# Ride Score — Minimal PWA Technical Architecture

## 1. Recommendation

Build the initial application as a client-side Progressive Web App using:

- React
- TypeScript
- Vite
- `vite-plugin-pwa`
- Native IndexedDB
- Native SVG
- Wrangler
- Cloudflare Workers Static Assets

The first version should not contain a backend API or any server-side ride processing. Cloudflare Workers should initially serve only the built application assets.

## 2. Why this stack

### React

The interface is small, but it has meaningful application states:

- Ready
- Requesting permissions
- Recording
- Interrupted
- Processing
- Results
- Permission denied or error

React provides a simple way to keep the screens consistent with those states. It also has a well-supported Vite and Cloudflare development path.

### TypeScript

TypeScript is useful because sensor events, location readings, ride records, processed windows, and permission states should have explicit shapes. It will also make later changes to the scoring method safer.

### Vite

Vite provides a small and fast development/build setup. The application remains a conventional client-side SPA without server rendering.

### No application framework above React

Do not use Next.js, Remix, React Router framework mode, or another full-stack framework. The MVP does not need server rendering, server actions, loaders, or framework-specific deployment adapters.

## 3. Minimal dependencies

### Runtime

- `react`
- `react-dom`

Avoid adding other runtime packages unless a concrete need appears during implementation.

### Development and deployment

- `typescript`
- `vite`
- React plugin for Vite
- `vite-plugin-pwa`
- `wrangler`
- TypeScript type packages required by React and the build setup

Add a unit-test runner only when the pure scoring module is ready to test. Vitest is the natural choice because the project already uses Vite.

### Explicitly excluded initially

- Redux, Zustand, or another state-management library
- Tailwind or a component library
- A charting library
- A mapping library
- An IndexedDB wrapper
- A routing library
- A validation library
- A backend framework such as Hono

## 4. Deployment architecture

The initial runtime architecture is:

```text
iPhone
   |
   |-- downloads the PWA from Cloudflare
   |-- requests motion and location permission
   |-- records motion and GPS locally
   |-- stores active and completed rides in IndexedDB
   |-- processes ride results locally
   `-- displays the route, timeline, and summary

Cloudflare Workers
   `-- serves HTML, JavaScript, CSS, icons, manifest, and browser service worker
```

The Cloudflare deployment should use Workers Static Assets with:

- The Vite `dist` directory as the asset directory
- SPA fallback to `index.html`
- A current Cloudflare compatibility date
- No Worker entry point unless an API is introduced later

Use Wrangler for local Cloudflare-compatible preview and deployment. The project should include scripts for development, build, preview, type checking, testing once added, and deployment.

Do not introduce the Cloudflare Vite plugin for the static-only version. It can be added later if the project gains Worker code, bindings, or API routes.

## 5. Browser PWA architecture

There are two different kinds of workers in this project:

- The Cloudflare Worker runs on Cloudflare and serves the application.
- The PWA service worker runs in the browser and caches the application shell.

The browser service worker does not provide continuous motion or location recording after iOS suspends the application.

Use `vite-plugin-pwa` to generate:

- The web app manifest
- Install icons and manifest references
- The browser service worker
- Application-shell precaching

Keep caching simple:

- Precache the application shell and local static assets.
- Store ride data in IndexedDB, not Cache Storage.
- Do not introduce complex runtime caching.
- Do not depend on network access while a ride is recording.
- Do not cache third-party map tiles in the initial version.

Do not automatically activate an application update during a ride. Use a prompt-based update flow, and suppress or defer the prompt while recording.

## 6. Application state

Use a small reducer in the top-level application. Do not add a state-management package.

```text
READY
  | Start
  v
REQUESTING_PERMISSION
  | Permission granted
  v
RECORDING
  | Stop
  v
PROCESSING
  | Processing complete
  v
RESULTS
```

Required alternative transitions:

```text
REQUESTING_PERMISSION -> PERMISSION_DENIED
RECORDING -> INTERRUPTED
PROCESSING -> ERROR
```

An interrupted ride should remain recoverable from locally persisted data where practical.

## 7. Separation of responsibilities

The recorder, scoring logic, and storage should be plain TypeScript modules independent of React.

```text
Browser motion and location events
                 |
                 v
           RideRecorder
                 |
        +--------+---------+
        |                  |
        v                  v
 In-memory buffers    Periodic IndexedDB writes
        |
        v
 Occasional UI status snapshots
        |
        v
      React
```

Do not place every motion sample into React state. Motion events may arrive many times per second; rendering for each event would be wasteful and could interfere with recording.

The recorder should:

- Own active browser event listeners.
- Timestamp and buffer motion samples.
- Timestamp and buffer location samples.
- Periodically persist batches.
- Publish only low-frequency recording status to the UI.
- Cleanly remove listeners when recording stops or fails.
- Prevent two concurrent recording sessions.

The scoring module should be a pure transformation from recorded samples to processed results. It should not access browser APIs or IndexedDB.

The storage module should own IndexedDB setup, schema versioning, writes, reads, and deletion.

## 8. Suggested project structure

```text
ride-score/
|-- public/
|   |-- icons/
|   `-- favicon.svg
|-- src/
|   |-- App.tsx
|   |-- app.css
|   |-- main.tsx
|   |-- ride/
|   |   |-- recorder.ts
|   |   |-- scoring.ts
|   |   |-- storage.ts
|   |   `-- types.ts
|   |-- screens/
|   |   |-- ReadyScreen.tsx
|   |   |-- RecordingScreen.tsx
|   |   `-- ResultsScreen.tsx
|   `-- components/
|       |-- RideTimeline.tsx
|       `-- RoutePlot.tsx
|-- index.html
|-- vite.config.ts
|-- wrangler.jsonc
|-- package.json
`-- tsconfig.json
```

