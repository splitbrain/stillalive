/**
 * Test adapter that reads and writes the game state in the browser.
 *
 * The functions in this file are the only test code that knows the global variables of the game. The test files
 * only use the exported functions.
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
	await page.goto('./');
	await page.waitForFunction(
		() =>
			typeof campaigns !== 'undefined' &&
			levelsLoaded >= levelsToLoad &&
			txtLoaded >= txtToLoad &&
			loadedImg >= imgToLoad,
		null,
		{ polling: 50 },
	);
}

/**
 * Start a level and run the game for a number of ticks.
 *
 * The level starts in the same way as from the level selection in the menu. Math.random() gets a pseudo-random
 * generator with the given seed, so the visual effects that change the game state give the same result in each run.
 * The run stops early in the tick in which the player reaches the exit. More levels can run in the same page.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {object} options The run options.
 * @param {number} options.campaign The index of the campaign.
 * @param {number} options.level The level number, starting at 1.
 * @param {number} options.ticks The number of ticks to run.
 * @param {number} options.seed The seed for Math.random().
 * @param {number[][]} [options.inputs] For each tick the key bitmask, the mouse x and the mouse y position. Without
 *     inputs, the run does not change the input state.
 * @returns {Promise<string>} One JSON line for each snapshot, and the line "finished" if the player reached the exit.
 */
export async function runLevel(page, { campaign, level, ticks, seed, inputs = null }) {
	return page.evaluate(
		({ campaign, level, ticks, seed, inputs, interval }) => {
			let state = seed >>> 0;
			Math.random = () => {
				state = (state + 0x6d2b79f5) >>> 0;
				let t = state;
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};

			let finished = false;
			const originalFinNiveau = finNiveau;
			finNiveau = function () {
				const result = originalFinNiveau();
				if (result) finished = true;
				return result;
			};

			ECART_X = 64;
			ECART_Y = 96;
			lvlType = campaign;
			currentLevel = level;
			if (campaign === 3) {
				bossNum = 0;
				currentMenu = 6;
				tutoJump = level > 1;
				tutoPortal = level > 4;
				tutoPause = true;
				portalsDisplayed = false;
				tutoEnded = false;
			} else {
				// the level selection in the menu loads the preview map before the level
				currentMenu = 1;
				loadPreviewMap(level);
				currentMenu = 2;
			}
			loadLevel(level);
			if (typeof camera === 'undefined') camera = new Camera(perso.x, perso.y);
			unclick();
			const startMap = map.slice();

			const pick = (obj, fields) => fields.map((field) => obj[field]);
			const snapshot = (tick) =>
				JSON.stringify({
					tick,
					time: TIME,
					perso: pick(perso, ['x', 'y', 'vx', 'vy', 'vie', 'mort']),
					caisses: caisses.map((c) => pick(c, ['x', 'y', 'vx', 'vy', 'porter'])),
					tourelles: tourelles.map((t) => pick(t, ['x', 'y', 'vx', 'vy', 'mort', 'porter'])),
					plasma: plasmaBall.map((p) => pick(p, ['x', 'y', 'vx', 'vy', 'used'])),
					platforms: platforms.map((p) => pick(p, ['x', 'y', 'vx'])),
					portals: portals.map((p) => pick(p, ['x', 'y', 'used', 'direction'])),
					cakesLeft: CAKELEFT,
					map: map.flatMap((tile, i) => (tile === startMap[i] ? [] : [[i, tile]])),
				});

			const lines = [snapshot(0)];
			for (let tick = 1; tick <= ticks; tick++) {
				if (inputs) {
					[keys, mouseX, mouseY] = inputs[tick - 1];
				}
				myLoop();
				if (tick % interval === 0 || finished) lines.push(snapshot(tick));
				if (finished) {
					lines.push('finished');
					break;
				}
			}
			finNiveau = originalFinNiveau;
			return lines.join('\n') + '\n';
		},
		{ campaign, level, ticks, seed, inputs, interval: SNAPSHOT_INTERVAL },
	);
}
