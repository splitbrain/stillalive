/**
 * The Portal object and its helper functions.
 */

import { game } from '../state.js';

/**
 * One of the two portals. The game has a blue portal with index 0 and a red portal with index 1.
 */
export class Portal {
	/**
	 * Create a portal that is not placed.
	 */
	constructor() {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = 0;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = 0;
		/** @type {number} The horizontal speed of the portal shot in 1/256 pixels per step. */
		this.vx = 0;
		/** @type {number} The vertical speed of the portal shot in 1/256 pixels per step. */
		this.vy = 0;
		/** @type {number} The horizontal size of the opening animation, from 0 to 1. */
		this.scaleX = 1;
		/** @type {number} The vertical size of the opening animation, from 0 to 1. */
		this.scaleY = 1;
		/** @type {boolean} True while the portal is placed on a wall. */
		this.used = false;
		/**
		 * @type {number} The side of the wall that the portal is on: Direction.UP, Direction.DOWN, Direction.LEFT or
		 * Direction.RIGHT.
		 */
		this.direction = 0;
		/** @type {number} The index of the platform that the portal is on, or -1. */
		this.platformIndex = -1;
		/** @type {number} The frame of the portal animation. */
		this.frame = 0;
	}

	/**
	 * Move the portal with its platform.
	 *
	 * @returns {void}
	 */
	move() {
		if (this.used && this.platformIndex > -1) {
			this.x += game.platforms[this.platformIndex].vx;
		}
	}
}

/**
 * Advance the opening animation of the placed portals and move them with their platforms.
 *
 * @returns {void}
 */
export function updatePortals() {
	for (const p of game.portals) {
		if (!p.used) continue;
		if (p.scaleX < 1) p.scaleX += 0.1;
		else if (p.scaleY < 1) p.scaleY += 0.1;
		p.move();
	}
}
