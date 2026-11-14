/**
 * The changes of the editor to a map: the wall shapes, the fill, the removal of overlapping objects and the object
 * limits.
 */

import { MAP_HEIGHT, MAP_SIZE, MAP_WIDTH } from './constants.js';
import { Tile, TileKind, isGravPipeTile, isTileKind } from './tiles.js';

/** @typedef {import('./TileMap.js').TileMap} TileMap */

/**
 * @type {number[]} The wall tile id for each combination of neighbor walls, indexed by the flags up (8), down (4),
 *     left (2) and right (1). A wall tile draws an edge on each side without a neighbor wall.
 */
const WALL_TILES = [16, 15, 14, 10, 13, 8, 9, 3, 12, 7, 6, 5, 11, 2, 4, 1];

/**
 * Choose the wall tile of each wall from its neighbors.
 *
 * @param {TileMap} map The map. The function changes the logic layer.
 * @returns {void}
 */
export function build(map) {
	for (let i = 0; i < MAP_SIZE; i++) {
		if (!isWallAt(map, i)) continue;
		const x = map.column(i);
		const y = map.row(i);
		const up = isTileHere(map, x, y - 1);
		const down = isTileHere(map, x, y + 1);
		const left = isTileHere(map, x - 1, y);
		const right = isTileHere(map, x + 1, y);
		map.setTile(i, WALL_TILES[(up << 3) | (down << 2) | (left << 1) | right]);
	}
}

/** @type {Array<[number, number]>} The column and row steps to the right, left, lower and upper neighbor. */
const NEIGHBORS = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
];

/**
 * Fill a connected area of one tile id with another tile id.
 *
 * @param {TileMap} map The map. The function changes the logic layer.
 * @param {number} tile The new tile id.
 * @param {number} toFill The tile id to replace.
 * @param {number} x The column of the start.
 * @param {number} y The row of the start.
 * @returns {void}
 */
export function fill(map, tile, toFill, x, y) {
	const queue = [map.index(x, y)];
	const queued = new Set(queue);
	// the loop also visits the positions that it adds to the queue
	for (const index of queue) {
		const column = map.column(index);
		const row = map.row(index);
		map.setTile(index, tile);
		for (const [dx, dy] of NEIGHBORS) {
			const nx = column + dx;
			const ny = row + dy;
			if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
			const next = map.index(nx, ny);
			if (map.tiles[next] === toFill && !queued.has(next)) {
				queued.add(next);
				queue.push(next);
			}
		}
	}
}

/**
 * Check if a map position holds a wall.
 *
 * @param {TileMap} map The map. The function reads the logic layer.
 * @param {number} index The index in the map.
 * @returns {boolean} True for a wall tile.
 */
function isWallAt(map, index) {
	return isTileKind(map.tiles[index], TileKind.WALL);
}

/**
 * Check if a map position is solid for the edges of the walls. Positions outside the map count as solid.
 *
 * @param {TileMap} map The map. The function reads the logic layer.
 * @param {number} x The column.
 * @param {number} y The row.
 * @returns {number} 1 for a wall, a decor tile or a conveyor belt, else 0.
 */
function isTileHere(map, x, y) {
	if (x < 0 || x > MAP_WIDTH - 1 || y < 0 || y > MAP_HEIGHT - 1) return 1;
	if (isTileKind(map.tiles[map.index(x, y)], TileKind.BELT_RIGHT, TileKind.BELT_LEFT)) return 1;
	return isTileKind(map.tiles[map.index(x, y)], TileKind.WALL, TileKind.DECOR) ? 1 : 0;
}

/** @type {number[]} The objects that are wider than one tile: two tiles for a pipe, three for a platform. */
const WIDE_OBJECTS = [Tile.PLATFORM_RIGHT, Tile.PLATFORM_LEFT, Tile.GRAVPIPE_UP, Tile.GRAVPIPE_DOWN];

/** @type {number[]} The objects that are two tiles high. */
const TALL_OBJECTS = [Tile.PLAYER_START, Tile.TURRET_LEFT, Tile.TURRET_RIGHT, Tile.GRAVPIPE_RIGHT, Tile.GRAVPIPE_LEFT];

