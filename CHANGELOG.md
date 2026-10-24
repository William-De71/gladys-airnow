# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/). This file is generated at
each release from the Conventional Commits: do not edit it by hand.

## [0.1.1] - 2026-10-24

### Security

- **security:** build the image on Node.js 24.22.1 or later ([7f0de04](https://github.com/William-De71/gladys-airnow/commit/7f0de04ca23119561c025ed77f50a619e12c83b9))

## [0.1.0] - 2026-10-18

### Added

- Air quality of AirNow (U.S. EPA, with its state, local and tribal partners) for up to three places, each a house of Gladys or a U.S. ZIP code, through the 2026 services of the AirNow API (a free key per user).
- One device per place, named after its reporting area: the Air Quality Index now and the AQI of PM2.5, ozone and PM10, the category as text, the forecast AQI of today and tomorrow, and the forecast as text.
- Scene triggers: air quality changed (filters: place, new category, worse or better), forecast updated (place, day, category) and air quality alert (Air Quality Action Day).
- Scene action: read the air quality of a place, with a ready-made sentence.
- Dashboard widgets: the air quality now with the health message of its category, and the forecast of the next days with the forecaster's discussion.
- Configuration actions: read now and a diagnostic written to the logs without the key.
- Cloud transport: observations read at 35 minutes past every hour, forecasts every 3 hours, kept in /data; an hourly budget of requests protects the key.
- English, French, German and Spanish everywhere: settings, devices, widgets, scenes and documentation.

[0.1.1]: https://github.com/William-De71/gladys-airnow/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/William-De71/gladys-airnow/releases/tag/v0.1.0
