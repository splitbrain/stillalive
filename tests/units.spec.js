import { test, expect } from '@playwright/test';
import { Direction, MAP_SIZE, MAP_WIDTH } from '../js/stage/constants.js';
import { emptyTiles } from '../js/stage/TileMap.js';
import { Tile } from '../js/stage/tiles.js';
import {
	gravPipeFieldCount,
	levelPortals,
	openGame,
	playerValues,
	playMap,
	runTicks,
	runTicksUntilMessage,
	setGravPipes,
	setMap,
	setPlayer,
	setPortals,
} from './adapter.js';

/**
 * Create a valid map in the file format.
 *
 * @returns {import('../js/stage/mapFile.js').MapFile} The map data.
 */
function validMap() {
	return { format: 1, tiles: emptyTiles(), bg: 0 };
}

/**
 * Create a valid map in the file format with a floor and a player start, so that the player can stand in the level.
 *
 * @returns {import('../js/stage/mapFile.js').MapFile} The map data.
 */
function floorMap() {
	const tiles = validMap()
		.tiles.fill(Tile.WALL, MAP_SIZE - MAP_WIDTH)
		.with(MAP_SIZE - 2 * MAP_WIDTH + 2, Tile.PLAYER_START);
	return { ...validMap(), tiles };
}

test.describe('units', () => {
	test.describe.configure({ mode: 'serial' });

	/** @type {import('@playwright/test').Page} */
	let page;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		await openGame(page);
	});

	test.afterAll(async () => {
		await page.close();
	});

	test('a pipe field between two facing portals ends', async () => {
		test.setTimeout(10000);
		await page.evaluate(async () => {
			const { CampaignId } = await import('/js/stage/constants.js');
			const { campaignById } = await import('/js/data/campaigns.js');
			window.__test.stage.play(campaignById(CampaignId.STORY).levels[3]);
		});
		// an empty map with walls on the left and the right side, and a floor that keeps the player alive
		const tiles = Array.from({ length: MAP_SIZE }, (_, i) =>
			i % MAP_WIDTH === 0 || i % MAP_WIDTH === MAP_WIDTH - 1 || i >= MAP_SIZE - MAP_WIDTH ? Tile.WALL : Tile.EMPTY,
		);
		await setMap(page, tiles);
		await setGravPipes(page, [{ x: 32 << 8, y: 160 << 8, direction: Direction.RIGHT }]);
		await setPortals(page, [
			{ x: 496 << 8, y: 160 << 8, direction: Direction.RIGHT },
			{ x: 12 << 8, y: 160 << 8, direction: Direction.LEFT },
		]);
		await setPlayer(page, { x: 200 << 8, y: 300 << 8 });
		await runTicks(page, 1);
		const fields = await gravPipeFieldCount(page);
		// one field from the gravitational pipe to the right portal, one field from the left portal back to the right portal
		expect(fields).toBe(2);
	});
	test('an event places the portals on the sides of the wall tiles', async () => {
		const portals = async (list) => {
			await playMap(page, { ...floorMap(), events: [{ on: 'start', portals: list }] });
			const name = (direction) => Object.keys(Direction).find((key) => Direction[key] === direction);
			return (await levelPortals(page)).map((portal) => [portal.x >> 8, portal.y >> 8, name(portal.direction)]);
		};
		// a portal on a side wall has the direction of the portal shot that hits the wall
		expect(
			await portals([
				[9, 14, 'left'],
				[11, 14, 'right'],
			]),
		).toEqual([
			[144, 224, 'RIGHT'],
			[188, 224, 'LEFT'],
		]);
		expect(
			await portals([
				[3, 20, 'up'],
				[5, 2, 'down'],
			]),
		).toEqual([
			[48, 320, 'DOWN'],
			[80, 44, 'UP'],
		]);
	});

	test('a playerX event fires when the center of the player enters the column', async () => {
		await playMap(page, { ...floorMap(), events: [{ on: 'playerX', x: 6, text: 'Column 6' }] });
		const textAt = async (centerX) => {
			const { width } = await playerValues(page);
			await setPlayer(page, { x: (centerX - (width >> 1)) << 8 });
			return (await runTicks(page, 1))?.text ?? null;
		};
		const texts = [await textAt(95), await textAt(96)];
		expect(texts).toEqual([null, 'Column 6']);
	});

	test('a time event fires at the tick that is nearest to its seconds', async () => {
		await playMap(page, { ...floorMap(), events: [{ on: 'time', seconds: 8.3, text: 'Now' }] });
		const time = await runTicksUntilMessage(page, 600);
		// 8.3 * 60 is 498.00000000000006
		expect(time).toBe(498);
	});
});
