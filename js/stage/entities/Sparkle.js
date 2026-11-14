/**
 * The Sparkle object.
 */

/**
 * A particle for a visual effect. The subclasses add the fade and the fall of each kind of sparkle.
 */
export class Sparkle {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {number} fading The start value of the fade, which also sets the size.
	 * @param {number} color The row of the sparkle image: 0 blue star, 1 red star, 2 cake crumb, 3 smoke, 4 blood.
	 */
	constructor(world, x, y, vx, vy, fading, color) {
		/** @type {import('../World.js').World} The World of the object. */
		this.world = world;
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {number} The row of the sparkle image: 0 blue star, 1 red star, 2 cake crumb, 3 smoke, 4 blood. */
		this.color = color;
		/** @type {number} The remaining visibility and size. The World removes the sparkle at 0 or less. */
		this.fading = fading;
		/** @type {number} The pixels that the drawing adds to the x and the y position. */
		this.drawOffset = 0;
	}

	/**
	 * Move the sparkle by its speed for one tick. The subclasses add their fade.
	 *
	 * @returns {void}
	 */
	move() {
		this.x += this.vx;
		this.y += this.vy;
	}
}
