import type { Ride } from './types'

const DATABASE_NAME = 'ride-score'
const DATABASE_VERSION = 1
const RIDES_STORE = 'rides'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(RIDES_STORE)) {
        request.result.createObjectStore(RIDES_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local ride storage.'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RIDES_STORE, mode)
    const request = action(transaction.objectStore(RIDES_STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Local storage action failed.'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error ?? new Error('Local storage transaction failed.'))
  })
}

export function saveRide(ride: Ride): Promise<IDBValidKey> {
  return withStore('readwrite', (store) => store.put(ride))
}

export function getRide(id: string): Promise<Ride | undefined> {
  return withStore('readonly', (store) => store.get(id))
}

export async function getRecoverableRide(): Promise<Ride | undefined> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RIDES_STORE, 'readonly')
    const request = transaction.objectStore(RIDES_STORE).getAll()
    request.onsuccess = () => {
      const rides = request.result as Ride[]
      resolve(rides
        .filter((ride) => ride.status === 'recording' || ride.status === 'interrupted')
        .sort((a, b) => b.startTimestamp - a.startTimestamp)[0])
    }
    request.onerror = () => reject(request.error ?? new Error('Could not read local rides.'))
    transaction.oncomplete = () => database.close()
  })
}

export function deleteRide(id: string): Promise<undefined> {
  return withStore('readwrite', (store) => store.delete(id))
}
