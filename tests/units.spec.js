import { test, expect } from '@playwright/test';
import { MAP_SIZE, MAP_WIDTH } from '../js/stage/constants.js';
import { openGame } from './adapter.js';

/**
 * Call an exported function of a game module in the page of the game.
 *
 * The page imports the module, so the function uses the same module instance and state as the game.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} module The path of the module, e.g. "/js/stage/replay.js".
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
		format: 2,
		campaign: 'normal',
		level: 3,
		ticks: 5,
		inputs: [
			[2, 1, 10, 20],
			[3, 4, 30, 40],
		],
		states: [[7, 0, 0, 0, 0, 0, 0, 0, 0]],
	};
}

/**
 * Create a valid map in the file format.
 *
 * @returns {object} The map data.
 */
function validMap() {
	return { format: 1, tiles: new Array(MAP_SIZE).fill(0), bg: 0 };
}

/**
 * Create a valid map in the file format with a floor and a player start, so that the player can stand in the level.
 *
 * @returns {object} The map data.
 */
function floorMap() {
	const tiles = validMap()
		.tiles.fill(1, MAP_SIZE - MAP_WIDTH)
		.with(MAP_SIZE - 2 * MAP_WIDTH + 2, 104);
	return { ...validMap(), tiles };
}

/**
 * Start a level from a map file, and run the game until the opening transition has ended.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {object} data The map file.
 * @returns {Promise<void>}
 */
