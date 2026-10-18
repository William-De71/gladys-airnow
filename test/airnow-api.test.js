import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createAirNowClient, kindOf, HOURLY_BUDGET } from '../src/airnow-api.js';
import { fixture } from './helpers/fake-api.js';

const respond =
  (body, status = 200) =>
  async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

test('the errors of the real service are told apart, whatever the status', () => {
  assert.equal(kindOf('Invalid API key', 401), 'auth');
  assert.equal(kindOf('Request not authenticated.', 401), 'auth');
  assert.equal(
    kindOf(
      fixture('forecast_current__nevada_distance300_ignored.json').WebServiceError[0].Message,
      200,
    ),
    'no_data',
  );
  assert.equal(
    kindOf(
      fixture('observation_current_ziplatLong__nevada_distance300_ignored.json').WebServiceError[0]
        .Message,
      200,
    ),
    'no_data',
  );
  assert.equal(kindOf('', 429), 'rate_limit');
  assert.equal(kindOf('', 500), 'failed');
});

test('a no-data answer is an error even with HTTP 200; rows otherwise', async () => {
  const empty = createAirNowClient({
    getApiKey: () => 'k',
    fetch: respond(fixture('forecast_current__nevada_distance300_ignored.json')),
  });
  await assert.rejects(empty.forecast({ zip: '89001' }), { kind: 'no_data' });
  const ok = createAirNowClient({
    getApiKey: () => 'k',
    fetch: respond(fixture('observation_current_ziplatLong.json')),
  });
  assert.equal((await ok.observations({ zip: '90210' })).length, 3);
  const html = createAirNowClient({
    getApiKey: () => 'k',
    fetch: respond('<html>down</html>', 503),
  });
  await assert.rejects(html.observations({ zip: '90210' }), { kind: 'failed' });
});

test('the query: ZIP code or rounded coordinates, JSON, the key', async () => {
  const urls = [];
  const client = createAirNowClient({
    getApiKey: () => 'secret-key',
    fetch: async (url) => {
      urls.push(String(url));
      return new Response('[]');
    },
  });
  await client.observations({ zip: '90210' });
  await client.forecast({ latitude: 38.319123, longitude: -122.29984 });
  assert.deepEqual(urls, [
    'https://www.airnowapi.org/aq/observation/current/ziplatlong/?zipCode=90210&format=application%2Fjson&API_KEY=secret-key',
    'https://www.airnowapi.org/aq/forecast/current/?latitude=38.3191&longitude=-122.2998&format=application%2Fjson&API_KEY=secret-key',
  ]);
  await assert.rejects(createAirNowClient({ getApiKey: () => '' }).forecast({ zip: '1' }), {
    kind: 'auth',
  });
});

test('the hourly budget of the key holds, over a sliding hour', async () => {
  let clock = 0;
  const history = [];
  const client = createAirNowClient({
    getApiKey: () => 'k',
    fetch: async () => new Response('[]'),
    now: () => clock,
    history,
  });
  for (let i = 0; i < HOURLY_BUDGET; i += 1) {
    await client.observations({ zip: '90210' });
  }
  await assert.rejects(client.observations({ zip: '90210' }), { kind: 'budget' });
  clock += 60 * 60 * 1000 + 1;
  await client.observations({ zip: '90210' });
  assert.equal(client.lastHour(), 1);
  assert.equal(history.length, 1, 'the history kept in /data is the same array');
});
