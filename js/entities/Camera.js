/**
 * The Camera object and its helper functions.
 */

import { game } from '../state.js';

/**
 * The security camera that follows the player with its look.
 */
export class Camera {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(x, y) {
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

		let angle;

		if (game.perso.flip == -1) {
			angle = 335;
		} else {
			angle = 185;
		}

		const dx = game.perso.x + Math.cos((angle / 180) * Math.PI) * (40 << 8);
		const dy = game.perso.y + Math.sin((angle / 180) * Math.PI) * (40 << 8);

		this.vx = (dx - this.x) >> 4;
		this.vy = (dy - this.y) >> 4;

		this.dy += this.inert * 6;
		this.y += this.dy;
		if (this.dy >= 64) this.inert = -this.inert;
		else if (this.dy <= -64) this.inert = -this.inert;
	}
}
