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

/**
 * Remove the objects that overlap a new object, because an object covers more than one tile.
 *
 * @param {TileMap} map The map. The function changes the logic layer.
 * @param {number} til The id of the new object.
 * @param {number} xt The column of the new object.
 * @param {number} yt The row of the new object.
 * @returns {void}
 */
export function eraseSprites(map, til, xt, yt) {
	if (
		til === Tile.PLATFORM_RIGHT ||
		til === Tile.PLATFORM_LEFT ||
		til === Tile.GRAVPIPE_UP ||
		til === Tile.GRAVPIPE_DOWN
	) {
		// objects wider than one tile
		for (let h = 1; h < 3; h++) {
			if (h === 2 && til >= Tile.GRAVPIPE_UP) continue;
			if (xt + h < MAP_WIDTH) {
				map.setTile(map.index(xt + h, yt), Tile.EMPTY);
				if (yt - 1 >= 0) {
					const t = map.tiles[map.index(xt + h, yt - 1)];
					if (t === Tile.PLAYER_START || t === Tile.TURRET_LEFT || t === Tile.TURRET_RIGHT || isGravPipeTile(t))
						map.setTile(map.index(xt + h, yt - 1), Tile.EMPTY);
				}
			}
		}
	}
	if (
		til === Tile.PLAYER_START ||
		til === Tile.TURRET_LEFT ||
		til === Tile.TURRET_RIGHT ||
		til === Tile.GRAVPIPE_RIGHT ||
		til === Tile.GRAVPIPE_LEFT
	) {
		// objects taller than one tile
		if (yt + 1 < MAP_HEIGHT) {
			map.setTile(map.index(xt, yt + 1), Tile.EMPTY);
			for (let h = 1; h < 3; h++) {
				if (xt - h >= 0) {
					const t = map.tiles[map.index(xt - h, yt + 1)];
					if (
						t === Tile.PLATFORM_RIGHT ||
						t === Tile.PLATFORM_LEFT ||
						t === Tile.GRAVPIPE_UP ||
						t === Tile.GRAVPIPE_DOWN
					)
						map.setTile(map.index(xt - h, yt + 1), Tile.EMPTY);
				}
			}
		}
	}

	if (yt - 1 >= 0) {
		const t = map.tiles[map.index(xt, yt - 1)];
		if (t === Tile.PLAYER_START || t === Tile.TURRET_LEFT || t === Tile.TURRET_RIGHT || isGravPipeTile(t))
			map.setTile(map.index(xt, yt - 1), Tile.EMPTY);
	}
	for (let h = 1; h < 3; h++) {
		if (xt - h >= 0) {
			const t = map.tiles[map.index(xt - h, yt)];
			if (t === Tile.PLATFORM_RIGHT || t === Tile.PLATFORM_LEFT) map.setTile(map.index(xt - h, yt), Tile.EMPTY);
			else if ((t === Tile.GRAVPIPE_UP || t === Tile.GRAVPIPE_DOWN) && h < 2)
				map.setTile(map.index(xt - h, yt), Tile.EMPTY);
		}
	}
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
