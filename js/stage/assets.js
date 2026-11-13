/**
 * Loading of the images, with the progress and the list of the missing images.
 */

/** @type {number} The number of requested images. */
let requested = 0;

/** @type {number} The number of loaded or failed images. */
let done = 0;

/** @type {string[]} The paths of the images that could not be loaded. */
const missing = [];

/** @type {function(): void} Called each time an image is loaded or failed. */
let onDone = () => {};

/**
 * Start to load an image.
 *
 * @param {string} src The path of the image.
 * @returns {HTMLImageElement} The image. It is empty until it is loaded.
 */
export function loadImage(src) {
	const img = new Image();
	img.src = src;
	requested++;
	img.decode().then(
		() => {
			done++;
			onDone();
		},
		() => {
			done++;
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
 * @returns {number} The share of loaded or failed images, from 0 to 1.
 */
export function imageProgress() {
	return requested === 0 ? 0 : done / requested;
}

/**
 * Check if all requested images are loaded or failed.
 *
 * @returns {boolean} True if the game does not need to wait for images.
 */
export function allImagesLoaded() {
	return requested > 0 && done === requested;
}

/**
 * Get the images that could not be loaded.
 *
 * @returns {string[]} The paths of the missing images.
 */
export function missingImages() {
	return missing;
}
