/**
 * Storage of the player data in the browser.
 *
 * The best times and the editor maps are small, so they stay in localStorage and can be read at once. The replays can
 * be large, so they go into IndexedDB.
 */

/** @type {string} The localStorage key of the best times. */
const BEST_TIMES_KEY = 'sajs_bestTimes';

/** @type {string} The prefix of the localStorage keys of the editor maps. The slot number follows the prefix. */
const EDITOR_MAP_PREFIX = 'sajs_editorMap';

/** @type {string} The name of the IndexedDB database. */
const DB_NAME = 'stillalivejs';

/** @type {string} The name of the IndexedDB object store for the replays. */
const REPLAY_STORE = 'replays';

/** @type {Promise<IDBDatabase>|null} The open database, created on first use. */
let database = null;

/**
 * Get the storage key of a level.
 *
 * @param {string} campaign The folder name of the campaign, e.g. "normal".
 * @param {number} level The level number, starting at 1.
 * @returns {string} The key, e.g. "normal-7".
 */
function levelKey(campaign, level) {
	return `${campaign}-${level}`;
}

/**
 * Read all best times.
 *
 * @returns {Object<string, number>} The best time in ticks for each level key.
 */
function readBestTimes() {
	try {
		return JSON.parse(localStorage.getItem(BEST_TIMES_KEY)) ?? {};
	} catch {
		return {};
	}
}

/**
 * Open the database and create the object store if necessary.
 *
 * @returns {Promise<IDBDatabase>} The open database.
 */
function openDatabase() {
	database ??= new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(REPLAY_STORE);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	return database;
}

/**
 * Run a request on the replay store.
 *
 * @param {IDBTransactionMode} mode The transaction mode.
 * @param {function(IDBObjectStore): IDBRequest} action Creates the request.
 * @returns {Promise<*>} The result of the request.
 */
async function replayRequest(mode, action) {
	const db = await openDatabase();
	return new Promise((resolve, reject) => {
		const request = action(db.transaction(REPLAY_STORE, mode).objectStore(REPLAY_STORE));
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Get the best time of a level.
 *
 * @param {string} campaign The folder name of the campaign.
 * @param {number} level The level number, starting at 1.
 * @returns {number|null} The best time in ticks, or null if the player has not finished the level.
 */
export function getBestTime(campaign, level) {
	return readBestTimes()[levelKey(campaign, level)] ?? null;
}

/**
 * Get the sum of all best times of a campaign.
 *
 * @param {string} campaign The folder name of the campaign.
 * @returns {{ticks: number, levels: number}} The sum of the best times in ticks and the number of finished levels.
 */
export function getCampaignTotal(campaign) {
	const total = { ticks: 0, levels: 0 };
	for (const [key, ticks] of Object.entries(readBestTimes())) {
		if (key.startsWith(`${campaign}-`)) {
			total.ticks += ticks;
			total.levels++;
		}
	}
	return total;
}

/**
 * Store a new best time and its replay.
 *
 * @param {string} campaign The folder name of the campaign.
 * @param {number} level The level number, starting at 1.
 * @param {number} ticks The time in ticks.
 * @param {object} replayData The replay in the file format.
 * @returns {Promise<void>} Resolves when the replay is stored.
 */
export async function saveBestTime(campaign, level, ticks, replayData) {
	const times = readBestTimes();
	times[levelKey(campaign, level)] = ticks;
	localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(times));
	await replayRequest('readwrite', (store) => store.put(replayData, levelKey(campaign, level)));
}

/**
 * Get the replay of the best time of a level.
 *
 * @param {string} campaign The folder name of the campaign.
 * @param {number} level The level number, starting at 1.
 * @returns {Promise<object|undefined>} The replay in the file format, or undefined if there is none.
 */
export function loadBestReplay(campaign, level) {
	return replayRequest('readonly', (store) => store.get(levelKey(campaign, level)));
}

/**
 * Get an editor map.
 *
 * @param {number} slot The slot number, starting at 1.
 * @returns {{tiles: number[], bg: number}|null} The tile ids and the background index, or null if the slot is empty.
 */
export function getEditorMap(slot) {
	try {
		return JSON.parse(localStorage.getItem(EDITOR_MAP_PREFIX + slot));
	} catch {
		return null;
	}
}

/**
 * Store an editor map.
 *
 * @param {number} slot The slot number, starting at 1.
 * @param {number[]} tiles The 768 tile ids.
 * @param {number} bg The background index.
 * @returns {void}
 */
export function saveEditorMap(slot, tiles, bg) {
	localStorage.setItem(EDITOR_MAP_PREFIX + slot, JSON.stringify({ tiles, bg }));
}

Object.assign(window, { getBestTime, getCampaignTotal, saveBestTime, loadBestReplay, getEditorMap, saveEditorMap });
