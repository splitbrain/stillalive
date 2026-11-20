/**
 * The LayerCache object.
 */

import { canvasGeneration, copyCanvas, drawCopy } from '../browser/canvas.js';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from '../constants.js';

/**
 * The cached copy of a layer of the playfield that changes only with the map, the version of the map, the background
 * and the canvas buffer.
 */
export class LayerCache {
	/** @type {OffscreenCanvas|null} The copy of the layer, or null before the first draw. */
	#copy = null;

	/** @type {import('../world/TileMap.js').TileMap|null} The map that the copy shows. */
	#map = null;

	/** @type {number} The version of the map that the copy shows. */
	#version = 0;

	/** @type {number} The index of the background image that the copy shows. */
	#background = 0;

	/** @type {number} The generation of the canvas buffer of the copy. */
	#generation = 0;

	/**
	 * Draw the layer of a map and a background from the copy. If the copy shows another map, map version, background
	 * or canvas buffer, draw the layer again and copy it first.
	 *
	 * @param {import('../world/TileMap.js').TileMap} map The map.
	 * @param {number} background The index of the background image.
	 * @param {() => void} drawLayer The function that draws the layer onto the canvas.
	 * @returns {void}
	 */
	draw(map, background, drawLayer) {
		const generation = canvasGeneration();
		if (
			!this.#copy ||
			this.#map !== map ||
			this.#version !== map.version ||
			this.#background !== background ||
			this.#generation !== generation
		) {
			drawLayer();
			this.#copy = copyCanvas(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
			this.#map = map;
			this.#version = map.version;
			this.#background = background;
			this.#generation = generation;
		}
		drawCopy(this.#copy, 0, 0);
	}
}
