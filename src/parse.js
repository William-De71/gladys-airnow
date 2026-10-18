// -----------------------------------------------------------------------------
// The answers of the AirNow API, read.
//
// /aq/observation/current/ziplatlong/   one row per pollutant measured near
//   the place (PM2.5, OZONE, PM10…): `nowcastAQI`, `aqiCategoryName`, the
//   reporting area, the monitoring site, the hour (labelled by its END) and
//   the timezone abbreviation;
// /aq/forecast/current/   one row per pollutant and per day: `aqi` (-1 when
//   the agency gives only a category), `categoryNumber`, `actionDay` (an Air
//   Quality Alert), `discussion`, the reporting area and its code.
// The overall AQI of a place is the highest AQI of its pollutants, as AirNow
// shows it.
// -----------------------------------------------------------------------------

import { categoryOf, categoryOfAqi, pollutantOf, rankOf, worse } from './aqi.js';
import { observedAt, zoneOffset } from './time.js';

const TEXT_MAX = 1000;

const text = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * @description An AQI value of the API: a finite number from 0, else null.
 * @param {unknown} value - The value (-1 means "not given").
 * @returns {number|null} The AQI.
 */
function aqiValue(value) {
  const number = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

/**
 * @description Read the current observations of a place.
 * @param {object[]} rows - The answer of /aq/observation/current/ziplatlong/.
 * @param {number} [now] - Now (ms).
 * @returns {object|null} `{ area, agency, zone, offset, observedAt, aqi,
 * category, pollutant, pollutants: { pm25: { aqi, category, site } … } }`,
 * null without a usable row.
 */
function parseObservations(rows, now = Date.now()) {
  const pollutants = {};
  let first = null;
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = pollutantOf(row?.parameterName);
    const aqi = aqiValue(row?.nowcastAQI ?? row?.aqi);
    if (!key || aqi === null) {
      continue;
    }
    first ??= row;
    const category = categoryOf(row.aqiCategoryName) ?? categoryOfAqi(aqi);
    const known = pollutants[key];
    // Two sites for the same pollutant: the higher reading.
    if (!known || aqi > known.aqi) {
      pollutants[key] = { aqi, category, site: text(row.siteName, 100) };
    }
  }
  if (!first) {
    return null;
  }
  let main = null;
  for (const [key, value] of Object.entries(pollutants)) {
    if (!main || value.aqi > pollutants[main].aqi) {
      main = key;
    }
  }
  return {
    area: text(first.reportingAreaName ?? first.reportingArea, 100),
    agency: text(first.reportingAgency, 100),
    zone: text(first.localTimeZone, 8),
    offset: zoneOffset(first.localTimeZone),
    observedAt: observedAt(first.dateObserved, first.hourObserved, first.localTimeZone, now),
    aqi: pollutants[main].aqi,
    category: pollutants[main].category,
    pollutant: main,
    pollutants,
  };
}

/**
 * @description Read the current forecasts of a place.
 * @param {object[]} rows - The answer of /aq/forecast/current/.
 * @returns {object|null} `{ area, areaCode, state, agency, issued, days: [{
 * date, aqi, category, pollutant, actionDay, discussion, pollutants }] }`,
 * the days in order; null without a usable row.
 */
function parseForecast(rows) {
  const days = new Map();
  let first = null;
  let issued = '';
  for (const row of Array.isArray(rows) ? rows : []) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(row?.dateValid ?? '') ? row.dateValid : null;
    const key = pollutantOf(row?.parameterName);
    const aqi = aqiValue(row?.aqi);
    const category =
      categoryOf(row?.categoryNumber) ?? categoryOf(row?.categoryName) ?? categoryOfAqi(aqi);
    if (!date || !key || !category) {
      continue;
    }
    first ??= row;
    if (typeof row.dateIssue === 'string' && row.dateIssue > issued) {
      issued = row.dateIssue;
    }
    const day = days.get(date) ?? {
      date,
      aqi: null,
      category: null,
      pollutant: null,
      actionDay: false,
      discussion: '',
      pollutants: {},
    };
    day.pollutants[key] = { aqi, category };
    // The worst pollutant of the day: by category, then by AQI.
    const better =
      rankOf(category) > rankOf(day.category) ||
      (rankOf(category) === rankOf(day.category) && (aqi ?? -1) > (day.aqi ?? -1));
    if (better) {
      day.pollutant = key;
      day.category = category;
    }
    if (aqi !== null && (day.aqi === null || aqi > day.aqi)) {
      day.aqi = aqi;
    }
    day.category = worse(day.category, category);
    day.actionDay ||= row.actionDay === true || row.actionDay === 'true';
    if (!day.discussion) {
      day.discussion = text(row.discussion, TEXT_MAX);
    }
    days.set(date, day);
  }
  if (!first) {
    return null;
  }
  return {
    area: text(first.reportingArea ?? first.reportingAreaName, 100),
    areaCode: text(first.reportingAreaCode, 20).toLowerCase(),
    state: text(first.stateCode, 4),
    agency: text(first.forecastAgency, 100),
    issued,
    days: [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
}

export { aqiValue, parseObservations, parseForecast };
