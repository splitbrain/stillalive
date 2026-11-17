import { expect, test } from '@playwright/test';
import { MAP_HEIGHT, MAP_SIZE, MAP_WIDTH } from '../js/stage/constants.js';
import { emptyTiles } from '../js/stage/world/TileMap.js';
import { Tile } from '../js/stage/map/tiles.js';
import {
	CAMPAIGNS,
	finishLevel,
	runTicks,
	stageValue,
	startGame,
	waitForLevelTime,
	waitForNarrator,
} from './adapter.js';

/**
 * The screen parts: the elements that show on some screens only.
 *
 * @type {string[]}
 */
const SCREEN_PARTS = [
	'ui-loading',
	'ui-main-menu',
	'ui-level-selection',
	'ui-narrator-text',
	'game-stage',
	'ui-pause-menu',
	'ui-intermission',
	'ui-robot-head',
	'ui-hud',
	'ui-vcr-panel',
	'ui-vcr-display',
	'ui-editor-palette',
	'ui-editor-buttons',
	'ui-editor-files',
	'ui-credits',
];

/**
 * The screen parts of the level selection.
 *
 * @type {string[]}
 */
const SELECT_PARTS = ['ui-level-selection', 'game-stage'];

/**
 * The screen parts of a level.
 *
 * @type {string[]}
 */
const PLAY_PARTS = ['ui-robot-head', 'ui-hud', 'ui-narrator-text', 'game-stage'];

/**
 * The screen parts of the editor.
 *
 * @type {string[]}
 */
const EDITOR_PARTS = ['ui-editor-palette', 'ui-editor-buttons', 'ui-narrator-text', 'game-stage'];

/**
 * The screen parts of the save screen and the load screen of the editor.
 *
 * @type {string[]}
 */
const FILE_PARTS = ['ui-editor-files', 'ui-editor-palette', 'ui-editor-buttons', 'ui-narrator-text', 'game-stage'];

/**
 * Check the hash of the URL and the parts of the page that show. All other screen parts must be hidden.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} hash The expected hash, e.g. "#/editor".
 * @param {string[]} visible The screen parts that show.
 * @returns {Promise<void>}
 */
async function expectScreen(page, hash, visible) {
	await expectHash(page, hash);
	for (const part of SCREEN_PARTS) {
		if (visible.includes(part)) await expect(page.locator(part)).toBeVisible();
		else await expect(page.locator(part)).toBeHidden();
	}
}

/**
 * Check the hash of the URL.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} hash The expected hash, e.g. "#/editor".
 * @returns {Promise<void>}
 */
async function expectHash(page, hash) {
	await expect.poll(() => page.evaluate(() => location.hash)).toBe(hash);
}

/**
 * Check the hashes of the history entries below the current entry. The router stores them in the state of each entry
 * that it adds.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @param {string[]} trail The expected hashes, the lowest first.
 * @returns {Promise<void>}
 */
async function expectTrail(page, trail) {
	await expect.poll(() => page.evaluate(() => history.state?.trail ?? [])).toEqual(trail);
}

/**
 * Set the hash of the URL, as a link or a typed URL does.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} hash The hash, e.g. "#/credits".
 * @returns {Promise<void>}
 */
function setHash(page, hash) {
	return page.evaluate((hash) => {
		location.hash = hash;
	}, hash);
}

