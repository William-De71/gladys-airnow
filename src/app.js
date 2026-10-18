// -----------------------------------------------------------------------------
// The AirNow integration: every handler, registered on a Gladys client.
//
// Brings the air quality of AirNow (U.S. EPA: the United States, Canada and
// Mexico) into Gladys, for up to three places — a house of Gladys or a ZIP
// code — through the AirNow API (a free key per user):
//   - devices (device.js): one per place, with the AQI now, PM2.5, ozone,
//     PM10, the category and the forecast of today and tomorrow;
//   - scene triggers (events.js): air quality changed, forecast updated,
//     air quality action day;
//   - scene action: read the air quality of a place;
//   - dashboard widgets (widgets.js): air quality now, forecast.
//
// AirNow updates the observations once an hour (10 to 30 minutes past the
// hour) and the forecasts once or twice a day: each place is read at 35
// minutes past every hour, its forecast every 3 hours, on the integration's
// own timer, never on a Gladys poll. Readings are kept in /data, so a
// restart reads nothing that is still fresh. Transport: cloud only.
//
// index.js only creates the SDK client; the tests drive this module with the
// fake Gladys of the SDK and a fake AirNow API (test/helpers/fake-api.js).
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { logger as sdkLogger } from '@gladysassistant/integration-sdk';
import { normalizeConfig, readLanguage, INTERNAL_KEYS, AUTO_LANGUAGE } from './config.js';
import { createAirNowClient } from './airnow-api.js';
import { parseObservations, parseForecast } from './parse.js';
import { createStore, DEFAULT_PATH } from './store.js';
import { placeKey, idsOf, keyOfExternalId, buildPlaceDevice, buildPlaceStates } from './device.js';
import {
  TRIGGERS,
  AIR_QUALITY_OUTPUTS,
  dayKeyOf,
  detectCategoryChange,
  detectForecastChanges,
  detectActionDays,
  changedData,
  forecastData,
  pick,
} from './events.js';
import {
  WIDGETS,
  WIDGET_ACTIONS,
  TTL_SECONDS,
  messageContent,
  buildAirQualityWidget,
  buildForecastWidget,
} from './widgets.js';
import { defaultTimeZone, localDate, MINUTE_MS, HOUR_MS } from './time.js';
import { t, all, categoryText, pollutantText, LANGUAGES } from './i18n.js';

const ACTIONS = { READ_NOW: 'read_now', DIAGNOSTIC: 'diagnostic' };
const SCENE_ACTIONS = { GET_AIR_QUALITY: 'get_air_quality' };
// Observations are published 10 to 30 minutes past the hour.
const OBSERVATION_MINUTE = 35;
const FORECAST_EVERY_MS = 3 * HOUR_MS;
const RETRY_MS = 15 * MINUTE_MS;
const TICK_MS = 5 * MINUTE_MS;
// A widget refresh or a scene action reads again past this age.
const STALE_MS = 75 * MINUTE_MS;
const REFRESH_MIN_AGE_MS = 15 * MINUTE_MS;
const DIAGNOSTIC_CHUNK = 3000;
const { version: VERSION } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

/**
 * @description The last mark of the hourly observations (hh:35) before now.
 * @param {number} now - Now (ms).
 * @returns {number} The mark (ms).
 */
function observationMark(now) {
  const offset = OBSERVATION_MINUTE * MINUTE_MS;
  return Math.floor((now - offset) / HOUR_MS) * HOUR_MS + offset;
}

/**
 * @description Register every handler of the integration on a Gladys client.
 * @param {object} gladys - A GladysIntegration (or the fake Gladys of the SDK).
 * @param {object} [options] - Options.
 * @param {Function} [options.fetch] - HTTP transport of the AirNow API (tests).
 * @param {string} [options.baseUrl] - The API root (tests).
 * @param {string} [options.storePath] - The file kept in /data.
 * @param {Function} [options.now] - `() => number` in ms (tests).
 * @param {string} [options.timeZone] - IANA timezone of the texts (TZ by default).
 * @param {boolean} [options.timers] - Arm the reading timer (false in tests).
 * @param {object} [options.logger] - Logger.
 * @returns {object} Handles for the tests.
 */
