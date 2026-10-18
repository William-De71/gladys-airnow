// The answers of the 2026 services, read (real answers, test/fixtures).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseObservations, parseForecast, aqiValue } from '../src/parse.js';
import { fixture } from './helpers/fake-api.js';

test('observations: one row per pollutant, the highest is the AQI, the hour is its end', () => {
  const parsed = parseObservations(
    fixture('observation_current_ziplatLong.json'),
    Date.parse('2026-09-10T02:00:00Z'),
  );
  assert.equal(parsed.area, 'NW Coastal LA');
  assert.equal(parsed.agency, 'South Coast AQMD');
  assert.equal(new Date(parsed.observedAt).toISOString(), '2026-09-10T00:00:00.000Z', '17:00 PDT');
  assert.equal(parsed.offset, -7);
  assert.deepEqual([parsed.aqi, parsed.category, parsed.pollutant], [34, 'good', 'ozone']);
  assert.deepEqual(parsed.pollutants.pm25, { aqi: 11, category: 'good', site: 'North Holywood' });
  assert.deepEqual(Object.keys(parsed.pollutants), ['pm25', 'ozone', 'pm10']);
});

test('observations: no usable row, a smoke reading above 500', () => {
  assert.equal(parseObservations([]), null);
  assert.equal(parseObservations([{ parameterName: 'PM2.5', nowcastAQI: -1 }]), null);
  const smoke = parseObservations([
    {
      parameterName: 'PM2.5',
      nowcastAQI: 874,
      aqiCategoryName: 'Hazardous',
      dateObserved: '2020-09-13',
      hourObserved: '12:00',
      localTimeZone: 'PDT',
    },
  ]);
  assert.deepEqual([smoke.aqi, smoke.category], [874, 'hazardous']);
});

test('forecast: days in order, worst pollutant, category-only days', () => {
  const zip = parseForecast(fixture('forecast_current__zip.json'));
  assert.deepEqual(
    [zip.area, zip.areaCode, zip.state, zip.agency, zip.issued],
    ['NW Coastal LA', 'ca132', 'CA', 'South Coast AQMD', '2026-09-09'],
  );
  assert.deepEqual(
    zip.days.map((day) => [day.date, day.aqi, day.category, day.pollutant]),
    [
      ['2026-09-09', 53, 'moderate', 'pm25'],
      ['2026-09-10', 53, 'moderate', 'pm25'],
    ],
  );
  assert.deepEqual(Object.keys(zip.days[0].pollutants), ['pm25', 'pm10', 'ozone', 'co', 'no2']);
  const napa = parseForecast(fixture('forecast_current__latlong.json'));
  assert.equal(napa.days.length, 6);
  assert.deepEqual(
    [napa.days[2].aqi, napa.days[2].category],
    [null, 'good'],
    'AQI -1: a category only',
  );
});

test('AQI values', () => {
  assert.equal(aqiValue(-1), null);
  assert.equal(aqiValue('42'), 42);
  assert.equal(aqiValue(null), null);
});
