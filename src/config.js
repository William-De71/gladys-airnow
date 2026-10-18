// -----------------------------------------------------------------------------
// Configuration of the AirNow integration.
//
// Fields of the config_schema:
//   - `api_key`      the AirNow API key of the user (free, a `secret`: never
//                    sent back to the UI, never logged);
//   - `house_<n>`    a house of Gladys (`source: "houses"`, its selector):
//                    its coordinates locate the place;
//   - `zip_<n>`      or a U.S. ZIP code, which wins over the house;
//   - `language`     language of the texts Gladys does not ask for in a
//                    language (device names, scene texts): `auto` follows the
//                    language of the last widget request.
// Up to three places (`<n>` from 1 to 3).
//
// Internal key, outside the config_schema (never shown in the UI):
//   - `last_language` language of the last widget request.
// -----------------------------------------------------------------------------

import { isLanguage } from './i18n.js';

const MAX_PLACES = 3;
const AUTO_LANGUAGE = 'auto';
const INTERNAL_KEYS = { language: 'last_language' };

const readString = (raw) =>
  typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : '';

/**
 * @description Read a ZIP code typed by hand.
 * @param {unknown} raw - "90210", "90210-1234", 2115 (a number loses its 0).
 * @returns {string|null} The five digits, null when it is not one.
 * @example
 * readZip('02115-4402'); // -> '02115'
 */
function readZip(raw) {
  const value = readString(raw);
  if (/^\d{3,4}$/.test(value) && typeof raw === 'number') {
    return value.padStart(5, '0');
  }
  const match = /^(\d{5})(?:-?\d{4})?$/.exec(value);
  return match ? match[1] : null;
}

/**
 * @description Normalize the raw config object from the host API.
 * @param {object} [rawConfig] - The raw config values.
 * @returns {object} `{ apiKey, places: [{ slot, zip, house, invalidZip }],
 * language }`; a slot without a ZIP code nor a house is left out.
 * @example
 * normalizeConfig({ api_key: 'k', zip_1: '90210' });
 */
function normalizeConfig(rawConfig = {}) {
  const config = rawConfig ?? {};
  const places = [];
  for (let slot = 1; slot <= MAX_PLACES; slot += 1) {
    const typed = readString(config[`zip_${slot}`]);
    const zip = typed ? readZip(config[`zip_${slot}`]) : null;
    const house = readString(config[`house_${slot}`]) || null;
    if (typed || house) {
      places.push({
        slot,
        zip,
        house: zip ? null : house,
        invalidZip: typed && !zip ? typed.slice(0, 20) : null,
      });
    }
  }
  return {
    apiKey: readString(config.api_key),
    places,
    language: isLanguage(config.language) ? config.language : AUTO_LANGUAGE,
  };
}

/**
 * @description Read the stored language of the last request.
 * @param {object} [rawConfig] - The raw config values.
 * @param {string} fallback - The language to keep when nothing valid is stored.
 * @returns {string} The language.
 */
function readLanguage(rawConfig, fallback) {
  const language = (rawConfig ?? {})[INTERNAL_KEYS.language];
  return typeof language === 'string' && /^[a-z]{2}$/.test(language) ? language : fallback;
}

export { MAX_PLACES, AUTO_LANGUAGE, INTERNAL_KEYS, readZip, normalizeConfig, readLanguage };
