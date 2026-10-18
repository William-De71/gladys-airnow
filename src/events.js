// -----------------------------------------------------------------------------
// Scene triggers and scene action outputs.
//
// Triggers (one event per transition, never a periodic snapshot):
//   - `air_quality_changed`  the category of the AQI now changes (Good ->
//                            Moderate…), with its direction;
//   - `forecast_updated`     the forecast category of a day appears or changes
//                            (a new issuance, usually once a day);
//   - `action_day`           a forecast announces an Air Quality Action Day
//                            (an alert of the agency) for a day.
// The first reading of a place is a baseline for the first two (an action day
// already announced does fire: it is news for whoever installs the
// integration). `seen` lives in /data: a restart never fires twice. A scene
// action or a widget never fires an event.
// -----------------------------------------------------------------------------

import { rankOf } from './aqi.js';
import { daysBetween } from './time.js';
import { categoryText, pollutantText } from './i18n.js';

const TRIGGERS = {
  AIR_QUALITY_CHANGED: 'air_quality_changed',
  FORECAST_UPDATED: 'forecast_updated',
  ACTION_DAY: 'action_day',
};
const DAY_KEYS = ['today', 'tomorrow', 'later'];
const AIR_QUALITY_OUTPUTS = [
  'aqi',
  'category',
  'category_name',
  'pollutant_name',
  'area',
  'forecast_today_aqi',
  'forecast_tomorrow_aqi',
  'forecast_tomorrow_category',
  'action_day',
  'summary',
];

/**
 * @description "today", "tomorrow" or "later" for a forecast date.
 * @param {string} date - The date.
 * @param {string} today - Today, in the reporting area.
 * @returns {string|null} The key, null for a past date.
 */
function dayKeyOf(date, today) {
  const days = daysBetween(today, date);
  if (days < 0) {
    return null;
  }
  return DAY_KEYS[Math.min(days, 2)];
}

/**
 * @description Whether the category now changed.
 * @param {string|null|undefined} previous - The category seen last, undefined at first.
 * @param {string|null} current - The category now.
 * @returns {{ direction: string, previous: string }|null} The change.
 */
function detectCategoryChange(previous, current) {
  if (!previous || !current || previous === current) {
    return null;
  }
  return { direction: rankOf(current) > rankOf(previous) ? 'worse' : 'better', previous };
}

/**
 * @description The forecast days whose category appeared or changed.
 * @param {object} options - Options.
 * @param {object|undefined} options.seen - date -> category seen; undefined: a baseline.
 * @param {object} options.forecast - The parsed forecast.
 * @param {string} options.today - Today, in the reporting area.
 * @returns {{ changes: object[], next: object }} The changed days, and what to remember.
 */
function detectForecastChanges({ seen, forecast, today }) {
  const next = {};
  const changes = [];
  for (const day of forecast?.days ?? []) {
    if (!dayKeyOf(day.date, today)) {
      continue;
    }
    next[day.date] = day.category;
    if (seen && seen[day.date] !== day.category) {
      changes.push(day);
    }
  }
  return { changes, next };
}

/**
 * @description The action days not announced yet.
 * @param {object} options - Options.
 * @param {string[]|undefined} options.fired - The dates already announced.
 * @param {object} options.forecast - The parsed forecast.
 * @param {string} options.today - Today, in the reporting area.
 * @returns {{ newly: object[], next: string[] }} The days, and what to remember.
 */
function detectActionDays({ fired = [], forecast, today }) {
  const next = fired.filter((date) => dayKeyOf(date, today));
  const newly = [];
  for (const day of forecast?.days ?? []) {
    if (day.actionDay && dayKeyOf(day.date, today) && !next.includes(day.date)) {
      newly.push(day);
      next.push(day.date);
    }
  }
  return { newly, next };
}

/**
 * @description The data of an `air_quality_changed` event.
 * @param {object} place - `{ deviceId, area }`.
 * @param {object} observations - The parsed observations.
 * @param {object} change - `{ direction, previous }`.
 * @param {string} language - The language of the texts.
 * @returns {object} The flat payload.
 */
function changedData(place, observations, change, language) {
  return {
    place: place.deviceId,
    area: place.area,
    aqi: observations.aqi,
    category: observations.category,
    category_name: categoryText(observations.category, language),
    previous_category: change.previous,
    direction: change.direction,
    pollutant: observations.pollutant,
    pollutant_name: pollutantText(observations.pollutant, language),
  };
}

/**
 * @description The data of a `forecast_updated` or `action_day` event.
 * @param {object} place - `{ deviceId, area }`.
 * @param {object} day - The forecast day.
 * @param {string} today - Today, in the reporting area.
 * @param {string} language - The language of the texts.
 * @returns {object} The flat payload.
 */
function forecastData(place, day, today, language) {
  return {
    place: place.deviceId,
    area: place.area,
    date: day.date,
    day: dayKeyOf(day.date, today),
    aqi: day.aqi,
    category: day.category,
    category_name: categoryText(day.category, language),
    pollutant: day.pollutant,
    pollutant_name: pollutantText(day.pollutant, language),
    action_day: day.actionDay,
    discussion: day.discussion.slice(0, 1000),
  };
}

/**
 * @description Keep only the declared keys of a scene action result.
 * @param {object} outputs - The values.
 * @param {string[]} keys - The declared outputs.
 * @returns {object} The result.
 */
const pick = (outputs, keys) => Object.fromEntries(keys.map((key) => [key, outputs[key] ?? null]));

export {
  TRIGGERS,
  DAY_KEYS,
  AIR_QUALITY_OUTPUTS,
  dayKeyOf,
  detectCategoryChange,
  detectForecastChanges,
  detectActionDays,
  changedData,
  forecastData,
  pick,
};
