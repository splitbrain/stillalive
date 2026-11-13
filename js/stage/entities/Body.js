/**
 * The Body object.
 */

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
}
