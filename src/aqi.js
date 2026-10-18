// -----------------------------------------------------------------------------
// The U.S. Air Quality Index (AQI) of the EPA, as AirNow reports it.
//
// Six categories, numbered 1 to 6 by AirNow (7 = unavailable, a sentinel).
// AQI values above 500 exist in real data (wildfire smoke): they stay
// "Hazardous" and are never rejected.
// -----------------------------------------------------------------------------

const CATEGORIES = [
  { number: 1, key: 'good', max: 50 },
  { number: 2, key: 'moderate', max: 100 },
  { number: 3, key: 'sensitive', max: 150 },
  { number: 4, key: 'unhealthy', max: 200 },
  { number: 5, key: 'very_unhealthy', max: 300 },
  { number: 6, key: 'hazardous', max: Infinity },
];
const CATEGORY_KEYS = CATEGORIES.map((category) => category.key);
// The names AirNow writes, lower case.
const NAMES = {
  good: 'good',
  moderate: 'moderate',
  'unhealthy for sensitive groups': 'sensitive',
  unhealthy: 'unhealthy',
  'very unhealthy': 'very_unhealthy',
  hazardous: 'hazardous',
};
// AirNow names -> the keys of the integration (features, outputs, texts).
const POLLUTANTS = {
  'PM2.5': 'pm25',
  PM25: 'pm25',
  PM10: 'pm10',
  OZONE: 'ozone',
  O3: 'ozone',
  NO2: 'no2',
  CO: 'co',
  SO2: 'so2',
};

/**
 * @description The category of an AQI value.
 * @param {number|null} aqi - The AQI.
 * @returns {string|null} The category key, null without a value.
 * @example
 * categoryOfAqi(74); // -> 'moderate'
 */
function categoryOfAqi(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0) {
    return null;
  }
  return CATEGORIES.find((category) => aqi <= category.max).key;
}

/**
 * @description The category of an AirNow number (1-6) or name.
 * @param {unknown} value - 2, "Moderate", "Unhealthy for Sensitive Groups".
 * @returns {string|null} The category key, null when unknown or unavailable.
 */
function categoryOf(value) {
  if (typeof value === 'number') {
    return CATEGORIES.find((category) => category.number === value)?.key ?? null;
  }
  return (
    NAMES[
      String(value ?? '')
        .trim()
        .toLowerCase()
    ] ?? null
  );
}

/**
 * @description The rank of a category, 1 (good) to 6 (hazardous).
 * @param {string|null} key - The category key.
 * @returns {number} The rank, 0 when none.
 */
const rankOf = (key) => CATEGORY_KEYS.indexOf(key) + 1;

/**
 * @description The worse of two categories.
 * @param {string|null} a - A category key.
 * @param {string|null} b - Another.
 * @returns {string|null} The worse one.
 */
const worse = (a, b) => (rankOf(b) > rankOf(a) ? b : a);

/**
 * @description The key of an AirNow pollutant name.
 * @param {unknown} name - "PM2.5", "OZONE", "Ozone".
 * @returns {string|null} pm25, pm10, ozone, no2, co, so2, or null.
 */
const pollutantOf = (name) =>
  POLLUTANTS[
    String(name ?? '')
      .trim()
      .toUpperCase()
  ] ?? null;

export { CATEGORIES, CATEGORY_KEYS, categoryOfAqi, categoryOf, rankOf, worse, pollutantOf };
