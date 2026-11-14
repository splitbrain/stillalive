/**
 * Collision and tile query functions.
 */

import { Direction, TILE_SIZE_BITS } from './constants.js';
import { isInPortal } from './portals.js';
import { game } from './state.js';
import { isDeadlyTile, isTileKind, Tile, TileKind } from './tiles.js';

/**
 * Check what an object stands on.
 *
 * @param {import('./entities/Body.js').Body} obj The object. It must also have the vertical speed vy.
 * @returns {number} 0 if the object is in the air, 1 for normal ground, 2 for an icy wall, 3 for a conveyor belt to
 *     the right and 4 for a conveyor belt to the left.
 */
export function touchingGround(obj) {
	if (obj.vy >= 0) {
		const hit = game.getTile((obj.x >> 8) + 1, (obj.y >> 8) + obj.pY);
		const hit2 = game.getTile((obj.x >> 8) + obj.pX - 1, (obj.y >> 8) + obj.pY);

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
function pointOnDeadlyTile(x, y) {
	const tile = game.map.atPixel(x, y);
	return isDeadlyTile(tile) ? tile : 0;
}

/**
 * Check if an object touches a deadly tile at one of its six test points.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {number} The id of the deadly tile that the object touches, or 0.
 */
export function touchesDeadlyTile(obj) {
	const x = obj.x >> 8;
	const y = obj.y >> 8;
	const pX = obj.pX;
	const pY = obj.pY;

	let hit = pointOnDeadlyTile(x, y);
	if (!hit) hit = pointOnDeadlyTile(x + pX - 1, y);
	if (!hit) hit = pointOnDeadlyTile(x, y + (pY >> 1));
	if (!hit) hit = pointOnDeadlyTile(x, y + pY - 6);
	if (!hit) hit = pointOnDeadlyTile(x + pX - 1, y + (pY >> 1));
	if (!hit) hit = pointOnDeadlyTile(x + pX - 1, y + pY - 6);

	return hit;
}

/**
 * Get the solid tile in the bottom row of an object.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {import('./World.js').Solid} The tile id or the object of the first solid point along the bottom edge,
 *     else Tile.EMPTY.
 */
export function downCollision(obj) {
	const x = obj.x >> 8;
	const y = (obj.y >> 8) + obj.pY - 1;
	const pX = obj.pX;

	let i;
	for (i = x; i < x + pX; i++) {
		const tile = game.getTile(i, y);
		if (tile) return tile;
	}

	return 0;
}

/**
 * Get the solid tile in the top row of an object.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {import('./World.js').Solid} The tile id or the object of the first solid point along the top edge,
 *     else Tile.EMPTY.
 */
export function upCollision(obj) {
	const x = obj.x >> 8;
	const y = obj.y >> 8;
	const pX = obj.pX;

	let i;
	for (i = x; i < x + pX; i++) {
		const tile = game.getTile(i, y);
		if (tile) return tile;
	}

	return 0;
}

/**
 * Get the solid tile left of an object.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {import('./World.js').Solid} The tile id or the object of the first solid point along the left edge,
 *     else Tile.EMPTY.
 */
export function leftCollision(obj) {
	const x = (obj.x >> 8) - 1;
	const y = obj.y >> 8;
	const pY = obj.pY;

	let i;
	for (i = y; i < y + pY; i++) {
		const tile = game.getTile(x, i);
		if (tile) return tile;
	}

	return 0;
}

/**
 * Get the solid tile right of an object.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {import('./World.js').Solid} The tile id or the object of the first solid point along the right edge,
 *     else Tile.EMPTY.
 */
export function rightCollision(obj) {
	const x = (obj.x >> 8) + obj.pX;
	const y = obj.y >> 8;
	const pY = obj.pY;

	let i;
	for (i = y; i < y + pY; i++) {
		const tile = game.getTile(x, i);
		if (tile) return tile;
	}

	return 0;
}

/**
 * Find the side of an object with the most points in solid tiles.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {number} Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT, or -1 if the object touches
 *     nothing.
 */
export function getCollision(obj) {
	let i;
	const hit = [0, 0, 0, 0]; //top, bottom, left, right
	const x = obj.x >> 8;
	const y = obj.y >> 8;

	let max = 0;

	for (i = x; i < x + obj.pX; i += 2) {
		if (game.getTile(i, y)) hit[0]++;
	}
	let maxVal = hit[0];

	for (i = x + 1; i < x + obj.pX - 1; i += 2) {
		if (game.getTile(i, y + obj.pY - 1)) hit[1]++;
	}
	if (hit[1] > maxVal) {
		max = 1;
		maxVal = hit[1];
	}

	for (i = y; i < y + obj.pY; i += 2) {
		if (game.getTile(x, i)) hit[2]++;
	}
	if (hit[2] > maxVal) {
		max = 2;
		maxVal = hit[2];
	}

	for (i = y; i < y + obj.pY; i += 2) {
		if (game.getTile(x + obj.pX - 1, i)) hit[3]++;
	}
	if (hit[3] > maxVal) {
		max = 3;
		maxVal = hit[3];
	}

	if (maxVal == 0) return -1;
	return max;
}

/**
 * Push an object out of the solid tiles and stop its speed in that direction.
 *
 * @param {import('./entities/Body.js').Body} obj The object. It must also have the speeds vx and vy.
 * @returns {boolean} True if a collision was resolved, false if there was none or the object is stuck between two
 *     sides.
 */
export function checkCollisions(obj) {
	let coll = false;

	if (getCollision(obj) == Direction.UP) {
		coll = true;
		if (obj.vy < 0) {
			obj.vx >>= 1;
			obj.vy = 0;
		}
		do {
			obj.y += 256;
			if (getCollision(obj) == Direction.DOWN) {
				coll = false;
				break;
			}
		} while (getCollision(obj) == Direction.UP);
	}

	if (!coll && getCollision(obj) == Direction.DOWN) {
		coll = true;
		if (obj.vy > 0) {
			obj.vy = 0;
		}
		do {
			obj.y -= 256;
			if (getCollision(obj) == Direction.UP) {
				coll = false;
				break;
			}
		} while (getCollision(obj) == Direction.DOWN);
	}

	if (!coll && getCollision(obj) == Direction.LEFT) {
		coll = true;
		if (obj.vx < 0) obj.vx = 0;
		do {
			obj.x += 256;
			if (getCollision(obj) == Direction.RIGHT) {
				coll = false;
				obj.vy = 0;
				break;
			}
		} while (getCollision(obj) == Direction.LEFT);
	}

	if (!coll && getCollision(obj) == Direction.RIGHT) {
		coll = true;
		if (obj.vx > 0) obj.vx = 0;
		do {
			obj.x -= 256;
			if (getCollision(obj) == Direction.LEFT) {
				coll = false;
				obj.vy = 0;
				break;
			}
		} while (getCollision(obj) == Direction.RIGHT);
	}

	return coll;
}

/**
 * Check if the player touches the exit.
 *
 * @returns {boolean} True if the player is on the open exit.
 */
export function atExit() {
	const p = game.player;
	if (!isInPortal(p)) {
		const x = p.x >> 8;
		const y = p.y >> 8;
		// check each tile that the box of the player touches
		for (let ty = y >> TILE_SIZE_BITS; ty <= (y + p.pY - 1) >> TILE_SIZE_BITS; ty++) {
			for (let tx = x >> TILE_SIZE_BITS; tx <= (x + p.pX - 1) >> TILE_SIZE_BITS; tx++) {
				if (game.map.atPixel(tx << TILE_SIZE_BITS, ty << TILE_SIZE_BITS) == Tile.EXIT) return true;
			}
		}
	}

	return false;
}
