// -----------------------------------------------------------------------------
// The devices of the integration, offered on the Discovery screen.
//
// "AirNow <reporting area>": one per configured place. Read-only features:
//   - `aqi`               the AQI now, the highest of the pollutants measured;
//   - `pm25`, `ozone`, `pm10`  the AQI of each pollutant (NowCast);
//   - `category`          text: "Moderate";
//   - `forecast_today`, `forecast_tomorrow`  the forecast AQI of the day, when
//                         the agency gives a number (some give a category only);
//   - `forecast`          text: "Tomorrow: Moderate (Ozone)".
// The AQI features are `airquality-sensor` / `aqi`: the Gladys front colors
// them on this very scale (the U.S. AQI). They go up to 999: smoke events
// exceed 500.
//
// External ids: the place as configured — `ext:airnow:place:zip-90210` or
// `ext:airnow:place:house-<house selector>`. `should_poll` stays false: the
// integration reads on its own timer (hourly observations).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { t, categoryText, pollutantText } from './i18n.js';

const DEVICE_TYPE = 'place';
const FEATURE_KEYS = {
  AQI: 'aqi',
  PM25: 'pm25',
  OZONE: 'ozone',
  PM10: 'pm10',
  CATEGORY: 'category',
  FORECAST_TODAY: 'forecast_today',
  FORECAST_TOMORROW: 'forecast_tomorrow',
  FORECAST: 'forecast',
};
const POLLUTANT_FEATURES = [
  [FEATURE_KEYS.PM25, 'pm25', 'featurePm25'],
  [FEATURE_KEYS.OZONE, 'ozone', 'featureOzone'],
  [FEATURE_KEYS.PM10, 'pm10', 'featurePm10'],
];
const MAX_AQI = 999;
const TEXT_MAX = 250;

/**
 * @description The key of a configured place.
 * @param {{ zip: string|null, house: string|null }} place - The place.
 * @returns {string} "zip-90210", "house-main-house".
 */
function placeKey(place) {
  if (place.zip) {
    return `zip-${place.zip}`;
  }
  return `house-${String(place.house)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')}`;
}

/**
 * @description The external ids of a place.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {string} key - The place key.
 * @returns {{ device: string, feature: Function }} The ids.
 */
const idsOf = (gladys, key) => gladys.externalIds(DEVICE_TYPE, key);

/**
 * @description The place key of a device (or feature) external id.
 * @param {unknown} externalId - The id.
 * @returns {string|null} The key.
 * @example
 * keyOfExternalId('ext:airnow:place:zip-90210:aqi'); // -> 'zip-90210'
 */
function keyOfExternalId(externalId) {
  const match = /:place:((?:zip|house)-[a-z0-9_-]+?)(?::[a-z_0-9]+)?$/.exec(
    String(externalId ?? ''),
  );
  return match ? match[1] : null;
}

/**
 * @description A read-only feature.
 * @param {object} feature - Its fields.
 * @returns {object} The feature.
 */
const sensor = (feature) => ({
  read_only: true,
  has_feedback: false,
  keep_history: true,
  ...feature,
});

const aqiShape = {
  category: DEVICE_FEATURE_CATEGORIES.AIRQUALITY_SENSOR,
  type: DEVICE_FEATURE_TYPES.AIRQUALITY_SENSOR.AQI,
  unit: DEVICE_FEATURE_UNITS.AQI,
  min: 0,
  max: MAX_AQI,
};
const textShape = {
  category: DEVICE_FEATURE_CATEGORIES.TEXT,
  type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
  keep_history: false,
  min: 0,
  max: 0,
};

/**
 * @description Build the device of a place.
 * @param {object} gladys - The GladysIntegration instance.
 * @param {object} place - `{ key, zip, house, area, label }`.
 * @param {string} [language] - Language of the names.
 * @returns {object} The discovered device.
 */
