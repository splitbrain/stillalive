/**
 * Test adapter that reads and writes the game state in the browser.
 *
 * When the URL contains "?test", the stage element puts itself, the game state and some functions on window.__test.
 * The specs use only the functions of this module to read and write the internals of the stage.
 */

import { readFileSync } from 'node:fs';
import { CAMPAIGN_FOLDERS, CampaignId } from '../js/stage/constants.js';

/**
 * The campaigns with their index in the campaigns array of the game and their number of levels from the campaign
 * file. The custom campaign has no campaign file, so it is not in the list.
 *
 * @type {{name: string, index: number, levels: number}[]}
 */
export const CAMPAIGNS = CAMPAIGN_FOLDERS.flatMap((name, index) =>
	index == CampaignId.CUSTOM
		? []
		: {
				name,
				index,
				levels: JSON.parse(readFileSync(new URL(`../maps/${name}/campaign.json`, import.meta.url))).levels.length,
			},
);

/**
 * Number of ticks between two snapshots.
 *
 * @type {number}
 */
export const SNAPSHOT_INTERVAL = 60;

/**
 * Get the levels of a campaign.
 *
 * @param {{name: string, index: number, levels: number}} campaign The campaign.
 * @returns {{level: number, id: string, boss: number}[]} One entry for each level. The id is the campaign name and the
 *     level number with two digits, e.g. "normal-07". The boss comes from the level file, 0 for a level without a boss.
 */
export function campaignLevels(campaign) {
	const folder = new URL(`../maps/${campaign.name}/`, import.meta.url);
	const files = JSON.parse(readFileSync(new URL('campaign.json', folder))).levels;
	return Array.from({ length: campaign.levels }, (_, i) => ({
		level: i + 1,
		id: `${campaign.name}-${String(i + 1).padStart(2, '0')}`,
		boss: JSON.parse(readFileSync(new URL(files[i], folder))).boss ?? 0,
	}));
}

/**
 * Create a 32-bit hash of a string with the FNV-1a algorithm.
 *
 * @param {string} text The text to hash.
 * @returns {number} The unsigned hash.
 */
