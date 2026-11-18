/**
 * Storage of the player data in the browser.
 *
 * The replays can be large, so they go into IndexedDB. All other data goes into localStorage. Some browsers block the
 * storage, e.g. in a private mode. The game then runs without stored data.
 */

import { CAMPAIGN_FOLDERS, CampaignId } from '../stage/constants.js';
import { Value } from '../value.js';

/** @typedef {import('../stage/map/mapFile.js').MapFile} MapFile */

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
 * @param {string} campaign The campaign id, e.g. "normal".
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
		// JSON.parse() of the text null gives null, as for a missing key
		return JSON.parse(readItem(key) ?? 'null');
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
 * @returns {Object<string, number>} The highest unlocked level of each campaign, by campaign id.
 */
function readProgress() {
	const stored = readJsonItem(PROGRESS_KEY) ?? {};
	return Object.fromEntries(CAMPAIGN_FOLDERS.map((id) => [id, Number.isInteger(stored[id]) ? stored[id] : 1]));
}

/**
 * The best times, an object with the best time in ticks for each level key, e.g. "normal-7". Each change sets a new
 * object.
 *
 * @type {Value<Object<string, number>>}
 */
export const bestTimes = new Value(readBestTimes());

/**
 * The highest unlocked level of each campaign, by campaign id. After the last level, it is the number of levels plus
 * one.
 *
 * @type {Readonly<Object<string, Value<number>>>}
 */
export const maxLevel = Object.freeze(
	Object.fromEntries(Object.entries(readProgress()).map(([id, level]) => [id, new Value(level)])),
);

/** @type {Map<number, Value<MapFile|null>>} The editor map of each slot that the page has read, by slot number. */
const editorMaps = new Map();

// a different browser tab changed the storage
window.addEventListener('storage', () => {
	bestTimes.set(readBestTimes());
	for (const [id, level] of Object.entries(readProgress())) maxLevel[id].set(level);
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
 * @param {(store: IDBObjectStore) => IDBRequest} action Creates the request.
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
 * @param {string} campaign The campaign id.
 * @param {number} level The level number, starting at 1.
 * @returns {number|null} The best time in ticks, or null if the player has not finished the level.
 */
export function getBestTime(campaign, level) {
	return bestTimes.get()[levelKey(campaign, level)] ?? null;
}

/**
 * Store a new best time and its replay. The time is only stored after the replay, so each stored time has a replay.
 *
 * @param {string} campaign The campaign id.
 * @param {number} level The level number, starting at 1.
 * @param {number} ticks The time in ticks.
 * @param {import('../stage/sessions/replay.js').ReplayFile} replayData The replay in the file format.
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
 * @param {string} campaign The campaign id.
 * @param {number} level The level number, starting at 1.
 * @returns {Promise<import('../stage/sessions/replay.js').ReplayFile|undefined>} The replay in the file format, or undefined if
 *     there is none.
 */
export function loadBestReplay(campaign, level) {
	return replayRequest('readonly', (store) => store.get(levelKey(campaign, level)));
}

/**
 * Get the editor map of a slot.
 *
 * @param {number} slot The slot number, starting at 1.
 * @returns {Value<MapFile|null>} The value with the editor map in the map file format without the format, or with
 *     null if the slot is empty.
 */
export function editorMap(slot) {
	let map = editorMaps.get(slot);
	if (!map) {
		map = new Value(readJsonItem(EDITOR_MAP_PREFIX + slot));
		editorMaps.set(slot, map);
	}
	return map;
}

/**
 * Store an editor map, and delete the best time and the replay of the slot in the custom campaign.
 *
 * @param {number} slot The slot number, starting at 1.
 * @param {MapFile} map The editor map in the map file format without the format.
 * @returns {boolean} True if the map is stored, false if the browser blocks the storage or the storage is full.
 */
export function saveEditorMap(slot, map) {
	if (!writeItem(EDITOR_MAP_PREFIX + slot, JSON.stringify(map))) return false;
	deleteBestTime(CampaignId.CUSTOM, slot);
	editorMap(slot).set(map);
	return true;
}

/**
 * Delete the best time and the replay of a level. The time goes first, so each stored time keeps its replay.
 *
 * @param {string} campaign The campaign id.
 * @param {number} level The level number, starting at 1.
 * @returns {void}
 */
function deleteBestTime(campaign, level) {
	const key = levelKey(campaign, level);
	const times = { ...bestTimes.get() };
	delete times[key];
	writeItem(BEST_TIMES_KEY, JSON.stringify(times));
	bestTimes.set(times);
	replayRequest('readwrite', (store) => store.delete(key)).catch((error) => console.error(error));
}

/**
 * Store a new highest unlocked level of a campaign.
 *
 * @param {string} campaign The campaign id.
 * @param {number} level The highest unlocked level.
 * @returns {void}
 */
export function saveProgress(campaign, level) {
	maxLevel[campaign].set(level);
	const progress = Object.fromEntries(CAMPAIGN_FOLDERS.map((id) => [id, maxLevel[id].get()]));
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
