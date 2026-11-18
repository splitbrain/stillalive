/**
 * The Platform object.
 */

import { MovingBody } from './MovingBody.js';
import { PLAYFIELD_WIDTH, TILE_SIZE } from '../constants.js';

/**
 * A moving platform. It turns around at walls and at the edges of the playfield.
 */
export class Platform extends MovingBody {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 */
	constructor(world, x, y, vx, vy) {
		super(world, x, y, 3 * TILE_SIZE, TILE_SIZE);
		this.vx = vx;
		this.vy = vy;
		/** @type {number} The direction of the arrow on the platform, 1 right or -1 left. */
		this.dir = vx > 0 ? 1 : -1;
	}

	/**
	 * Move the platform for one tick and turn it around at walls and at the edges of the playfield.
	 *
	 * @returns {void}
	 */
	move() {
		this.x += this.vx;
		const x = this.pixelX;
		if (
			x < 0 ||
			x > PLAYFIELD_WIDTH - 3 * TILE_SIZE ||
			(this.vx > 0 && this.rightCollision()) ||
			(this.vx < 0 && this.leftCollision())
		) {
			this.vx = -this.vx;
		}
	}
}
