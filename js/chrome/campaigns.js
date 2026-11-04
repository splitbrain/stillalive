/**
 * Loading of the campaigns, their level files and the credits.
 */

import { CAMPAIGN_FOLDERS, CampaignId } from '../stage/constants.js';
import { parseMap } from '../stage/mapFile.js';
import { Value } from '../value.js';

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
/** @type {Value} The lines of the credits, an empty list until the credits are loaded. */
export const credits = new Value([]);

/**
 * A campaign with its levels.
 */
class Campaign {
	/**
	 * @param {string} folder The folder name of the campaign below maps/.
	 */
	constructor(folder) {
		/** @type {string} The folder name of the campaign below maps/. */
		this.folder = folder;
		/** @type {import('../stage/level.js').Level[]} The levels of the campaign. */
		this.levels = [];
		/** @type {boolean} True if the intermission screen shows after each level, false if the next level starts at once. */
		this.intermission = true;
		/** @type {boolean} True if the best times and the replays of the levels are stored. */
		this.records = true;
		/** @type {string} The message of the last intermission screen, or an empty text for none. */
		this.endText = '';
	}
}

/**
 * Create the campaigns and start to load their files.
 *
 * @returns {void}
 */
export function loadCampaigns() {
	campaigns = CAMPAIGN_FOLDERS.map((folder) => new Campaign(folder));
	for (let c = 0; c < campaigns.length; c++) loadCampaignFiles(c);
}

/**
 * Load the level list of a campaign and then its level files.
 *
 * The campaign file is JSON with the list of the level files in "levels". These properties are optional:
 *
 * - intermission: false starts the next level at once after the exit. The default is true.
 * - records: false stores no best times and no replays. The default is true.
 * - endText: the message of the last intermission screen. The default is none.
 *
 * @param {number} camp The index of the campaign.
 * @returns {void}
 */
function loadCampaignFiles(camp) {
	const folder = 'maps/' + campaigns[camp].folder + '/';
	loadLevelJsonFile(folder + 'campaign.json', function (data) {
		campaigns[camp].intermission = data.intermission !== false;
		campaigns[camp].records = data.records !== false;
		campaigns[camp].endText = typeof data.endText == 'string' ? data.endText : '';
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
 * Start to load the lines of the credits.
 *
 * @returns {void}
 */
export function loadCreditsText() {
	loadJsonFile('credits.json', function (data) {
		credits.set(data.lines);
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
