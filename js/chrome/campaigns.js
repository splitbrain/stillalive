/**
 * Loading of the campaigns and their level files.
 */

import { CAMPAIGN_FOLDERS, CampaignId } from '../stage/constants.js';
import { parseMap } from '../stage/mapFile.js';
import { Value } from '../value.js';
import { maxLevel } from './storage.js';

/** @type {Campaign[]} The loaded campaigns, by campaign id. */
export let campaigns;
/** @type {number} The number of loaded campaign and level files. */
let levelsLoaded = 0;
/** @type {number} The number of campaign and level files to load. The campaign files add their level files. */
let levelsToLoad = CAMPAIGN_FOLDERS.length;
/** @type {string[]} The URLs of the campaign and level files that could not be loaded. */
const missingLevelFiles = [];
/**
 * The loading progress of the campaign and level files from 0 to 1, and the URLs of the files that could not be
 * loaded, as {progress: number, missing: string[]}. Each change sets a new object.
 *
 * @type {Value}
 */
export const campaignsLoading = new Value({ progress: 0, missing: [] });
/** @type {Value} True when all campaign and level files are loaded. */
export const campaignsReady = new Value(false);

/**
 * A campaign with its levels.
 */
export class Campaign {
	/**
	 * @param {number} id The campaign id, the index in the campaigns list.
	 * @param {string} folder The folder name of the campaign below maps/.
	 */
	constructor(id, folder) {
		/** @type {number} The campaign id, the index in the campaigns list. */
		this.id = id;
		/** @type {string} The folder name of the campaign below maps/. */
		this.folder = folder;
		/** @type {string} The name of the campaign in the main menu. */
		this.title = folder;
		/** @type {number} The position of the campaign in the main menu, low numbers first. */
		this.sort = 0;
		/** @type {string} The folder of the campaign that the main menu shows this campaign under, or empty for none. */
		this.parent = '';
		/** @type {import('../stage/level.js').Level[]} The levels of the campaign. */
		this.levels = [];
	}

	/**
	 * Get the number of levels that the player has finished. The levels unlock one after the other, so this is the
	 * highest unlocked level minus one.
	 *
	 * @returns {number} The number of finished levels.
	 */
	get completed() {
		return maxLevel[this.id].get() - 1;
	}

	/**
	 * Get the highest level that the player can play. After the last level, this is the last level.
	 *
	 * @returns {number} The level number.
	 */
	get unlocked() {
		return Math.min(maxLevel[this.id].get(), this.levels.length);
	}
}

/**
 * Create the campaigns and start to load their files.
 *
 * @returns {void}
 */
export function loadCampaigns() {
	campaigns = CAMPAIGN_FOLDERS.map((folder, id) => new Campaign(id, folder));
	for (let c = 0; c < campaigns.length; c++) loadCampaignFiles(c);
}

/**
 * Get the campaigns in the order of the main menu.
 *
 * @returns {Campaign[]} The campaigns, sorted by their sort number.
 */
export function listCampaigns() {
	return campaigns.toSorted((a, b) => a.sort - b.sort);
}

/**
 * Load the level list of a campaign and then its level files.
 *
 * The campaign file is JSON with the list of the level files in "levels". These properties are optional:
 *
 * - title: the name in the main menu. The default is the folder name.
 * - sort: the position in the main menu, low numbers first. The default is 0.
 * - parent: the folder name of the campaign that the main menu shows this campaign under. The default is none.
 *
 * @param {number} camp The index of the campaign.
 * @returns {void}
 */
function loadCampaignFiles(camp) {
	const folder = 'maps/' + campaigns[camp].folder + '/';
	loadLevelJsonFile(folder + 'campaign.json', function (data) {
		if (typeof data.title == 'string') campaigns[camp].title = data.title;
		campaigns[camp].sort = Number.isFinite(data.sort) ? data.sort : 0;
		campaigns[camp].parent = typeof data.parent == 'string' ? data.parent : '';
		levelsToLoad += data.levels.length;
		for (let i = 0; i < data.levels.length; i++) {
			loadLevelFile(camp, i, folder + data.levels[i]);
		}
		fileLoaded();
	});
}

/**
 * Load a level file of a campaign. In level 8 of the normal and the advanced campaign, the player jumps into the level
 * from below the bottom edge.
 *
 * @param {number} camp The index of the campaign.
 * @param {number} index The index of the level in the campaign, starting at 0.
 * @param {string} url The URL of the level file.
 * @returns {void}
 */
function loadLevelFile(camp, index, url) {
	loadLevelJsonFile(url, function (data) {
		campaigns[camp].levels[index] = {
			...parseMap(data),
			campaign: campaigns[camp].folder,
			number: index + 1,
			fromBelow: index == 7 && camp <= CampaignId.ADVANCED,
		};
		fileLoaded();
	});
}

/**
 * Count a loaded campaign or level file.
 *
 * @returns {void}
 */
function fileLoaded() {
	levelsLoaded++;
	campaignsReady.set(areCampaignsLoaded());
	updateLoading();
}

/**
 * Set the loading progress after a campaign or level file is loaded or failed.
 *
 * @returns {void}
 */
function updateLoading() {
	campaignsLoading.set({ progress: levelsLoaded / levelsToLoad, missing: missingLevelFiles.slice() });
}

/**
 * Load a campaign or level file. A file that fails to load or that the callback rejects goes into the list of missing
 * level files.
 *
 * @param {string} url The URL of the file.
 * @param {function(*)} callback Gets the content of the file.
 * @returns {void}
 */
function loadLevelJsonFile(url, callback) {
	loadJsonFile(url, callback, () => {
		missingLevelFiles.push(url);
		updateLoading();
	});
}

/**
 * Load a JSON file.
 *
 * @param {string} url The URL of the file.
 * @param {function(*)} callback Gets the content of the file.
 * @param {function(): void} [onError] Called if the file fails to load or the callback throws an error.
 * @returns {void}
 */
function loadJsonFile(url, callback, onError = () => {}) {
	fetch(url, { cache: 'no-cache' })
		.then(function (response) {
			if (!response.ok) throw new Error(url + ': ' + response.status);
			return response.json();
		})
		.then(callback)
		.catch(function (e) {
			console.error(url, e);
			onError();
		});
}

/**
 * Check if all campaign and level files are loaded.
 *
 * @returns {boolean} True when all files are loaded.
 */
export function areCampaignsLoaded() {
	return levelsLoaded >= levelsToLoad;
}
