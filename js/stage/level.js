/**
 * The Level type, the directions of the gravitational pipes and the launch of the plasma balls.
 */

import { Direction, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from './constants.js';
import { Tile } from './tiles.js';

/**
 * A level as the stage plays it: the data of a map file and where the level comes from.
 *
 * @typedef {object} Level
 * @property {number[]} tiles The 768 tile ids.
 * @property {number} bg The background index.
 * @property {string} title The name of the level, or an empty text for none.
 * @property {number} boss The boss, or 0 for a level without a boss.
 * @property {{jump: boolean, portals: boolean}} abilities The abilities of the player at the level start.
 * @property {import('./mapFile.js').MapEvent[]} events The events of the level.
 * @property {import('./mapFile.js').MapLabel[]} labels The texts at positions of the playfield.
 * @property {string} campaign The folder name of the campaign, for the replay file.
 * @property {number} number The level number, starting at 1, for the replay file.
 * @property {boolean} fromBelow True if the player jumps into the level from below the bottom edge.
 */

/** @type {Object<number, number>} The direction of each gravitational pipe tile. */
export const GRAVPIPE_DIRECTIONS = {
	[Tile.GRAVPIPE_RIGHT]: Direction.RIGHT,
	[Tile.GRAVPIPE_LEFT]: Direction.LEFT,
	[Tile.GRAVPIPE_UP]: Direction.UP,
	[Tile.GRAVPIPE_DOWN]: Direction.DOWN,
};

/**
 * Get the launch of the plasma ball from a plasma start in a map. Three sides of the start must be closed, and the
 * ball flies out of the open side. Each tile that is not empty closes a side, and so does the edge of the map.
 *
 * @param {import('./TileMap.js').TileMap} map The map.
 * @param {number} x The column of the plasma start.
 * @param {number} y The row of the plasma start.
 * @returns {{x: number, y: number, vx: number, vy: number}|null} The start position of the ball in 1/256 pixels and its
 *     speed, or null if fewer than three sides are closed.
 */
export function plasmaLaunch(map, x, y) {
	const closed = (cx, cy) =>
		cx < 0 || cx >= MAP_WIDTH || cy < 0 || cy >= MAP_HEIGHT || map.tiles[map.index(cx, cy)] !== Tile.EMPTY;
	const up = closed(x, y - 1);
	const down = closed(x, y + 1);
	const left = closed(x - 1, y);
	const right = closed(x + 1, y);

	if (up && down && left) return { x: ((x + 1) * TILE_SIZE) << 8, y: (y * TILE_SIZE) << 8, vx: 424, vy: 0 };
	if (up && down && right) return { x: ((x - 1) * TILE_SIZE) << 8, y: (y * TILE_SIZE) << 8, vx: -424, vy: 0 };
	if (right && down && left) return { x: (x * TILE_SIZE) << 8, y: ((y - 1) * TILE_SIZE) << 8, vx: 0, vy: -424 };
	if (left && right && up) return { x: (x * TILE_SIZE) << 8, y: ((y + 1) * TILE_SIZE) << 8, vx: 0, vy: 424 };
	return null;
}
