/**
 * The loading of the game code and files, and the loading progress.
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
	watchAudioUnlock,
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

/** @type {number} The number of element modules that are defined or failed. */
let modulesDone = 0;

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
 * @type {Value<boolean>} False until the code, the images and the campaigns are loaded or failed, and the sounds too
 *     while the sound is on. After that, the value stays true.
 */
export const ready = new Value(false);

/**
 * Load the game code and files, and define the custom elements. The first elements are defined before the other
 * modules and the files start to load, so that the player sees them early. The groups are defined in their order. An
 * element whose module cannot be loaded stays undefined, and the later groups are defined anyway.
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
	for (const [index, group] of groups.entries()) defineElements(group, await Promise.all(loads[index]));
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
 * Define the elements whose module is loaded, and list the elements whose module cannot be loaded as missing. Both
 * count as done.
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
		}
		modulesDone++;
		update();
	});
}

/**
 * Start to load the images, the sounds, the campaigns and the key labels, and start to wait for the first input that
 * unlocks the audio. The sound setting is read first, because the game waits for the sounds only while the sound is on.
 *
 * @returns {void}
 */
function startFiles() {
	setSoundOn(loadSoundSetting());
	watchAudioUnlock();
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
	const code = modulesRequested > 0 && modulesDone === modulesRequested;
	if (code && allImagesLoaded() && (allSoundsLoaded() || !isSoundOn()) && campaignsReady.get()) ready.set(true);
}

/**
 * Set the loading progress after a module or a file is loaded or failed, and check if the game can start.
 *
 * @returns {void}
 */
function update() {
	loading.set({
		code: { progress: modulesRequested === 0 ? 0 : modulesDone / modulesRequested, missing: [...missingModules] },
		images: { progress: imageProgress(), missing: [...missingImages()] },
		sounds: { progress: soundProgress(), missing: [...missingSounds()] },
	});
	checkReady();
}
