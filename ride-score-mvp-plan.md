# Ride Score — Initial PWA Plan

## 1. Product idea

Ride Score is a Progressive Web App that records how physically disturbed a journey feels to a passenger.

It does not try to identify potholes or determine why a disturbance occurred. Rough road surfaces, braking, acceleration, turns, speed breakers, and other vehicle movements may all contribute to the result.

The initial product question is:

> Can an iPhone produce a ride-disturbance timeline that visually matches what the passenger experienced?

## 2. Initial user experience

The first version has three states.

### Ready

- Instruct the user to secure the iPhone in a rigid mount.
- Tell the user that the screen must remain on and the phone must not be handled during the ride.
- Provide a **Start Ride** button.
- Request motion and location permissions as part of the start action.

### Recording

- Show elapsed time.
- Show a clear recording indicator.
- Provide a **Stop Ride** button.
- Keep the screen awake where supported.
- Save collected data locally throughout the ride so an interruption does not lose the whole recording.
- Do not show a live map or live analysis in the initial version.

### Result

- Show the route travelled.
- Colour route sections by disturbance level.
- Show the ride-disturbance timeline.
- Show one overall disturbance result.
- Show total duration, moving duration, average intensity, and maximum intensity.

## 3. Data to collect

Use only two primary data sources.

### Motion

Collect timestamped three-axis linear acceleration from the browser's device-motion events.

The preferred input is acceleration with gravity already removed. For each motion sample, calculate a direction-independent magnitude:

```text
motion magnitude = sqrt(x^2 + y^2 + z^2)
```

This intentionally allows braking, acceleration, turning, bumps, and vibration to affect the measurement without classifying their cause.

If gravity-free acceleration proves unavailable or unreliable during device testing, add a calibrated fallback later. Do not implement phone-orientation transformation in the first version unless testing demonstrates that it is required.

### Location

Collect timestamped GPS position and speed. Use location only to:

- Draw the route.
- Determine whether the vehicle is moving.
- Associate disturbance values with route sections.

Do not use GPS as the primary input for braking detection or ride scoring.

## 4. Initial scoring method

### Per-second intensity

Group motion samples into one-second windows. Calculate RMS motion magnitude for every window:

```text
second intensity = RMS of motion magnitudes recorded during that second
```

This produces a simple ride timeline. RMS gives stronger movements more influence than small sensor fluctuations without requiring event detection.

### Moving versus idle time

Use GPS speed to label each second as moving or idle. Exclude idle seconds from the overall score so time spent stationary in traffic does not make a ride appear smoother.

The precise speed threshold should be selected during field testing rather than treated as a permanent product rule.

### Overall result

Initially calculate the overall result from the average per-second intensity during moving time. Also retain the maximum per-second intensity and the percentage of moving time above provisional disturbance thresholds.

Avoid presenting a scientifically authoritative universal score at this stage. Prefer:

- Average intensity
- Maximum intensity
- Percentage of moving time disturbed
- A provisional label: **Calm**, **Moderate**, or **Rough**

The first meaningful comparisons should be between rides recorded with the same phone, mount, and vehicle.

## 5. Visual presentation

### Timeline

Plot one intensity value per second. A smooth ride should appear mostly flat, occasional manoeuvres should create isolated peaks, and a continuously disturbed ride should show frequent activity.

### Route

Divide the GPS route into sections and assign the nearest corresponding per-second intensity. Use a simple three-colour scale:

- Green: low disturbance
- Yellow: moderate disturbance
- Red: high disturbance

Do not show pothole markers or attempt to label the cause of any section.

## 6. Explicit constraints for version one

- The iPhone must be rigidly mounted.
- The PWA must remain visible in the foreground.
- The screen must remain on.
- The user must not handle the phone while recording.
- A turn, braking event, acceleration, vibration, or bump may all increase the result intentionally.
- Stopped time is excluded from the overall result.
- Comparisons across different phones, vehicles, suspension systems, tyres, or mounting positions may not be reliable.
- Data is stored locally on the phone.

## 7. Features deliberately excluded

The initial version will not include:

- Accounts or login
- Cloud synchronization
- Backend processing
- Sharing
- Crowdsourced road data
- Pothole or event classification
- Machine learning
- Automatic trip detection
- Recording while the screen is locked
- Reliable background recording
- Navigation or route planning
- Vehicle profiles
- Speed-based score normalization
- Separate braking, turning, and vibration scores
- Phone-orientation mathematics
- User-labelled events
- Ride leaderboards
- Sophisticated offline maps

A basic raw-data export may be added for development and field analysis, but it does not need to be part of the main user experience.

## 8. Validation plan

Record controlled journeys using the same iPhone, vehicle, and mount:

1. Smooth road with little traffic
2. Smooth road with frequent braking
3. Rough road with little traffic
4. Rough road with frequent braking

The expected qualitative patterns are:

| Journey | Expected timeline |
| --- | --- |
| Smooth road, little traffic | Mostly flat |
| Smooth road, frequent braking | Flat sections with occasional broader peaks |
| Rough road, little traffic | Frequent small-to-medium activity |
| Rough road, frequent braking | Frequent activity with additional larger peaks |

The concept is validated if the timelines visibly separate these cases and generally agree with the passenger's experience.

Repeat each route more than once to check whether the pattern is reasonably consistent. Record notes immediately after each ride and compare them with the generated timeline.

## 9. Decisions to make from field testing

Do not decide these through theory alone:

- Whether gravity-free acceleration is stable enough on supported iPhones
- Appropriate moving-speed threshold
- Appropriate Calm, Moderate, and Rough thresholds
- Whether one-second windows are responsive enough
- Whether isolated severe movement affects the overall result sufficiently
- Whether touching or repositioning the phone needs automatic invalidation
- Whether route colouring remains useful with the GPS update frequency available

## 10. MVP completion criteria

The initial version is complete when a user can:

1. Mount the phone and start a ride.
2. Record motion and location while the app remains open.
3. Stop the ride without losing recorded data.
4. See the travelled route coloured by disturbance.
5. See a disturbance timeline and simple summary.
6. Repeat a route and obtain results that are directionally consistent with the experienced ride.

In one sentence, the MVP is:

> Start a ride, record acceleration and GPS, stop the ride, and show a coloured route, timeline, and relative disturbance result.
