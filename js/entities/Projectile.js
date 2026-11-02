/**
 * The Projectile object and its helper functions.
 */

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
		this.pX = 16;
		/** @type {number} The height in pixels. */
		this.pY = 16;
		/** @type {boolean} True after the wheel hit something; it then fades out. */
		this.needKill = false;
		/** @type {number} Ticks left of the fade out. */
		this.timer = 0;
		/** @type {number} The tile id of the wheel frame to draw. */
		this.img = 36;
	}

	/**
	 * Move the wheel for one tick and start the fade out when it hits a wall, a platform or a crate.
	 *
	 * @returns {void}
	 */
	move() {
		if (!this.needKill) {
			this.x += this.vx;
			this.y += this.vy;

			if (game.TIME % 6 == 0) {
				if (++this.img > LAST_OF_KIND[TileKind.WHEEL]) this.img = FIRST_OF_KIND[TileKind.WHEEL];
			}

			const t = getTile((this.x >> 8) + 8, (this.y >> 8) + 8);

			if (t) {
				this.needKill = true;
				this.timer = 180;
				if (t > PLATFORM_CODE) {
					this.timer = 0;
				}
			} else {
				if (anyCrateAt(this.x >> 8, this.y >> 8)) this.needKill = true;
				else if (anyCrateAt((this.x >> 8) + 16, this.y >> 8)) this.needKill = true;
				else if (anyCrateAt(this.x >> 8, (this.y >> 8) + 16)) this.needKill = true;
				else if (anyCrateAt((this.x >> 8) + 16, (this.y >> 8) + 16)) this.needKill = true;
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
 * @returns {number} 1 if the wheel overlaps the player, else 0.
 */
export function projectileTouchesPlayer(obj) {
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
