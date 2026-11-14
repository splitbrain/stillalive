/**
 * Helpers for the unit tests, which run the logic layer of the stage in Node.
 */

import { MAP_SIZE, MAP_WIDTH } from '../../js/stage/constants.js';
import { InputState } from '../../js/stage/InputState.js';
import { parseMap } from '../../js/stage/mapFile.js';
import { emptyTiles } from '../../js/stage/TileMap.js';
import { Tile } from '../../js/stage/tiles.js';
import { World } from '../../js/stage/World.js';

/**
 * Replace Math.random() with a pseudo-random generator, so that a test gives the same result in each run.
 *
 * @param {number} seed The seed.
 * @returns {() => void} A function that puts the original Math.random() back.
 */
export function seedRandom(seed) {
	const original = Math.random;
	let state = seed >>> 0;
	Math.random = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let mixed = state;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
	return () => {
		Math.random = original;
	};
}

/**
 * Get the map index of a tile.
 *
 * @param {number} column The column.
 * @param {number} row The row.
 * @returns {number} The index in the tile list.
 */
export function at(column, row) {
	return row * MAP_WIDTH + column;
}

/**
 * Create the tiles of a map with a wall floor in the last row and a player start in the lower left corner.
 *
 * @returns {number[]} The tile ids, one for each map position.
 */
export function floorTiles() {
	return emptyTiles()
		.fill(Tile.WALL, MAP_SIZE - MAP_WIDTH)
		.with(MAP_SIZE - 2 * MAP_WIDTH + 2, Tile.PLAYER_START);
}

/**
 * Create a test level from tiles.
 *
 * @param {number[]} tiles The tile ids, one for each map position.
 * @param {number} [boss] The boss of the level, or 0 for a level without a boss.
 * @returns {import('../../js/stage/level.js').Level} The level.
 */
export function testLevel(tiles, boss = 0) {
	return { ...parseMap({ format: 1, tiles, bg: 0, boss }), campaign: 'test', number: 1, fromBelow: false };
}

/**
 * Create the World of a level start from tiles.
 *
 * @param {number[]} tiles The tile ids, one for each map position.
 * @param {object} [options] The options.
 * @param {number} [options.boss] The boss of the level, or 0 for a level without a boss.
 * @param {boolean} [options.restart] True to start the level as a restart, which skips the entrance of the boss.
 * @returns {World} The World at the start of the opening transition.
 */
export function startWorld(tiles, { boss = 0, restart = false } = {}) {
	return World.forLevel(testLevel(tiles, boss), { restart });
}

/**
 * Run ticks of a World with the same keys in each tick, in the order of the game loop.
 *
 * @param {World} world The World.
 * @param {number} count The number of ticks.
 * @param {number} [keys] The key bitmask of each tick.
 * @returns {void}
 */
export function runTicks(world, count, keys = 0) {
	const input = new InputState();
	input.keys = keys;
	for (let tick = 0; tick < count; tick++) {
		input.update();
		world.applyInput(input);
		input.endTick();
		world.tick(input);
	}
}

/**
 * Run ticks of a World until the opening transition has ended.
 *
 * @param {World} world The World.
 * @returns {void}
 */
export function runUntilRunning(world) {
	while (!world.isRunning()) runTicks(world, 1);
}
