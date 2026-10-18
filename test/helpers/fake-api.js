// A fake AirNow API for the tests, served through the `fetch` option of the
// integration. Its answers are real ones of the 2026 services, captured on
// 2026-09-09 by the authors of the R package airnow (MIT,
// github.com/briandconnelly/airnow, dev/superpowers/probes/new): ZIP code 90210
// (NW Coastal LA), the coordinates of Napa, and a point of central Nevada with
// no data. AirNow data are preliminary, from the U.S. EPA and its partner
// agencies. Tests never touch the network.

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 2026-09-09 18:40 in Los Angeles (PDT): the fixture of 90210 is the 17:00
// observation (16:00-16:59), the last one published at 17:35.
const NOW = Date.parse('2026-09-10T01:40:00Z');
const TZ = 'America/Los_Angeles';
const KEY = 'good-key';
const NAPA = { latitude: 38.3191, longitude: -122.2998 };
const NEVADA = { latitude: 39.5, longitude: -116.9 };

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const silent = { info() {}, warn() {}, error() {}, debug() {} };

/**
 * @description A temporary path for the file kept in /data.
 * @returns {string} The path.
 */
const storePath = () => join(mkdtempSync(join(tmpdir(), 'airnow-')), 'airnow.json');

/**
 * @description The fake API: answers by path, ZIP code or coordinates.
 * @returns {Function & { calls: object[], answers: object }} A `fetch`.
 */
function fakeAirNow() {
  const answers = {
    observations: {
      90210: fixture('observation_current_ziplatLong.json'),
      napa: fixture('observation_current_ziplatLong__latlong.json'),
      nevada: {
        status: 200,
        body: fixture('observation_current_ziplatLong__nevada_distance300_ignored.json'),
      },
    },
    forecast: {
      90210: fixture('forecast_current__zip.json'),
      napa: fixture('forecast_current__latlong.json'),
      nevada: { status: 200, body: fixture('forecast_current__nevada_distance300_ignored.json') },
    },
  };
  const calls = [];
  const fetch = async (url) => {
    const target = new URL(url);
    const params = Object.fromEntries(target.searchParams);
    const service = target.pathname.includes('/observation/') ? 'observations' : 'forecast';
    calls.push({ service, params });
    if (fetch.offline) {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    }
    if (params.API_KEY !== KEY) {
      return new Response(JSON.stringify({ WebServiceError: [{ Message: 'Invalid API key' }] }), {
        status: 401,
      });
    }
    let where = params.zipCode;
    if (!where) {
      const near = (point) =>
        Math.abs(Number(params.latitude) - point.latitude) < 0.01 &&
        Math.abs(Number(params.longitude) - point.longitude) < 0.01;
      where = near(NAPA) ? 'napa' : near(NEVADA) ? 'nevada' : 'unknown';
    }
    const answer = answers[service][where];
    if (!answer) {
      return new Response(
        JSON.stringify({
          WebServiceError: [
            { Message: 'Error - There is no reporting area at your searched location' },
          ],
        }),
        { status: 200 },
      );
    }
    if (answer.status) {
      return new Response(JSON.stringify(answer.body), { status: answer.status });
    }
    return new Response(JSON.stringify(clone(answer)), { status: 200 });
  };
  fetch.calls = calls;
  fetch.answers = answers;
  fetch.offline = false;
  return fetch;
}

export { NOW, TZ, KEY, NAPA, NEVADA, silent, storePath, fixture, clone, fakeAirNow };
