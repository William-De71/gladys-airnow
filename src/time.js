// -----------------------------------------------------------------------------
// Times.
//
// AirNow writes the time of an observation as a local date, an hour and the
// abbreviation of the timezone of the reporting area ("2026-09-09", "18:00",
// "PDT"). The 2026 services label the hour by its END: "18:00" is the average
// of 17:00-17:59 (the retired services said 17). Forecasts are local dates.
// Texts are written in the timezone of the Gladys instance (TZ).
// -----------------------------------------------------------------------------

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
// The abbreviations AirNow uses (it writes AKT for Alaska).
const ZONE_OFFSETS = {
  HST: -10,
  HDT: -9,
  AKT: -9,
  AKST: -9,
  AKDT: -8,
  PST: -8,
  PDT: -7,
  MST: -7,
  MDT: -6,
  CST: -6,
  CDT: -5,
  EST: -5,
  EDT: -4,
  AST: -4,
  ADT: -3,
  NST: -3.5,
  NDT: -2.5,
  SST: -11,
  CHST: 10,
  UTC: 0,
  GMT: 0,
};

/**
 * @description The timezone of the instance.
 * @returns {string|undefined} An IANA name, undefined for the system one.
 */
function defaultTimeZone() {
  return process.env.TZ || undefined;
}

/**
 * @description The offset of an AirNow timezone abbreviation.
 * @param {unknown} zone - "PDT".
 * @returns {number|null} Hours from UTC, null when unknown.
 */
function zoneOffset(zone) {
  const offset =
    ZONE_OFFSETS[
      String(zone ?? '')
        .trim()
        .toUpperCase()
    ];
  return offset === undefined ? null : offset;
}

/**
 * @description The instant an observation hour ends.
 * @param {string} date - "2026-09-09", local to the reporting area.
 * @param {string|number} hour - "18:00" or 18, the END of the hour averaged.
 * @param {string} zone - "PDT".
 * @param {number} [now] - Now (ms): guards the unverified midnight wrap.
 * @returns {number|null} The instant in ms, null when unreadable.
 * @example
 * observedAt('2026-09-09', '18:00', 'PDT'); // -> 2026-09-10T01:00:00Z
 */
function observedAt(date, hour, zone, now = Date.now()) {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? ''));
  const hours = Number.parseInt(String(hour ?? ''), 10);
  const offset = zoneOffset(zone);
  if (!day || !Number.isInteger(hours) || hours < 0 || hours > 24 || offset === null) {
    return null;
  }
  let instant =
    Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), hours) - offset * HOUR_MS;
  // "00:00" may carry the date of the day that ends or of the one that
  // starts (never observed yet): an instant in the future is the former.
  if (hours === 0 && instant > now + HOUR_MS) {
    instant -= 24 * HOUR_MS;
  }
  return instant;
}

/**
 * @description The local date of an instant in a timezone.
 * @param {number} instant - The instant (ms).
 * @param {string|number} [zone] - An IANA name, or a UTC offset in hours.
 * @returns {string} "YYYY-MM-DD".
 */
function localDate(instant, zone = defaultTimeZone()) {
  if (typeof zone === 'number') {
    return new Date(instant + zone * HOUR_MS).toISOString().slice(0, 10);
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}

/**
 * @description The number of days from one date to another.
 * @param {string} from - "2026-09-09".
 * @param {string} to - "2026-09-10".
 * @returns {number} 1.
 */
const daysBetween = (from, to) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / (24 * HOUR_MS));

/**
 * @description "18:00" in the language and timezone of the user.
 * @param {number|null} instant - The instant (ms).
 * @param {object} [options] - `{ language, timeZone }`.
 * @returns {string} The time, '' when none.
 */
function formatTime(instant, { language = 'en', timeZone = defaultTimeZone() } = {}) {
  if (!Number.isFinite(instant)) {
    return '';
  }
  return new Intl.DateTimeFormat(language, {
    timeZone,
    hour: language === 'en' ? 'numeric' : '2-digit',
    minute: '2-digit',
    hourCycle: language === 'en' ? 'h12' : 'h23',
  }).format(new Date(instant));
}

/**
 * @description "Fri 11" for a forecast date, in the language of the user.
 * @param {string} date - "2026-09-11".
 * @param {string} language - The language.
 * @returns {string} The day.
 */
function formatDay(date, language) {
  const instant = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(instant)) {
    return String(date ?? '');
  }
  // en-GB writes "Fri 11", en-US "11 Fri".
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
  }).format(new Date(instant));
}

export {
  MINUTE_MS,
  HOUR_MS,
  ZONE_OFFSETS,
  defaultTimeZone,
  zoneOffset,
  observedAt,
  localDate,
  daysBetween,
  formatTime,
  formatDay,
};
