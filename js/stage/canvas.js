/**
 * The canvas of the game.
 *
 * The canvas shows the playfield. The game draws in playfield units: a playfield of PLAYFIELD_WIDTH by
 * PLAYFIELD_HEIGHT units. The canvas buffer has the size of the canvas on the page in device pixels, so the picture
 * stays sharp at every size. A transformation at the start of each frame maps the playfield units to the buffer
 * pixels and adds the screen shake. Vector images are drawn from a copy at the scale of the buffer, so that each
 * vector image is rasterized only once per scale.
 */

import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from './constants.js';
import { game } from './state.js';

/** @type {HTMLCanvasElement} The game canvas. */
let canvas;

/** @type {CanvasRenderingContext2D} The drawing context of the game canvas. */
export let ctx;

/** @type {number} The number of buffer pixels per playfield unit. */
let scale = 1;

/** @type {number} The wanted width of the buffer in device pixels, from the size of the canvas on the page. */
let wantedWidth;

/** @type {number} The wanted height of the buffer in device pixels, from the size of the canvas on the page. */
let wantedHeight;

/** @type {WeakMap<HTMLImageElement, {scale: number, picture: OffscreenCanvas}>} The copies of the vector images at a scale. */
const scaledImages = new WeakMap();

/** @type {WeakMap<HTMLImageElement, boolean>} True for each image that is a vector image, from its file name. */
const vectorImages = new WeakMap();

/**
 * Check if an image is a vector image. The result is kept, as the drawing asks for each image in each frame.
 *
 * @param {HTMLImageElement} image The image.
 * @returns {boolean} True for a vector image.
 */
function isVectorImage(image) {
	let vector = vectorImages.get(image);
	if (vector === undefined) {
		vector = image.src.endsWith('.svg');
		vectorImages.set(image, vector);
	}
	return vector;
}

/**
 * Remember the size of the canvas on the page in device pixels. A hidden canvas has no size, so the buffer keeps its
 * size until the canvas shows again.
 *
 * @param {ResizeObserverEntry[]} entries The observed changes.
 * @returns {void}
 */
function onResize(entries) {
	const rect = entries[0].contentRect;
	if (rect.width == 0 || rect.height == 0) return;
	wantedWidth = Math.round(rect.width * devicePixelRatio);
	wantedHeight = Math.round(rect.height * devicePixelRatio);
}

/**
 * Use a canvas for the drawing.
 *
 * @param {HTMLCanvasElement} element The canvas.
 * @returns {void}
 */
export function setCanvas(element) {
	canvas = element;
	ctx = canvas.getContext('2d');
	wantedWidth = canvas.width;
	wantedHeight = canvas.height;
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
 * Convert a point on the canvas to playfield units.
 *
 * @param {number} px The x position on the canvas in CSS pixels.
 * @param {number} py The y position on the canvas in CSS pixels.
 * @returns {number[]} The x and y position in playfield units.
 */
export function playfieldPoint(px, py) {
	return [(px * PLAYFIELD_WIDTH) / canvas.clientWidth, (py * PLAYFIELD_HEIGHT) / canvas.clientHeight];
}

/**
 * Prepare the canvas for a frame: apply a new size of the buffer and set the transformation to playfield units
 * with the screen shake.
 *
 * @returns {void}
 */
export function beginFrame() {
	if (canvas.width !== wantedWidth || canvas.height !== wantedHeight) {
		canvas.width = wantedWidth;
		canvas.height = wantedHeight;
	}
	scale = Math.min(canvas.width / PLAYFIELD_WIDTH, canvas.height / PLAYFIELD_HEIGHT);
	ctx.setTransform(scale, 0, 0, scale, game.shakeX * scale, game.shakeY * scale);
}

/**
 * Make the canvas empty.
 *
 * @returns {void}
 */
export function clearCanvas() {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
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
 * the image are in playfield units: the pixels of a raster image, or the viewBox of a vector image. The browser scales
 * a raster image directly. A vector image is drawn from its copy at the scale of the buffer. Without a rotation in
 * the current transformation, the edges of a vector image are on whole buffer pixels. An image that is not loaded is
 * not drawn.
 *
 * @param {HTMLImageElement} image The image.
 * @param {...number} args The destination position, or the destination rectangle, or the source rectangle followed
 *     by the destination rectangle.
 * @returns {void}
 */
export function drawImage(image, ...args) {
	if (!image.complete || image.naturalWidth === 0) return;
	if (!isVectorImage(image)) {
		ctx.drawImage(image, ...args);
		return;
	}
	const picture = scaledImage(image);
	let [dx, dy, dw, dh] = args.length === 2 ? [...args, image.naturalWidth, image.naturalHeight] : args.slice(-4);
	const m = ctx.getTransform();
	if (m.b === 0 && m.c === 0) {
		[dx, dw] = snapSpan(dx, dw, m.a, m.e);
		[dy, dh] = snapSpan(dy, dh, m.d, m.f);
	}
	if (args.length === 8) {
		const [sx, sy, sw, sh] = args;
		ctx.drawImage(picture, sx * scale, sy * scale, sw * scale, sh * scale, dx, dy, dw, dh);
	} else {
		ctx.drawImage(picture, dx, dy, dw, dh);
	}
}

/**
 * Move the edges of a destination span to the nearest buffer pixels. Images that touch then share their edge pixels
 * and leave no seam between them.
 *
 * @param {number} start The start of the span in playfield units.
 * @param {number} size The size of the span in playfield units.
 * @param {number} factor The buffer pixels per playfield unit of the current transformation on this axis.
 * @param {number} offset The offset of the current transformation on this axis in buffer pixels.
 * @returns {number[]} The start and the size of the moved span in playfield units.
 */
function snapSpan(start, size, factor, offset) {
	const first = (Math.round(start * factor + offset) - offset) / factor;
	const last = (Math.round((start + size) * factor + offset) - offset) / factor;
	return [first, last - first];
}

/**
 * Copy a part of the canvas into a new offscreen canvas at the scale of the buffer. The part moves with the screen
 * shake. The copy remembers its scale.
 *
 * @param {number} x The left edge of the part in playfield units.
 * @param {number} y The top edge of the part in playfield units.
 * @param {number} w The width of the part in playfield units.
 * @param {number} h The height of the part in playfield units.
 * @returns {OffscreenCanvas} The copy, with the scale in its scale property.
 */
export function copyCanvas(x, y, w, h) {
	const copy = new OffscreenCanvas(Math.round(w * scale), Math.round(h * scale));
	copy.scale = scale;
	copy
		.getContext('2d')
		.drawImage(
			canvas,
			Math.round((x + game.shakeX) * scale),
			Math.round((y + game.shakeY) * scale),
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
 * transparency and composition of the canvas do not apply, but the copy moves with the screen shake. A copy from
 * another scale of the buffer is scaled to the current scale.
 *
 * @param {OffscreenCanvas} copy The copy.
 * @param {number} x The left edge on the canvas in playfield units.
 * @param {number} y The top edge on the canvas in playfield units.
 * @returns {void}
 */
export function drawCopy(copy, x, y) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.beginPath();
	const px = Math.round((x + game.shakeX) * scale);
	const py = Math.round((y + game.shakeY) * scale);
	const w = Math.round((copy.width * scale) / copy.scale);
	const h = Math.round((copy.height * scale) / copy.scale);
	ctx.rect(px, py, w, h);
	ctx.clip();
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'copy';
	ctx.drawImage(copy, px, py, w, h);
	ctx.restore();
}
