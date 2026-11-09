/**
 * The loading of the game: the code of the custom elements, the images, the sounds and the campaigns. The page shows
 * the progress on the loading screen, and the game starts when everything is loaded.
 */

import { campaignsReady, loadCampaigns } from './chrome/campaigns.js';
import { loadSoundSetting } from './chrome/storage.js';
import { allImagesLoaded, imageProgress, missingImages, onImageDone } from './stage/assets.js';
import {
	allSoundsLoaded,
	isSoundOn,
	loadSfx,
	missingSounds,
	onSoundDone,
	setSoundOn,
	soundProgress,
} from './stage/audio.js';
import { loadGfx } from './stage/images.js';
import { loadKeyLabels } from './stage/keys.js';
import { Value } from './value.js';

/**
 * A custom element and the module of its class.
 *
 * @typedef {object} ElementModule
 * @property {string} tag The tag name of the element.
 * @property {string} url The URL of the module, relative to this module.
 * @property {string} name The name of the exported class.
 */

/** @type {number} The number of element modules to load. */
let modulesRequested = 0;

/** @type {number} The number of element modules that are loaded and defined. */
let modulesDefined = 0;

/** @type {string[]} The tag names of the elements whose module could not be loaded. */
const missingModules = [];

/**
 * @type {Value<{code: {progress: number, missing: string[]}, images: {progress: number, missing: string[]}, sounds:
 *     {progress: number, missing: string[]}}>} The loading progress of the code, the images and the sounds from 0 to 1,
 *     and the elements and files that could not be loaded. A new object each time a module or a file is done.
 */
export const loading = new Value({
	code: { progress: 0, missing: [] },
	images: { progress: 0, missing: [] },
	sounds: { progress: 0, missing: [] },
});

/**
 * @type {Value<boolean>} False until the code, the images and the campaigns are loaded, and the sounds too while the
 *     sound is on. The value stays true.
 */
export const ready = new Value(false);

/**
 * Load the game: the modules of the custom elements, the images, the sounds, the campaigns and the key labels of the
 * keyboard of the player. The first elements load alone and are defined at once, so that the player sees them early.
 * Then the other modules and the files start to load. The other elements are defined in the order of their groups:
 * the elements of a group are defined when all elements of the groups before are defined. An element whose module
 * cannot be loaded is not defined, and the elements of the later groups are defined anyway.
 *
 * @param {ElementModule[]} first The elements that show first.
 * @param {ElementModule[][]} groups The other elements, in groups.
 * @returns {Promise<void>} Resolves when all modules are loaded or failed.
 */
export async function loadGame(first, groups) {
	modulesRequested = first.length + groups.flat().length;
	defineElements(first, await Promise.all(first.map(importModule)));
	startFiles();
	const loads = groups.map((group) => group.map(importModule));
	for (let g = 0; g < groups.length; g++) defineElements(groups[g], await Promise.all(loads[g]));
}

/**
 * Load the module of an element.
 *
 * @param {ElementModule} element The element.
 * @returns {Promise<object|Error>} The module, or the error if the module cannot be loaded.
 */
function importModule({ url }) {
	return import(url).catch((error) => error);
}

/**
 * Define the elements whose module is loaded, and count the elements whose module cannot be loaded as missing.
 *
 * @param {ElementModule[]} elements The elements, in the order of their definition.
 * @param {Array<object|Error>} modules The modules of the elements, or the errors.
 * @returns {void}
 */
function defineElements(elements, modules) {
	elements.forEach(({ tag, name }, i) => {
		if (modules[i] instanceof Error) {
			console.error(`Could not load the element ${tag}`, modules[i]);
			missingModules.push(tag);
		} else {
			customElements.define(tag, modules[i][name]);
			modulesDefined++;
		}
		update();
	});
}

/**
 * Start to load the images, the sounds, the campaigns and the key labels. The sound setting comes from the storage,
 * because the sounds are not needed while the sound is off.
 *
 * @returns {void}
 */
function startFiles() {
	setSoundOn(loadSoundSetting());
	onImageDone(update);
	onSoundDone(update);
	campaignsReady.subscribe(checkReady);
	loadGfx();
	loadSfx();
	loadCampaigns();
	loadKeyLabels();
}

/**
 * Check if the game can start, and set ready when it can. Call it again when the sound setting changes.
 *
 * @returns {void}
 */
export function checkReady() {
	const code = modulesRequested > 0 && modulesDefined === modulesRequested;
	if (code && allImagesLoaded() && (allSoundsLoaded() || !isSoundOn()) && campaignsReady.get()) ready.set(true);
}

/**
 * Set the loading progress after a module or a file is loaded or failed, and check if the game can start.
 *
 * @returns {void}
 */
function update() {
	loading.set({
		code: { progress: modulesRequested === 0 ? 0 : modulesDefined / modulesRequested, missing: missingModules.slice() },
		images: { progress: imageProgress(), missing: missingImages().slice() },
		sounds: { progress: soundProgress(), missing: missingSounds().slice() },
	});
	checkReady();
}
