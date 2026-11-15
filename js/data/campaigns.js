/**
 * Loading of the campaigns and their level files, and the custom campaign of the editor maps.
 */

import { CAMPAIGN_FOLDERS, CampaignId, LEVELS_PER_CAMPAIGN } from '../stage/constants.js';
import { MAP_FORMAT, parseMap } from '../stage/mapFile.js';
import { Value } from '../value.js';
import { editorMap, getBestTime, maxLevel } from './storage.js';

/** @type {Campaign[]} The loaded campaigns, by campaign id. */
export let campaigns;
/** @type {number} The number of loaded or failed campaign and level files. */
let levelsLoaded = 0;
/**
 * @type {number} The number of campaign and level files to load: one campaign file for each campaign except the custom
 *     campaign. The campaign files add their level files.
 */
let levelsToLoad = CAMPAIGN_FOLDERS.length - 1;
/** @type {string[]} The URLs of the campaign and level files that could not be loaded. */
const missingLevelFiles = [];
/**
 * The loading progress of the campaign and level files from 0 to 1, and the URLs of the files that could not be
 * loaded. Each change sets a new object.
 *
 * @type {Value<{progress: number, missing: string[]}>}
 */
export const campaignsLoading = new Value({ progress: 0, missing: [] });
/** @type {Value<boolean>} True when all campaign and level files are loaded or failed. */
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
		/**
		 * @type {Array<import('../stage/level.js').Level|null>} The levels of the campaign, by level number minus one. A
		 *     level that is not there is null.
		 */
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

	/**
	 * Get the number of levels that are there.
	 *
	 * @returns {number} The number of levels that are not null.
	 */
	get levelCount() {
		return this.levels.filter((level) => level != null).length;
	}

	/**
	 * Check if a level can be played: the level is there, and the player has unlocked it.
	 *
	 * @param {number} level The level number.
	 * @returns {boolean} True for a level that can be played.
	 */
	isOpen(level) {
		return level <= this.unlocked && this.levels[level - 1] != null;
	}

	/**
	 * Get the next level that can be played after a level.
	 *
	 * @param {number} level The level number.
	 * @returns {number} The number of the next level, or 0 if there is none.
	 */
	nextLevel(level) {
		for (let next = level + 1; next <= this.levels.length; next++) {
			if (this.isOpen(next)) return next;
		}
		return 0;
	}

	/**
	 * Get the level that the selection shows: the selected level, or else the highest unlocked level.
	 *
	 * @param {number} level The number of the selected level, or 0 for none.
	 * @returns {import('../stage/level.js').Level|null} The level, or null if it is not there.
	 */
	shownLevel(level) {
		return this.levels[(level || this.unlocked) - 1] ?? null;
	}
}

/**
 * The custom campaign: its levels are the editor maps in the slots. The level number is the slot number, and an empty
 * slot or a slot with a map that is not valid has no level. All levels are unlocked.
 */
class CustomCampaign extends Campaign {
	/**
	 * Make the levels from the editor maps, and make them again when a slot changes.
	 *
	 * @param {number} id The campaign id, the index in the campaigns list.
	 * @param {string} folder The name of the campaign in the routes and in the storage keys.
	 */
	constructor(id, folder) {
		super(id, folder);
		this.title = 'My Levels';
		for (let slot = 1; slot <= LEVELS_PER_CAMPAIGN; slot++) {
			editorMap(slot).subscribe((map) => (this.levels[slot - 1] = this.#createLevel(slot, map)));
		}
	}

	/**
	 * Make the level of a slot.
	 *
	 * @param {number} slot The slot number.
	 * @param {object|null} map The editor map in the map file format without the format, or null for an empty slot.
	 * @returns {import('../stage/level.js').Level|null} The level, or null if the slot is empty or the map is not valid.
	 */
	#createLevel(slot, map) {
		if (map == null) return null;
		try {
			return { ...parseMap({ format: MAP_FORMAT, ...map }), campaign: this.folder, number: slot, fromBelow: false };
		} catch {
			return null;
		}
	}

	/**
	 * Get the number of levels that have a best time.
	 *
	 * @returns {number} The number of finished levels.
	 */
	get completed() {
		return this.levels.filter((level) => level != null && getBestTime(this.folder, level.number) !== null).length;
	}

	/**
	 * Get the highest level that the player can play.
	 *
	 * @returns {number} The level number, or 0 if all slots are empty.
	 */
	get unlocked() {
		return this.levels.findLastIndex((level) => level != null) + 1;
	}
}

/**
 * Create the campaigns and start to load the files of all campaigns except the custom campaign.
 *
 * @returns {void}
 */
export function loadCampaigns() {
	campaigns = CAMPAIGN_FOLDERS.map((folder, id) =>
		id === CampaignId.CUSTOM ? new CustomCampaign(id, folder) : new Campaign(id, folder),
	);
	for (const campaign of campaigns) {
		if (campaign.id !== CampaignId.CUSTOM) loadCampaignFiles(campaign.id);
	}
}

/**
 * Get a campaign by its folder name.
 *
 * @param {string} folder The folder name of the campaign.
 * @returns {Campaign|null} The campaign, or null if there is none or the campaigns are not loaded.
 */
export function campaignByFolder(folder) {
	return campaigns?.[CAMPAIGN_FOLDERS.indexOf(folder)] ?? null;
}

/**
 * Get the campaigns in the order of the main menu.
 *
 * @returns {Campaign[]} The campaigns, sorted by their sort number.
 */
export function listCampaigns() {
	return campaigns.toSorted((one, other) => one.sort - other.sort);
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
	const folder = `maps/${campaigns[camp].folder}`;
	loadLevelJsonFile(`${folder}/campaign.json`, function (data) {
		if (typeof data.title === 'string') campaigns[camp].title = data.title;
		campaigns[camp].sort = Number.isFinite(data.sort) ? data.sort : 0;
		campaigns[camp].parent = typeof data.parent === 'string' ? data.parent : '';
		levelsToLoad += data.levels.length;
		for (const [i, file] of data.levels.entries()) loadLevelFile(camp, i, `${folder}/${file}`);
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
			fromBelow: index === 7 && camp <= CampaignId.ADVANCED,
		};
		fileLoaded();
	});
}

/**
 * Count a loaded or failed campaign or level file.
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
	campaignsLoading.set({ progress: levelsLoaded / levelsToLoad, missing: [...missingLevelFiles] });
}

/**
 * Load a campaign or level file. A file that fails to load or whose callback throws an error goes into the list of
 * missing level files and counts as done.
 *
 * @param {string} url The URL of the file.
 * @param {(content: any) => void} callback Called with the parsed content of the file.
 * @returns {void}
 */
function loadLevelJsonFile(url, callback) {
	loadJsonFile(url, callback, () => {
		missingLevelFiles.push(url);
		fileLoaded();
	});
}

/**
 * Load a JSON file.
 *
 * @param {string} url The URL of the file.
 * @param {(content: any) => void} callback Called with the parsed content of the file.
 * @param {() => void} [onError] Called if the file fails to load or the callback throws an error.
 * @returns {void}
 */
function loadJsonFile(url, callback, onError = () => {}) {
	fetch(url, { cache: 'no-cache' })
		.then(function (response) {
			if (!response.ok) throw new Error(`${url}: ${response.status}`);
			return response.json();
		})
		.then(callback)
		.catch(function (error) {
			console.error(url, error);
			onError();
		});
}

/**
 * Check if all campaign and level files are loaded or failed.
 *
 * @returns {boolean} True when the game does not need to wait for campaign files.
 */
function areCampaignsLoaded() {
	return levelsLoaded >= levelsToLoad;
}
