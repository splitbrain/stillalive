/**
 * The tile ids of the maps and the codes of the collision functions.
 *
 * A map is a list of 768 tile ids. The ids below 100 are tiles of the tile set, and tileset[id] is their image. The
 * ids from 100 to 111 mark objects in a level file; the level loader replaces them with entities. The collision
 * functions return a tile id, or a code for a platform or a crate.
 */

import { NUM_TILES } from './constants.js';

/** @type {Object<string, number>} The tile ids that the game logic checks. */
export const Tile = {
	EMPTY: 0,
	WALL: 1,
	SWITCH: 19,
	PLASMA_START: 20,
	PLASMA_SLOT: 21,
	EXIT: 22,
	EXIT_CLOSED: 35,
	ICYWALL: 46,
	ACIDPOOL: 47,
	TURRET_LEFT: 100,
	TURRET_RIGHT: 101,
	CRATE: 102,
	CAKE: 103,
	PLAYER_START: 104,
	PLATFORM_RIGHT: 105,
	PLATFORM_LEFT: 106,
	TUNNEL_RIGHT: 107,
	TUNNEL_LEFT: 108,
	TUNNEL_UP: 109,
	TUNNEL_DOWN: 110,
	TUBE: 111,
	TUNNEL_BLOCK: 199,
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
const KIND_OF = new Array(NUM_TILES).fill(TileKind.DECOR);
for (const [first, last, kind] of TILE_RANGES) {
	for (let id = first; id <= last; id++) KIND_OF[id] = kind;
}

/** @type {Object<string, number>} The first id of each kind, e.g. the first frame of an animated door. */
export const FIRST_OF_KIND = Object.fromEntries(TILE_RANGES.map(([first, , kind]) => [kind, first]));

/** @type {Object<string, number>} The last id of each kind, e.g. the last frame of an animated door. */
export const LAST_OF_KIND = Object.fromEntries(TILE_RANGES.map(([, last, kind]) => [kind, last]));

/** @type {number} The collision functions return this code plus the platform index for a platform. */
export const PLATFORM_CODE = 200;

/** @type {number} The collision functions return this code plus the crate index for a crate. */
export const CRATE_CODE = 300;

/**
 * Get the kind of a tile.
 *
 * @param {number} id The tile id.
 * @returns {string|undefined} The kind, or undefined for an object id or a collision code.
 */
export function tileKind(id) {
	return KIND_OF[id];
}

/**
 * Check if a tile has one of the given kinds.
 *
 * @param {number} id The tile id.
 * @param {...string} kinds The kinds to check.
 * @returns {boolean} True if the tile has one of the kinds.
 */
export function isTileKind(id, ...kinds) {
	return kinds.includes(KIND_OF[id]);
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
 * Check if a tile kills the player and the objects.
 *
 * @param {number} id The tile id.
 * @returns {boolean} True for the razor wheels, the acid surface and the acid pool.
 */
export function isDeadlyTile(id) {
	return isTileKind(id, TileKind.WHEEL, TileKind.ACID, TileKind.ACIDPOOL);
}

/**
 * Check if a tile id marks an object in a level file.
 *
 * @param {number} id The tile id.
 * @returns {boolean} True for the ids from the left turret to the tube.
 */
export function isObjectTile(id) {
	return id >= Tile.TURRET_LEFT && id <= Tile.TUBE;
}

/**
 * Check if a tile id marks a tunnel in a level file.
 *
 * @param {number} id The tile id.
 * @returns {boolean} True for the four tunnel directions.
 */
export function isTunnelTile(id) {
	return id >= Tile.TUNNEL_RIGHT && id <= Tile.TUNNEL_DOWN;
}

/**
 * Check if a collision result is a platform code.
 *
 * @param {number} code The result of a collision function.
 * @returns {boolean} True for a platform code.
 */
export function isPlatformCode(code) {
	return code >= PLATFORM_CODE && code < CRATE_CODE;
}

/**
 * Check if a collision result is a crate code.
 *
 * @param {number} code The result of a collision function.
 * @returns {boolean} True for a crate code.
 */
export function isCrateCode(code) {
	return code >= CRATE_CODE;
}
