/**
 * Loading of the images.
 *
 * The module counts the loaded images, so the loading screen can show the progress, and it remembers the files
 * that could not be loaded.
 */

/** @type {number} The number of requested images. */
let requested = 0;

/** @type {number} The number of loaded images. */
let loadedCount = 0;

/** @type {string[]} The paths of the images that could not be loaded. */
const missing = [];

/** @type {function(): void} Called each time an image is loaded or failed. */
let onDone = () => {};

/**
 * Start to load an image.
 *
 * @param {string} src The path of the image.
 * @returns {HTMLImageElement} The image. The game can use it at once, it is empty until it is loaded.
 */
export function loadImage(src) {
	const img = new Image();
	img.src = src;
	requested++;
	img.decode().then(
		() => {
			loadedCount++;
			onDone();
		},
		() => {
			missing.push(src);
			console.error(`Could not load the image ${src}`);
			onDone();
		},
	);
	return img;
}

/**
 * Set the function that is called each time an image is loaded or failed.
 *
 * @param {function(): void} callback The function.
 * @returns {void}
 */
export function onImageDone(callback) {
	onDone = callback;
}

/**
 * Get the loading progress of all requested images.
 *
 * @returns {number} The share of loaded images, from 0 to 1.
 */
export function imageProgress() {
	return requested === 0 ? 0 : loadedCount / requested;
}

/**
 * Check if all requested images are loaded.
 *
 * @returns {boolean} True if all images are loaded.
 */
export function allImagesLoaded() {
	return requested > 0 && loadedCount === requested;
}

/**
 * Get the images that could not be loaded.
 *
 * @returns {string[]} The paths of the missing images.
 */
export function missingImages() {
	return missing;
}
