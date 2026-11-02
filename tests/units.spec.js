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
		data.tiles[1] = 111;
		const { result, error } = await call(page, '/js/mapFile.js', 'parseMap', data);
		expect(error).toBeUndefined();
		expect(result).toEqual({ tiles: data.tiles, bg: 0 });
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
		};
		for (const [name, data] of Object.entries(cases)) {
			const { error } = await call(page, '/js/mapFile.js', 'parseMap', data);
			expect(error, name).toBe('This is not a valid StillAliveJS map file.');
		}
	});
});
