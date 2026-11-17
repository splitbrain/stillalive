/**
 * The Body object and its helper functions.
 */

import { Direction, DIRECTIONS, Ground, TILE_SIZE } from '../constants.js';
import { inForceFieldRange, isDeadlyTile, isTileKind, Tile, TileKind } from '../map/tiles.js';
import { toPixels, toSubpixels } from '../utils.js';

/**
 * @type {Array<{side: number, opposite: number, dx: number, dy: number}>} The sides in the order in which
 *     checkCollisions() resolves them, with the step of one pixel that moves the object away from the side.
 */
const PUSH_OUT = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT].map((side) => {
	const opposite = DIRECTIONS[side].opposite;
	return { side, opposite, dx: toSubpixels(DIRECTIONS[opposite].dx), dy: toSubpixels(DIRECTIONS[opposite].dy) };
});

/**
 * @typedef {(vx: number, vy: number) => number[]} SpeedTurn A function that gets the speeds of an object before a
 *     teleport and returns the speeds [vx, vy] after the teleport.
 */

/** @type {SpeedTurn} The turn that keeps the speeds. */
export const KEEP_SPEED = (vx, vy) => [vx, vy];

/**
 * @type {Object<number, Object<number, SpeedTurn>>} The turns of the speed after a teleport, by the direction of the
 *     entry portal and then by the direction of the exit portal.
 */
const TELEPORT_TURNS = {
	[Direction.UP]: {
		[Direction.UP]: (vx) => [vx, 650],
		[Direction.DOWN]: (vx) => [vx, -1000],
		[Direction.LEFT]: (vx, vy) => [650, vy],
		[Direction.RIGHT]: (vx, vy) => [-650, vy],
	},
	[Direction.DOWN]: {
		[Direction.UP]: KEEP_SPEED,
		[Direction.DOWN]: (vx, vy) => [vx, Math.min(-vy, -1100)],
		[Direction.LEFT]: (vx, vy) => [vy, vx],
		[Direction.RIGHT]: (vx, vy) => [-vy, vx],
	},
	[Direction.LEFT]: {
		[Direction.UP]: (vx) => [vx, 650],
		[Direction.DOWN]: (vx) => [vx, -1000],
		[Direction.LEFT]: (vx, vy) => [1000, vy],
		[Direction.RIGHT]: (vx, vy) => [-650, vy],
	},
	[Direction.RIGHT]: {
		[Direction.UP]: (vx) => [vx, 650],
		[Direction.DOWN]: (vx) => [vx, -1000],
		[Direction.LEFT]: (vx, vy) => [650, vy],
		[Direction.RIGHT]: (vx, vy) => [-1000, vy],
	},
};

/**
 * An object with a position and a size in the playfield. The base of the objects that move and collide.
 */
