/**
 * The Cake object.
 */

import { Body } from './Body.js';
import { TILE_SIZE } from '../constants.js';
import { random } from '../utils.js';

/**
 * A cake that the player collects. The cake floats up and down.
 */
export class Cake extends Body {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(world, x, y) {
		super(world, x, y, TILE_SIZE, TILE_SIZE);
		/** @type {number} The direction of the float, 1 down or -1 up. */
		this.mDir = random(0, 2) == 0 ? -1 : 1;
		/** @type {number} The vertical offset of the float in 1/256 pixels. */
		this.vy = random(-3 << 8, 3 << 8);
		/** @type {boolean} True until the player collects the cake. */
		this.used = true;
	}

	/**
	 * Move the cake up or down for one tick and turn it around at the ends of the float.
	 *
	 * @returns {void}
	 */
	move() {
		this.vy += 32 * this.mDir;
		if (this.vy < -3 << 8) this.mDir = -this.mDir;
		else if (this.vy > 3 << 8) this.mDir = -this.mDir;
	}
}
