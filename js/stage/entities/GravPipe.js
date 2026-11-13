/**
 * The GravPipe object.
 */

import { TILE_SIZE } from '../constants.js';

/**
 * A gravitational pipe that pushes objects in one direction.
 */
export class GravPipe {
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
		this.pX = TILE_SIZE;
		/** @type {number} The height in pixels. */
		this.pY = 2 * TILE_SIZE;
	}
}
