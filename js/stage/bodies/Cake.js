/**
 * The Cake object.
 */

import { Body } from './Body.js';
import { playSound, sfx_grabCake } from '../browser/audio.js';
import { TILE_SIZE } from '../constants.js';
import { PuffSparkle } from '../effects/sparkles.js';
import { random, toSubpixels } from '../utils.js';

/**
 * A cake that the player eats. The cake floats up and down.
 */
export class Cake extends Body {
	/** @type {boolean} True after the player ate the cake. */
	#eaten = false;

	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(world, x, y) {
		super(world, x, y, TILE_SIZE, TILE_SIZE);
		/** @type {number} The direction of the float, 1 down or -1 up. */
		this.floatDir = random(0, 2) === 0 ? -1 : 1;
		/** @type {number} The vertical offset of the float in 1/256 pixels, from -3 to 3 pixels. */
		this.floatOffset = random(toSubpixels(-3), toSubpixels(3));
	}

	/**
	 * Check if the cake went away.
	 *
	 * @returns {boolean} True after the player ate the cake.
	 */
	get gone() {
		return this.#eaten;
	}

	/**
	 * Let the player eat the cake. The cake goes away with sparkles and a sound, and the World counts it.
	 *
	 * @returns {void}
	 */
	eaten() {
		this.#eaten = true;
		this.world.effects.addPuffSparkles(this.x, this.y, PuffSparkle.CAKE, 2, 180);
		playSound(sfx_grabCake);
		this.world.cakeEaten();
	}

	/**
	 * Move the cake up or down for one tick and turn it around at the ends of the float.
	 *
	 * @returns {void}
	 */
	move() {
		this.floatOffset += 32 * this.floatDir;
		if (this.floatOffset < toSubpixels(-3)) this.floatDir = -this.floatDir;
		else if (this.floatOffset > toSubpixels(3)) this.floatDir = -this.floatDir;
	}
}
