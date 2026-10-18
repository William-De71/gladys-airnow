// -----------------------------------------------------------------------------
// HTTP client of the AirNow API (https://www.airnowapi.org), 2026 services.
//
//   GET /aq/observation/current/ziplatlong/?zipCode=…|latitude=…&longitude=…
//   GET /aq/forecast/current/?zipCode=…|latitude=…&longitude=…
// with `format=application/json` and `API_KEY` (a free key, per user).
//
// Errors come as `{ "WebServiceError": [{ "Message": "…" }] }`: with HTTP 401
// for a bad key ("Invalid API key", "Request not authenticated."), and with
// HTTP 200 when there is simply no data near the place ("There is no
// reporting area at your searched location", "No observations were found
// for all monitors within 50 miles"). Read the body whatever the status.
//
// The key may be used by 500 requests per hour per service: the client counts
// its own requests over a sliding hour and refuses past HOURLY_BUDGET, so a
// misconfigured loop never gets the key throttled. The key travels in the
// query string (the API takes nothing else): it is never logged.
// -----------------------------------------------------------------------------

const BASE_URL = 'https://www.airnowapi.org';
const PATHS = {
  observations: '/aq/observation/current/ziplatlong/',
  forecast: '/aq/forecast/current/',
};
const TIMEOUT_MS = 15000;
const HOUR_MS = 60 * 60 * 1000;
const HOURLY_BUDGET = 200;

/**
 * @description An error of the AirNow API, with a kind the messages can tell apart.
 */
class AirNowError extends Error {
  /**
   * @param {string} kind - `auth`, `no_data`, `rate_limit`, `budget`,
   * `unreachable`, `invalid`, `failed`.
   * @param {string} message - The message.
   */
  constructor(kind, message) {
    super(message);
    this.name = 'AirNowError';
    this.kind = kind;
  }
}

/**
 * @description The kind of a WebServiceError message.
 * @param {string} message - The message of the API.
 * @param {number} status - The HTTP status.
 * @returns {string} The kind.
 */
function kindOf(message, status) {
  if (status === 401 || status === 403 || /api key|not authenticated|unauthori/i.test(message)) {
    return 'auth';
  }
  if (status === 429 || /limit|exceed|too many/i.test(message)) {
    return 'rate_limit';
  }
  if (/no reporting area|no observations|not found|no data/i.test(message)) {
    return 'no_data';
  }
  if (status >= 400 && status < 500) {
    return 'invalid';
  }
  return 'failed';
}

/**
 * @description The query of a place.
 * @param {object} where - `{ zip }` or `{ latitude, longitude }`.
 * @returns {object} The query parameters.
 */
function placeQuery(where) {
  if (where.zip) {
    return { zipCode: where.zip };
  }
  return { latitude: where.latitude.toFixed(4), longitude: where.longitude.toFixed(4) };
}

/**
 * @description The AirNow client.
 * @param {object} options - Options.
 * @param {Function} options.getApiKey - `() => string`.
 * @param {Function} [options.fetch] - The fetch implementation (tests).
 * @param {string} [options.baseUrl] - The API root.
 * @param {Function} [options.now] - `() => number`.
 * @param {number[]} [options.history] - Instants of the requests of the last hour (kept in /data).
 * @returns {object} The client.
 */
function createAirNowClient({
  getApiKey,
  fetch: fetchFn = globalThis.fetch,
  baseUrl = BASE_URL,
  now = () => Date.now(),
  history = [],
}) {
  const sent = history;

  /**
   * @description How many requests the last hour saw.
   * @returns {number} The count.
   */
  function lastHour() {
    const since = now() - HOUR_MS;
    while (sent.length && sent[0] <= since) {
      sent.shift();
    }
    return sent.length;
  }

  /**
   * @description GET a service.
   * @param {string} path - The path.
   * @param {object} query - The parameters.
   * @returns {Promise<object[]>} The rows.
   */
  async function get(path, query) {
    const key = getApiKey();
    if (!key) {
      throw new AirNowError('auth', 'No API key');
    }
    if (lastHour() >= HOURLY_BUDGET) {
      throw new AirNowError('budget', `${HOURLY_BUDGET} requests in the last hour: waiting`);
    }
    const url = new URL(path, baseUrl);
    for (const [name, value] of Object.entries({
      ...query,
      format: 'application/json',
      API_KEY: key,
    })) {
      url.searchParams.set(name, value);
    }
    sent.push(now());
    let response;
    try {
      response = await fetchFn(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new AirNowError('unreachable', String(err?.cause?.code ?? err?.message ?? err));
    }
    const body = await response.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new AirNowError(
        response.status >= 500 ? 'failed' : kindOf(body, response.status),
        `HTTP ${response.status}: ${body.slice(0, 120)}`,
      );
    }
    const error = data?.WebServiceError;
    if (error) {
      const message = String(
        Array.isArray(error) ? (error[0]?.Message ?? error[0] ?? '') : (error.Message ?? error),
      ).slice(0, 200);
      throw new AirNowError(kindOf(message, response.status), message);
    }
    if (!response.ok) {
      throw new AirNowError(kindOf('', response.status), `HTTP ${response.status}`);
    }
    if (!Array.isArray(data)) {
      throw new AirNowError('failed', 'Unexpected answer');
    }
    return data;
  }

  return {
    observations: (where) => get(PATHS.observations, placeQuery(where)),
    forecast: (where) => get(PATHS.forecast, placeQuery(where)),
    lastHour,
    get history() {
      return sent;
    },
  };
}

export { BASE_URL, PATHS, HOURLY_BUDGET, AirNowError, kindOf, placeQuery, createAirNowClient };