/**
 * Remove the logic tile at a map position if the position is in the map and the tile passes a test.
 *
 * @param {TileMap} map The map. The function changes the logic layer.
 * @param {number} x The column.
 * @param {number} y The row.
 * @param {function(number): boolean} test The test of the tile id.
 * @returns {void}
 */
function eraseIf(map, x, y, test) {
	if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return;
	const index = map.index(x, y);
	if (test(map.tiles[index])) map.setTile(index, Tile.EMPTY);
}

/**
 * Remove the object above a map position if the object reaches into the position: the player start, a turret or a
 * gravitational pipe.
 *
 * @param {TileMap} map The map. The function changes the logic layer.
 * @param {number} x The column.
 * @param {number} y The row.
 * @returns {void}
 */
export function eraseObjectAbove(map, x, y) {
	eraseIf(
		map,
		x,
		y - 1,
		(tile) =>
			tile === Tile.PLAYER_START || tile === Tile.TURRET_LEFT || tile === Tile.TURRET_RIGHT || isGravPipeTile(tile),
	);
}

/**
 * Remove the objects that overlap a new object, because an object covers more than one tile.
 *
 * @param {TileMap} map The map. The function changes the logic layer.
 * @param {number} object The id of the new object.
 * @param {number} column The column of the new object.
 * @param {number} row The row of the new object.
 * @returns {void}
 */
export function eraseSprites(map, object, column, row) {
	if (WIDE_OBJECTS.includes(object)) {
		const width = object >= Tile.GRAVPIPE_UP ? 2 : 3;
		for (let offset = 1; offset < width && column + offset < MAP_WIDTH; offset++) {
			map.setTile(map.index(column + offset, row), Tile.EMPTY);
			eraseObjectAbove(map, column + offset, row);
		}
	}
	if (TALL_OBJECTS.includes(object) && row + 1 < MAP_HEIGHT) {
		map.setTile(map.index(column, row + 1), Tile.EMPTY);
		for (let offset = 1; offset < 3; offset++) {
			eraseIf(map, column - offset, row + 1, (tile) => WIDE_OBJECTS.includes(tile));
		}
	}

	eraseObjectAbove(map, column, row);
	// the wide objects to the left reach into the position
	eraseIf(map, column - 1, row, (tile) => WIDE_OBJECTS.includes(tile));
	eraseIf(map, column - 2, row, (tile) => tile === Tile.PLATFORM_RIGHT || tile === Tile.PLATFORM_LEFT);
}

/**
 * Check if the map can take one more object of a type. Each type has a limit.
 *
 * @param {TileMap} map The map. The function reads the logic layer.
 * @param {number} tile The object id.
 * @returns {boolean} True if the object can be placed.
 */
export function allowTile(map, tile) {
	switch (tile) {
		case Tile.PLAYER_START:
			return true;
		case Tile.CAKE:
			return countTile(map, tile) < 30;
		case Tile.CRATE:
			return countTile(map, tile) < 15;
		case Tile.TURRET_LEFT:
		case Tile.TURRET_RIGHT:
			return countTile(map, Tile.TURRET_LEFT) + countTile(map, Tile.TURRET_RIGHT) < 15;
		case Tile.PLATFORM_RIGHT:
		case Tile.PLATFORM_LEFT:
			return countTile(map, Tile.PLATFORM_RIGHT) + countTile(map, Tile.PLATFORM_LEFT) < 8;
		case Tile.GRAVPIPE_RIGHT:
		case Tile.GRAVPIPE_LEFT:
		case Tile.GRAVPIPE_UP:
		case Tile.GRAVPIPE_DOWN:
			return (
				countTile(map, Tile.GRAVPIPE_RIGHT) +
					countTile(map, Tile.GRAVPIPE_LEFT) +
					countTile(map, Tile.GRAVPIPE_UP) +
					countTile(map, Tile.GRAVPIPE_DOWN) <
				8
			);
		default:
			return false;
	}
}

/**
 * Count the tiles of an id in the map.
 *
 * @param {TileMap} map The map. The function reads the logic layer.
 * @param {number} tile The tile id.
 * @returns {number} The count.
 */
function countTile(map, tile) {
	return map.tiles.filter((id) => id === tile).length;
}
