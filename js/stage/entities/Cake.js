/**
 * The Cake object and its helper functions.
 */

import { playSound, sfx_exit, sfx_grabCake } from '../audio.js';
import { Body } from './Body.js';
import { MAP_SIZE, SparkleType, TILE_SIZE } from '../constants.js';
import { createCakeOrSmokeSparkles } from './Sparkle.js';
import { Tile } from '../tiles.js';
import { random } from '../utils.js';

/**
 * Open the exit.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function openExit(world) {
	let i;
	for (i = 0; i < MAP_SIZE; i++) {
		if (world.map.tiles[i] == Tile.EXIT_CLOSED) world.map.set(i, Tile.EXIT);
	}
}

/**
 * Collect the cakes that the player touches, and open the exit when the last cake is collected.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function collectCakes(world) {
	for (const cake of world.cakes) {
		if (cake.used) {
			if (world.player.overlaps(cake)) {
				cake.used = false;
				world.cakesLeft--;
				createCakeOrSmokeSparkles(world, cake.x, cake.y, SparkleType.CAKE, 2, 180);
				playSound(sfx_grabCake);
				if (world.cakesLeft == 0) {
					openExit(world);
					playSound(sfx_exit);
				}
			}
		}
	}
}

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

/**
 * Let the cakes float up and down. The cakes stand still during the level transitions.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function updateCakes(world) {
	if (!world.isRunning()) return;
	for (const c of world.cakes) {
		if (c.used) c.move();
	}
}