export class Body {
	/**
	 * @param {import('../world/World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} width The width in pixels.
	 * @param {number} height The height in pixels.
	 */
	constructor(world, x, y, width, height) {
		/** @type {import('../world/World.js').World} The World of the object. */
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
	 * Get the horizontal center of the object.
	 *
	 * @returns {number} The x coordinate of the center in pixels.
	 */
	midX() {
		return this.pixelX + (this.width >> 1);
	}

	/**
	 * Get the vertical center of the object.
	 *
	 * @returns {number} The y coordinate of the center in pixels.
	 */
	midY() {
		return this.pixelY + (this.height >> 1);
	}

	/**
	 * Check if a point is inside the object.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {boolean} True if the point is inside the object.
	 */
	contains(x, y) {
		const left = this.pixelX;
		const top = this.pixelY;
		return x >= left && x < left + this.width && y >= top && y < top + this.height;
	}

	/**
	 * Check if the object overlaps a box.
	 *
	 * @param {number} x The left edge of the box in pixels.
	 * @param {number} y The top edge of the box in pixels.
	 * @param {number} width The width of the box in pixels.
	 * @param {number} height The height of the box in pixels.
	 * @returns {boolean} True if the object and the box overlap.
	 */
	overlapsBox(x, y, width, height) {
		const left = this.pixelX;
		const top = this.pixelY;
		return left + this.width > x && x + width > left && top + this.height > y && y + height > top;
	}

	/**
	 * Check if the object overlaps another object.
	 *
	 * @param {Body} other The other object.
	 * @returns {boolean} True if the two objects overlap.
	 */
	overlaps(other) {
		return this.overlapsBox(other.pixelX, other.pixelY, other.width, other.height);
	}

	/**
	 * Check what the object stands on. The object must have the vertical speed vy.
	 *
	 * @returns {number} The ground, a value of Ground.
	 */
	touchingGround() {
		if (this.vy < 0) return Ground.AIR;
		const y = this.pixelY + this.height;
		const hit = this.world.getTile(this.pixelX + 1, y);
		const hit2 = this.world.getTile(this.pixelX + this.width - 1, y);

		if (isTileKind(hit, TileKind.BELT_RIGHT) || isTileKind(hit2, TileKind.BELT_RIGHT)) return Ground.BELT_RIGHT;
		if (isTileKind(hit, TileKind.BELT_LEFT) || isTileKind(hit2, TileKind.BELT_LEFT)) return Ground.BELT_LEFT;
		if (hit === Tile.ICYWALL || hit2 === Tile.ICYWALL) return Ground.ICE;
		return hit || hit2 ? Ground.FLOOR : Ground.AIR;
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
	 * Check if a force field tile is on the diagonal line through the object.
	 *
	 * @returns {boolean} True if the object touches a force field tile.
	 */
	inForceField() {
		for (let j = 0; j <= this.width - 1; j += 2) {
			const tile = this.world.map.atPixel(this.pixelX + j, this.pixelY + j);
			if (inForceFieldRange(tile)) return true;
		}
		return false;
	}

	/**
	 * Get the first solid point in a row as wide as the object.
	 *
	 * @param {number} x The x coordinate of the first point in pixels.
	 * @param {number} y The y coordinate of the row in pixels.
	 * @returns {import('../world/World.js').Solid} The tile id or the object of the first solid point, else Tile.EMPTY.
	 */
	#firstSolidInRow(x, y) {
		for (let i = x; i < x + this.width; i++) {
			const tile = this.world.getTile(i, y);
			if (tile) return tile;
		}
		return Tile.EMPTY;
	}

	/**
	 * Get the first solid point in a column as high as the object.
	 *
	 * @param {number} x The x coordinate of the column in pixels.
	 * @param {number} y The y coordinate of the first point in pixels.
	 * @returns {import('../world/World.js').Solid} The tile id or the object of the first solid point, else Tile.EMPTY.
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
	 * Get the solid tile in the bottom row of the object.
	 *
	 * @returns {import('../world/World.js').Solid} The tile id or the object of the first solid point along the bottom edge,
	 *     else Tile.EMPTY.
	 */
	downCollision() {
		return this.#firstSolidInRow(this.pixelX, this.pixelY + this.height - 1);
	}

	/**
	 * Get the solid tile in the top row of the object.
	 *
	 * @returns {import('../world/World.js').Solid} The tile id or the object of the first solid point along the top edge,
	 *     else Tile.EMPTY.
	 */
	upCollision() {
		return this.#firstSolidInRow(this.pixelX, this.pixelY);
	}

	/**
	 * Get the solid tile left of the object.
	 *
	 * @returns {import('../world/World.js').Solid} The tile id or the object of the first solid point along the left edge,
	 *     else Tile.EMPTY.
	 */
	leftCollision() {
		return this.#firstSolidInColumn(this.pixelX - 1, this.pixelY);
	}

	/**
	 * Get the solid tile right of the object.
	 *
	 * @returns {import('../world/World.js').Solid} The tile id or the object of the first solid point along the right edge,
	 *     else Tile.EMPTY.
	 */
	rightCollision() {
		return this.#firstSolidInColumn(this.pixelX + this.width, this.pixelY);
	}

	/**
	 * Find the side of the object with the most points in solid tiles. If two sides have the same number of points,
	 * the side with the lower direction wins.
	 *
	 * @returns {number} Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT, or -1 if the object touches
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

	/**
	 * Push the object out of the solid tiles and stop its speed in that direction. The object must have the speeds vx
	 * and vy.
	 *
	 * @returns {boolean} True if a collision was resolved, false if there was none or the object is stuck between two
	 *     sides.
	 */
	checkCollisions() {
		for (const { side, opposite, dx, dy } of PUSH_OUT) {
			if (this.getCollision() !== side) continue;
			this.#stopAgainst(side);
			if (this.#pushOut(side, opposite, dx, dy)) return true;
		}
		return false;
	}

	/**
	 * Stop the speed towards a side that touches a solid tile. A hit at the top also halves the horizontal speed.
	 *
	 * @param {number} side The side, a value of Direction.
	 * @returns {void}
	 */
	#stopAgainst(side) {
		const { dx, dy, horizontal } = DIRECTIONS[side];
		if (horizontal) {
			if (this.vx * dx > 0) this.vx = 0;
		} else if (this.vy * dy > 0) {
			if (side === Direction.UP) this.vx >>= 1;
			this.vy = 0;
		}
	}

	/**
	 * Move the object away from a side in steps of one pixel until the side is free.
	 *
	 * @param {number} side The side that touches a solid tile, a value of Direction.
	 * @param {number} opposite The opposite side.
	 * @param {number} dx The horizontal step in 1/256 pixels.
	 * @param {number} dy The vertical step in 1/256 pixels.
	 * @returns {boolean} True if the side is free, false if the object is stuck because the opposite side touches a
	 *     solid tile. A stuck object between two side walls also stops falling.
	 */
	#pushOut(side, opposite, dx, dy) {
		do {
			this.x += dx;
			this.y += dy;
			if (this.getCollision() === opposite) {
				if (dx !== 0) this.vy = 0;
				return false;
			}
		} while (this.getCollision() === side);
		return true;
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
	 * @param {import('../portals/Portal.js').Portal} portal The portal.
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {void}
	 */
	alignToPortal(portal, side) {
		if (DIRECTIONS[side].horizontal) {
			const gap = (2 * TILE_SIZE - this.height) >> 1;
			this.y = toSubpixels(toPixels(portal.y) + gap);
			this.vy = 0;
		} else {
			this.x = toSubpixels(toPixels(portal.x) + TILE_SIZE / 2);
		}
	}

	/**
	 * Turn the speed of the object to the direction of the exit portal after a teleport. The object must have the
	 * speeds vx and vy.
	 *
	 * @param {import('../portals/Portal.js').Portal} entry The portal that the object entered.
	 * @param {import('../portals/Portal.js').Portal} exit The portal that the object came out of.
	 * @returns {void}
	 */
	teleported(entry, exit) {
		[this.vx, this.vy] = TELEPORT_TURNS[entry.direction][exit.direction](this.vx, this.vy);
	}
}
