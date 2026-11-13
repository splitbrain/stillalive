/**
 * The AnimatedTile object and its helper functions.
 */

import { ORDERED, RANDOM } from '../constants.js';
import { game } from '../state.js';
import { random } from '../utils.js';

export class AnimatedTile {
	/**
	 * @param {number} x The column of the tile in the map.
	 * @param {number} y The row of the tile in the map.
	 * @param {number} min The first frame, as a tile id.
	 * @param {number} max The last frame, as a tile id.
	 * @param {number} type RANDOM for random frames or ORDERED for frames in sequence.
	 * @param {number} place The index of the tile in the map.
	 * @param {number} speed The number of ticks between two frames.
	 */
	constructor(x, y, min, max, type, place, speed) {
		/** @type {number} The column of the tile in the map. */
		this.x = x;
		/** @type {number} The row of the tile in the map. */
		this.y = y;
		/** @type {boolean} True while the tile is drawn and solid; an open door is false. */
		this.used = true;
		/** @type {number} The current frame, as a tile id. */
		this.current = min;
		/** @type {number} The first frame, as a tile id. */
		this.min = min;
		/** @type {number} The last frame, as a tile id. */
		this.max = max;
		/** @type {number} RANDOM for random frames or ORDERED for frames in sequence. */
		this.type = type;
		/** @type {number} The index of the tile in the map. */
		this.place = place;
		/** @type {number} The number of ticks between two frames. */
		this.speed = speed;
	}
}

/**
 * Advance the frames of the animated tiles.
 *
 * @returns {void}
 */
export function animateTiles() {
	let r;
	for (const tile of game.animatedTiles) {
		if (!tile.used || game.time % tile.speed != 0) continue;
		if (tile.type == RANDOM) {
			do {
				r = random(tile.min, tile.max + 1);
			} while (r == tile.current);
			tile.current = r;
		} else if (tile.type == ORDERED) {
			if (tile.current == tile.max) tile.current = tile.min;
			else tile.current++;
		}
	}
}
