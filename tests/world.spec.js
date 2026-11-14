import { test, expect } from '@playwright/test';
import { FADE_START, KEY_RIGHT, MAP_SIZE, MAP_WIDTH } from '../js/stage/constants.js';
import { Tile } from '../js/stage/tiles.js';
import { openGame, runWorld } from './adapter.js';

/**
 * Create a map in the file format with a floor and a player start in the lower left corner.
 *
 * @returns {object} The map data.
 */
function floorMap() {
	const tiles = new Array(MAP_SIZE)
		.fill(Tile.EMPTY)
		.fill(Tile.WALL, MAP_SIZE - MAP_WIDTH)
		.with(MAP_SIZE - 2 * MAP_WIDTH + 2, Tile.PLAYER_START);
	return { format: 1, tiles, bg: 0 };
}

test('a World from a map runs ticks without the stage element', async ({ page }) => {
	await openGame(page);
	// the opening transition takes 4 points of the fade in each tick
	const opening = FADE_START / 4;
	const states = await runWorld(page, floorMap(), { ticks: opening + 60, keys: KEY_RIGHT });
	const start = states[0];
	const opened = states[opening];
	const running = states.slice(opening + 1);
	const last = states.at(-1);

	// the level time and the player stand still during the opening transition
	expect(opened).toEqual(start);
	expect(last.time).toBe(60);
	// the player walks to the right on the floor
	expect(running.every((state, i) => i == 0 || state.x > running[i - 1].x)).toBe(true);
	expect(running.every((state) => state.y == last.y)).toBe(true);
});
