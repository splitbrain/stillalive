/**
 * The Camera object.
 */

import { toSubpixels } from '../utils.js';

/**
 * The security camera that follows the player.
 */
export class Camera {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(world, x, y) {
		/** @type {import('../World.js').World} The World of the object. */
		this.world = world;
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} The direction of the swing, 1 or -1. */
		this.inert = 1;
		/** @type {number} The speed of the swing in 1/256 pixels per tick. */
		this.dy = 0;
	}

	/**
	 * Move the camera towards a point near the player and let it swing.
	 *
	 * @returns {void}
	 */
	move() {
		this.x += this.vx;
		this.y += this.vy;

		const angle = this.world.player.flip === -1 ? 335 : 185;
		const dx = this.world.player.x + Math.cos((angle / 180) * Math.PI) * toSubpixels(40);
		const dy = this.world.player.y + Math.sin((angle / 180) * Math.PI) * toSubpixels(40);

		this.vx = (dx - this.x) >> 4;
		this.vy = (dy - this.y) >> 4;

		this.dy += this.inert * 6;
		this.y += this.dy;
		if (this.dy >= 64) this.inert = -this.inert;
		else if (this.dy <= -64) this.inert = -this.inert;
	}
}
