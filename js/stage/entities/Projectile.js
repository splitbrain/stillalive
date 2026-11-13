/**
 * The Projectile object and its helper functions.
 */

import { playSound, sfx_bladeStick } from '../audio.js';
import { TILE_SIZE } from '../constants.js';
import { anyCrateAt } from './Crate.js';
import { getTile } from '../physics.js';
import { game } from '../state.js';
import { FIRST_OF_KIND, LAST_OF_KIND, PLATFORM_CODE, TileKind } from '../tiles.js';

/**
 * A razor wheel that the boss throws.
 */
export class Projectile {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 */
	constructor(x, y, vx, vy) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {number} The width in pixels. */
		this.pX = TILE_SIZE;
		/** @type {number} The height in pixels. */
		this.pY = TILE_SIZE;
		/** @type {boolean} True after the wheel hit something. */
		this.needKill = false;
		/** @type {number} Ticks until the stopped wheel goes away. */
		this.timer = 0;
		/** @type {number} The tile id of the wheel frame to draw. */
		this.img = FIRST_OF_KIND[TileKind.WHEEL];
	}

	/**
	 * Move the wheel for one tick and stop it when it hits a wall, a platform or a crate.
	 *
	 * @returns {void}
	 */
	move() {
		if (!this.needKill) {
			this.x += this.vx;
			this.y += this.vy;

			if (game.time % 6 == 0) {
				if (++this.img > LAST_OF_KIND[TileKind.WHEEL]) this.img = FIRST_OF_KIND[TileKind.WHEEL];
			}

			const t = getTile((this.x >> 8) + TILE_SIZE / 2, (this.y >> 8) + TILE_SIZE / 2);

			if (t) {
				this.needKill = true;
				this.timer = 180;
				if (t >= PLATFORM_CODE) {
					this.timer = 0;
				} else playSound(sfx_bladeStick);
			} else {
				if (anyCrateAt(this.x >> 8, this.y >> 8)) this.needKill = true;
				else if (anyCrateAt((this.x >> 8) + TILE_SIZE, this.y >> 8)) this.needKill = true;
				else if (anyCrateAt(this.x >> 8, (this.y >> 8) + TILE_SIZE)) this.needKill = true;
				else if (anyCrateAt((this.x >> 8) + TILE_SIZE, (this.y >> 8) + TILE_SIZE)) this.needKill = true;
			}
		} else {
			if (--this.timer < 0) this.timer = 0;
		}
	}
}

/**
 * Check if a wheel overlaps the player.
 *
 * @param {Projectile} obj The wheel.
 * @returns {boolean} True if the wheel overlaps the player.
 */
function projectileTouchesPlayer(obj) {
	const posx = obj.x >> 8;
	const posy = obj.y >> 8;
	const px = obj.pX;
	const py = obj.pY;

	const x = game.player.x >> 8;
	const y = game.player.y >> 8;

	if (posx + px > x && x + game.player.pX > posx && posy + py > y && y + game.player.pY > posy) {
		return true;
	}

	return false;
}

/**
 * Move the razor wheels of the boss, kill the player on a hit and remove the stopped wheels after their timer.
 *
 * @returns {void}
 */
export function updateProjectiles() {
	for (let pi = 0; pi < game.projectiles.length; pi++) {
		const p = game.projectiles[pi];
		p.move();
		if (!p.needKill && projectileTouchesPlayer(p)) {
			game.projectiles.splice(pi, 1);
			game.player.life = -200;
			game.player.recoveryTime = 180;
			return;
		}
		if (p.needKill && p.timer == 0) {
			game.projectiles.splice(pi, 1);
			pi--;
		}
	}
}
