/**
 * Storage of the player data in the browser.
 *
 * The progress, the best times, the editor maps and the sound setting are small, so they stay in localStorage and can
 * be read at once. The replays can be large, so they go into IndexedDB. Some browsers block the storage, e.g. in a
 * private mode. The game then runs without stored data.
 */

import { CAMPAIGN_FOLDERS } from './constants.js';

/** @type {string} The localStorage key of the highest unlocked level of each campaign. */
const PROGRESS_KEY = 'sajs_progress';

/** @type {string} The localStorage key of the best times. */
const BEST_TIMES_KEY = 'sajs_bestTimes';

/** @type {string} The localStorage key of the sound setting. */
const SOUND_SETTING_KEY = 'sajs_sound';

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
 * Read a value from localStorage.
 *
 * @param {string} key The key.
 * @returns {string|null} The value, or null if the key does not exist or the browser blocks the storage.
 */
function readItem(key) {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/**
 * Read a JSON value from localStorage.
 *
 * @param {string} key The key.
 * @returns {*} The parsed value, or null if the key does not exist, the value is not valid or the browser blocks the
 *     storage.
 */
function readJsonItem(key) {
	try {
		return JSON.parse(readItem(key));
	} catch {
		return null;
	}
}

/**
 * Write a value into localStorage.
 *
 * @param {string} key The key.
 * @param {string} value The value.
 * @returns {boolean} True if the value is stored, false if the browser blocks the storage or the storage is full.
 */
function writeItem(key, value) {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

/**
 * Read all best times.
 *
 * @returns {Object<string, number>} The best time in ticks for each level key.
 */
function readBestTimes() {
	return readJsonItem(BEST_TIMES_KEY) ?? {};
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
 * Store a new best time and its replay. The time is only stored after the replay, so each stored time has a replay.
 *
 * @param {string} campaign The folder name of the campaign.
 * @param {number} level The level number, starting at 1.
 * @param {number} ticks The time in ticks.
 * @param {object} replayData The replay in the file format.
 * @returns {Promise<void>} Resolves when the replay is stored.
 */
export async function saveBestTime(campaign, level, ticks, replayData) {
	await replayRequest('readwrite', (store) => store.put(replayData, levelKey(campaign, level)));
	const times = readBestTimes();
	times[levelKey(campaign, level)] = ticks;
	writeItem(BEST_TIMES_KEY, JSON.stringify(times));
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
	return readJsonItem(EDITOR_MAP_PREFIX + slot);
}

/**
 * Store an editor map.
 *
 * @param {number} slot The slot number, starting at 1.
 * @param {number[]} tiles The 768 tile ids.
 * @param {number} bg The background index.
 * @returns {boolean} True if the map is stored, false if the browser blocks the storage or the storage is full.
 */
export function saveEditorMap(slot, tiles, bg) {
	return writeItem(EDITOR_MAP_PREFIX + slot, JSON.stringify({ tiles, bg }));
}

/**
 * The highest unlocked level of each campaign, by campaign index. CAMPAIGN_FINISHED marks a finished campaign.
 *
 * @type {number[]}
 */
export const maxLevel = [];

/**
 * Load the highest unlocked level of each campaign.
 *
 * @returns {void}
 */
export function loadProgress() {
	const stored = readJsonItem(PROGRESS_KEY) ?? {};
	CAMPAIGN_FOLDERS.forEach((folder, i) => {
		maxLevel[i] = Number.isInteger(stored[folder]) ? stored[folder] : 1;
	});
}

/**
 * Store a new highest unlocked level of a campaign.
 *
 * @param {number} campaign The campaign index.
 * @param {number} level The highest unlocked level.
 * @returns {void}
 */
export function saveProgress(campaign, level) {
	maxLevel[campaign] = level;
	const progress = Object.fromEntries(CAMPAIGN_FOLDERS.map((folder, i) => [folder, maxLevel[i]]));
	writeItem(PROGRESS_KEY, JSON.stringify(progress));
}

/**
 * Check if the player wants to hear the sounds.
 *
 * @returns {boolean} False if the player turned the sound off, else true.
 */
export function loadSoundSetting() {
	return readItem(SOUND_SETTING_KEY) !== 'off';
}

/**
 * Store the sound setting.
 *
 * @param {boolean} enabled True if the player wants to hear the sounds.
 * @returns {void}
 */
export function saveSoundSetting(enabled) {
	writeItem(SOUND_SETTING_KEY, enabled ? 'on' : 'off');
}
