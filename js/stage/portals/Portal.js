/**
 * The Portal object.
 */

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
		/** @type {import('../bodies/Platform.js').Platform|null} The platform that the portal is on, or null. */
		this.platform = null;
		/** @type {number} The frame of the portal animation. */
		this.frame = 0;
	}

	/**
	 * Advance the opening animation of the portal: first the width grows, then the height.
	 *
	 * @returns {void}
	 */
	animate() {
		if (this.scaleX < 1) this.scaleX += 0.1;
		else if (this.scaleY < 1) this.scaleY += 0.1;
	}

	/**
	 * Move the portal with its platform.
	 *
	 * @returns {void}
	 */
	move() {
		if (this.used && this.platform) {
			this.x += this.platform.vx;
		}
	}
}
