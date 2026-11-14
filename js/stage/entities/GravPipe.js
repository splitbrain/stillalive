/**
 * The GravPipe object.
 */

import { Body } from './Body.js';
import { TILE_SIZE } from '../constants.js';

/**
 * A gravitational pipe that pushes objects in one direction.
 */
export class GravPipe extends Body {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} dir The direction of the push: Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT.
	 */
	constructor(world, x, y, dir) {
		super(world, x, y, TILE_SIZE, 2 * TILE_SIZE);
		/** @type {number} The direction of the push: Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT. */
		this.dir = dir;
	}
}
