/**
 * The tile ids of the maps and the checks of their kinds.
 *
 * A map is a list of 768 tile ids. The ids below 100 are tiles of the tile set, and tileset[id] is their image. The
 * ids from 100 to 110 mark bodies in a level file. The level loader creates the bodies from them. The id 120 marks
 * the tube of the boss in a boss level. The id 199 is never in a file: it exists only in the logic layer of a running
 * level.
 */

import { NUM_TILES } from '../constants.js';

/**
 * The tile ids that the game logic checks and the editor puts in a map. For a kind with several ids, like an animated
 * door, this is the id that the editor puts in a map.
 *
 * @type {Object<string, number>}
 */
export const Tile = {
	EMPTY: 0,
	WALL: 1,
	STRIPES: 17,
	STRIPES_MIRRORED: 18,
	SWITCH: 19,
	PLASMA_START: 20,
	PLASMA_SLOT: 21,
	EXIT: 22,
	SWITCH_DOOR: 23,
	PLASMA_DOOR: 29,
	EXIT_CLOSED: 35,
	WHEEL: 36,
	ACID: 38,
	ENERGYWALL: 40,
	ICYWALL: 46,
	ACIDPOOL: 47,
	FORCE_FIELD: 49,
	BELT_RIGHT: 55,
	BELT_LEFT: 57,
	TURRET_LEFT: 100,
	TURRET_RIGHT: 101,
	CRATE: 102,
	CAKE: 103,
	PLAYER_START: 104,
	PLATFORM_RIGHT: 105,
	PLATFORM_LEFT: 106,
	GRAVPIPE_RIGHT: 107,
	GRAVPIPE_LEFT: 108,
	GRAVPIPE_UP: 109,
	GRAVPIPE_DOWN: 110,
	TUBE: 120,
	/**
	 * A solid tile without an image on the two tiles of a gravitational pipe. The level start writes it into the logic
	 * layer of a running level. It is never in a map file and never in the editor.
	 */
	GRAVPIPE_BLOCK: 199,
};

/** @type {Object<string, string>} The kinds of tiles. */
export const TileKind = {
	EMPTY: 'empty',
	WALL: 'wall',
	DECOR: 'decor',
	SWITCH: 'switch',
	PLASMA_START: 'plasmaStart',
	PLASMA_SLOT: 'plasmaSlot',
	EXIT: 'exit',
	SWITCH_DOOR: 'switchDoor',
	PLASMA_DOOR: 'plasmaDoor',
	EXIT_CLOSED: 'exitClosed',
	WHEEL: 'wheel',
	ACID: 'acid',
	ENERGYWALL: 'energyWall',
	ICYWALL: 'icyWall',
	ACIDPOOL: 'acidPool',
	FORCE_FIELD: 'forceField',
	BELT_RIGHT: 'beltRight',
	BELT_LEFT: 'beltLeft',
	BOSS_BLOCK: 'bossBlock',
};

/**
 * The ranges of the tile set, as [first id, last id, kind].
 *
 * @type {Array<[number, number, string]>}
 */
const TILE_RANGES = [
	[0, 0, TileKind.EMPTY],
	[1, 16, TileKind.WALL],
	[17, 18, TileKind.DECOR],
	[19, 19, TileKind.SWITCH],
	[20, 20, TileKind.PLASMA_START],
	[21, 21, TileKind.PLASMA_SLOT],
	[22, 22, TileKind.EXIT],
	[23, 28, TileKind.SWITCH_DOOR],
	[29, 34, TileKind.PLASMA_DOOR],
	[35, 35, TileKind.EXIT_CLOSED],
	[36, 37, TileKind.WHEEL],
	[38, 39, TileKind.ACID],
	[40, 45, TileKind.ENERGYWALL],
	[46, 46, TileKind.ICYWALL],
	[47, 47, TileKind.ACIDPOOL],
	[48, 53, TileKind.FORCE_FIELD],
	[54, 55, TileKind.BELT_RIGHT],
	[56, 57, TileKind.BELT_LEFT],
	[58, 60, TileKind.BOSS_BLOCK],
];

/** @type {string[]} The kind of each tile id of the tile set. */
const KIND_OF = Array.from(
	{ length: NUM_TILES },
	(_, id) => TILE_RANGES.find(([first, last]) => id >= first && id <= last)?.[2] ?? TileKind.DECOR,
);

/** @type {Object<string, number>} The first id of each kind, e.g. the first frame of an animated door. */
export const FIRST_OF_KIND = Object.fromEntries(TILE_RANGES.map(([first, , kind]) => [kind, first]));

/** @type {Object<string, number>} The last id of each kind, e.g. the last frame of an animated door. */
export const LAST_OF_KIND = Object.fromEntries(TILE_RANGES.map(([, last, kind]) => [kind, last]));

/**
 * Check if a tile has one of the given kinds. A body, e.g. the crate or the platform of a collision result, is not
 * a tile and has no kind.
 *
 * @param {number|object} id The tile id, or a body.
 * @param {...string} kinds The kinds to check.
 * @returns {boolean} True if the tile has one of the kinds, false for a body.
 */
export function isTileKind(id, ...kinds) {
	return typeof id === 'number' && kinds.includes(KIND_OF[id]);
}

/**
 * Check if a tile id is in the range that the collision functions treat as force field.
 *
 * The range starts one id after the first force field frame and ends one id after the last frame. The levels and the
 * editor only use the second frame, so the range has no effect on the gameplay.
 *
 * @param {number} id The tile id.
 * @returns {boolean} True if the tile counts as force field in a collision.
 */
export function inForceFieldRange(id) {
	return id >= FIRST_OF_KIND[TileKind.FORCE_FIELD] + 1 && id <= LAST_OF_KIND[TileKind.FORCE_FIELD] + 1;
}

/**
 * Check if a tile is deadly: it kills the player, breaks a turret and sends a crate back.
 *
 * @param {number} id The tile id.
 * @returns {boolean} True for the razor wheels, the acid surface and the acid pool.
 */
export function isDeadlyTile(id) {
	return isTileKind(id, TileKind.WHEEL, TileKind.ACID, TileKind.ACIDPOOL);
}

/**
 * Check if a tile id marks a body in a level file.
 *
 * @param {number} id The tile id.
 * @returns {boolean} True for the ids from the left turret to the down gravitational pipe.
 */
export function isBodyTile(id) {
	return id >= Tile.TURRET_LEFT && id <= Tile.GRAVPIPE_DOWN;
}

/**
 * Check if a tile id marks a gravitational pipe in a level file.
 *
 * @param {number} id The tile id.
 * @returns {boolean} True for the four gravitational pipe directions.
 */
export function isGravPipeTile(id) {
	return id >= Tile.GRAVPIPE_RIGHT && id <= Tile.GRAVPIPE_DOWN;
}
