/**
 * The RazorWheel object.
 */

import { Body } from './Body.js';
import { MovingBody } from './MovingBody.js';
import { playSound, sfx_razorWheelStick } from '../browser/audio.js';
import { TILE_SIZE } from '../constants.js';
import { FIRST_OF_KIND, LAST_OF_KIND, TileKind } from '../map/tiles.js';

/**
 * A razor wheel that the boss throws.
 */
export class RazorWheel extends MovingBody {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 */
	constructor(world, x, y, vx, vy) {
		super(world, x, y, TILE_SIZE, TILE_SIZE);
		this.vx = vx;
		this.vy = vy;
		/** @type {boolean} True after the razor wheel hit something. */
		this.needKill = false;
		/** @type {number} Ticks until the stopped razor wheel goes away. */
		this.timer = 0;
		/** @type {number} The tile id of the razor wheel frame to draw. */
		this.frame = FIRST_OF_KIND[TileKind.RAZOR_WHEEL];
	}

	/**
	 * Check if the razor wheel went away.
	 *
	 * @returns {boolean} True after the razor wheel stopped and its timer ended.
	 */
	get gone() {
		return this.needKill && this.timer === 0;
	}

	/**
	 * Move the razor wheel for one tick. A wall, a platform or a crate stops it. A razor wheel that still flies kills
	 * the player on contact and goes away.
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
		if (this.world.time % 6 === 0 && ++this.frame > LAST_OF_KIND[TileKind.RAZOR_WHEEL]) {
			this.frame = FIRST_OF_KIND[TileKind.RAZOR_WHEEL];
		}

		const hit = this.world.getTile(this.pixelX + TILE_SIZE / 2, this.pixelY + TILE_SIZE / 2);
		if (hit) {
			// a razor wheel sticks in a wall for a while, and goes away at once at a body
			this.needKill = true;
			if (hit instanceof Body) {
				this.timer = 0;
			} else {
				this.timer = 180;
				playSound(sfx_razorWheelStick);
			}
			return;
		}

		// a crate at a corner of the razor wheel stops it
		const x = this.pixelX;
		const y = this.pixelY;
		const corners = [
			[x, y],
			[x + TILE_SIZE, y],
			[x, y + TILE_SIZE],
			[x + TILE_SIZE, y + TILE_SIZE],
		];
		if (corners.some(([cx, cy]) => this.world.anyCrateAt(cx, cy))) {
			this.needKill = true;
			return;
		}

		if (this.overlaps(this.world.player)) {
			this.world.player.takeFatalHit();
			this.needKill = true;
			this.timer = 0;
		}
	}
}