export function hashString(text) {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

/**
 * Open the game in test mode and wait until the loader reports that the game is ready.
 *
 * The game loop and the timers of the page run at the real speed. runLevel() and runPortalScene() run all their ticks
 * in one call, so the game loop cannot run a tick between them.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
export async function openGame(page) {
	await page.goto('./?test');
	// waitForFunction needs a synchronous function, so the ready value is imported first
	await page.evaluate(async () => {
		window.__loaded = (await import('/js/loader.js')).ready;
	});
	await page.waitForFunction(() => window.__loaded.get(), null, { polling: 50 });
}

/**
 * Get a value of the stage.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} name The name of the Value property of the stage, e.g. "mode".
 * @returns {Promise<*>} The current value.
 */
export function stageValue(page, name) {
	return page.evaluate((name) => window.__test.stage[name].get(), name);
}

/**
 * Open the game and click the start button as a player does. Then wait until the main menu shows.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
export async function startGame(page) {
	await openGame(page);
	await page.locator('loading-screen .start').click();
	await page.locator('main-menu').waitFor();
}

/**
 * Wait until the narrator text shows all of its text.
 *
 * The click targets below the narrator text move during the typing, so a click must wait for the end of the text. The
 * stage must not be paused, because the typing stops in a pause.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
export async function waitForNarrator(page) {
	await page.waitForFunction(() => {
		const narrator = document.querySelector('narrator-text');
		const testing = window.__test.stage.mode.get() == 'test';
		const text = (testing ? null : narrator.getAttribute('text')) ?? window.__test.stage.message.get()?.text ?? '';
		return narrator.querySelector('p').textContent === text;
	});
}

/**
 * Run ticks of the stage in one call, so that the game loop cannot run a tick between them.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {number} count The number of ticks.
 * @returns {Promise<{text: string, wait: boolean}|null>} The message of the narrator after the last tick, or null
 *     without a message.
 */
export function runTicks(page, count) {
	return page.evaluate((count) => {
		for (let tick = 0; tick < count; tick++) window.__test.tick();
		return window.__test.world().events?.message ?? null;
	}, count);
}

/**
 * Run ticks until the narrator has a message or the level time reaches a limit.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {number} maxTime The level time in ticks at which the run stops without a message.
 * @returns {Promise<number>} The level time after the last tick.
 */
export function runTicksUntilMessage(page, maxTime) {
	return page.evaluate((maxTime) => {
		const t = window.__test;
		while (!t.world().events?.message && t.world().time < maxTime) t.tick();
		return t.world().time;
	}, maxTime);
}

/**
 * Wait until the level time is above 0. The level time starts after the opening transition and the waits of the
 * events at the level start.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
export async function waitForLevelTime(page) {
	await page.waitForFunction(() => window.__test.world().time > 0);
}

/**
 * Start a level from map data, and run ticks until the opening transition has ended.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {object} data The map in the map file format.
 * @returns {Promise<void>}
 */
export async function playMap(page, data) {
	await page.evaluate(async (data) => {
		const { parseMap } = await import('/js/stage/mapFile.js');
		const t = window.__test;
		t.stage.play({ ...parseMap(data), campaign: 'test', number: 1, fromBelow: false });
		while (!t.world().isRunning()) t.tick();
	}, data);
}

/**
 * Create a World from map data in the page and run ticks with the same keys in each tick. The stage element does not
 * take part.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {object} data The map in the map file format.
 * @param {object} options The run options.
 * @param {number} options.ticks The number of ticks to run.
 * @param {number} [options.keys] The key bitmask of each tick.
 * @returns {Promise<{time: number, x: number, y: number}[]>} The level time and the player position in 1/256 pixels
 *     after the creation and after each tick.
 */
export function runWorld(page, data, { ticks, keys = 0 }) {
	return page.evaluate(
		async ({ data, ticks, keys }) => {
			const { parseMap } = await import('/js/stage/mapFile.js');
			const { World } = await import('/js/stage/World.js');
			const world = World.forLevel({ ...parseMap(data), campaign: 'test', number: 1, fromBelow: false });
			const input = {
				keys,
				oldKeys: 0,
				mouseX: 0,
				mouseY: 0,
				mousePressed: 0,
				mouseReleased: 0,
				mouseButton: 0,
				mouseNewPress: 0,
			};
			const state = () => ({ time: world.time, x: world.player.x, y: world.player.y });
			const states = [state()];
			for (let tick = 0; tick < ticks; tick++) {
				world.applyInput(input);
				input.oldKeys = input.keys;
				world.tick(input);
				states.push(state());
			}
			return states;
		},
		{ data, ticks, keys },
	);
}

/**
 * Decode a replay in the file format with the decoder of the stage.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {*} data The replay data. It must be serializable.
 * @returns {Promise<{result?: object, error?: string}>} The decoded replay or the message of the thrown error.
 */
export function decodeReplay(page, data) {
	return page.evaluate(async (data) => {
		const { decodeReplay } = await import('/js/stage/replay.js');
		try {
			return { result: decodeReplay(data) };
		} catch (e) {
			return { error: e.message };
		}
	}, data);
}

/**
 * Get the values of the player.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<{x: number, y: number, vx: number, vy: number, life: number, dead: boolean, width: number}>} The
 *     position and the speed in 1/256 pixels, the life, the death flag and the width in pixels.
 */
export function playerValues(page) {
	return page.evaluate(() => {
		const { x, y, vx, vy, life, dead, pX } = window.__test.world().player;
		return { x, y, vx, vy, life, dead, width: pX };
	});
}

/**
 * Change values of the player.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {{x?: number, y?: number, vx?: number, vy?: number, life?: number}} values The new values. The position and
 *     the speed are in 1/256 pixels.
 * @returns {Promise<void>}
 */
export async function setPlayer(page, values) {
	await page.evaluate((values) => {
		Object.assign(window.__test.world().player, values);
	}, values);
}

/**
 * Remember the current level run, so that isSameLevelRun() can find the start of a new level run. Each level start
 * and each restart create a new player object, so the player object identifies the level run.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
export async function rememberLevelRun(page) {
	await page.evaluate(() => {
		window.__rememberedLevelRun = window.__test.world().player;
	});
}

/**
 * Check if the level run is the same as at the last call of rememberLevelRun().
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<boolean>} False after a restart or after the start of a level.
 */
export function isSameLevelRun(page) {
	return page.evaluate(() => window.__test.world().player === window.__rememberedLevelRun);
}

/**
 * Get the labels of the level.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<{x: number, y: number, text: string}[]>} The labels in the map file format.
 */
export function levelLabels(page) {
	return page.evaluate(() => window.__test.world().labels);
}

/**
 * Get the abilities of the player in the level.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<{jump: boolean, portals: boolean}>} The abilities.
 */
export function levelAbilities(page) {
	return page.evaluate(() => window.__test.world().abilities);
}

/**
 * Replace the tiles of the map.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {number[]} tiles The tile ids, one for each map position.
 * @returns {Promise<void>}
 */
export async function setMap(page, tiles) {
	await page.evaluate((tiles) => {
		const world = window.__test.world();
		world.map.replace(tiles);
	}, tiles);
}

/**
 * Get the two portals.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<{x: number, y: number, used: boolean, direction: number}[]>} The portals. The position is in
 *     1/256 pixels, and the direction is a value of Direction.
 */
export function levelPortals(page) {
	return page.evaluate(() =>
		window.__test.world().portals.list.map(({ x, y, used, direction }) => ({ x, y, used, direction })),
	);
}

/**
 * Place the two portals.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {{x: number, y: number, direction: number}[]} placed The position in 1/256 pixels and the direction of each
 *     portal. The direction is a value of Direction.
 * @returns {Promise<void>}
 */
export async function setPortals(page, placed) {
	await page.evaluate((placed) => {
		placed.forEach((values, i) => Object.assign(window.__test.world().portals.list[i], { used: true, ...values }));
	}, placed);
}

/**
 * Replace the gravitational pipes of the level.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {{x: number, y: number, direction: number}[]} pipes The position in 1/256 pixels and the direction of each pipe.
 *     The direction is a value of Direction.
 * @returns {Promise<void>}
 */
export async function setGravPipes(page, pipes) {
	await page.evaluate(async (pipes) => {
		const { GravPipe } = await import('/js/stage/entities/GravPipe.js');
		const world = window.__test.world();
		world.gravPipes = pipes.map(({ x, y, direction }) => new GravPipe(world, x, y, direction));
	}, pipes);
}

/**
 * Get the number of fields of the gravitational pipes. The tick builds the fields again from the pipes and the portals.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<number>} The number of fields.
 */
export function gravPipeFieldCount(page) {
	return page.evaluate(() => window.__test.world().gravPipeFields.length);
}

/**
 * Finish the running level.
 *
 * The function opens the exit and puts the player on the first exit tile. The game loop then runs the end of the level.
 * A wait of an event or the entrance of a boss stops the level end, so the level must run without them, e.g. after a restart.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 * @throws {Error} If the level has no exit tile.
 */
export async function finishLevel(page) {
	await page.evaluate(async () => {
		const { Tile } = await import('/js/stage/tiles.js');
		const world = window.__test.world();
		world.openExit();
		// a tile is 16 pixels, and the player position is in 1/256 pixels
		const exit = world.map.tiles.indexOf(Tile.EXIT);
		if (exit < 0) throw new Error('The level has no exit tile.');
		world.player.x = world.map.column(exit) << 12;
		world.player.y = world.map.row(exit) << 12;
		world.player.vx = 0;
		world.player.vy = 0;
	});
}

/**
 * Start a level and run the game for a number of ticks.
 *
 * An event that waits for a click at the level start waits until the inputs click. Math.random() uses a pseudo-random
 * generator with the given seed, so the visual effects that change the game state give the same result in each run.
 * The run stops in the tick in which the player reaches the exit. In this tick, the phase of the same level changes
 * from running to closing. More levels can run in the same page.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {object} options The run options.
 * @param {number} options.campaign The index of the campaign.
 * @param {number} options.level The level number, starting at 1.
 * @param {number} options.ticks The number of ticks to run.
 * @param {number} options.seed The seed for Math.random().
 * @param {number[][]} [options.inputs] For each tick the key bitmask, the mouse x and the mouse y position. Without
 *     inputs, the run does not change the input state.
 * @param {object} [options.replay] A replay in the file format. The run plays the replay instead of using inputs.
 * @param {boolean} [options.skipBossIntro] True to start the level as a restart, which skips the entrance of the boss
 *     and the waits of the events, as a replay does.
 * @returns {Promise<string>} One JSON line for each snapshot, and the line "finished" if the player reached the exit.
 */
export async function runLevel(
	page,
	{ campaign, level, ticks, seed, inputs = null, replay = null, skipBossIntro = false },
) {
	return page.evaluate(
		async ({ campaign, level, ticks, seed, inputs, replay: replayData, skipBossIntro, interval }) => {
			const { campaigns } = await import('/js/chrome/campaigns.js');
			const t = window.__test;
			const { input, stage } = t;
			const levelData = campaigns[campaign].levels[level - 1];
			let state = seed >>> 0;
			Math.random = () => {
				state = (state + 0x6d2b79f5) >>> 0;
				let t = state;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};

			// the level selection shows the preview before the level
			stage.preview(levelData);
			stage.play(levelData, { replay: replayData, restart: skipBossIntro });
			const startMap = t.world().map.tiles.slice();

			const pick = (obj, fields) => fields.map((field) => obj[field]);
			// the snapshots store the flags of the player, the crates, the turrets and the plasma balls as 0 and 1
			const pickNumbers = (obj, fields) => pick(obj, fields).map((v) => (typeof v === 'boolean' ? Number(v) : v));
			// a restart creates a new World, so the snapshot reads the current one
			const snapshot = (tick, world = t.world()) =>
				JSON.stringify({
					tick,
					time: world.time,
					player: pickNumbers(world.player, ['x', 'y', 'vx', 'vy', 'life', 'dead']),
					crates: world.crates.map((c) => pickNumbers(c, ['x', 'y', 'vx', 'vy', 'carried'])),
					turrets: world.turrets.map((t) => pickNumbers(t, ['x', 'y', 'vx', 'vy', 'dead', 'carried'])),
					plasma: world.plasmaBall.map((p) => pickNumbers(p, ['x', 'y', 'vx', 'vy', 'used'])),
					platforms: world.platforms.map((p) => pick(p, ['x', 'y', 'vx'])),
					portals: world.portals.list.map((p) => pick(p, ['x', 'y', 'used', 'direction'])),
					cakesLeft: world.cakesLeft,
					map: world.map.tiles.flatMap((tile, i) => (tile === startMap[i] ? [] : [[i, tile]])),
				});

			/**
			 * Read the level run and its phase. Each level start and each restart create a new player object, so the
			 * player object identifies the level run.
			 *
			 * @returns {{run: object, running: boolean, closing: boolean}} The player object of the level run, and the
			 *     flags for the running level and for the closing transition.
			 */
			const levelPhase = () => ({
				run: t.world().player,
				running: t.world().isRunning(),
				closing: t.world().isClosing(),
			});
			/**
			 * Check if a tick ended the level.
			 *
			 * @param {{run: object, running: boolean}} before The level phase before the tick.
			 * @param {{run: object, closing: boolean}} after The level phase after the tick.
			 * @returns {boolean} True if the phase changed from running to closing in the same level run.
			 */
			const levelEnded = (before, after) => after.run === before.run && before.running && after.closing;

			const lines = [snapshot(0)];
			for (let tick = 1; tick <= ticks; tick++) {
				if (inputs) {
					[input.keys, input.mouseX, input.mouseY] = inputs[tick - 1];
				}
				const before = levelPhase();
				t.tick();
				const finished = levelEnded(before, levelPhase());
				if (tick % interval === 0 || finished) lines.push(snapshot(tick));
				if (finished) {
					lines.push('finished');
					break;
				}
			}
			t.endReplay();
			return lines.join('\n') + '\n';
		},
		{ campaign, level, ticks, seed, inputs, replay, skipBossIntro, interval: SNAPSHOT_INTERVAL },
	);
}

/**
 * Get the replay that the stage recorded in the last run.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<object>} The replay in the file format, after a round trip through JSON.
 */
export async function recordedReplay(page) {
	const data = await page.evaluate(async () => {
		const { encodeReplay } = await import('/js/stage/replay.js');
		const t = window.__test;
		const world = t.world();
		return JSON.stringify(encodeReplay(t.replay(), world.level.campaign, world.level.number));
	});
	return JSON.parse(data);
}

/**
 * Run a scene with portals on an empty map with walls on all four borders.
 *
 * The scene starts the first level of the normal campaign and replaces its map. The player shoots each portal from a
 * position toward a target. Then the object of the scene goes on the map and the game runs.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {object} scene The scene.
 * @param {number[][]} scene.portals For each portal the x and the y position of the shot and of its target, in
 *     playfield pixels.
 * @param {object} [scene.object] The object: type "crate", "turret" or "plasma", the position x and y in playfield
 *     pixels, and for a plasma ball the speed vx and vy in 1/256 pixels per tick.
 * @param {number[]} scene.player The x and the y position of the player in playfield pixels.
 * @param {number} scene.keys The key bitmask during the scene.
 * @param {number} scene.ticks The number of ticks to run.
 * @param {number} scene.seed The seed for Math.random().
 * @returns {Promise<string>} One JSON line with the portals, then one JSON line for each tick with the position and
 *     the speed of the object and of the player.
 */
export async function runPortalScene(page, scene) {
	return page.evaluate(async (scene) => {
		const t = window.__test;
		const { input, stage } = t;
		const { campaigns } = await import('/js/chrome/campaigns.js');
		const { Crate } = await import('/js/stage/entities/Crate.js');
		const { Turret } = await import('/js/stage/entities/Turret.js');
		const { Plasma } = await import('/js/stage/entities/Plasma.js');
		const { MAP_HEIGHT, MAP_WIDTH } = await import('/js/stage/constants.js');
		const { Tile } = await import('/js/stage/tiles.js');
		let state = scene.seed >>> 0;
		Math.random = () => {
			state = (state + 0x6d2b79f5) >>> 0;
			let r = state;
			r = Math.imul(r ^ (r >>> 15), r | 1);
			r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		};

		stage.play(campaigns[0].levels[0]);
		const world = t.world();
		world.map.replace(
			world.map.tiles.map((tile, i) => {
				const x = world.map.column(i);
				const y = world.map.row(i);
				return x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1 ? Tile.WALL : Tile.EMPTY;
			}),
		);
		for (const list of [
			'cakes',
			'crates',
			'turrets',
			'plasmaBall',
			'platforms',
			'gravPipes',
			'gravPipeFields',
			'animatedTiles',
		])
			world[list] = [];
		input.keys = 0;
		for (let i = 0; i < 40; i++) t.tick();

		scene.portals.forEach(([sx, sy, tx, ty], p) => {
			world.player.x = sx << 8;
			world.player.y = sy << 8;
			input.mouseX = tx;
			input.mouseY = ty;
			world.portals.launchPortal(p, input.mouseX, input.mouseY);
		});
		Object.assign(world.player, { x: scene.player[0] << 8, y: scene.player[1] << 8, vx: 0, vy: 0 });
		const o = scene.object;
		let obj = null;
		if (o?.type === 'crate') world.crates.push((obj = new Crate(world, o.x << 8, o.y << 8)));
		else if (o?.type === 'turret') world.turrets.push((obj = new Turret(world, o.x << 8, o.y << 8, -1)));
		else if (o?.type === 'plasma') world.plasmaBall.push((obj = new Plasma(world, o.x << 8, o.y << 8, o.vx, o.vy)));

		const p = world.portals.list.map((portal) => [portal.used, portal.direction, portal.x >> 8, portal.y >> 8]);
		const lines = [JSON.stringify({ portals: p })];
		for (let tick = 1; tick <= scene.ticks; tick++) {
			input.keys = scene.keys;
			t.tick();
			const pick = (e) => (e ? [e.x, e.y, e.vx, e.vy] : null);
			lines.push(JSON.stringify([tick, pick(obj), pick(t.world().player)]));
		}
		return lines.join('\n') + '\n';
	}, scene);
}
