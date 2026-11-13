/**
 * The Cake object and its helper functions.
 */

import { playSound, sfx_exit, sfx_grabCake } from '../audio.js';
import { Body } from './Body.js';
import { MAP_SIZE, SparkleType, TILE_SIZE } from '../constants.js';
import { createCakeOrSmokeSparkles } from './Sparkle.js';
import { game } from '../state.js';
import { Tile } from '../tiles.js';
import { random } from '../utils.js';

/**
 * Open the exit.
 *
 * @returns {void}
 */
export function openExit() {
	let i;
	for (i = 0; i < MAP_SIZE; i++) {
		if (game.map[i] == Tile.EXIT_CLOSED) {
			game.map[i] = Tile.EXIT;
			game.displayMap[i] = Tile.EXIT;
		}
	}
	game.tilesChanged = true;
}

/**
 * Collect the cakes that the player touches, and open the exit when the last cake is collected.
 *
 * @returns {void}
 */
export function collectCakes() {
	for (const cake of game.cakes) {
		if (cake.used) {
			if (game.player.overlaps(cake)) {
				cake.used = false;
				game.cakesLeft--;
				createCakeOrSmokeSparkles(cake.x, cake.y, SparkleType.CAKE, 2, 180);
				playSound(sfx_grabCake);
				if (game.cakesLeft == 0) {
					openExit();
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
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(x, y) {
		super(x, y, TILE_SIZE, TILE_SIZE);
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
 * @returns {void}
 */
export function updateCakes() {
	if (game.player.fadeNextLevel != -1) return;
	for (const c of game.cakes) {
		if (c.used) c.move();
	}
}
