/**
 * The Tunnel object and its helper functions.
 */

export class Tunnel {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} dir The direction of the push: Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT.
	 */
	constructor(x, y, dir) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The direction of the push: Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT. */
		this.dir = dir;
		/** @type {number} The width in pixels. */
		this.pX = 16;
		/** @type {number} The height in pixels. */
		this.pY = 32;
	}
}
