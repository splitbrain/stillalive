/**
 * The Cake object and its helper functions.
 */

import { playSound, sfx_grabCake } from '../audio.js';
import { MAP_SIZE, SparkleType } from '../constants.js';
import { reloadTiles } from '../level.js';
import { createCakeOrSmokeSparkles } from './Sparkle.js';
import { game } from '../state.js';
import { Tile } from '../tiles.js';
import { random } from '../utils.js';

/**
 * Open the exit: the closed exit tiles become exit tiles.
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
	reloadTiles();
}

/**
 * Collect the cakes that the player touches, and open the exit when the last cake is collected.
 *
 * @returns {void}
 */
export function collectCakes() {
	let i;
	for (i = 0; i < game.cakes.length; i++) {
		if (game.cakes[i].used) {
			if (playerTouchesCake(i)) {
				game.cakes[i].used = false;
				game.CAKELEFT--;
				createCakeOrSmokeSparkles(game.cakes[i].x, game.cakes[i].y, SparkleType.CAKE, 2, 180);
				playSound(sfx_grabCake);
				if (game.CAKELEFT == 0) openExit();
			}
		}
	}
}

/**
 * Check if the player overlaps a cake.
 *
 * @param {number} i The index of the cake.
 * @returns {number} 1 if the player overlaps the cake, else 0.
 */
function playerTouchesCake(i) {
	let hit = 0;

	const posx = game.player.x >> 8;
	const posy = game.player.y >> 8;
	const pX = game.player.pX;
	const pY = game.player.pY;
	const x = game.cakes[i].x >> 8;
	const y = game.cakes[i].y >> 8;

	if (posx + pX > x && x + 16 > posx && posy + pY > y && y + 16 > posy) {
		hit = 1;
	}

	return hit;
}

/**
 * A cake that the player collects. The cake floats up and down.
 */
export class Cake {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(x, y) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The direction of the float, 1 down or -1 up. */
		this.mDir = random(0, 2) == 0 ? -1 : 1;
		/** @type {number} The vertical offset of the float in 1/256 pixels. */
		this.vy = random(-3 << 8, 3 << 8);
		/** @type {boolean} True until the player collects the cake. */
		this.used = true;
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
		if (!c.used) continue;
		c.vy += 32 * c.mDir;
		if (c.vy < -3 << 8) c.mDir = -c.mDir;
		else if (c.vy > 3 << 8) c.mDir = -c.mDir;
	}
}
