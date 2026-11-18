/**
 * The Body object.
 */

import { inForceFieldRange, isDeadlyTile, Tile } from '../map/tiles.js';
import { toPixels } from '../utils.js';

/**
 * A body is a thing in the playfield with a position and a size that takes part in the physics of the level. Most
 * bodies move and collide with the tiles. A static body, e.g. a gravitational pipe, stays at its place, and the box of
 * the boss is the hit box for the crates. A body with a speed is a MovingBody.
 */
export class Body {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} width The width in pixels.
	 * @param {number} height The height in pixels.
	 */
	constructor(world, x, y, width, height) {
		/** @type {import('../world/World.js').World} The World of the body. */
		this.world = world;
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The width in pixels. */
		this.width = width;
		/** @type {number} The height in pixels. */
		this.height = height;
	}

	/**
	 * Get the x position in whole pixels.
	 *
	 * @returns {number} The left edge in pixels.
	 */
	get pixelX() {
		return toPixels(this.x);
	}

	/**
	 * Get the y position in whole pixels.
	 *
	 * @returns {number} The top edge in pixels.
	 */
	get pixelY() {
		return toPixels(this.y);
	}

	/**
	 * Get the horizontal center of the body.
	 *
	 * @returns {number} The x coordinate of the center in pixels.
	 */
	midX() {
		return this.pixelX + (this.width >> 1);
	}

	/**
	 * Get the vertical center of the body.
	 *
	 * @returns {number} The y coordinate of the center in pixels.
	 */
	midY() {
		return this.pixelY + (this.height >> 1);
	}

	/**
	 * Check if a point is inside the body.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {boolean} True if the point is inside the body.
	 */
	contains(x, y) {
		const left = this.pixelX;
		const top = this.pixelY;
		return x >= left && x < left + this.width && y >= top && y < top + this.height;
	}

	/**
	 * Check if the body overlaps a box.
	 *
	 * @param {number} x The left edge of the box in pixels.
	 * @param {number} y The top edge of the box in pixels.
	 * @param {number} width The width of the box in pixels.
	 * @param {number} height The height of the box in pixels.
	 * @returns {boolean} True if the body and the box overlap.
	 */
	overlapsBox(x, y, width, height) {
		const left = this.pixelX;
		const top = this.pixelY;
		return left + this.width > x && x + width > left && top + this.height > y && y + height > top;
	}

	/**
	 * Check if the body overlaps another body.
	 *
	 * @param {Body} other The other body.
	 * @returns {boolean} True if the two bodies overlap.
	 */
	overlaps(other) {
		return this.overlapsBox(other.pixelX, other.pixelY, other.width, other.height);
	}

	/**
	 * Check if a point is on a deadly tile.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {number} The id of the deadly tile at the point, or 0.
	 */
	#pointOnDeadlyTile(x, y) {
		const tile = this.world.map.atPixel(x, y);
		return isDeadlyTile(tile) ? tile : 0;
	}

	/**
	 * Check if the body touches a deadly tile at one of its six test points.
	 *
	 * @returns {number} The id of the deadly tile that the body touches, or 0.
	 */
	touchesDeadlyTile() {
		const x = this.pixelX;
		const y = this.pixelY;
		const width = this.width;
		const height = this.height;

		return (
			this.#pointOnDeadlyTile(x, y) ||
			this.#pointOnDeadlyTile(x + width - 1, y) ||
			this.#pointOnDeadlyTile(x, y + (height >> 1)) ||
			this.#pointOnDeadlyTile(x, y + height - 6) ||
			this.#pointOnDeadlyTile(x + width - 1, y + (height >> 1)) ||
			this.#pointOnDeadlyTile(x + width - 1, y + height - 6)
		);
	}

	/**
	 * Check if a force field tile is on the diagonal line through the body.
	 *
	 * @returns {boolean} True if the body touches a force field tile.
	 */
	inForceField() {
		for (let j = 0; j <= this.width - 1; j += 2) {
			const tile = this.world.map.atPixel(this.pixelX + j, this.pixelY + j);
			if (inForceFieldRange(tile)) return true;
		}
		return false;
	}

	/**
	 * Get the first solid point in a row as wide as the body.
	 *
	 * @param {number} x The x coordinate of the first point in pixels.
	 * @param {number} y The y coordinate of the row in pixels.
	 * @returns {import('../world/World.js').Solid} The tile id or the body of the first solid point, else Tile.EMPTY.
	 */
	#firstSolidInRow(x, y) {
		for (let i = x; i < x + this.width; i++) {
			const tile = this.world.getTile(i, y);
			if (tile) return tile;
		}
		return Tile.EMPTY;
	}

	/**
	 * Get the first solid point in a column as high as the body.
	 *
	 * @param {number} x The x coordinate of the column in pixels.
	 * @param {number} y The y coordinate of the first point in pixels.
	 * @returns {import('../world/World.js').Solid} The tile id or the body of the first solid point, else Tile.EMPTY.
	 */
	#firstSolidInColumn(x, y) {
		for (let i = y; i < y + this.height; i++) {
			const tile = this.world.getTile(x, i);
			if (tile) return tile;
		}
		return Tile.EMPTY;
	}

	/**
	 * Count the solid points at every second pixel of a row.
	 *
	 * @param {number} from The x coordinate of the first point in pixels.
	 * @param {number} to The x coordinate in pixels where the row ends, not included.
	 * @param {number} y The y coordinate of the row in pixels.
	 * @returns {number} The number of solid points.
	 */
	#countSolidInRow(from, to, y) {
		let count = 0;
		for (let i = from; i < to; i += 2) {
			if (this.world.getTile(i, y)) count++;
		}
		return count;
	}

	/**
	 * Count the solid points at every second pixel of a column.
	 *
	 * @param {number} x The x coordinate of the column in pixels.
	 * @param {number} from The y coordinate of the first point in pixels.
	 * @param {number} to The y coordinate in pixels where the column ends, not included.
	 * @returns {number} The number of solid points.
	 */
	#countSolidInColumn(x, from, to) {
		let count = 0;
		for (let i = from; i < to; i += 2) {
			if (this.world.getTile(x, i)) count++;
		}
		return count;
	}

	/**
	 * Get the solid tile in the bottom row of the body.
	 *
	 * @returns {import('../world/World.js').Solid} The tile id or the body of the first solid point along the bottom edge,
	 *     else Tile.EMPTY.
	 */
	downCollision() {
		return this.#firstSolidInRow(this.pixelX, this.pixelY + this.height - 1);
	}

	/**
	 * Get the solid tile in the top row of the body.
	 *
	 * @returns {import('../world/World.js').Solid} The tile id or the body of the first solid point along the top edge,
	 *     else Tile.EMPTY.
	 */
	upCollision() {
		return this.#firstSolidInRow(this.pixelX, this.pixelY);
	}

	/**
	 * Get the solid tile left of the body.
	 *
	 * @returns {import('../world/World.js').Solid} The tile id or the body of the first solid point along the left edge,
	 *     else Tile.EMPTY.
	 */
	leftCollision() {
		return this.#firstSolidInColumn(this.pixelX - 1, this.pixelY);
	}

	/**
	 * Get the solid tile right of the body.
	 *
	 * @returns {import('../world/World.js').Solid} The tile id or the body of the first solid point along the right edge,
	 *     else Tile.EMPTY.
	 */
	rightCollision() {
		return this.#firstSolidInColumn(this.pixelX + this.width, this.pixelY);
	}

	/**
	 * Find the side of the body with the most points in solid tiles. If two sides have the same number of points,
	 * the side with the lower direction wins.
	 *
	 * @returns {number} Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT, or -1 if the body touches
	 *     nothing.
	 */
	getCollision() {
		const x = this.pixelX;
		const y = this.pixelY;
		// the points of the sides by direction: top, bottom, left, right
		const hits = [
			this.#countSolidInRow(x, x + this.width, y),
			this.#countSolidInRow(x + 1, x + this.width - 1, y + this.height - 1),
			this.#countSolidInColumn(x, y, y + this.height),
			this.#countSolidInColumn(x + this.width - 1, y, y + this.height),
		];
		const most = Math.max(...hits);
		return most === 0 ? -1 : hits.indexOf(most);
	}
}