function buildPlaceDevice(gladys, place, language = 'en') {
  const ids = idsOf(gladys, place.key);
  const feature = (key, name, shape) =>
    sensor({ name: t(name, language), external_id: ids.feature(key), ...shape });
  const params = [
    place.zip
      ? { name: 'AIRNOW_ZIP', value: place.zip }
      : { name: 'AIRNOW_HOUSE', value: place.house },
  ];
  if (place.area) {
    params.push({ name: 'AIRNOW_REPORTING_AREA', value: place.area });
  }
  return {
    name: t('deviceName', language, { area: place.area || place.label }),
    external_id: ids.device,
    model: 'AirNow',
    should_poll: false,
    params,
    features: [
      feature(FEATURE_KEYS.AQI, 'featureAqi', aqiShape),
      ...POLLUTANT_FEATURES.map(([key, , name]) => feature(key, name, aqiShape)),
      feature(FEATURE_KEYS.CATEGORY, 'featureCategory', textShape),
      feature(FEATURE_KEYS.FORECAST_TODAY, 'featureForecastToday', aqiShape),
      feature(FEATURE_KEYS.FORECAST_TOMORROW, 'featureForecastTomorrow', aqiShape),
      feature(FEATURE_KEYS.FORECAST, 'featureForecast', textShape),
    ],
  };
}

/**
 * @description The forecast text of a day.
 * @param {object|null} day - The forecast day.
 * @param {string} dayName - "Tomorrow".
 * @param {string} language - The language.
 * @returns {string} "Tomorrow: Moderate (Ozone)", '' without a day.
 */
function forecastLine(day, dayName, language) {
  if (!day) {
    return '';
  }
  const line = t('forecastText', language, {
    day: dayName,
    category: categoryText(day.category, language),
    pollutant: pollutantText(day.pollutant, language),
  });
  return day.actionDay ? `${line}, ${t('forecastActionDay', language)}` : line;
}

/**
 * @description The states of a place. A value AirNow did not give this time
 * is left untouched (a 0 would claim clean air).
 * @param {object} gladys - The GladysIntegration instance.
 * @param {string} key - The place key.
 * @param {object} reading - `{ observations, today, tomorrow }`: the parsed
 * observations (or null) and the forecast days of today and tomorrow (or null).
 * @param {string} language - The language.
 * @returns {object[]} `{ device_feature_external_id, state | text }`.
 */
function buildPlaceStates(gladys, key, { observations, today, tomorrow }, language) {
  const ids = idsOf(gladys, key);
  const states = [];
  const aqi = (featureKey, value) => {
    if (Number.isFinite(value)) {
      states.push({
        device_feature_external_id: ids.feature(featureKey),
        state: Math.min(value, MAX_AQI),
      });
    }
  };
  if (observations) {
    aqi(FEATURE_KEYS.AQI, observations.aqi);
    for (const [featureKey, pollutant] of POLLUTANT_FEATURES) {
      aqi(featureKey, observations.pollutants[pollutant]?.aqi);
    }
    states.push({
      device_feature_external_id: ids.feature(FEATURE_KEYS.CATEGORY),
      text: categoryText(observations.category, language).slice(0, TEXT_MAX),
    });
  }
  aqi(FEATURE_KEYS.FORECAST_TODAY, today?.aqi);
  aqi(FEATURE_KEYS.FORECAST_TOMORROW, tomorrow?.aqi);
  const line =
    forecastLine(tomorrow, t('dayTomorrow', language), language) ||
    forecastLine(today, t('dayToday', language), language);
  if (line) {
    states.push({
      device_feature_external_id: ids.feature(FEATURE_KEYS.FORECAST),
      text: line.slice(0, TEXT_MAX),
    });
  }
  return states;
}

export {
  DEVICE_TYPE,
  FEATURE_KEYS,
  MAX_AQI,
  placeKey,
  idsOf,
  keyOfExternalId,
  buildPlaceDevice,
  forecastLine,
  buildPlaceStates,
};
