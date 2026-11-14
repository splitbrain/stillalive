/**
 * The AnimatedTile object.
 */

import { ORDERED, RANDOM } from '../constants.js';
import { random } from '../utils.js';

/**
 * A map tile that changes its frame at a fixed interval.
 */
export class AnimatedTile {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The column of the tile in the map.
	 * @param {number} y The row of the tile in the map.
	 * @param {number} min The first frame, as a tile id.
	 * @param {number} max The last frame, as a tile id.
	 * @param {number} type RANDOM for random frames or ORDERED for frames in sequence.
	 * @param {number} place The index of the tile in the map.
	 * @param {number} speed The number of ticks between two frames.
	 */
	constructor(world, x, y, min, max, type, place, speed) {
		/** @type {import('../World.js').World} The World of the object. */
		this.world = world;
		/** @type {number} The column of the tile in the map. */
		this.x = x;
		/** @type {number} The row of the tile in the map. */
		this.y = y;
		/** @type {boolean} True while the tile is drawn and solid. False for an open door. */
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

	/**
	 * Advance to the next frame when the interval of the tile is over.
	 *
	 * @returns {void}
	 */
	animate() {
		if (!this.used || this.world.time % this.speed != 0) return;
		if (this.type == RANDOM) {
			let frame;
			do {
				frame = random(this.min, this.max + 1);
			} while (frame == this.current);
			this.current = frame;
		} else if (this.type == ORDERED) {
			if (this.current == this.max) this.current = this.min;
			else this.current++;
		}
	}
}