Keep the structure shallow. Add files only when a module has a clear responsibility.

## 9. Initial data model

### Ride

- ID
- Start timestamp
- End timestamp
- Status
- Motion samples
- Location samples
- Per-second intensity values
- Summary values
- Optional interruption or error information

### Motion sample

- Timestamp
- X acceleration
- Y acceleration
- Z acceleration

### Location sample

- Timestamp
- Latitude
- Longitude
- Speed, when supplied
- Accuracy

### Processed second

- Start timestamp
- RMS motion intensity
- Moving or idle classification
- Optional interpolated route position

### Summary

- Elapsed duration
- Moving duration
- Idle duration
- Average moving intensity
- Maximum intensity
- Percentage of moving time above provisional disturbance thresholds
- Provisional Calm, Moderate, or Rough label

Do not store classifications for individual physical events because the MVP does not identify their cause.

## 10. Visualizations

Use native SVG for the first version.

### Timeline

Render one processed intensity value per second as a line or filled area chart. Avoid a charting dependency until interaction requirements justify one.

### Route

Initially normalize GPS coordinates into an SVG viewport and draw the route as colour-coded line segments. This validates synchronization between location and disturbance without requiring map tiles, API keys, or a mapping library.

If field testing shows that geographic context is important, add a map library and an appropriate map-tile provider in a later iteration.

## 11. Recording requirements

- Motion and location permission requests must follow the user's Start Ride gesture.
- The application should request a screen wake lock where supported.
- The interface must clearly state that the phone should remain mounted and the app must remain in the foreground.
- Listen for page visibility changes and mark or warn about interruptions.
- Persist data incrementally rather than waiting until Stop Ride.
- Stop and remove every sensor listener cleanly.
- Exclude idle seconds from the overall moving score.
- Do not attempt background or locked-screen recording in this version.

## 12. Testing approach

### Automated tests

Prioritize tests for the pure scoring logic using synthetic inputs:

- No movement
- Constant small vibration
- One large event
- Several medium events
- A mixture of idle and moving periods
- Missing samples
- Irregular timestamps
- No usable GPS speed
- Empty or very short rides

Also test that stronger synthetic motion produces a greater result than weaker motion.

### Manual browser tests

- Motion permission accepted and denied
- Location permission accepted and denied
- Starting and stopping more than one ride
- PWA installed on an iPhone Home Screen
- Screen wake-lock behaviour
- Application moved to the background
- Application interrupted and reopened
- Recording with network access disabled
- PWA update available during and outside recording

### Field tests

Use the four controlled ride types defined in the MVP product plan. Field testing on a real mounted iPhone is required; desktop simulation cannot validate the sensor signal or iOS lifecycle behaviour.

## 13. Deferred Cloudflare capabilities

Only add a Worker API when a real server-side requirement appears. A later architecture might use:

- A Worker API for authenticated ride upload
- D1 for ride metadata and user-visible records
- R2 for larger raw sample files
- Cloudflare Access or another authentication solution

None of these are part of the initial implementation.

## 14. Implementation order

1. Scaffold the React, TypeScript, and Vite application.
2. Add the PWA manifest, icons, shell caching, and safe update behaviour.
3. Implement the application states and three screens with placeholder data.
4. Implement the motion recorder and a visible sensor diagnostic.
5. Implement GPS recording and moving/idle classification.
6. Implement incremental IndexedDB persistence and interrupted-ride recovery.
7. Implement pure per-second scoring and summary calculation.
8. Implement the SVG timeline and route plot.
9. Add scoring tests and error-path tests.
10. Test on a real iPhone over HTTPS.
11. Configure and verify Cloudflare Workers Static Assets deployment.
12. Conduct controlled field rides and tune provisional thresholds.

Keep every stage runnable. Do not build all subsystems before testing sensor access on the target iPhone.

## 15. Initial completion criteria

The implementation is complete when:

- It builds and type-checks without errors.
- It can be installed as a PWA on an iPhone.
- Start Ride requests the required permissions from a user gesture.
- A mounted iPhone can record motion and location in the foreground.
- An active ride is persisted incrementally.
- Stop Ride produces a timeline, route plot, and summary.
- Idle periods do not improve the moving-ride score.
- The core scoring tests pass.
- The application works without network access after its shell has been cached.
- It deploys successfully as static assets on Cloudflare Workers.

## 16. Guidance for an implementation agent

The implementation agent should receive both:

- `ride-score-mvp-plan.md`
- `ride-score-technical-architecture.md`

It should be instructed to:

- Treat the two files as the product and technical source of truth.
- Implement in the listed order rather than expanding scope.
- Check current browser and Cloudflare APIs before relying on generated configuration.
- Use current stable package versions rather than guessing version numbers from the plan.
- Preserve the local-only architecture.
- Avoid adding excluded dependencies or features without a demonstrated need.
- Run build, type-check, and tests after implementation.
- Report what requires validation on a physical iPhone.
- Avoid claiming that simulated or desktop testing validates the ride measurement.

The agent should not deploy to Cloudflare unless explicitly authorized and provided access to the correct Cloudflare account.
