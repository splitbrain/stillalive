/**
 * The Projectile object.
 */

import { Body } from './Body.js';
import { playSound, sfx_bladeStick } from '../audio.js';
import { TILE_SIZE } from '../constants.js';
import { FIRST_OF_KIND, LAST_OF_KIND, TileKind } from '../tiles.js';

/**
 * A razor wheel that the boss throws.
 */
export class Projectile extends Body {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 */
	constructor(world, x, y, vx, vy) {
		super(world, x, y, TILE_SIZE, TILE_SIZE);
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {boolean} True after the wheel hit something. */
		this.needKill = false;
		/** @type {number} Ticks until the stopped wheel goes away. */
		this.timer = 0;
		/** @type {number} The tile id of the wheel frame to draw. */
		this.frame = FIRST_OF_KIND[TileKind.WHEEL];
	}

	/**
	 * Move the wheel for one tick and stop it when it hits a wall, a platform or a crate.
	 *
	 * @returns {void}
	 */
	move() {
		if (this.needKill) {
			this.timer = Math.max(this.timer - 1, 0);
			return;
		}

		this.x += this.vx;
		this.y += this.vy;
		if (this.world.time % 6 === 0 && ++this.frame > LAST_OF_KIND[TileKind.WHEEL]) {
			this.frame = FIRST_OF_KIND[TileKind.WHEEL];
		}

		const hit = this.world.getTile(this.pixelX + TILE_SIZE / 2, this.pixelY + TILE_SIZE / 2);
		if (hit) {
			// a wheel sticks in a wall for a while, and goes away at once at an object
			this.needKill = true;
			if (hit instanceof Body) {
				this.timer = 0;
			} else {
				this.timer = 180;
				playSound(sfx_bladeStick);
			}
			return;
		}

		// a crate at a corner of the wheel stops it
		const x = this.pixelX;
		const y = this.pixelY;
		const corners = [
			[x, y],
			[x + TILE_SIZE, y],
			[x, y + TILE_SIZE],
			[x + TILE_SIZE, y + TILE_SIZE],
		];
		if (corners.some(([cx, cy]) => this.world.anyCrateAt(cx, cy))) this.needKill = true;
	}
}
