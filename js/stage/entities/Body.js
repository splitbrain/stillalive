/**
 * The Body object.
 */

import { Direction, TILE_SIZE } from '../constants.js';

/**
 * An object with a position and a size in the playfield. The base of the objects that move and collide.
 */
export class Body {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} pX The width in pixels.
	 * @param {number} pY The height in pixels.
	 */
	constructor(x, y, pX, pY) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The width in pixels. */
		this.pX = pX;
		/** @type {number} The height in pixels. */
		this.pY = pY;
	}

	/**
	 * Get the horizontal center of the object.
	 *
	 * @returns {number} The x coordinate of the center in pixels.
	 */
	midX() {
		return (this.x >> 8) + (this.pX >> 1);
	}

	/**
	 * Get the vertical center of the object.
	 *
	 * @returns {number} The y coordinate of the center in pixels.
	 */
	midY() {
		return (this.y >> 8) + (this.pY >> 1);
	}

	/**
	 * Check if a point is inside the object.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {boolean} True if the point is inside the object.
	 */
	contains(x, y) {
		const left = this.x >> 8;
		const top = this.y >> 8;
		return x >= left && x < left + this.pX && y >= top && y < top + this.pY;
	}

	/**
	 * Check if the object overlaps a box.
	 *
	 * @param {number} x The left edge of the box in pixels.
	 * @param {number} y The top edge of the box in pixels.
	 * @param {number} w The width of the box in pixels.
	 * @param {number} h The height of the box in pixels.
	 * @returns {boolean} True if the object and the box overlap.
	 */
	overlapsBox(x, y, w, h) {
		const left = this.x >> 8;
		const top = this.y >> 8;
		return left + this.pX > x && x + w > left && top + this.pY > y && y + h > top;
	}

	/**
	 * Check if the object overlaps another object.
	 *
	 * @param {Body} other The other object.
	 * @returns {boolean} True if the two objects overlap.
	 */
	overlaps(other) {
		return this.overlapsBox(other.x >> 8, other.y >> 8, other.pX, other.pY);
	}

	/**
	 * Check if the object can go into a portal on one side.
	 *
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {boolean} True if the object can go into the portal.
	 */
	// eslint-disable-next-line no-unused-vars
	canEnterPortal(side) {
		return true;
	}

	/**
	 * Move the object to the middle of a portal that it goes into. At a portal in a side wall, the object loses its
	 * vertical speed. The object must have the speeds vx and vy.
	 *
	 * @param {import('./Portal.js').Portal} portal The portal.
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {void}
	 */
	alignToPortal(portal, side) {
		if (side == Direction.LEFT || side == Direction.RIGHT) {
			const gap = (2 * TILE_SIZE - this.pY) >> 1;
			this.y = ((portal.y >> 8) + gap) << 8;
			this.vy = 0;
		} else {
			this.x = ((portal.x >> 8) + TILE_SIZE / 2) << 8;
		}
	}

	/**
	 * Turn the speed of the object to the direction of the exit portal after a teleport. The object must have the
	 * speeds vx and vy.
	 *
	 * @param {import('./Portal.js').Portal} entry The portal that the object entered.
	 * @param {import('./Portal.js').Portal} exit The portal that the object came out of.
	 * @returns {void}
	 */
	teleported(entry, exit) {
		let swap;
		const from = entry.direction;
		const to = exit.direction;
		if (from == Direction.DOWN && to == Direction.DOWN) {
			this.vy = -this.vy;
			if (this.vy > -1100) this.vy = -1100;
		} else if (from == Direction.DOWN && to == Direction.LEFT) {
			swap = this.vx;
			this.vx = this.vy;
			this.vy = swap;
		} else if (from == Direction.DOWN && to == Direction.RIGHT) {
			swap = this.vx;
			this.vx = -this.vy;
			this.vy = swap;
		} else if (from == Direction.LEFT && to == Direction.DOWN) {
			this.vy = -1000;
		} else if (from == Direction.RIGHT && to == Direction.DOWN) {
			this.vy = -1000;
		} else if (from == Direction.RIGHT && to == Direction.RIGHT) {
			this.vx = -1000;
		} else if (from == Direction.LEFT && to == Direction.LEFT) {
			this.vx = 1000;
		} else if (from == Direction.UP && to == Direction.UP) {
			this.vy = 650;
		} else if (from == Direction.LEFT && to == Direction.RIGHT) {
			this.vx = -650;
		} else if (from == Direction.RIGHT && to == Direction.LEFT) {
			this.vx = 650;
		} else if (from == Direction.RIGHT && to == Direction.UP) {
			this.vy = 650;
		} else if (from == Direction.LEFT && to == Direction.UP) {
			this.vy = 650;
		} else if (from == Direction.UP && to == Direction.LEFT) {
			this.vx = 650;
		} else if (from == Direction.UP && to == Direction.RIGHT) {
			this.vx = -650;
		} else if (from == Direction.UP && to == Direction.DOWN) {
			this.vy = -1000;
		}
	}
}
