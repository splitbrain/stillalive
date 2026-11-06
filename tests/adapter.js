/**
 * Test adapter that reads and writes the game state in the browser.
 *
 * The stage element gives the tests access to itself and to its state and functions through window.__test when the URL
 * contains "?test". The campaigns come from the campaign module of the page. The functions in this file are the only
 * test code that knows this hook. The test files only use the exported functions.
 */

import { readFileSync } from 'node:fs';
import { CAMPAIGN_FOLDERS } from '../js/stage/constants.js';

/**
 * The campaigns with their index in the campaigns array of the game and their number of levels from the campaign
 * file.
 *
 * @type {{name: string, index: number, levels: number}[]}
 */
export const CAMPAIGNS = CAMPAIGN_FOLDERS.map((name, index) => ({
	name,
	index,
	levels: JSON.parse(readFileSync(new URL(`../maps/${name}/campaign.json`, import.meta.url))).levels.length,
}));

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
 * Open the game and wait until the stage is ready and all campaigns are loaded.
 *
 * The game loop and the timers of the page run at the real speed. runLevel() and runPortalScene() run all their ticks
 * in one call, so the game loop cannot run a tick between them.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
export async function openGame(page) {
	await page.goto('./?test');
	// the wait needs a function that answers at once, so the check of the campaigns is imported before
	await page.evaluate(async () => {
		window.__campaignsLoaded = (await import('/js/chrome/campaigns.js')).areCampaignsLoaded;
	});
	await page.waitForFunction(
		() => {
			const t = window.__test;
			return t !== undefined && t.stage.ready.get() && window.__campaignsLoaded();
		},
		null,
		{ polling: 50 },
	);
}

/**
 * Open the game and start it as a player does: click the start button and wait until the main menu shows.
 *
 * The game loop and the timers of the page run at the real speed, so the stage, the narrator and the robot work as in
 * the game.
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
 * Wait until the narrator text has typed its full text: the fixed text of the screen or the text of the message of
 * the stage. The click targets below the narrator text move while it types, so a click must wait for the end of the
 * text. The stage must not be paused and must not be in test mode, because the typing stops in a pause and the test
 * mode types a different text.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
export async function waitForNarrator(page) {
	await page.waitForFunction(() => {
		const narrator = document.querySelector('narrator-text');
		const text = narrator.getAttribute('text') ?? window.__test.stage.message.get()?.text ?? '';
		return narrator.querySelector('p').textContent === text;
	});
}

/**
 * Finish the running level: open the exit and place the player on the first exit tile. The game loop then runs the
 * end of the level. A wait of an event or the entrance of a boss holds the level end, so the level must run without
 * them, e.g. after a restart.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 * @throws {Error} If the level has no exit tile.
 */
export async function finishLevel(page) {
	await page.evaluate(async () => {
		const { openExit } = await import('/js/stage/entities/Cake.js');
		const { Tile } = await import('/js/stage/tiles.js');
		const { MAP_WIDTH } = await import('/js/stage/constants.js');
		const { game } = window.__test;
		openExit();
		// a tile is 16 pixels, and the player position is in 1/256 pixels
		const exit = game.map.indexOf(Tile.EXIT);
		if (exit < 0) throw new Error('The level has no exit tile.');
		game.player.x = (exit % MAP_WIDTH) << 12;
		game.player.y = Math.floor(exit / MAP_WIDTH) << 12;
		game.player.vx = 0;
		game.player.vy = 0;
	});
}

