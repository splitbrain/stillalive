/**
 * The Tunnel object and its helper functions.
 */

export class Tunnel {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} dir The direction of the push: HAUT, BAS, GAUCHE or DROITE.
	 */
	constructor(x, y, dir) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The direction of the push: HAUT, BAS, GAUCHE or DROITE. */
		this.dir = dir;
		/** @type {number} The width in pixels. */
		this.pX = 16;
		/** @type {number} The height in pixels. */
		this.pY = 32;
		/** @type {number} Always 0. */
		this.vx = 0;
		/** @type {number} Always 0. */
		this.vy = 0;
	}
}
