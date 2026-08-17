# @mux/mux-data-google-ima

## 0.3.17

### Patch Changes

- d9531f1: chore: replace build and deploy setup (no functional changes)
  - Updated dependency: mux-embed@5.18.1

## 0.3.16

### Patch Changes

- 29a0592: Set viewer_connection_type, viewer_connection_low_data_mode with new networkchange event
  - Updated dependency: mux-embed@5.18.0

## 0.3.15

### Patch Changes

- d269a8e: [chore] force upgrade of yarn to 4.12.0
  - Updated dependency: mux-embed@5.17.10

## 0.3.14

### Patch Changes

- 972aa7b: [chore] upgrade yarn version
  - Updated dependency: mux-embed@5.17.9

## 0.3.13

### Patch Changes

- c61e7e0: [chore] publish mux-embed first, then the rest
  - Updated dependency: mux-embed@5.17.8

## 0.3.12

### Patch Changes

- 459e426: fix workspace build issue
  - Updated dependency: mux-embed@5.17.7

## 0.3.11

### Patch Changes

- 5fc0f70: [chore] fix release pipeline
  - Updated dependency: mux-embed@5.17.6

## 0.3.10

### Patch Changes

- 3d12318: fix issue where playback_mode may not have appeared on all events
  - Updated dependency: mux-embed@5.17.5

## 0.3.9

### Patch Changes

- d497a4e: [chore] fix npm publish
  - Updated dependency: mux-embed@5.17.4

## 0.3.8

### Patch Changes

- e8b169f: [chore] fix deploy pipeline
  - Updated dependency: mux-embed@5.17.3

## 0.3.7

### Patch Changes

- 1546883: [chore] update build process to github actions
  - Updated dependency: mux-embed@5.17.2

## 0.3.6

### Patch Changes

- 8aa9078: fix issue where playing time might accumulate for paused players
  - Updated dependency: mux-embed@5.17.1

## 0.3.5

### Patch Changes

- fb35e4e: add compatibility for dash.js 5
  - Updated dependency: mux-embed@5.17.0

## 0.3.4

### Patch Changes

- 546d371: Update parsing of initial value for player_playback_mode
  - Updated dependency: mux-embed@5.16.1

## 0.3.3

### Patch Changes

- a2c08d2: Add Playback Range Tracker for new engagement metrics
  - Updated dependency: mux-embed@5.16.0

## 0.3.2

### Patch Changes

- 9b29061: Automatically detect playback mode changes for HTML 5 Video
  - Updated dependency: mux-embed@5.15.0

## 0.3.1

### Patch Changes

- 05c1931: Emit a renditionchange event at the start of views to eanble updated rendition tracking.
  - Updated dependency: mux-embed@5.14.0

## 0.3.0

### Minor Changes

- 4b4cad5: Add ad type metadata to Ad Events

### Patch Changes

- 4b4cad5: Add ad type metadata to Ad Events
- f438c4a: Add support for the upcoming Playback Mode changes:
  - Updated dependency: mux-embed@5.13.0

## 0.2.12

### Patch Changes

- 95bfc7d: SDKs will no longer immediately send error events that are flagged as warnings. Fatal errors will still immediately be sent.
  - Updated dependency: mux-embed@5.12.0

## 0.2.11

### Patch Changes

- c537870: Allow dev to specify page starting load and page finished loading times to calculate Page Load Time
  - Updated dependency: mux-embed@5.11.0

## 0.2.10

### Patch Changes

- 1644b67: Adds support for cdnchange events
  - Updated dependency: mux-embed@5.10.0

## 0.2.9

### Patch Changes

- 4e18c30: Submit Aggregate Startup Time when autoplay is set
  - Updated dependency: mux-embed@5.9.1

## 0.2.8

### Patch Changes

- 5c14949: feat(google-ima): Support dynamic playback engine (adding/removing) during monitor.

## 0.2.7

### Patch Changes

- Updated dependencies [eb2ebfa]
  - mux-embed@5.9.0

## 0.2.6

### Patch Changes

- Updated dependencies [8fa7827]
  - mux-embed@5.8.3

## 0.2.5

### Patch Changes

- Updated dependencies [38eeefe]
  - mux-embed@5.8.2

## 0.2.4

### Patch Changes

- Updated dependencies [cef9e40]
  - mux-embed@5.8.1

## 0.2.3

### Patch Changes

- Updated dependencies [049be75]
  - mux-embed@5.8.0

## 0.2.2

### Patch Changes

- Updated dependencies [41b0915]
  - mux-embed@5.7.0

## 0.2.1

### Patch Changes

- Updated dependencies [9cd7dbf]
  - mux-embed@5.6.0

## 0.2.0

### Minor Changes

- 18af18e: Update mechanism for generating unique IDs, used for `view_id` and others

### Patch Changes

- Updated dependencies [18af18e]
- Updated dependencies [157f957]
  - mux-embed@5.5.0

## 0.1.2

### Patch Changes

- 2d96231: [chore] internal build process fix (no functional changes)
- Updated dependencies [2d96231]
  - mux-embed@5.4.3

## 0.1.1

### Patch Changes

- 5104511: [chore] only publish minified code

## 0.1.0

### Minor Changes

- e5f3e65: feat(google-ima): Beta implementation of google-ima extension to mux-embed

### Patch Changes

- Updated dependencies [e5f3e65]
- Updated dependencies [fecba0b]
- Updated dependencies [40f531d]
  - mux-embed@5.4.2