/**
 * Start a level and run the game for a number of ticks.
 *
 * The level starts in the same way as from the level selection, also in the tutorial: the stage shows the preview of
 * the level and then plays it. An event that waits for a click at the level start keeps waiting until the inputs click,
 * as in the game. Math.random() gets a pseudo-random generator with the given seed, so the visual effects that change
 * the game state give the same result in each run.
 * The run stops early in the tick in which the player reaches the exit. In this tick, the game sets the fade of the
 * same player object from -1 to 120. More levels can run in the same page.
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
			const { game, input, stage } = t;
			const levelData = campaigns[campaign].levels[level - 1];
			let state = seed >>> 0;
			Math.random = () => {
				state = (state + 0x6d2b79f5) >>> 0;
				let t = state;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};

			game.shakeX = 0;
			game.shakeY = 0;
			// the level selection shows the preview before the level
			stage.preview(levelData);
			stage.play(levelData, { replay: replayData, restart: skipBossIntro });
			const startMap = game.map.slice();

			const pick = (obj, fields) => fields.map((field) => obj[field]);
			// the snapshots store the flags of the player, the crates, the turrets and the plasma balls as 0 and 1
			const pickNumbers = (obj, fields) => pick(obj, fields).map((v) => (typeof v === 'boolean' ? Number(v) : v));
			const snapshot = (tick) =>
				JSON.stringify({
					tick,
					time: game.time,
					player: pickNumbers(game.player, ['x', 'y', 'vx', 'vy', 'life', 'dead']),
					crates: game.crates.map((c) => pickNumbers(c, ['x', 'y', 'vx', 'vy', 'carried'])),
					turrets: game.turrets.map((t) => pickNumbers(t, ['x', 'y', 'vx', 'vy', 'dead', 'carried'])),
					plasma: game.plasmaBall.map((p) => pickNumbers(p, ['x', 'y', 'vx', 'vy', 'used'])),
					platforms: game.platforms.map((p) => pick(p, ['x', 'y', 'vx'])),
					portals: game.portals.map((p) => pick(p, ['x', 'y', 'used', 'direction'])),
					cakesLeft: game.cakesLeft,
					map: game.map.flatMap((tile, i) => (tile === startMap[i] ? [] : [[i, tile]])),
				});

			const lines = [snapshot(0)];
			for (let tick = 1; tick <= ticks; tick++) {
				if (inputs) {
					[input.keys, input.mouseX, input.mouseY] = inputs[tick - 1];
				}
				const player = game.player;
				const fade = player.fadeNextLevel;
				t.tick();
				const finished = game.player === player && fade === -1 && player.fadeNextLevel === 120;
				if (tick % interval === 0 || finished) lines.push(snapshot(tick));
				if (finished) {
					lines.push('finished');
					break;
				}
			}
			game.replayMode = false;
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
		const { game } = window.__test;
		return JSON.stringify(encodeReplay(game.replay, game.level.campaign, game.level.number));
	});
	return JSON.parse(data);
}

/**
 * Run a scene with portals on an empty map with walls on all four borders.
 *
 * The scene plays the first level of the normal campaign, replaces its map, and lets the player shoot the two
 * portals from a position toward a target. Then it places the object of the scene and runs the game. Each tick adds
 * one line with the position and the speed of the object and of the player.
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
 * @returns {Promise<string>} One line for each tick.
 */
export async function runPortalScene(page, scene) {
	return page.evaluate(async (scene) => {
		const t = window.__test;
		const { game, input, stage } = t;
		const { campaigns } = await import('/js/chrome/campaigns.js');
		const { launchPortal } = await import('/js/stage/portals.js');
		const { Crate } = await import('/js/stage/entities/Crate.js');
		const { Turret } = await import('/js/stage/entities/Turret.js');
		const { Plasma } = await import('/js/stage/entities/Plasma.js');
		const { MAP_HEIGHT, MAP_WIDTH } = await import('/js/stage/constants.js');
		let state = scene.seed >>> 0;
		Math.random = () => {
			state = (state + 0x6d2b79f5) >>> 0;
			let r = state;
			r = Math.imul(r ^ (r >>> 15), r | 1);
			r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		};

		stage.play(campaigns[0].levels[0]);
		for (let i = 0; i < game.map.length; i++) {
			const x = i % MAP_WIDTH;
			const y = Math.floor(i / MAP_WIDTH);
			game.map[i] = x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1 ? 1 : 0;
		}
		game.displayMap = game.map.slice();
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
			game[list] = [];
		game.tilesChanged = true;
		input.keys = 0;
		for (let i = 0; i < 40; i++) t.tick();

		scene.portals.forEach(([sx, sy, tx, ty], p) => {
			game.player.x = sx << 8;
			game.player.y = sy << 8;
			input.mouseX = tx;
			input.mouseY = ty;
			launchPortal(p);
		});
		Object.assign(game.player, { x: scene.player[0] << 8, y: scene.player[1] << 8, vx: 0, vy: 0 });
		const o = scene.object;
		let obj = null;
		if (o?.type === 'crate') game.crates.push((obj = new Crate(o.x << 8, o.y << 8)));
		else if (o?.type === 'turret') game.turrets.push((obj = new Turret(o.x << 8, o.y << 8, -1)));
		else if (o?.type === 'plasma') game.plasmaBall.push((obj = new Plasma(o.x << 8, o.y << 8, o.vx, o.vy)));

		const p = game.portals.map((portal) => [portal.used, portal.direction, portal.x >> 8, portal.y >> 8]);
		const lines = [JSON.stringify({ portals: p })];
		for (let tick = 1; tick <= scene.ticks; tick++) {
			input.keys = scene.keys;
			t.tick();
			const pick = (e) => (e ? [e.x, e.y, e.vx, e.vy] : null);
			lines.push(JSON.stringify([tick, pick(obj), pick(game.player)]));
		}
		return lines.join('\n') + '\n';
	}, scene);
}
