import { test, expect } from '@playwright/test';
import { openGame } from './adapter.js';

/**
 * Call an exported function of a game module in the page of the game.
 *
 * The page imports the module, so the function uses the same module instance and state as the game.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} module The path of the module, e.g. "/js/replay.js".
 * @param {string} name The name of the exported function.
 * @param {...*} args The arguments for the function. They must be serializable.
 * @returns {Promise<{result?: *, error?: string}>} The return value or the message of the thrown error.
 */
async function call(page, module, name, ...args) {
	return page.evaluate(
		async ({ module, name, args }) => {
			const exports = await import(module);
			try {
				return { result: exports[name](...args) };
			} catch (e) {
				return { error: e.message };
			}
		},
		{ module, name, args },
	);
}

/**
 * Create a valid replay in the file format.
 *
 * @returns {object} The replay data.
 */
function validReplay() {
	return {
		format: 1,
		campaign: 'normal',
		level: 3,
		ticks: 5,
		inputs: [
			[2, 1, 10, 20],
			[3, 4, 30, 40],
		],
		states: [[7, 0, 0, 0, 0, 0, 0, 0, 0]],
		bossSpeech: -1,
	};
}

/**
 * Create a valid map in the file format.
 *
 * @returns {object} The map data.
 */
function validMap() {
	return { format: 1, tiles: new Array(768).fill(0), bg: 0 };
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

	test('decodeReplay() accepts a valid replay', async () => {
		const { result, error } = await call(page, '/js/replay.js', 'decodeReplay', validReplay());
		expect(error).toBeUndefined();
		expect(result.inputs).toEqual([1, 1, 4, 4, 4]);
		expect(result.mouseX).toEqual([10, 10, 30, 30, 30]);
		expect(result.mouseY).toEqual([20, 20, 40, 40, 40]);
		expect(result.states).toEqual({ 7: [0, 0, 0, 0, 0, 0, 0, 0] });
		expect(result.bossSpeech).toBe(-1);
	});

	test('decodeReplay() rejects data that is not a replay', async () => {
		const cases = [null, 'text', { ...validReplay(), format: 2 }, { ...validReplay(), campaign: 1 }];
		for (const data of cases) {
			const { error } = await call(page, '/js/replay.js', 'decodeReplay', data);
			expect(error, JSON.stringify(data)).toBe('This is not a StillAliveJS replay file.');
		}
	});

	test('decodeReplay() rejects a damaged replay', async () => {
		const cases = {
			'wrong tick sum': { ticks: 6 },
			'count of zero': { inputs: [[0, 1, 10, 20]], ticks: 0 },
			'short input entry': { inputs: [[5, 1, 10]] },
			'not an integer': { inputs: [[5, 1, 10.5, 20]] },
			'wrong state length': { states: [[7, 0, 0]] },
			'no states': { states: undefined },
			'no boss speech': { bossSpeech: undefined },
		};
		for (const [name, change] of Object.entries(cases)) {
			const { error } = await call(page, '/js/replay.js', 'decodeReplay', { ...validReplay(), ...change });
			expect(error, name).toBe('The replay file is damaged.');
		}
	});

	test('parseMap() accepts a valid map', async () => {
		const data = validMap();
		data.tiles[0] = 22;
		data.tiles[1] = 110;
		const { result, error } = await call(page, '/js/mapFile.js', 'parseMap', data);
		expect(error).toBeUndefined();
		expect(result).toEqual({ tiles: data.tiles, bg: 0, boss: 0 });
	});

	test('parseMap() reads the boss and accepts the tube only in a boss level', async () => {
		const data = validMap();
		expect((await call(page, '/js/mapFile.js', 'parseMap', data)).result.boss).toBe(0);
		data.tiles[1] = 111;
		const boss = await call(page, '/js/mapFile.js', 'parseMap', { ...data, boss: 4 });
		expect(boss.error).toBeUndefined();
		expect(boss.result.boss).toBe(4);
		const noBoss = await call(page, '/js/mapFile.js', 'parseMap', data);
		expect(noBoss.error).toBe('This is not a valid StillAliveJS map file.');
	});

	test('parseMap() rejects a damaged map', async () => {
		const tiles = (index, value) => validMap().tiles.with(index, value);
		const cases = {
			'no data': null,
			'wrong format': { ...validMap(), format: 2 },
			'too few tiles': { ...validMap(), tiles: new Array(767).fill(0) },
			'no tiles': { ...validMap(), tiles: undefined },
			'negative tile id': { ...validMap(), tiles: tiles(5, -1) },
			'unknown tile id': { ...validMap(), tiles: tiles(5, 99) },
			'unknown object id': { ...validMap(), tiles: tiles(5, 112) },
			'tile id as text': { ...validMap(), tiles: tiles(5, '1') },
			'negative background': { ...validMap(), bg: -1 },
			'background out of range': { ...validMap(), bg: 1000 },
			'unknown boss': { ...validMap(), boss: 5 },
			'negative boss': { ...validMap(), boss: -1 },
			'boss as text': { ...validMap(), boss: '1' },
		};
		for (const [name, data] of Object.entries(cases)) {
			const { error } = await call(page, '/js/mapFile.js', 'parseMap', data);
			expect(error, name).toBe('This is not a valid StillAliveJS map file.');
		}
	});

	test('toTime() shows minutes, seconds and three digits for the milliseconds', async () => {
		const cases = {
			0: '00:00.000',
			1: '00:00.017',
			6: '00:00.100',
			59: '00:00.983',
			60: '00:01.000',
			3599: '00:59.983',
			3600: '01:00.000',
			36001: '10:00.017',
		};
		for (const [ticks, expected] of Object.entries(cases)) {
			const { result } = await call(page, '/js/utils.js', 'toTime', Number(ticks));
			expect(result, `${ticks} ticks`).toBe(expected);
		}
	});

	test('a tunnel field between two facing portals ends', async () => {
		test.setTimeout(10000);
		const fields = await page.evaluate(async () => {
			const { Direction, Menu } = await import('/js/constants.js');
			const { Tile } = await import('/js/tiles.js');
			const t = window.__test;
			t.ui.campaign = 4;
			t.ui.currentMenu = Menu.PLAY;
			t.ui.currentLevel = 4;
			t.loadLevel(4);
			const g = t.game;
			// an empty map with walls on the left and the right side
			for (let i = 0; i < 768; i++) g.map[i] = i % 32 === 0 || i % 32 === 31 ? Tile.WALL : Tile.EMPTY;
			g.tunnels = [Object.assign(g.tunnels[0], { x: 32 << 8, y: 160 << 8, dir: Direction.RIGHT })];
			Object.assign(g.portals[0], { used: true, direction: Direction.RIGHT, x: 496 << 8, y: 160 << 8 });
			Object.assign(g.portals[1], { used: true, direction: Direction.LEFT, x: 12 << 8, y: 160 << 8 });
			g.player.x = 200 << 8;
			g.player.y = 300 << 8;
			t.tick();
			return g.forceFields.length;
		});
		// one field from the tunnel to the right portal, one field from the left portal back to the right portal
		expect(fields).toBe(2);
	});
});