test.describe('ui', () => {
	test('walks the routes from the main menu to the level and to the editor', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/');
		await expectScreen(page, '#/', ['ui-main-menu']);
		await expect(page.locator('ui-main-menu .custom')).toBeHidden();

		await page.getByRole('link', { name: 'Classic Mode' }).click();
		await expectScreen(page, '#/select/normal', SELECT_PARTS);
		await expect(page.locator('ui-level-list')).toBeVisible();
		await expect(page.locator('ui-level-selection .details')).toBeHidden();
		await expect.poll(() => stageValue(page, 'mode')).toBe('preview');

		// a locked level is a link without a target
		await expect(page.locator('ui-level-list a:not([href])')).toHaveCount(27);
		await page.locator('ui-level-list').getByRole('link', { name: 'Level 1', exact: true }).click();
		await expectScreen(page, '#/select/normal/1', SELECT_PARTS);
		await expect(page.locator('ui-level-list')).toBeHidden();
		await expect(page.locator('ui-level-selection .title')).toHaveText('Holes in One');
		await expect(page.locator('ui-level-selection .number')).toHaveText('Level 1');
		await expect(page.locator('ui-level-selection .replay')).not.toHaveAttribute('href');
		await expect.poll(() => stageValue(page, 'mode')).toBe('preview');

		await page.locator('ui-level-selection .play').click();
		await expectScreen(page, '#/play/normal/1', PLAY_PARTS);
		await expect.poll(() => stageValue(page, 'mode')).toBe('play');
		await expect(page.locator('ui-hud [data-value="life"]')).toHaveText('100');
		await expect(page.locator('ui-hud [data-value="cakes"]')).toHaveText(/^\d+$/);
		await expect(page.locator('ui-hud [data-value="portals"]')).toHaveText('0');

		await page.keyboard.press('Escape');
		await expect(page.locator('ui-pause-menu')).toBeVisible();
		await expect.poll(() => stageValue(page, 'paused')).toBe(true);

		await page.locator('ui-pause-menu .resume').click();
		await expect(page.locator('ui-pause-menu')).toBeHidden();
		await expect.poll(() => stageValue(page, 'paused')).toBe(false);

		await page.keyboard.press('Escape');
		await page.locator('ui-pause-menu .exit').click();
		await expectScreen(page, '#/', ['ui-main-menu']);

		// the Exit link goes up to the entry of the main menu
		await expectTrail(page, []);

		await page.getByRole('link', { name: 'Classic Mode' }).click();
		await page.locator('ui-level-list').getByRole('link', { name: 'Level 1', exact: true }).click();
		await expectScreen(page, '#/select/normal/1', SELECT_PARTS);
		await expectTrail(page, ['#/', '#/select/normal']);

		await page.locator('ui-level-selection .back').click();
		await expectScreen(page, '#/select/normal', SELECT_PARTS);
		await expect(page.locator('ui-level-list')).toBeVisible();
		await expect.poll(() => stageValue(page, 'mode')).toBe('preview');
		await expectTrail(page, ['#/']);

		await page.locator('ui-level-selection .back').click();
		await expectScreen(page, '#/', ['ui-main-menu']);
		await expectTrail(page, []);

		await page.getByRole('link', { name: 'Level Editor' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('ui-editor-palette')).toBeVisible();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		// a palette button sets the brush of the stage to its tile
		const cake = page.locator('ui-editor-palette button[title="Cake"]');
		await cake.click();
		await expect.poll(() => stageValue(page, 'brush')).toBe(Tile.CAKE);
		await expect(cake).toHaveClass(/selected/);
		const tile = page.locator('ui-editor-palette button[data-tile]').first();
		await tile.click();
		await expect.poll(() => stageValue(page, 'brush')).toBe(Number(await tile.getAttribute('data-tile')));

		await waitForNarrator(page);
		await page.locator('ui-editor-buttons').getByRole('button', { name: 'Save' }).click();
		await expectScreen(page, '#/save', FILE_PARTS);
		await expect(page.locator('ui-slot-list')).toBeVisible();
		await expect(page.locator('ui-slot-list button').first()).toBeVisible();
		await expect(page.locator('ui-editor-palette')).toHaveAttribute('inert');
		await expect(page.locator('ui-editor-buttons button:enabled')).toHaveCount(0);

		await page.goBack();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('ui-editor-palette')).not.toHaveAttribute('inert');
		await expect(page.locator('ui-slot-list')).toBeHidden();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		await page.locator('ui-editor-buttons').getByRole('button', { name: 'Save' }).click();
		await expectScreen(page, '#/save', FILE_PARTS);
		await page.locator('ui-editor-files .back').click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('ui-editor-palette')).toBeVisible();
		await expect(page.locator('ui-slot-list')).toBeHidden();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		await expectTrail(page, ['#/']);

		await page.locator('ui-editor-buttons').getByRole('button', { name: 'Exit' }).click();
		await expectScreen(page, '#/', ['ui-main-menu']);
		await expectTrail(page, []);
	});

	test('keeps the history in the tree of the screens after a level', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('stillalive_progress', JSON.stringify({ normal: 2 })));
		await startGame(page);
		await setHash(page, '#/');
		await page.getByRole('link', { name: 'Classic Mode' }).click();
		await page.locator('ui-level-list').getByRole('link', { name: 'Level 1', exact: true }).click();
		await page.locator('ui-level-selection .play').click();
		await expectScreen(page, '#/play/normal/1', PLAY_PARTS);
		await waitForLevelTime(page);
		// a replay ends when its inputs end, so the level runs for 20 seconds to give the replay time for the checks
		await runTicks(page, 1200);
		await finishLevel(page);
		await expect(page.locator('ui-intermission')).toBeVisible();

		// the Stop button and the back button both end the replay and open the panel again
		const below = ['#/', '#/select/normal', '#/select/normal/1'];
		await page.locator('ui-intermission .replay').click();
		await expectHash(page, '#/replay/normal/1');
		await expect(page.locator('ui-vcr-panel')).toBeVisible();
		await expectTrail(page, [...below, '#/play/normal/1']);
		await page.locator('ui-vcr-panel .stop').click();
		await expectHash(page, '#/play/normal/1');
		await expect(page.locator('ui-intermission')).toBeVisible();
		await expectTrail(page, below);

		await page.locator('ui-intermission .replay').click();
		await expectHash(page, '#/replay/normal/1');
		await expect(page.locator('ui-vcr-panel')).toBeVisible();
		await page.goBack();
		await expectHash(page, '#/play/normal/1');
		await expect(page.locator('ui-intermission')).toBeVisible();
		await expectTrail(page, below);

		// Continue replaces the level, and the back button goes to the selection of the level that the player left
		await page.locator('ui-intermission .next').click();
		await expectScreen(page, '#/play/normal/2', PLAY_PARTS);
		await expectTrail(page, below);
		await page.goBack();
		await expectScreen(page, '#/select/normal/2', SELECT_PARTS);
		await expectTrail(page, ['#/', '#/select/normal']);
	});

	test('runs the test of the editor map on its own route', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/editor');
		await expectScreen(page, '#/editor', EDITOR_PARTS);

		const tryButton = page.locator('ui-editor-buttons .test');
		await tryButton.click();
		await expectHash(page, '#/test');
		await expect.poll(() => stageValue(page, 'mode')).toBe('test');
		await expectTrail(page, ['#/editor']);
		await page.goBack();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		// the end of the test run on the stage goes up to the editor
		await tryButton.click();
		await expect.poll(() => stageValue(page, 'mode')).toBe('test');
		await page.keyboard.press('Escape');
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');
		await expectTrail(page, []);

		await tryButton.click();
		await expect.poll(() => stageValue(page, 'mode')).toBe('test');
		await expect(tryButton).toHaveText('Stop');
		await tryButton.click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');
		await expectTrail(page, []);

		// without an open editor, the editor route replaces the test run
		await setHash(page, '#/');
		await expectScreen(page, '#/', ['ui-main-menu']);
		await setHash(page, '#/test');
		await expectScreen(page, '#/editor', EDITOR_PARTS);
	});

	test('keeps one map in memory and saves, loads, undoes and redoes it', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/editor');
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await waitForNarrator(page);
		const tiles = emptyTiles();
		tiles[100] = 16;
		await page.evaluate((tiles) => window.__test.stage.edit({ tiles, bg: 2 }), tiles);
		const map = () => page.evaluate(() => window.__test.stage.getMap());
		const buttons = page.locator('ui-editor-buttons');
		const slot = page.locator('ui-slot-list button').first();
		const confirm = page.locator('ui-confirm');

		// an empty slot saves at once and then shows its number
		await buttons.getByRole('button', { name: 'Save' }).click();
		await expectScreen(page, '#/save', FILE_PARTS);
		await expect(slot).toHaveText('Empty');
		await slot.click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(slot).toHaveText('Slot 1');

		await buttons.getByRole('button', { name: 'Clear' }).click();
		await expect.poll(async () => (await map()).tiles[100]).toBe(Tile.EMPTY);
		await buttons.getByRole('button', { name: 'Undo' }).click();
		await expect.poll(async () => (await map()).tiles[100]).toBe(16);
		await buttons.getByRole('button', { name: 'Redo' }).click();
		await expect.poll(async () => (await map()).tiles[100]).toBe(Tile.EMPTY);

		// an empty map loads at once
		await buttons.getByRole('button', { name: 'Load' }).click();
		await expectScreen(page, '#/load', FILE_PARTS);
		await slot.click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		expect(await map()).toEqual({ tiles, bg: 2 });

		// a map that is not empty is replaced only after the confirmation
		await buttons.getByRole('button', { name: 'Load' }).click();
		await slot.click();
		await confirm.getByRole('button', { name: 'No' }).click();
		await expectScreen(page, '#/load', FILE_PARTS);
		await slot.click();
		await confirm.getByRole('button', { name: 'Yes' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);

		// a stored slot is overwritten only after the confirmation
		await buttons.getByRole('button', { name: 'Save' }).click();
		await slot.click();
		await expect(confirm).toContainText('Slot 1 contains a map');
		await confirm.getByRole('button', { name: 'Yes' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);

		// the import question disables the palette and the buttons until Escape selects No
		await buttons.getByRole('button', { name: 'Import' }).click();
		await expect(confirm).toBeVisible();
		await expect(page.locator('ui-editor-palette')).toHaveAttribute('inert');
		await expect(page.locator('ui-editor-buttons button:enabled')).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(confirm).toBeHidden();
		await expect(page.locator('ui-editor-palette')).not.toHaveAttribute('inert');
		await expect(page.locator('ui-editor-buttons button:enabled')).toHaveCount(9);

		// the map stays in memory after the exit
		await buttons.getByRole('button', { name: 'Exit' }).click();
		await expectScreen(page, '#/', ['ui-main-menu']);
		await page.getByRole('link', { name: 'Level Editor' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		expect(await map()).toEqual({ tiles, bg: 2 });
	});

	test('plays the editor maps of the slots as the custom campaign', async ({ page }) => {
		await page.addInitScript(
			({ MAP_HEIGHT, MAP_SIZE, MAP_WIDTH, Tile }) => {
				if (sessionStorage.getItem('custom-setup')) return;
				sessionStorage.setItem('custom-setup', '1');
				const map = { tiles: Array.from({ length: MAP_SIZE }, () => Tile.EMPTY), bg: 0 };
				// a floor, the player start and the exit
				for (let x = 0; x < MAP_WIDTH; x++) map.tiles[(MAP_HEIGHT - 1) * MAP_WIDTH + x] = Tile.WALL;
				map.tiles[(MAP_HEIGHT - 3) * MAP_WIDTH + 2] = Tile.PLAYER_START;
				map.tiles[(MAP_HEIGHT - 2) * MAP_WIDTH + 20] = Tile.EXIT;
				localStorage.setItem('stillalive_editorMap1', JSON.stringify(map));
				localStorage.setItem('stillalive_editorMap3', JSON.stringify(map));
				localStorage.setItem('stillalive_bestTimes', JSON.stringify({ 'custom-3': 1 }));
			},
			{ MAP_HEIGHT, MAP_SIZE, MAP_WIDTH, Tile },
		);
		await startGame(page);
		await setHash(page, '#/');
		await expect(page.locator('ui-main-menu .custom')).toHaveText('My Levels 1/2');

		// all levels are unlocked, and the empty slots are disabled
		await page.getByRole('link', { name: 'My Levels' }).click();
		await expectScreen(page, '#/select/custom', SELECT_PARTS);
		const list = page.locator('ui-level-list');
		await expect(list.locator('a[href]')).toHaveText(['Level 1', 'Level 3']);

		// Continue skips the empty slot, and the last stored slot has no Continue
		await list.getByRole('link', { name: 'Level 1', exact: true }).click();
		await page.locator('ui-level-selection .play').click();
		await expectScreen(page, '#/play/custom/1', PLAY_PARTS);
		await waitForLevelTime(page);
		await finishLevel(page);
		await expect(page.locator('ui-intermission')).toBeVisible();
		await page.locator('ui-intermission .next').click();
		await expectScreen(page, '#/play/custom/3', PLAY_PARTS);
		await waitForLevelTime(page);
		await finishLevel(page);
		await expect(page.locator('ui-intermission')).toBeVisible();
		await expect(page.locator('ui-intermission .next')).toBeHidden();
		await expect(page.locator('ui-intermission .message')).toHaveText('Best time: 00:00.017');

		// a save into a slot deletes its best time
		await setHash(page, '#/');
		await expect(page.locator('ui-main-menu .custom')).toHaveText('My Levels 2/2');
		await setHash(page, '#/save');
		await page.locator('ui-slot-list button').nth(2).click();
		await page.locator('ui-confirm').getByRole('button', { name: 'Yes' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await setHash(page, '#/');
		await expect(page.locator('ui-main-menu .custom')).toHaveText('My Levels 1/2');
		expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('stillalive_bestTimes'))))).toEqual([
			'custom-1',
		]);
	});

	test('opens the tutorial with a button for each of its levels', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/');
		await page.getByRole('link', { name: 'Tutorial' }).click();
		await expectScreen(page, '#/select/tutorial', SELECT_PARTS);
		await expect(page.locator('ui-level-list ui-button')).toHaveCount(8);
	});

	test('holds the level end for the exit text until a click', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('stillalive_progress', JSON.stringify({ tutorial: 8 })));
		await startGame(page);
		await setHash(page, '#/play/tutorial/8');
		await waitForLevelTime(page);
		await finishLevel(page);
		await expect.poll(() => stageValue(page, 'message')).toMatchObject({ text: /^Congratulations/, wait: true });
		await expect(page.locator('ui-narrator-text')).toBeVisible();
		await expect(page.locator('ui-intermission')).toBeHidden();

		// the stage reads the mouse button once per tick, so the button stays down until the stage has ended the wait
		const stage = await page.locator('game-stage').boundingBox();
		await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
		await page.mouse.down();
		await expect.poll(() => stageValue(page, 'message')).toBeNull();
		await page.mouse.up();
		await expect(page.locator('ui-intermission')).toBeVisible();
		await expect(page.locator('ui-intermission .message')).toHaveText('New best time!');
	});

	test('replaces an unknown route and a locked level', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/unknown/route');
		await expectScreen(page, '#/', ['ui-main-menu']);

		await setHash(page, '#/select/normal/5');
		await expectScreen(page, '#/select/normal', SELECT_PARTS);
	});

	test('shows the credits after the last story level', async ({ page }) => {
		const last = CAMPAIGNS.find((campaign) => campaign.name === 'story').levels;
		// the game reads the progress when the page loads, and this progress unlocks the last story level
		await page.addInitScript(
			(last) => localStorage.setItem('stillalive_progress', JSON.stringify({ story: last })),
			last,
		);
		await startGame(page);
		await setHash(page, `#/select/story/${last}`);
		await expectScreen(page, `#/select/story/${last}`, SELECT_PARTS);

		await page.locator('ui-level-selection .play').click();
		await expectScreen(page, `#/play/story/${last}`, PLAY_PARTS);
		// the boss is the robot, so its window stays empty
		await expect(page.locator('ui-robot-head .window')).toBeVisible();
		await expect(page.locator('ui-robot-head .head')).toBeHidden();
		await expect(page.locator('ui-robot-head .eye')).toBeHidden();

		// the restart skips the entrance of the boss and the wait of its speech, which holds the level end
		await page.keyboard.press('Escape');
		await page.locator('ui-pause-menu .restart').click();
		await expect.poll(() => stageValue(page, 'paused')).toBe(false);
		await finishLevel(page);
		await expectScreen(page, '#/credits', ['ui-credits']);
		await expect.poll(() => stageValue(page, 'mode')).toBe('idle');

		await page.locator('ui-credits a').click();
		await expectScreen(page, '#/', ['ui-main-menu']);
	});

	test('shows the screen parts that shouldShow() selects', async ({ page }) => {
		await startGame(page);
		const screens = { '#/': 'main', '#/select/normal': 'select', '#/editor': 'editor' };
		const tags = [...SCREEN_PARTS.filter((tag) => tag !== 'game-stage'), 'ui-confirm'].sort();
		for (const [hash, screen] of Object.entries(screens)) {
			await setHash(page, hash);
			// the root element applies the route after the hashchange event, so the check polls
			const result = () =>
				page.evaluate(async (screen) => {
					const { UiElement } = await import('/js/ui/element.js');
					const elements = /** @type {import('../js/ui/element.js').UiElement[]} */ (
						[...document.querySelectorAll('ui-root *')].filter(
							(element) => element instanceof UiElement && element.shouldShow(screen) !== null,
						)
					);
					const mismatches = elements.filter((element) => element.hidden !== !element.shouldShow(screen));
					return {
						tags: [...new Set(elements.map((element) => element.localName))].sort(),
						mismatches: mismatches.map((element) => element.localName),
						stage: !(/** @type {HTMLElement} */ (document.querySelector('game-stage')).hidden),
					};
				}, screen);
			await expect.poll(result).toEqual({ tags, mismatches: [], stage: screen !== 'main' });
		}
	});

	test('builds the markup of an element once, on its first connect', async ({ page }) => {
		await startGame(page);
		const counts = await page.evaluate(() => {
			const stage = window.__test.stage;
			const menu = document.createElement('ui-pause-menu');
			const count = () => menu.querySelectorAll('a, button').length;
			const before = count();
			document.body.append(menu);
			const connected = count();
			menu.remove();
			document.body.append(menu);
			const reconnected = count();
			// after the second connect, the element has one click handler, so a click changes the sound once
			const sound = stage.sound.get();
			/** @type {HTMLElement} */ (menu.querySelector('.sound')).click();
			const toggled = stage.sound.get() !== sound;
			stage.setSound(sound);
			menu.remove();
			return { before, connected, reconnected, toggled };
		});
		expect(counts).toEqual({ before: 0, connected: 5, reconnected: 5, toggled: true });
	});

	test('renders the attributes that are set before the first connect', async ({ page }) => {
		await startGame(page);
		// an attribute change before the build must not render, which would throw in the browser
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const result = await page.evaluate(() => {
			const panel = document.createElement('ui-intermission');
			panel.setAttribute('message', 'New best time!');
			document.body.append(panel);
			const message = panel.querySelector('.message')?.textContent;
			panel.remove();
			return { message };
		});
		expect(result).toEqual({ message: 'New best time!' });
		expect(errors).toEqual([]);
	});
});