async function playMap(page, data) {
	await page.evaluate(async (data) => {
		const { parseMap } = await import('/js/stage/mapFile.js');
		const t = window.__test;
		t.stage.play({ ...parseMap(data), campaign: 'test', number: 1, fromBelow: false });
		while (t.game.player.fadeNextLevel != -1) t.tick();
	}, data);
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
		const { result, error } = await call(page, '/js/stage/replay.js', 'decodeReplay', validReplay());
		expect(error).toBeUndefined();
		expect(result.inputs).toEqual([1, 1, 4, 4, 4]);
		expect(result.mouseX).toEqual([10, 10, 30, 30, 30]);
		expect(result.mouseY).toEqual([20, 20, 40, 40, 40]);
		expect(result.states).toEqual({ 7: [0, 0, 0, 0, 0, 0, 0, 0] });
	});

	test('decodeReplay() rejects data that is not a replay', async () => {
		const cases = [null, 'text', { ...validReplay(), format: 1 }, { ...validReplay(), campaign: 1 }];
		for (const data of cases) {
			const { error } = await call(page, '/js/stage/replay.js', 'decodeReplay', data);
			expect(error, JSON.stringify(data)).toBe('This is not a Still Alive replay file.');
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
		};
		for (const [name, change] of Object.entries(cases)) {
			const { error } = await call(page, '/js/stage/replay.js', 'decodeReplay', { ...validReplay(), ...change });
			expect(error, name).toBe('The replay file is damaged.');
		}
	});

	test('parseMap() accepts a valid map', async () => {
		const data = validMap();
		data.tiles[0] = 22;
		data.tiles[1] = 110;
		const { result, error } = await call(page, '/js/stage/mapFile.js', 'parseMap', data);
		expect(error).toBeUndefined();
		expect(result).toEqual({
			tiles: data.tiles,
			bg: 0,
			title: '',
			boss: 0,
			abilities: { jump: true, portals: true },
			events: [],
			labels: [],
		});
	});

	test('parseMap() reads the abilities, the events and the labels', async () => {
		const events = [
			{ on: 'start', text: 'Hello', wait: 'click', unlock: 'jump' },
			{ on: 'playerX', x: 6, text: '' },
			{
				on: 'time',
				ticks: 300,
				portals: [
					[9, 14, 'left'],
					[11, 14, 'right'],
				],
			},
			{ on: 'bossArrived', text: 'Here I am' },
			{ on: 'bossDied', unlock: 'portals' },
			{ on: 'exit', text: 'Goodbye', wait: 'click' },
		];
		const labels = [
			{ x: 10, y: 20, text: 'Here' },
			{ x: 16.5, y: 3.5, text: 'Portal\nHere' },
		];
		const data = { ...validMap(), abilities: { portals: false }, events, labels };
		const { result, error } = await call(page, '/js/stage/mapFile.js', 'parseMap', data);
		expect(error).toBeUndefined();
		expect(result.abilities).toEqual({ jump: true, portals: false });
		expect(result.events).toEqual(events);
		expect(result.labels).toEqual(labels);
	});

	test('parseMap() puts the text before the events as a start event', async () => {
		const events = [{ on: 'bossArrived', text: 'Here I am' }];
		const data = { ...validMap(), text: 'Hello', events };
		const { result, error } = await call(page, '/js/stage/mapFile.js', 'parseMap', data);
		expect(error).toBeUndefined();
		expect(result.events).toEqual([{ on: 'start', text: 'Hello' }, ...events]);
	});

	test('parseMap() reads the title', async () => {
		const { result, error } = await call(page, '/js/stage/mapFile.js', 'parseMap', { ...validMap(), title: 'Hello' });
		expect(error).toBeUndefined();
		expect(result.title).toBe('Hello');
	});

	test('parseMap() reads the boss and accepts the tube only in a boss level', async () => {
		const data = validMap();
		expect((await call(page, '/js/stage/mapFile.js', 'parseMap', data)).result.boss).toBe(0);
		data.tiles[1] = 111;
		const boss = await call(page, '/js/stage/mapFile.js', 'parseMap', { ...data, boss: 4 });
		expect(boss.error).toBeUndefined();
		expect(boss.result.boss).toBe(4);
		const noBoss = await call(page, '/js/stage/mapFile.js', 'parseMap', data);
		expect(noBoss.error).toBe('This is not a valid Still Alive map file.');
	});

	test('parseMap() rejects a damaged map', async () => {
		const tiles = (index, value) => validMap().tiles.with(index, value);
		const cases = {
			'no data': null,
			'wrong format': { ...validMap(), format: 2 },
			'too few tiles': { ...validMap(), tiles: new Array(MAP_SIZE - 1).fill(0) },
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
			'text as number': { ...validMap(), text: 1 },
			'title as number': { ...validMap(), title: 1 },
			'abilities as list': { ...validMap(), abilities: [false] },
			'unknown ability': { ...validMap(), abilities: { fly: false } },
			'ability as text': { ...validMap(), abilities: { jump: 'false' } },
			'events as object': { ...validMap(), events: { on: 'start' } },
			'event as text': { ...validMap(), events: ['start'] },
			'unknown trigger': { ...validMap(), events: [{ on: 'end' }] },
			'trigger as list': { ...validMap(), events: [{ on: ['start'] }] },
			'no trigger': { ...validMap(), events: [{ text: 'Hello' }] },
			'player x missing': { ...validMap(), events: [{ on: 'playerX' }] },
			'player column with decimals': { ...validMap(), events: [{ on: 'playerX', x: 6.5 }] },
			'negative ticks': { ...validMap(), events: [{ on: 'time', ticks: -1 }] },
			'event text as number': { ...validMap(), events: [{ on: 'start', text: 1 }] },
			'unknown wait': { ...validMap(), events: [{ on: 'start', wait: 'key' }] },
			'unknown unlock': { ...validMap(), events: [{ on: 'start', unlock: 'fly' }] },
			'one portal': { ...validMap(), events: [{ on: 'start', portals: [[1, 2, 'left']] }] },
			'unknown portal direction': {
				...validMap(),
				events: [
					{
						on: 'start',
						portals: [
							[1, 2, 'left'],
							[3, 4, 'back'],
						],
					},
				],
			},
			'labels as object': { ...validMap(), labels: { x: 1, y: 2, text: 'Here' } },
			'label without text': { ...validMap(), labels: [{ x: 1, y: 2 }] },
			'label position as text': { ...validMap(), labels: [{ x: '1', y: 2, text: 'Here' }] },
			'label position in quarter tiles': { ...validMap(), labels: [{ x: 1.25, y: 2, text: 'Here' }] },
		};
		for (const [name, data] of Object.entries(cases)) {
			const { error } = await call(page, '/js/stage/mapFile.js', 'parseMap', data);
			expect(error, name).toBe('This is not a valid Still Alive map file.');
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
			const { result } = await call(page, '/js/chrome/time.js', 'toTime', Number(ticks));
			expect(result, `${ticks} ticks`).toBe(expected);
		}
	});

	test('a pipe field between two facing portals ends', async () => {
		test.setTimeout(10000);
		const fields = await page.evaluate(async () => {
			const { CampaignId, Direction, MAP_SIZE, MAP_WIDTH } = await import('/js/stage/constants.js');
			const { Tile } = await import('/js/stage/tiles.js');
			const { campaigns } = await import('/js/chrome/campaigns.js');
			const t = window.__test;
			t.stage.play(campaigns[CampaignId.STORY].levels[3]);
			const g = t.game;
			// an empty map with walls on the left and the right side
			for (let i = 0; i < MAP_SIZE; i++) {
				const x = i % MAP_WIDTH;
				g.map[i] = x === 0 || x === MAP_WIDTH - 1 ? Tile.WALL : Tile.EMPTY;
			}
			g.gravPipes = [Object.assign(g.gravPipes[0], { x: 32 << 8, y: 160 << 8, dir: Direction.RIGHT })];
			Object.assign(g.portals[0], { used: true, direction: Direction.RIGHT, x: 496 << 8, y: 160 << 8 });
			Object.assign(g.portals[1], { used: true, direction: Direction.LEFT, x: 12 << 8, y: 160 << 8 });
			g.player.x = 200 << 8;
			g.player.y = 300 << 8;
			t.tick();
			return g.gravPipeFields.length;
		});
		// one field from the gravitational pipe to the right portal, one field from the left portal back to the right portal
		expect(fields).toBe(2);
	});
	test('an event places the portals on the sides of the wall tiles', async () => {
		const portals = async (list) => {
			await playMap(page, { ...floorMap(), events: [{ on: 'start', portals: list }] });
			return page.evaluate(async () => {
				const { Direction } = await import('/js/stage/constants.js');
				const name = (direction) => Object.keys(Direction).find((key) => Direction[key] === direction);
				return window.__test.game.portals.map((p) => [p.x >> 8, p.y >> 8, name(p.direction)]);
			});
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
		const texts = await page.evaluate(() => {
			const t = window.__test;
			const textAt = (centerX) => {
				t.game.player.x = (centerX - (t.game.player.pX >> 1)) << 8;
				t.tick();
				return t.game.message?.text ?? null;
			};
			return [textAt(95), textAt(96)];
		});
		expect(texts).toEqual([null, 'Column 6']);
	});
});
