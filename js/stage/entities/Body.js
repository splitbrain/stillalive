/**
 * The Body object.
 */

import { Direction, TILE_SIZE } from '../constants.js';
import { inForceFieldRange, isDeadlyTile, isTileKind, Tile, TileKind } from '../tiles.js';

/**
 * An object with a position and a size in the playfield. The base of the objects that move and collide.
 */
export class Body {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} pX The width in pixels.
	 * @param {number} pY The height in pixels.
	 */
	constructor(world, x, y, pX, pY) {
		/** @type {import('../World.js').World} The World of the object. */
		this.world = world;
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
	 * Check what the object stands on. The object must have the vertical speed vy.
	 *
	 * @returns {number} 0 if the object is in the air, 1 for normal ground, 2 for an icy wall, 3 for a conveyor belt to
	 *     the right and 4 for a conveyor belt to the left.
	 */
	touchingGround() {
		const world = this.world;
		if (this.vy >= 0) {
			const hit = world.getTile((this.x >> 8) + 1, (this.y >> 8) + this.pY);
			const hit2 = world.getTile((this.x >> 8) + this.pX - 1, (this.y >> 8) + this.pY);

			if (isTileKind(hit, TileKind.BELT_RIGHT) || isTileKind(hit2, TileKind.BELT_RIGHT)) return 3;
			if (isTileKind(hit, TileKind.BELT_LEFT) || isTileKind(hit2, TileKind.BELT_LEFT)) return 4;
			if (hit == Tile.ICYWALL || hit2 == Tile.ICYWALL) return 2;
			else if (hit || hit2) return 1;
		}
		return 0;
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
	 * Check if the object touches a deadly tile at one of its six test points.
	 *
	 * @returns {number} The id of the deadly tile that the object touches, or 0.
	 */
	touchesDeadlyTile() {
		const x = this.x >> 8;
		const y = this.y >> 8;
		const pX = this.pX;
		const pY = this.pY;

		return (
			this.#pointOnDeadlyTile(x, y) ||
			this.#pointOnDeadlyTile(x + pX - 1, y) ||
			this.#pointOnDeadlyTile(x, y + (pY >> 1)) ||
			this.#pointOnDeadlyTile(x, y + pY - 6) ||
			this.#pointOnDeadlyTile(x + pX - 1, y + (pY >> 1)) ||
			this.#pointOnDeadlyTile(x + pX - 1, y + pY - 6)
		);
	}

	/**
	 * Check if a force field tile is on the diagonal line through the object.
	 *
	 * @returns {boolean} True if the object touches a force field tile.
	 */
	inForceField() {
		for (let j = 0; j <= this.pX - 1; j += 2) {
			const t = this.world.map.atPixel((this.x >> 8) + j, (this.y >> 8) + j);
			if (inForceFieldRange(t)) return true;
		}
		return false;
	}

	/**
	 * Get the first solid point in a row as wide as the object.
	 *
	 * @param {number} x The x coordinate of the first point in pixels.
	 * @param {number} y The y coordinate of the row in pixels.
	 * @returns {import('../World.js').Solid} The tile id or the object of the first solid point, else Tile.EMPTY.
	 */
	#firstSolidInRow(x, y) {
		for (let i = x; i < x + this.pX; i++) {
			const tile = this.world.getTile(i, y);
			if (tile) return tile;
		}
		return 0;
	}

	/**
	 * Get the first solid point in a column as high as the object.
	 *
	 * @param {number} x The x coordinate of the column in pixels.
	 * @param {number} y The y coordinate of the first point in pixels.
	 * @returns {import('../World.js').Solid} The tile id or the object of the first solid point, else Tile.EMPTY.
	 */
	#firstSolidInColumn(x, y) {
		for (let i = y; i < y + this.pY; i++) {
			const tile = this.world.getTile(x, i);
			if (tile) return tile;
		}
		return 0;
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
	 * Get the solid tile in the bottom row of the object.
	 *
	 * @returns {import('../World.js').Solid} The tile id or the object of the first solid point along the bottom edge,
	 *     else Tile.EMPTY.
	 */
	downCollision() {
		return this.#firstSolidInRow(this.x >> 8, (this.y >> 8) + this.pY - 1);
	}

	/**
	 * Get the solid tile in the top row of the object.
	 *
	 * @returns {import('../World.js').Solid} The tile id or the object of the first solid point along the top edge,
	 *     else Tile.EMPTY.
	 */
	upCollision() {
		return this.#firstSolidInRow(this.x >> 8, this.y >> 8);
	}

	/**
	 * Get the solid tile left of the object.
	 *
	 * @returns {import('../World.js').Solid} The tile id or the object of the first solid point along the left edge,
	 *     else Tile.EMPTY.
	 */
	leftCollision() {
		return this.#firstSolidInColumn((this.x >> 8) - 1, this.y >> 8);
	}

	/**
	 * Get the solid tile right of the object.
	 *
	 * @returns {import('../World.js').Solid} The tile id or the object of the first solid point along the right edge,
	 *     else Tile.EMPTY.
	 */
	rightCollision() {
		return this.#firstSolidInColumn((this.x >> 8) + this.pX, this.y >> 8);
	}

	/**
	 * Find the side of the object with the most points in solid tiles. If two sides have the same number of points,
	 * the side with the lower direction wins.
	 *
	 * @returns {number} Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT, or -1 if the object touches
	 *     nothing.
	 */
	getCollision() {
		const x = this.x >> 8;
		const y = this.y >> 8;
		// the points of the sides by direction: top, bottom, left, right
		const hits = [
			this.#countSolidInRow(x, x + this.pX, y),
			this.#countSolidInRow(x + 1, x + this.pX - 1, y + this.pY - 1),
			this.#countSolidInColumn(x, y, y + this.pY),
			this.#countSolidInColumn(x + this.pX - 1, y, y + this.pY),
		];
		const most = Math.max(...hits);
		return most == 0 ? -1 : hits.indexOf(most);
	}

	/**
	 * Push the object out of the solid tiles and stop its speed in that direction. The object must have the speeds vx
	 * and vy.
	 *
	 * @returns {boolean} True if a collision was resolved, false if there was none or the object is stuck between two
	 *     sides.
	 */
	checkCollisions() {
		let coll = false;

		if (this.getCollision() == Direction.UP) {
			coll = true;
			if (this.vy < 0) {
				this.vx >>= 1;
				this.vy = 0;
			}
			do {
				this.y += 256;
				if (this.getCollision() == Direction.DOWN) {
					coll = false;
					break;
				}
			} while (this.getCollision() == Direction.UP);
		}

		if (!coll && this.getCollision() == Direction.DOWN) {
			coll = true;
			if (this.vy > 0) {
				this.vy = 0;
			}
			do {
				this.y -= 256;
				if (this.getCollision() == Direction.UP) {
					coll = false;
					break;
				}
			} while (this.getCollision() == Direction.DOWN);
		}

		if (!coll && this.getCollision() == Direction.LEFT) {
			coll = true;
			if (this.vx < 0) this.vx = 0;
			do {
				this.x += 256;
				if (this.getCollision() == Direction.RIGHT) {
					coll = false;
					this.vy = 0;
					break;
				}
			} while (this.getCollision() == Direction.LEFT);
		}

		if (!coll && this.getCollision() == Direction.RIGHT) {
			coll = true;
			if (this.vx > 0) this.vx = 0;
			do {
				this.x -= 256;
				if (this.getCollision() == Direction.LEFT) {
					coll = false;
					this.vy = 0;
					break;
				}
			} while (this.getCollision() == Direction.RIGHT);
		}

		return coll;
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
		const from = entry.direction;
		const to = exit.direction;
		if (from == Direction.DOWN && to == Direction.DOWN) {
			this.vy = -this.vy;
			if (this.vy > -1100) this.vy = -1100;
		} else if (from == Direction.DOWN && to == Direction.LEFT) {
			[this.vx, this.vy] = [this.vy, this.vx];
		} else if (from == Direction.DOWN && to == Direction.RIGHT) {
			[this.vx, this.vy] = [-this.vy, this.vx];
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
