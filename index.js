// -----------------------------------------------------------------------------
// Entry point of the AirNow external integration.
//
// Brings the air quality of AirNow (U.S. EPA) into Gladys, for up to three
// places, through the AirNow API (a free key):
//   - devices: one per place, with the AQI now, PM2.5, ozone, PM10, the
//     category and the forecast of today and tomorrow (src/device.js);
//   - scene triggers: air quality changed, forecast updated, action day;
//   - scene action: read the air quality of a place;
//   - dashboard widgets: air quality now, forecast.
//
// This file only wires the SDK client: the handlers are in src/app.js.
//
// Environment variables provided by the Gladys supervisor:
//   GLADYS_HOST_API_URL / GLADYS_INTEGRATION_TOKEN / GLADYS_INTEGRATION_SELECTOR
// The SDK reads them automatically: `new GladysIntegration()` is enough.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { createApp } from './src/app.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const gladys = new GladysIntegration();
createApp(gladys);

// --- Startup -----------------------------------------------------------------------
logger.info(`Starting the AirNow integration ${version}...`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
