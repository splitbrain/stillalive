/**
 * Loading of the images.
 *
 * The module counts the loaded images, so the loading screen can show the progress, and it remembers the files
 * that could not be loaded.
 */

/** @type {Promise<void>[]} One promise for each requested image. */
const pending = [];

/** @type {WeakSet<HTMLImageElement>} The images that are loaded and decoded. */
const loaded = new WeakSet();

/** @type {number} The number of loaded images. */
let loadedCount = 0;

/** @type {string[]} The paths of the images that could not be loaded. */
const missing = [];

/**
 * Start to load an image.
 *
 * @param {string} src The path of the image.
 * @returns {HTMLImageElement} The image. The game can use it at once, it is empty until it is loaded.
 */
export function loadImage(src) {
	const img = new Image();
	img.src = src;
	pending.push(
		img.decode().then(
			() => {
				loaded.add(img);
				loadedCount++;
			},
			() => {
				missing.push(src);
				console.error(`Could not load the image ${src}`);
			},
		),
	);
	return img;
}

/**
 * Wait until all requested images are loaded or failed.
 *
 * @returns {Promise<void>} Resolves when all images are done.
 */
export async function whenImagesDone() {
	await Promise.all(pending);
}

/**
 * Check if images are loaded.
 *
 * @param {HTMLImageElement[]} images The images to check.
 * @returns {boolean} True if all images are loaded.
 */
export function areImagesLoaded(images) {
	return images.every((img) => loaded.has(img));
}

/**
 * Get the loading progress of all requested images.
 *
 * @returns {number} The share of loaded images, from 0 to 1.
 */
export function imageProgress() {
	return pending.length === 0 ? 0 : loadedCount / pending.length;
}

/**
 * Check if all requested images are loaded.
 *
 * @returns {boolean} True if all images are loaded.
 */
export function allImagesLoaded() {
	return pending.length > 0 && loadedCount === pending.length;
}

/**
 * Get the images that could not be loaded.
 *
 * @returns {string[]} The paths of the missing images.
 */
export function missingImages() {
	return missing;
}
