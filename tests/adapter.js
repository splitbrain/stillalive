/**
 * Test adapter that reads and writes the game state in the browser.
 *
 * The game gives the tests access to its state and functions through window.__test when the URL contains "?test".
 * The functions in this file are the only test code that knows this hook. The test files only use the exported
 * functions.
 */

/**
 * The campaigns with their index in the campaigns array of the game and their number of levels.
 *
 * @type {{name: string, index: number, levels: number}[]}
 */
export const CAMPAIGNS = [
	{ name: 'normal', index: 0, levels: 28 },
	{ name: 'advanced', index: 1, levels: 28 },
	{ name: 'community', index: 2, levels: 28 },
	{ name: 'tutorial', index: 3, levels: 8 },
	{ name: 'story', index: 4, levels: 28 },
];

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
 * @returns {{level: number, id: string}[]} One entry for each level. The id is the campaign name and the level number
 *     with two digits, e.g. "normal-07".
 */
export function campaignLevels(campaign) {
	return Array.from({ length: campaign.levels }, (_, i) => ({
		level: i + 1,
		id: `${campaign.name}-${String(i + 1).padStart(2, '0')}`,
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
 * Open the game, stop its timers and wait until all levels, texts and images are loaded.
 *
 * The fake clock of Playwright never runs the game loop, so only runLevel() runs game ticks.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
export async function openGame(page) {
	await page.clock.install();
	await page.goto('./?test');
	await page.waitForFunction(
		() => {
			const t = window.__test;
			return t !== undefined && t.levelsLoaded() >= t.levelsToLoad() && t.allImagesLoaded();
		},
		null,
		{ polling: 50 },
	);
}

/**
 * Start a level and run the game for a number of ticks.
 *
 * The level starts in the same way as from the level selection in the menu. Math.random() gets a pseudo-random
 * generator with the given seed, so the visual effects that change the game state give the same result in each run.
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
 * @returns {Promise<string>} One JSON line for each snapshot, and the line "finished" if the player reached the exit.
 */
export async function runLevel(page, { campaign, level, ticks, seed, inputs = null, replay = null }) {
	return page.evaluate(
		({ campaign, level, ticks, seed, inputs, replay: replayData, interval }) => {
			const t = window.__test;
			const { game, ui, input } = t;
			let state = seed >>> 0;
			Math.random = () => {
				state = (state + 0x6d2b79f5) >>> 0;
				let t = state;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};

			game.ECART_X = 64;
			game.ECART_Y = 96;
			ui.lvlType = campaign;
			ui.currentLevel = level;
			if (campaign === 3) {
				game.bossNum = 0;
				ui.currentMenu = 6;
				ui.tutoJump = level > 1;
				ui.tutoPortal = level > 4;
				ui.tutoPause = true;
				ui.portalsDisplayed = false;
				ui.tutoEnded = false;
			} else {
				// the level selection in the menu loads the preview map before the level
				ui.currentMenu = 1;
				t.loadPreviewMap(level);
				ui.currentMenu = 2;
			}
			game.replayMode = replayData !== null;
			if (game.replayMode) game.replay = t.decodeReplay(replayData);
			t.loadLevel(level);
			if (typeof game.camera === 'undefined') game.camera = new t.Camera(game.perso.x, game.perso.y);
			t.unclick();
			const startMap = game.map.slice();

			const pick = (obj, fields) => fields.map((field) => obj[field]);
			const snapshot = (tick) =>
				JSON.stringify({
					tick,
					time: game.TIME,
					perso: pick(game.perso, ['x', 'y', 'vx', 'vy', 'vie', 'mort']),
					caisses: game.caisses.map((c) => pick(c, ['x', 'y', 'vx', 'vy', 'porter'])),
					tourelles: game.tourelles.map((t) => pick(t, ['x', 'y', 'vx', 'vy', 'mort', 'porter'])),
					plasma: game.plasmaBall.map((p) => pick(p, ['x', 'y', 'vx', 'vy', 'used'])),
					platforms: game.platforms.map((p) => pick(p, ['x', 'y', 'vx'])),
					portals: game.portals.map((p) => pick(p, ['x', 'y', 'used', 'direction'])),
					cakesLeft: game.CAKELEFT,
					map: game.map.flatMap((tile, i) => (tile === startMap[i] ? [] : [[i, tile]])),
				});

			const lines = [snapshot(0)];
			for (let tick = 1; tick <= ticks; tick++) {
				if (inputs) {
					[input.keys, input.mouseX, input.mouseY] = inputs[tick - 1];
				}
				const perso = game.perso;
				const fade = perso.fadeNextLevel;
				t.myLoop();
				const finished = game.perso === perso && fade === -1 && perso.fadeNextLevel === 120;
				if (tick % interval === 0 || finished) lines.push(snapshot(tick));
				if (finished) {
					lines.push('finished');
					break;
				}
			}
			game.replayMode = false;
			return lines.join('\n') + '\n';
		},
		{ campaign, level, ticks, seed, inputs, replay, interval: SNAPSHOT_INTERVAL },
	);
}

/**
 * Get the replay that the game recorded in the last run.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<object>} The replay in the file format, after a round trip through JSON.
 */
export async function recordedReplay(page) {
	const data = await page.evaluate(() => {
		const t = window.__test;
		return JSON.stringify(t.encodeReplay(t.game.replay, t.campaigns()[t.ui.lvlType].folder, t.ui.currentLevel));
	});
	return JSON.parse(data);
}
