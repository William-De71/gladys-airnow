// -----------------------------------------------------------------------------
// What the integration keeps across restarts, in /data/airnow.json (the only
// writable place of the container):
//   - `requests`  the instants of the requests of the last hour (the hourly
//                 budget of the key survives a restart);
//   - `places`    the last observations and forecast of each place, and when
//                 they were read: a restart reads nothing that is still fresh;
//   - `seen`      what the scene triggers already know: the current category
//                 of each place, the category of each forecast day, the
//                 action days announced. A restart never fires twice.
// -----------------------------------------------------------------------------

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_PATH = '/data/airnow.json';
const EMPTY = () => ({
  requests: [],
  places: {},
  seen: { category: {}, forecast: {}, actionDays: {} },
});

/**
 * @description The store.
 * @param {object} [options] - `{ path, logger }`.
 * @returns {object} `{ data, load, save }`.
 */
function createStore({ path = DEFAULT_PATH, logger } = {}) {
  const store = {
    data: EMPTY(),
    /**
     * @description Read the file; an absent or broken file is an empty store.
     * @returns {Promise<void>}
     */
    async load() {
      try {
        const raw = JSON.parse(await readFile(path, 'utf8'));
        const base = EMPTY();
        const value = raw && typeof raw === 'object' ? raw : {};
        const part = (name) => (value[name] && typeof value[name] === 'object' ? value[name] : {});
        store.data.requests.splice(0, store.data.requests.length);
        store.data.requests.push(
          ...(Array.isArray(value.requests) ? value.requests.filter(Number.isFinite) : []),
        );
        store.data.places = { ...part('places') };
        store.data.seen = { ...base.seen, ...part('seen') };
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger?.warn(`Unable to read ${path}: ${err.message}`);
        }
      }
    },
    /**
     * @description Write the file (atomically: a temporary file, then a rename).
     * @returns {Promise<void>}
     */
    async save() {
      try {
        await mkdir(dirname(path), { recursive: true });
        const temporary = `${path}.tmp`;
        await writeFile(temporary, JSON.stringify(store.data));
        await rename(temporary, path);
      } catch (err) {
        logger?.warn(`Unable to write ${path}: ${err.message}`);
      }
    },
  };
  return store;
}

export { DEFAULT_PATH, createStore };