function createApp(
  gladys,
  {
    fetch: fetchFn,
    baseUrl,
    storePath = DEFAULT_PATH,
    now = () => Date.now(),
    timeZone = defaultTimeZone(),
    timers = true,
    logger = sdkLogger,
  } = {},
) {
  let config = normalizeConfig();
  let language = 'en';
  let createdDevices = new Set();
  // The configured places, resolved: `{ slot, key, zip, house, where, label,
  // deviceId, area }`; and the errors of the places that could not be.
  let places = [];
  let placeErrors = [];
  let authError = null;
  let lastStatus = null;
  let lastDiscovery = null;
  let timer = null;
  let reading = null;
  let stopped = false;

  const store = createStore({ path: storePath, logger });
  const api = createAirNowClient({
    getApiKey: () => config.apiKey,
    now,
    history: store.data.requests,
    ...(fetchFn ? { fetch: fetchFn } : {}),
    ...(baseUrl ? { baseUrl } : {}),
  });

  /**
   * @description Remember the language of a request, and store it when it changed.
   * @param {string} next - The language.
   */
  function rememberLanguage(next) {
    if (typeof next !== 'string' || !/^[a-z]{2}$/.test(next) || next === language) {
      return;
    }
    language = next;
    gladys
      .setConfig({ [INTERNAL_KEYS.language]: next })
      .catch((err) => logger.warn(`Unable to store the language: ${err.message}`));
  }

  /**
   * @description Language of the texts Gladys does not ask for in a language.
   * @returns {string} The language.
   */
  const textLanguage = () => (config.language === AUTO_LANGUAGE ? language : config.language);

  /**
   * @description What is kept of a place.
   * @param {object} place - The place.
   * @returns {object} `{ observations, obsAt, obsTried, forecast, fcAt, fcTried, error }`.
   */
  function stateOf(place) {
    store.data.places[place.key] ??= {};
    return store.data.places[place.key];
  }

  /**
   * @description Today in the reporting area of a place.
   * @param {object} place - The place.
   * @returns {string} "YYYY-MM-DD".
   */
  function todayOf(place) {
    const offset = stateOf(place).observations?.offset;
    return Number.isFinite(offset) ? localDate(now(), offset) : localDate(now(), timeZone);
  }

  /**
   * @description The message of an error, for a user.
   * @param {Error} err - The error.
   * @param {string} lang - The language.
   * @param {object} [place] - The place concerned.
   * @returns {string} The message.
   */
  function errorText(err, lang, place) {
    const key = {
      auth: 'errAuth',
      no_data: 'errNoData',
      rate_limit: 'errRateLimit',
      budget: 'errRateLimit',
      unreachable: 'errUnreachable',
      no_key: 'errNoKey',
      invalid_zip: 'errInvalidZip',
      unknown_house: 'errUnknownHouse',
      house_no_location: 'errHouseNoLocation',
    }[err?.kind];
    return t(key ?? 'errFailed', lang, {
      place: place?.label ?? '',
      zip: err?.zip ?? '',
      slot: err?.slot ?? '',
      detail: String(err?.message ?? '').slice(0, 120),
    });
  }

  /**
   * @description Report the connection status, only when it changed.
   * @param {boolean} connected - Connected or not.
   * @param {object} message - The multi-language message.
   * @returns {Promise<void>}
   */
  async function reportStatus(connected, message) {
    const clipped = Object.fromEntries(
      Object.entries(message).map(([lang, text]) => [lang, text.slice(0, 200)]),
    );
    const signature = JSON.stringify([connected, clipped]);
    if (signature === lastStatus) {
      return;
    }
    lastStatus = signature;
    try {
      await gladys.setConnectionStatus(connected, clipped);
    } catch (err) {
      lastStatus = null;
      logger.error('Unable to report the connection status', err);
    }
  }

  /**
   * @description Work out the connection status from the last readings.
   * @returns {Promise<void>}
   */
  async function refreshStatus() {
    if (!config.apiKey) {
      await reportStatus(false, all('errNoKey'));
      return;
    }
    if (authError) {
      await reportStatus(false, all('errAuth'));
      return;
    }
    if (places.length === 0 && placeErrors.length === 0) {
      await reportStatus(true, all('statusNoPlace'));
      return;
    }
    const line = (place, lang) => {
      const observations = stateOf(place).observations;
      return observations
        ? t('placeLine', lang, {
            area: place.area || place.label,
            aqi: observations.aqi,
            category: categoryText(observations.category, lang),
          })
        : place.area || place.label;
    };
    const failing = [
      ...placeErrors.map(({ err }) => ({ err })),
      ...places
        .filter((place) => stateOf(place).error)
        .map((place) => ({ err: stateOf(place).error, place })),
    ];
    const total = places.length + placeErrors.length;
    if (failing.length > 0) {
      const ok = total - failing.length;
      await reportStatus(
        ok > 0,
        Object.fromEntries(
          LANGUAGES.map((lang) => [
            lang,
            t('statusSomeFailing', lang, {
              ok,
              total,
              detail: errorText(failing[0].err, lang, failing[0].place),
            }),
          ]),
        ),
      );
      return;
    }
    await reportStatus(
      true,
      Object.fromEntries(
        LANGUAGES.map((lang) => [
          lang,
          t('statusConnected', lang, {
            places: places.map((place) => line(place, lang)).join(', '),
          }),
        ]),
      ),
    );
  }

  /**
   * @description Refresh the list of the devices the user created.
   * @returns {Promise<void>}
   */
  async function refreshCreatedDevices() {
    try {
      const devices = await gladys.getDevices();
      createdDevices = new Set(devices.map((device) => device.external_id));
    } catch (err) {
      logger.warn(`Unable to read the devices: ${err.message}`);
    }
  }

  /**
   * @description Ask the open widgets to pull their content again.
   */
  function refreshWidgets() {
    for (const key of Object.values(WIDGETS)) {
      Promise.resolve(gladys.requestWidgetRefresh(key)).catch(() => {});
    }
  }

  /**
   * @description Publish scene events, one by one.
   * @param {Array<{ key: string, data: object }>} events - The events.
   * @returns {Promise<void>}
   */
  async function publishEvents(events) {
    for (const { key, data } of events) {
      logger.info(
        `AirNow ${data.area}: ${key} (${data.category}${data.date ? `, ${data.date}` : ''})`,
      );
      try {
        await gladys.publishSceneEvent(key, data);
      } catch (err) {
        logger.warn(`Unable to fire ${key}: ${err.message}`);
      }
    }
  }

  // --- Places ------------------------------------------------------------------------

  /**
   * @description Resolve the configured places: a ZIP code, or the location of a house.
   * @returns {Promise<void>}
   */
  async function resolvePlaces() {
    const resolved = [];
    const errors = [];
    let houses = null;
    for (const entry of config.places) {
      try {
        if (entry.invalidZip) {
          throw Object.assign(new Error('Invalid ZIP code'), {
            kind: 'invalid_zip',
            zip: entry.invalidZip,
          });
        }
        let where;
        let label;
        if (entry.zip) {
          where = { zip: entry.zip };
          label = `ZIP ${entry.zip}`;
        } else {
          houses ??= await gladys.getHouses().catch((err) => {
            logger.warn(`Unable to read the houses: ${err.message}`);
            return [];
          });
          const house = houses.find((candidate) => candidate.selector === entry.house);
          if (!house) {
            throw Object.assign(new Error('Unknown house'), {
              kind: 'unknown_house',
              slot: entry.slot,
            });
          }
          if (!Number.isFinite(house.latitude) || !Number.isFinite(house.longitude)) {
            throw Object.assign(new Error('House without location'), {
              kind: 'house_no_location',
              slot: entry.slot,
            });
          }
          where = { latitude: house.latitude, longitude: house.longitude };
          label = house.name || entry.house;
        }
        const key = placeKey(entry);
        if (resolved.some((place) => place.key === key)) {
          continue;
        }
        const place = { slot: entry.slot, key, zip: entry.zip, house: entry.house, where, label };
        place.deviceId = idsOf(gladys, key).device;
        place.area = stateOf(place).observations?.area || stateOf(place).forecast?.area || '';
        resolved.push(place);
      } catch (err) {
        logger.warn(`AirNow place ${entry.slot}: ${err.message}`);
        errors.push({ slot: entry.slot, err });
      }
    }
    places = resolved;
    placeErrors = errors;
  }

  /**
   * @description Offer a device per place on the Discovery screen, when they changed.
   * @param {boolean} [force] - Publish even when unchanged.
   * @returns {Promise<number>} How many devices were offered.
   */
  async function publishDiscoveredDevices(force = false) {
    const lang = textLanguage();
    const devices = places.map((place) => buildPlaceDevice(gladys, place, lang));
    const signature = JSON.stringify(devices);
    if (force || signature !== lastDiscovery) {
      await gladys.publishDiscoveredDevices(devices);
      lastDiscovery = signature;
    }
    return devices.length;
  }

  /**
   * @description The forecast days of today and tomorrow of a place.
   * @param {object} place - The place.
   * @returns {{ today: object|null, tomorrow: object|null }} The days.
   */
  function nextDays(place) {
    const today = todayOf(place);
    const days = stateOf(place).forecast?.days ?? [];
    return {
      today: days.find((day) => dayKeyOf(day.date, today) === 'today') ?? null,
      tomorrow: days.find((day) => dayKeyOf(day.date, today) === 'tomorrow') ?? null,
    };
  }

  /**
   * @description Publish the states of a place, when its device exists.
   * @param {object} place - The place.
   * @returns {Promise<void>}
   */
  async function publishStates(place) {
    if (!createdDevices.has(place.deviceId)) {
      return;
    }
    const states = buildPlaceStates(
      gladys,
      place.key,
      { observations: stateOf(place).observations ?? null, ...nextDays(place) },
      textLanguage(),
    );
    if (states.length) {
      await gladys
        .publishChangedStates(states)
        .catch((err) =>
          logger.warn(`Unable to publish the states of ${place.label}: ${err.message}`),
        );
    }
  }

  // --- Reading -----------------------------------------------------------------------

  /**
   * @description Whether a reading is due.
   * @param {number|undefined} at - When it was last read.
   * @param {number|undefined} tried - When it was last tried.
   * @param {boolean} expired - Whether the last reading is too old.
   * @returns {boolean} True when due.
   */
  function due(at, tried, expired) {
    if (!at || expired) {
      return !(tried && tried > (at ?? 0) && now() - tried < RETRY_MS);
    }
    return false;
  }

  /**
   * @description Read one service of a place.
   * @param {object} place - The place.
   * @param {string} kind - `observations` or `forecast`.
   * @returns {Promise<boolean>} True when the reading changed something.
   */
  async function readService(place, kind) {
    const state = stateOf(place);
    const at = kind === 'observations' ? 'obsAt' : 'fcAt';
    const tried = kind === 'observations' ? 'obsTried' : 'fcTried';
    state[tried] = now();
    try {
      const rows = await api[kind](place.where);
      const parsed = kind === 'observations' ? parseObservations(rows, now()) : parseForecast(rows);
      state[kind] = parsed;
      state[at] = now();
      state.error = null;
      authError = null;
      return true;
    } catch (err) {
      if (err.kind === 'no_data') {
        // Nothing near the place: a valid answer, read again at the next mark.
        state[kind] = null;
        state[at] = now();
        if (kind === 'observations') {
          state.error = err;
        }
        return true;
      }
      logger.warn(`AirNow ${place.label} ${kind} (${err.kind ?? 'error'}): ${err.message}`);
      if (err.kind === 'auth') {
        authError = err;
      }
      state.error = err;
      throw err;
    }
  }

  /**
   * @description What follows the readings of a place: events, states.
   * @param {object} place - The place.
   * @param {object} before - `{ category }` of the place before the readings.
   * @returns {Promise<void>}
   */
  async function digest(place) {
    const state = stateOf(place);
    const seen = store.data.seen;
    const lang = textLanguage();
    const events = [];
    const area = state.observations?.area || state.forecast?.area || '';
    if (area && area !== place.area) {
      place.area = area;
    }
    if (gladys.connected !== false) {
      const observations = state.observations;
      if (observations) {
        const change = detectCategoryChange(seen.category[place.key], observations.category);
        if (change) {
          events.push({
            key: TRIGGERS.AIR_QUALITY_CHANGED,
            data: changedData(place, observations, change, lang),
          });
        }
        seen.category[place.key] = observations.category;
      }
      if (state.forecast) {
        const today = todayOf(place);
        const updated = detectForecastChanges({
          seen: seen.forecast[place.key],
          forecast: state.forecast,
          today,
        });
        seen.forecast[place.key] = updated.next;
        events.push(
          ...updated.changes.map((day) => ({
            key: TRIGGERS.FORECAST_UPDATED,
            data: forecastData(place, day, today, lang),
          })),
        );
        const action = detectActionDays({
          fired: seen.actionDays[place.key],
          forecast: state.forecast,
          today,
        });
        seen.actionDays[place.key] = action.next;
        events.push(
          ...action.newly.map((day) => ({
            key: TRIGGERS.ACTION_DAY,
            data: forecastData(place, day, today, lang),
          })),
        );
      }
    }
    await store.save();
    await publishEvents(events);
    await publishStates(place);
  }

  /**
   * @description Read what is due for every place (one round at a time).
   * @param {object} [options] - `{ force }`: read everything now.
   * @returns {Promise<void>}
   */
  function readPlaces({ force = false } = {}) {
    if (!reading) {
      reading = (async () => {
        if (!config.apiKey || (authError && !force)) {
          await refreshStatus();
          return;
        }
        let changed = false;
        for (const place of places) {
          const state = stateOf(place);
          const tasks = [];
          if (force || due(state.obsAt, state.obsTried, state.obsAt < observationMark(now()))) {
            tasks.push('observations');
          }
          if (force || due(state.fcAt, state.fcTried, now() - state.fcAt >= FORECAST_EVERY_MS)) {
            tasks.push('forecast');
          }
          let read = false;
          for (const kind of tasks) {
            try {
              read = (await readService(place, kind)) || read;
            } catch (err) {
              if (err.kind === 'auth' || err.kind === 'budget' || err.kind === 'rate_limit') {
                break;
              }
            }
          }
          if (read) {
            await digest(place);
            changed = true;
          }
          if (authError) {
            break;
          }
        }
        if (changed) {
          await store.save();
          await publishDiscoveredDevices().catch((err) =>
            logger.warn(`Unable to offer the devices: ${err.message}`),
          );
          refreshWidgets();
        }
        await refreshStatus();
      })().finally(() => {
        reading = null;
      });
    }
    return reading;
  }

  /**
   * @description (Re)arm the reading timer.
   */
  function schedule() {
    clearInterval(timer);
    if (!timers || stopped) {
      return;
    }
    timer = setInterval(() => {
      readPlaces().catch((err) => logger.error('Readings', err));
    }, TICK_MS);
    timer.unref?.();
  }

  /**
   * @description Resolve the places, offer the devices, read what is due.
   * @returns {Promise<void>}
   */
  async function applyConfig() {
    authError = null;
    await resolvePlaces();
    logger.info(
      `${places.length} place(s): ${places.map((place) => place.label).join(', ') || 'none'}` +
        (placeErrors.length ? `; ${placeErrors.length} not resolved` : ''),
    );
    await publishDiscoveredDevices().catch((err) =>
      logger.warn(`Unable to offer the devices: ${err.message}`),
    );
    await readPlaces();
    for (const place of places) {
      await publishStates(place);
    }
    await refreshStatus();
    schedule();
  }

  /**
   * @description The place a widget or a scene action targets.
   * @param {unknown} externalId - The `source: "devices"` value.
   * @returns {object|null} The place, the first one by default.
   */
  function target(externalId) {
    const key = keyOfExternalId(externalId);
    return places.find((place) => place.key === key) ?? places[0] ?? null;
  }

  /**
   * @description Make sure a place has fresh enough readings.
   * @param {object} place - The place.
   * @returns {Promise<void>}
   */
  async function ensureFresh(place) {
    const state = stateOf(place);
    if (!state.obsAt || now() - state.obsAt > STALE_MS || !state.fcAt) {
      await readPlaces();
    }
  }

  // --- Dashboard widgets -------------------------------------------------------------

  /**
   * @description The common start of a widget: configured, a place.
   * @param {object} settings - The widget settings.
   * @param {string} lang - The language.
   * @returns {Promise<{ place?: object, content?: object }>} The place, or the content to show.
   */
  async function widgetPlace(settings, lang) {
    if (!config.apiKey) {
      return { content: messageContent(t('errNoKey', lang)) };
    }
    if (authError) {
      return { content: messageContent(t('errAuth', lang)) };
    }
    const place = target(settings.place);
    if (!place) {
      return { content: messageContent(t('noPlaceWidget', lang)) };
    }
    await ensureFresh(place).catch(() => {});
    const error = stateOf(place).error;
    if (error && !stateOf(place).observations && !stateOf(place).forecast) {
      return {
        content: messageContent(errorText(error, lang, place), {
          ttl: TTL_SECONDS.message,
          refresh: true,
        }),
      };
    }
    return { place };
  }

  gladys.onWidgetGet(WIDGETS.AIR_QUALITY, async ({ settings = {}, language: lang }) => {
    rememberLanguage(lang);
    const { place, content } = await widgetPlace(settings, lang);
    if (content) {
      return content;
    }
    return buildAirQualityWidget({
      place,
      observations: stateOf(place).observations ?? null,
      language: lang,
      timeZone,
    });
  });

  gladys.onWidgetGet(WIDGETS.FORECAST, async ({ settings = {}, language: lang }) => {
    rememberLanguage(lang);
    const { place, content } = await widgetPlace(settings, lang);
    if (content) {
      return content;
    }
    return buildForecastWidget({
      place,
      forecast: stateOf(place).forecast ?? null,
      today: todayOf(place),
      language: lang,
    });
  });

  /**
   * @description The Refresh button of both widgets: read again when the
   * last observation is not recent (AirNow updates hourly).
   * @param {string} actionKey - The action.
   * @param {object} settings - The widget settings.
   * @returns {Promise<object>} The toast.
   */
  async function refreshAction(actionKey, settings) {
    if (actionKey !== WIDGET_ACTIONS.REFRESH) {
      throw new Error(`Unknown action ${actionKey}`);
    }
    const place = target(settings?.place);
    if (!place) {
      return all('noPlaceWidget');
    }
    const state = stateOf(place);
    if (state.obsAt && !state.error && now() - state.obsAt < REFRESH_MIN_AGE_MS) {
      return all('refreshCached');
    }
    state.obsAt = 0;
    state.obsTried = 0;
    await readPlaces();
    if (stateOf(place).error) {
      return Object.fromEntries(
        LANGUAGES.map((lang) => [lang, errorText(stateOf(place).error, lang, place).slice(0, 200)]),
      );
    }
    return all('refreshDone', { aqi: stateOf(place).observations?.aqi ?? '–' });
  }

  gladys.onWidgetAction(WIDGETS.AIR_QUALITY, async (actionKey, params, { settings } = {}) =>
    refreshAction(actionKey, settings),
  );
  gladys.onWidgetAction(WIDGETS.FORECAST, async (actionKey, params, { settings } = {}) =>
    refreshAction(actionKey, settings),
  );

  // --- Scene action ------------------------------------------------------------------
  gladys.onSceneAction(SCENE_ACTIONS.GET_AIR_QUALITY, async (fields = {}) => {
    if (!config.apiKey) {
      throw new Error('The AirNow API key is not configured');
    }
    const place = target(fields.place);
    if (!place) {
      throw new Error('No AirNow place is configured');
    }
    await ensureFresh(place);
    const state = stateOf(place);
    if (!state.observations && state.error && state.error.kind !== 'no_data') {
      throw new Error(`AirNow could not be read: ${state.error.message}`);
    }
    const lang = textLanguage();
    const { today, tomorrow } = nextDays(place);
    const observations = state.observations;
    const area = place.area || place.label;
    const summary = [
      observations
        ? t('summaryNow', lang, {
            area,
            category: categoryText(observations.category, lang),
            aqi: observations.aqi,
            pollutant: pollutantText(observations.pollutant, lang),
          })
        : t('summaryNoNow', lang, { area }),
      tomorrow
        ? t('summaryTomorrow', lang, {
            category: categoryText(tomorrow.category, lang),
            pollutant: pollutantText(tomorrow.pollutant, lang),
          })
        : '',
    ]
      .filter(Boolean)
      .join(' ');
    return pick(
      {
        aqi: observations?.aqi,
        category: observations?.category,
        category_name: categoryText(observations?.category ?? null, lang),
        pollutant_name: pollutantText(observations?.pollutant ?? null, lang),
        area,
        forecast_today_aqi: today?.aqi,
        forecast_tomorrow_aqi: tomorrow?.aqi,
        forecast_tomorrow_category: tomorrow?.category,
        action_day: Boolean(today?.actionDay || tomorrow?.actionDay),
        summary,
      },
      AIR_QUALITY_OUTPUTS,
    );
  });

  // --- Configuration screen actions --------------------------------------------------
  gladys.onAction(ACTIONS.READ_NOW, async () => {
    if (!config.apiKey) {
      return all('errNoKey');
    }
    await resolvePlaces();
    await publishDiscoveredDevices().catch(() => {});
    await readPlaces({ force: true });
    if (authError) {
      return all('errAuth');
    }
    if (places.length === 0 && placeErrors.length === 0) {
      return all('statusNoPlace');
    }
    return Object.fromEntries(
      LANGUAGES.map((lang) => {
        const lines = [
          ...places.map((place) => {
            const state = stateOf(place);
            if (state.observations) {
              return t('placeLine', lang, {
                area: place.area || place.label,
                aqi: state.observations.aqi,
                category: categoryText(state.observations.category, lang),
              });
            }
            return state.error
              ? errorText(state.error, lang, place)
              : t('summaryNoNow', lang, { area: place.label });
          }),
          ...placeErrors.map(({ err }) => errorText(err, lang)),
        ];
        return [lang, t('readDone', lang, { places: lines.join(' · ') }).slice(0, 1000)];
      }),
    );
  });

  gladys.onAction(ACTIONS.DIAGNOSTIC, async () => {
    const report = {
      version: VERSION,
      timeZone: timeZone ?? null,
      apiKey: config.apiKey ? 'set' : 'missing',
      language: config.language,
      requestsLastHour: api.lastHour(),
      authError: authError?.message ?? null,
      places: places.map((place) => {
        const state = stateOf(place);
        return {
          slot: place.slot,
          key: place.key,
          where: place.zip ? { zip: place.zip } : { house: place.house, located: true },
          area: place.area,
          created: createdDevices.has(place.deviceId),
          observedAt: state.observations?.observedAt
            ? new Date(state.observations.observedAt).toISOString()
            : null,
          aqi: state.observations?.aqi ?? null,
          pollutants: state.observations ? Object.keys(state.observations.pollutants) : null,
          obsAt: state.obsAt ? new Date(state.obsAt).toISOString() : null,
          forecastDays:
            state.forecast?.days.map(
              (day) => `${day.date}:${day.category}${day.actionDay ? '!' : ''}`,
            ) ?? null,
          fcAt: state.fcAt ? new Date(state.fcAt).toISOString() : null,
          error: state.error ? `${state.error.kind}: ${state.error.message}` : null,
        };
      }),
      placeErrors: placeErrors.map(({ slot, err }) => `${slot}: ${err.kind}`),
    };
    const json = JSON.stringify(report);
    const count = Math.max(1, Math.ceil(json.length / DIAGNOSTIC_CHUNK));
    for (let chunk = 0; chunk < count; chunk += 1) {
      logger.info(
        `AirNow diagnostic ${chunk + 1}/${count}: ${json.slice(chunk * DIAGNOSTIC_CHUNK, (chunk + 1) * DIAGNOSTIC_CHUNK)}`,
      );
    }
    return all('diagnosticDone', { count });
  });

  // --- Devices -----------------------------------------------------------------------
  gladys.onScanRequest(async () => {
    await resolvePlaces();
    const count = await publishDiscoveredDevices(true);
    logger.info(`Scan: ${count} device(s) offered`);
  });

  gladys.onDeviceCreated(async () => {
    await refreshCreatedDevices();
    // States sent before the device existed were dropped by Gladys, and the SDK
    // forgot what it sent for this device: send everything known again.
    for (const place of places) {
      await publishStates(place);
    }
    refreshWidgets();
  });

  gladys.onDeviceDeleted(refreshCreatedDevices);

  // --- Configuration -----------------------------------------------------------------

  /**
   * @description Reload the whole config (internal keys included).
   * @param {object} [fallback] - Raw values to use when the read fails.
   * @returns {Promise<void>}
   */
  async function loadConfig(fallback) {
    try {
      const raw = await gladys.getConfig();
      config = normalizeConfig(raw);
      language = readLanguage(raw, language);
    } catch (err) {
      if (fallback) {
        config = normalizeConfig(fallback);
      }
      logger.error('Unable to read the configuration', err);
    }
  }

  gladys.onConfigUpdated(async (rawConfig) => {
    const previousKey = config.apiKey;
    await loadConfig(rawConfig);
    logger.info('Configuration updated');
    lastStatus = null;
    lastDiscovery = null;
    if (config.apiKey !== previousKey) {
      // A new key: what failed with the old one is tried again at once.
      for (const state of Object.values(store.data.places)) {
        state.obsTried = 0;
        state.fcTried = 0;
      }
    }
    await applyConfig();
  });

  // --- Connection lifecycle ----------------------------------------------------------
  // Each (re)connection resynchronizes; the promise lets the tests wait for it.
  let startup = Promise.resolve();
  gladys.on('connected', () => {
    startup = (async () => {
      await loadConfig();
      await store.load();
      await refreshCreatedDevices();
      lastStatus = null;
      lastDiscovery = null;
      await applyConfig();
    })().catch((err) => logger.error('Startup', err));
  });

  // --- Graceful shutdown -------------------------------------------------------------
  gladys.handleShutdown(async (signal) => {
    logger.info(`Received ${signal} -> graceful shutdown`);
    stopped = true;
    clearInterval(timer);
    await store.save();
  });

  return {
    store,
    api,
    readPlaces,
    applyConfig,
    getPlaces: () => places,
    getPlaceErrors: () => placeErrors,
    whenReady: () => startup,
  };
}

export {
  createApp,
  ACTIONS,
  SCENE_ACTIONS,
  OBSERVATION_MINUTE,
  FORECAST_EVERY_MS,
  RETRY_MS,
  observationMark,
};
