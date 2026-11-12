/**
 * Storage of the player data in the browser.
 *
 * The progress, the best times, the editor maps and the sound and music settings are small, so they stay in localStorage and can
 * be read at once. The replays can be large, so they go into IndexedDB. Some browsers block the storage, e.g. in a
 * private mode. The game then runs without stored data.
 *
 * The progress, the best times and the editor maps are Value instances, so that the page can show their changes. The
 * page shows the sound and music settings through the stage, so these settings are only read and written.
 */

import { CAMPAIGN_FOLDERS, CampaignId } from '../stage/constants.js';
import { Value } from '../value.js';

/** @type {string} The localStorage key of the highest unlocked level of each campaign. */
const PROGRESS_KEY = 'stillalive_progress';

/** @type {string} The localStorage key of the best times. */
const BEST_TIMES_KEY = 'stillalive_bestTimes';

/** @type {string} The localStorage key of the sound setting. */
const SOUND_SETTING_KEY = 'stillalive_sound';

/** @type {string} The localStorage key of the music setting. */
const MUSIC_SETTING_KEY = 'stillalive_music';

/** @type {string} The prefix of the localStorage keys of the editor maps. The slot number follows the prefix. */
const EDITOR_MAP_PREFIX = 'stillalive_editorMap';

/** @type {string} The name of the IndexedDB database. */
const DB_NAME = 'stillalive';

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
 * Read the highest unlocked level of each campaign.
 *
 * @returns {number[]} The highest unlocked level of each campaign, by campaign index.
 */
function readProgress() {
	const stored = readJsonItem(PROGRESS_KEY) ?? {};
	return CAMPAIGN_FOLDERS.map((folder) => (Number.isInteger(stored[folder]) ? stored[folder] : 1));
}

/**
 * The best times, an object with the best time in ticks for each level key, e.g. "normal-7". Each change sets a new
 * object.
 *
 * @type {Value}
 */
export const bestTimes = new Value(readBestTimes());

/**
 * The highest unlocked level of each campaign, by campaign index. After the last level, it is the number of levels
 * plus one.
 *
 * @type {Value[]}
 */
export const maxLevel = readProgress().map((level) => new Value(level));

/** @type {Map<number, Value>} The editor map of each slot that the page has read, by slot number. */
const editorMaps = new Map();

// a different browser tab changed the storage
window.addEventListener('storage', () => {
	bestTimes.set(readBestTimes());
	readProgress().forEach((level, i) => maxLevel[i].set(level));
	for (const [slot, map] of editorMaps) map.set(readJsonItem(EDITOR_MAP_PREFIX + slot));
});

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
 * @returns {Promise<*>} The result of the request. Resolves when the transaction is complete.
 */
async function replayRequest(mode, action) {
	const db = await openDatabase();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(REPLAY_STORE, mode);
		const request = action(tx.objectStore(REPLAY_STORE));
		tx.oncomplete = () => resolve(request.result);
		tx.onabort = () => reject(tx.error ?? request.error);
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
	return bestTimes.get()[levelKey(campaign, level)] ?? null;
}

/**
 * Get the sum of all best times of a campaign.
 *
 * @param {string} campaign The folder name of the campaign.
 * @returns {{ticks: number, levels: number}} The sum of the best times in ticks and the number of finished levels.
 */
export function getCampaignTotal(campaign) {
	const total = { ticks: 0, levels: 0 };
	for (const [key, ticks] of Object.entries(bestTimes.get())) {
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
	const times = { ...bestTimes.get(), [levelKey(campaign, level)]: ticks };
	writeItem(BEST_TIMES_KEY, JSON.stringify(times));
	bestTimes.set(times);
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
 * Get the editor map of a slot.
 *
 * @param {number} slot The slot number, starting at 1.
 * @returns {Value} The editor map in the map file format without the format, or null if the slot is empty.
 */
export function editorMap(slot) {
	if (!editorMaps.has(slot)) editorMaps.set(slot, new Value(readJsonItem(EDITOR_MAP_PREFIX + slot)));
	return editorMaps.get(slot);
}

/**
 * Store an editor map, and delete the best time and the replay of the slot in the custom campaign.
 *
 * @param {number} slot The slot number, starting at 1.
 * @param {object} map The editor map in the map file format without the format.
 * @returns {boolean} True if the map is stored, false if the browser blocks the storage or the storage is full.
 */
export function saveEditorMap(slot, map) {
	if (!writeItem(EDITOR_MAP_PREFIX + slot, JSON.stringify(map))) return false;
	deleteBestTime(CAMPAIGN_FOLDERS[CampaignId.CUSTOM], slot);
	editorMap(slot).set(map);
	return true;
}

/**
 * Delete the best time and the replay of a level. The time goes first, so each stored time keeps its replay.
 *
 * @param {string} campaign The folder name of the campaign.
 * @param {number} level The level number, starting at 1.
 * @returns {void}
 */
function deleteBestTime(campaign, level) {
	const key = levelKey(campaign, level);
	const times = { ...bestTimes.get() };
	delete times[key];
	writeItem(BEST_TIMES_KEY, JSON.stringify(times));
	bestTimes.set(times);
	replayRequest('readwrite', (store) => store.delete(key)).catch((e) => console.error(e));
}

/**
 * Store a new highest unlocked level of a campaign.
 *
 * @param {number} campaign The campaign index.
 * @param {number} level The highest unlocked level.
 * @returns {void}
 */
export function saveProgress(campaign, level) {
	maxLevel[campaign].set(level);
	const progress = Object.fromEntries(CAMPAIGN_FOLDERS.map((folder, i) => [folder, maxLevel[i].get()]));
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

/**
 * Check if the player wants to hear the music.
 *
 * @returns {boolean} False if the player turned the music off, else true.
 */
export function loadMusicSetting() {
	return readItem(MUSIC_SETTING_KEY) !== 'off';
}

/**
 * Store the music setting.
 *
 * @param {boolean} enabled True if the player wants to hear the music.
 * @returns {void}
 */
export function saveMusicSetting(enabled) {
	writeItem(MUSIC_SETTING_KEY, enabled ? 'on' : 'off');
}
