/**
 * The Cake object and its helper functions.
 */

import { playSound, sfx_grabCake } from '../audio.js';
import { createCakeOrSmokeSparkles } from './Sparkle.js';
import { reloadTiles } from '../render/game.js';
import { game } from '../state.js';
import { Tile } from '../tiles.js';
import { random } from '../utils.js';

/**
 * Open the exit: the closed exit tiles become exit tiles.
 *
 * @returns {void}
 */
export function validerArrivee() {
	let i;
	for (i = 0; i < 768; i++) {
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
export function toucheCake() {
	let i;
	for (i = 0; i < game.cakes.length; i++) {
		if (game.cakes[i].used) {
			if (persoToucheCake(i)) {
				game.cakes[i].used = 0;
				game.CAKELEFT--;
				createCakeOrSmokeSparkles(game.cakes[i].x, game.cakes[i].y, 8, 2, 180);
				playSound(sfx_grabCake);
				if (game.CAKELEFT == 0) validerArrivee();
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
function persoToucheCake(i) {
	let retour = 0;

	const posx = game.perso.x >> 8;
	const posy = game.perso.y >> 8;
	const pX = game.perso.pX;
	const pY = game.perso.pY;
	const x = game.cakes[i].x >> 8;
	const y = game.cakes[i].y >> 8;

	if (posx + pX > x && x + 16 > posx && posy + pY > y && y + 16 > posy) {
		retour = 1;
	}

	return retour;
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
		/** @type {number} The x position of the start. */
		this.ox = x;
		/** @type {number} The y position of the start. */
		this.oy = y;
		/** @type {number} The direction of the float, 1 down or -1 up. */
		this.mDir = parseInt(random(0, 1)) == 0 ? -1 : 1;
		/** @type {number} The vertical offset of the float in 1/256 pixels. */
		this.vy = random(-3 << 8, 3 << 8);
		/** @type {boolean} True until the player collects the cake. */
		this.used = true;
	}
}
