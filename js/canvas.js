/**
 * The canvas of the game.
 *
 * The game draws in screen units: a screen of SCREEN_WIDTH by SCREEN_HEIGHT units. The canvas shows a view of the
 * screen: the whole screen in the menus, or only the playfield in a level. The canvas buffer has the size of the
 * canvas on the page in device pixels, so the picture stays sharp at every size. A transformation at the start of
 * each frame maps the screen units of the view to the buffer pixels. Vector images are drawn from a copy at the
 * scale of the buffer, so that each vector image is rasterized only once per scale.
 */

import { SCREEN_HEIGHT, SCREEN_WIDTH } from './constants.js';

/** @type {HTMLCanvasElement} The game canvas. */
const canvas = document.getElementById('canvas');

/** @type {CanvasRenderingContext2D} The drawing context of the game canvas. */
export const ctx = canvas.getContext('2d');

/** @type {number} The number of buffer pixels per screen unit. */
let scale = 1;

/** @type {{x: number, y: number, w: number, h: number}} The part of the screen that the canvas shows, in screen units. */
let view = { x: 0, y: 0, w: SCREEN_WIDTH, h: SCREEN_HEIGHT };

/** @type {number} The wanted width of the buffer in device pixels, from the size of the canvas on the page. */
let wantedWidth = canvas.width;

/** @type {number} The wanted height of the buffer in device pixels, from the size of the canvas on the page. */
let wantedHeight = canvas.height;

/** @type {WeakMap<HTMLImageElement, {scale: number, picture: OffscreenCanvas}>} The copies of the vector images at a scale. */
const scaledImages = new WeakMap();

/**
 * Remember the size of the canvas on the page in device pixels.
 *
 * @param {ResizeObserverEntry[]} entries The observed changes.
 * @returns {void}
 */
function onResize(entries) {
	const rect = entries[0].contentRect;
	wantedWidth = Math.round(rect.width * devicePixelRatio);
	wantedHeight = Math.round(rect.height * devicePixelRatio);
}

/**
 * Watch the size of the canvas on the page. The buffer follows the size at the start of the next frame.
 *
 * @returns {void}
 */
export function watchCanvasSize() {
	new ResizeObserver(onResize).observe(canvas);
}

/**
 * Set the part of the screen that the canvas shows. The canvas on the page gets the ratio of the view, also as the
 * CSS variable --view-ratio for its size limit.
 *
 * @param {number} x The left edge in screen units.
 * @param {number} y The top edge in screen units.
 * @param {number} w The width in screen units.
 * @param {number} h The height in screen units.
 * @returns {void}
 */
export function setView(x, y, w, h) {
	if (view.x === x && view.y === y && view.w === w && view.h === h) return;
	view = { x, y, w, h };
	canvas.style.aspectRatio = `${w} / ${h}`;
	canvas.style.setProperty('--view-ratio', String(w / h));
}

/**
 * Convert a point on the canvas to screen units.
 *
 * @param {number} px The x position on the canvas in CSS pixels.
 * @param {number} py The y position on the canvas in CSS pixels.
 * @returns {number[]} The x and y position in screen units.
 */
export function screenPoint(px, py) {
	return [view.x + (px * view.w) / canvas.clientWidth, view.y + (py * view.h) / canvas.clientHeight];
}

/**
 * Prepare the canvas for a frame: apply a new size of the buffer and set the transformation of the view.
 *
 * @returns {void}
 */
export function beginFrame() {
	if (canvas.width !== wantedWidth || canvas.height !== wantedHeight) {
		canvas.width = wantedWidth;
		canvas.height = wantedHeight;
	}
	scale = Math.min(canvas.width / view.w, canvas.height / view.h);
	ctx.setTransform(scale, 0, 0, scale, -view.x * scale, -view.y * scale);
}

/**
 * Get the copy of a vector image at the scale of the buffer.
 *
 * @param {HTMLImageElement} image The image.
 * @returns {OffscreenCanvas} The copy.
 */
function scaledImage(image) {
	const entry = scaledImages.get(image);
	if (entry && entry.scale === scale) return entry.picture;
	const picture = new OffscreenCanvas(Math.ceil(image.naturalWidth * scale), Math.ceil(image.naturalHeight * scale));
	picture.getContext('2d').drawImage(image, 0, 0, picture.width, picture.height);
	scaledImages.set(image, { scale, picture });
	return picture;
}

/**
 * Draw an image like ctx.drawImage(), with the same arguments after the image. The source rectangle and the size of
 * the image are in screen units: the pixels of a raster image, or the viewBox of a vector image. The browser scales
 * a raster image directly. A vector image is drawn from its copy at the scale of the buffer. An image that is not
 * loaded is not drawn.
 *
 * @param {HTMLImageElement} image The image.
 * @param {...number} args The destination position, or the destination rectangle, or the source rectangle followed
 *     by the destination rectangle.
 * @returns {void}
 */
export function drawImage(image, ...args) {
	if (!image.complete || image.naturalWidth === 0) return;
	if (!image.src.endsWith('.svg')) {
		ctx.drawImage(image, ...args);
		return;
	}
	const picture = scaledImage(image);
	if (args.length === 2) {
		ctx.drawImage(picture, args[0], args[1], image.naturalWidth, image.naturalHeight);
	} else if (args.length === 4) {
		ctx.drawImage(picture, args[0], args[1], args[2], args[3]);
	} else {
		const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
		ctx.drawImage(picture, sx * scale, sy * scale, sw * scale, sh * scale, dx, dy, dw, dh);
	}
}

/**
 * Copy a part of the canvas into a new offscreen canvas at the scale of the buffer. The copy remembers its scale.
 *
 * @param {number} x The left edge of the part in screen units.
 * @param {number} y The top edge of the part in screen units.
 * @param {number} w The width of the part in screen units.
 * @param {number} h The height of the part in screen units.
 * @returns {OffscreenCanvas} The copy, with the scale in its scale property.
 */
export function copyCanvas(x, y, w, h) {
	const copy = new OffscreenCanvas(Math.round(w * scale), Math.round(h * scale));
	copy.scale = scale;
	copy
		.getContext('2d')
		.drawImage(
			canvas,
			Math.round((x - view.x) * scale),
			Math.round((y - view.y) * scale),
			copy.width,
			copy.height,
			0,
			0,
			copy.width,
			copy.height,
		);
	return copy;
}

/**
 * Draw a copy from copyCanvas() onto the canvas. The copy replaces the pixels, as the current transformation,
 * transparency and composition of the canvas do not apply. A copy from another scale of the buffer is scaled to
 * the current scale.
 *
 * @param {OffscreenCanvas} copy The copy.
 * @param {number} x The left edge on the canvas in screen units.
 * @param {number} y The top edge on the canvas in screen units.
 * @returns {void}
 */
export function drawCopy(copy, x, y) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.beginPath();
	const px = Math.round((x - view.x) * scale);
	const py = Math.round((y - view.y) * scale);
	const w = Math.round((copy.width * scale) / copy.scale);
	const h = Math.round((copy.height * scale) / copy.scale);
	ctx.rect(px, py, w, h);
	ctx.clip();
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'copy';
	ctx.drawImage(copy, px, py, w, h);
	ctx.restore();
}
