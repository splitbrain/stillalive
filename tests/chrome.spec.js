import { expect, test } from '@playwright/test';
import { CAMPAIGNS, finishLevel, startGame, waitForNarrator } from './adapter.js';

/**
 * The elements of the page that show on some screens only. The app element asks each of its screen parts with
 * shouldShow() if it shows on the current screen, and hides the parts that do not show. The stage shows on the
 * select, play, editor and editor-file screens.
 *
 * @type {string[]}
 */
const SCREEN_PARTS = [
	'loading-screen',
	'main-menu',
	'level-selection',
	// 'best-times',
	'narrator-text',
	'game-stage',
	'pause-menu',
	'intermission-panel',
	'robot-head',
	'game-hud',
	'vcr-panel',
	'vcr-display',
	'editor-palette',
	'editor-buttons',
	'editor-files',
	'credits-screen',
];

/**
 * The screen parts of the level selection.
 *
 * @type {string[]}
 */
const SELECT_PARTS = ['level-selection', /* 'best-times', */ 'game-stage'];

/**
 * The screen parts of a level.
 *
 * @type {string[]}
 */
const PLAY_PARTS = ['robot-head', 'game-hud', /* 'best-times', */ 'narrator-text', 'game-stage'];

/**
 * The screen parts of the editor.
 *
 * @type {string[]}
 */
const EDITOR_PARTS = ['editor-palette', 'editor-buttons', 'narrator-text', 'game-stage'];

/**
 * The screen parts of the save and load screen of the editor.
 *
 * @type {string[]}
 */
const FILE_PARTS = ['editor-files', 'editor-palette', 'editor-buttons', 'narrator-text', 'game-stage'];

/**
 * Check the hash of the URL and the parts of the page that show. All other screen parts must be hidden.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} hash The expected hash, e.g. "#/editor".
 * @param {string[]} visible The screen parts that show.
 * @returns {Promise<void>}
 */
async function expectScreen(page, hash, visible) {
	await expect.poll(() => page.evaluate(() => location.hash)).toBe(hash);
	for (const part of SCREEN_PARTS) {
		if (visible.includes(part)) await expect(page.locator(part)).toBeVisible();
		else await expect(page.locator(part)).toBeHidden();
	}
}

/**
 * Get a value of the stage.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} name The name of the value, e.g. "mode".
 * @returns {Promise<*>} The current content of the value.
 */
function stageValue(page, name) {
	return page.evaluate((name) => window.__test.stage[name].get(), name);
}

/**
 * Set the hash of the URL, as a link or a typed URL does.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} hash The hash, e.g. "#/credits".
 * @returns {Promise<void>}
 */
function setHash(page, hash) {
	return page.evaluate((hash) => (location.hash = hash), hash);
}

test.describe('chrome', () => {
	test('walks the routes from the main menu to the level and to the editor', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/');
		await expectScreen(page, '#/', ['main-menu']);

		await page.getByRole('link', { name: 'Classic Mode' }).click();
		await expectScreen(page, '#/campaign/normal', SELECT_PARTS);
		await expect(page.locator('level-list')).toBeVisible();
		await expect(page.locator('level-selection .details')).toBeHidden();
		await expect.poll(() => stageValue(page, 'mode')).toBe('preview');

		// a locked level is a link without a target
		await expect(page.locator('level-list a:not([href])')).toHaveCount(27);
		await page.locator('level-list').getByRole('link', { name: 'Level 1', exact: true }).click();
		await expectScreen(page, '#/campaign/normal/1', SELECT_PARTS);
		await expect(page.locator('level-list')).toBeHidden();
		await expect(page.locator('level-selection .title')).toHaveText('Holes in One');
		await expect(page.locator('level-selection .number')).toHaveText('Level 1');
		await expect(page.locator('level-selection .replay')).not.toHaveAttribute('href');
		await expect.poll(() => stageValue(page, 'mode')).toBe('preview');

		await page.locator('level-selection .play').click();
		await expectScreen(page, '#/campaign/normal/1/play', PLAY_PARTS);
		await expect.poll(() => stageValue(page, 'mode')).toBe('play');
		await expect(page.locator('game-hud [data-value="life"]')).toHaveText('100');
		await expect(page.locator('game-hud [data-value="cakes"]')).toHaveText(/^\d+$/);
		await expect(page.locator('game-hud [data-value="portals"]')).toHaveText('0');

		await page.keyboard.press('Escape');
		await expect(page.locator('pause-menu')).toBeVisible();
		await expect.poll(() => stageValue(page, 'paused')).toBe(true);

		await page.locator('pause-menu .resume').click();
		await expect(page.locator('pause-menu')).toBeHidden();
		await expect.poll(() => stageValue(page, 'paused')).toBe(false);

		await page.keyboard.press('Escape');
		await page.locator('pause-menu .exit').click();
		await expectScreen(page, '#/', ['main-menu']);

		// the Exit link replaces the entry of the level, so the back button goes to the entry before the level
		await page.goBack();
		await expectScreen(page, '#/campaign/normal/1', SELECT_PARTS);
		await expect.poll(() => stageValue(page, 'mode')).toBe('preview');

		await page.locator('level-selection .back').click();
		await expectScreen(page, '#/campaign/normal', SELECT_PARTS);
		await expect(page.locator('level-list')).toBeVisible();

		await page.locator('level-selection .back').click();
		await expectScreen(page, '#/', ['main-menu']);

		await page.getByRole('link', { name: 'Level Editor' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('editor-palette')).toBeVisible();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		// the palette names the objects by their constants and sets the brush of the stage
		const cake = page.locator('editor-palette button[title="Cake"]');
		await cake.click();
		await expect.poll(() => stageValue(page, 'brush')).toBe(103);
		await expect(cake).toHaveClass(/selected/);
		const tile = page.locator('editor-palette button[data-tile]').first();
		await tile.click();
		await expect.poll(() => stageValue(page, 'brush')).toBe(Number(await tile.getAttribute('data-tile')));

		await waitForNarrator(page);
		await page.locator('editor-buttons').getByRole('button', { name: 'Save' }).click();
		await expectScreen(page, '#/editor/save', FILE_PARTS);
		await expect(page.locator('slot-list')).toBeVisible();
		await expect(page.locator('slot-list button').first()).toBeVisible();
		await expect(page.locator('editor-palette')).toHaveAttribute('inert');
		await expect(page.locator('editor-buttons button:enabled')).toHaveCount(0);

		await page.goBack();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('editor-palette')).not.toHaveAttribute('inert');
		await expect(page.locator('slot-list')).toBeHidden();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		await page.locator('editor-buttons').getByRole('button', { name: 'Save' }).click();
		await expectScreen(page, '#/editor/save', FILE_PARTS);
		await page.locator('editor-files .back').click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('editor-palette')).toBeVisible();
		await expect(page.locator('slot-list')).toBeHidden();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		await page.locator('editor-buttons').getByRole('button', { name: 'Exit' }).click();
		await expectScreen(page, '#/', ['main-menu']);
	});

	test('keeps one map in memory and saves, loads, undoes and redoes it', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/editor');
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await waitForNarrator(page);
		const tiles = new Array(768).fill(0);
		tiles[100] = 16;
		await page.evaluate((tiles) => window.__test.stage.edit({ tiles, bg: 2 }), tiles);
		const map = () => page.evaluate(() => window.__test.stage.getMap());
		const buttons = page.locator('editor-buttons');
		const slot = page.locator('slot-list button').first();
		const confirm = page.locator('confirm-screen');

		// an empty slot saves at once and then shows its number
		await buttons.getByRole('button', { name: 'Save' }).click();
		await expectScreen(page, '#/editor/save', FILE_PARTS);
		await expect(slot).toHaveText('Empty');
		await slot.click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(slot).toHaveText('Slot 1');

		await buttons.getByRole('button', { name: 'Clear' }).click();
		await expect.poll(async () => (await map()).tiles[100]).toBe(0);
		await buttons.getByRole('button', { name: 'Undo' }).click();
		await expect.poll(async () => (await map()).tiles[100]).toBe(16);
		await buttons.getByRole('button', { name: 'Redo' }).click();
		await expect.poll(async () => (await map()).tiles[100]).toBe(0);

		// an empty map loads at once
		await buttons.getByRole('button', { name: 'Load' }).click();
		await expectScreen(page, '#/editor/load', FILE_PARTS);
		await slot.click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		expect(await map()).toEqual({ tiles, bg: 2 });

		// a map that is not empty is replaced only after the confirmation
		await buttons.getByRole('button', { name: 'Load' }).click();
		await slot.click();
		await confirm.getByRole('button', { name: 'No' }).click();
		await expectScreen(page, '#/editor/load', FILE_PARTS);
		await slot.click();
		await confirm.getByRole('button', { name: 'Yes' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);

		// a stored slot is overwritten only after the confirmation
		await buttons.getByRole('button', { name: 'Save' }).click();
		await slot.click();
		await expect(confirm).toContainText('Slot 1 contains a map');
		await confirm.getByRole('button', { name: 'Yes' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);

		// the question of the import disables the palette and the buttons until Escape answers it with No
		await buttons.getByRole('button', { name: 'Import' }).click();
		await expect(confirm).toBeVisible();
		await expect(page.locator('editor-palette')).toHaveAttribute('inert');
		await expect(page.locator('editor-buttons button:enabled')).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(confirm).toBeHidden();
		await expect(page.locator('editor-palette')).not.toHaveAttribute('inert');
		await expect(page.locator('editor-buttons button:enabled')).toHaveCount(9);

		// the map stays in memory after the exit
		await buttons.getByRole('button', { name: 'Exit' }).click();
		await expectScreen(page, '#/', ['main-menu']);
		await page.getByRole('link', { name: 'Level Editor' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		expect(await map()).toEqual({ tiles, bg: 2 });
	});

	test('opens the tutorial with a button for each of its levels', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/');
		await page.getByRole('link', { name: 'Tutorial' }).click();
		await expectScreen(page, '#/campaign/tutorial', SELECT_PARTS);
		await expect(page.locator('level-list menu-button')).toHaveCount(8);
	});

	test('holds the level end for the exit text until a click', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('stillalive_progress', JSON.stringify({ tutorial: 8 })));
		await startGame(page);
		await setHash(page, '#/campaign/tutorial/8/play');
		await page.waitForFunction(() => window.__test.game.time > 0);
		await finishLevel(page);
		await expect.poll(() => stageValue(page, 'message')).toMatchObject({ text: /^Congratulations/, wait: true });
		await expect(page.locator('narrator-text')).toBeVisible();
		await expect(page.locator('intermission-panel')).toBeHidden();

		// the stage reads the mouse button once per tick, so the button stays down until the stage has ended the wait
		const stage = await page.locator('game-stage').boundingBox();
		await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
		await page.mouse.down();
		await expect.poll(() => stageValue(page, 'message')).toBeNull();
		await page.mouse.up();
		await expect(page.locator('intermission-panel')).toBeVisible();
		await expect(page.locator('intermission-panel .message')).toHaveText('New best time!');
	});

	test('replaces an unknown route and a locked level', async ({ page }) => {
		await startGame(page);
		await setHash(page, '#/unknown/route');
		await expectScreen(page, '#/', ['main-menu']);

		await setHash(page, '#/campaign/normal/5');
		await expectScreen(page, '#/campaign/normal', SELECT_PARTS);
	});

	test('shows the credits after the last story level', async ({ page }) => {
		const last = CAMPAIGNS.find((campaign) => campaign.name == 'story').levels;
		// the progress is read when the page loads: the last story level is unlocked and not finished
		await page.addInitScript((last) => localStorage.setItem('stillalive_progress', JSON.stringify({ story: last })), last);
		await startGame(page);
		await setHash(page, `#/campaign/story/${last}`);
		await expectScreen(page, `#/campaign/story/${last}`, SELECT_PARTS);

		await page.locator('level-selection .play').click();
		await expectScreen(page, `#/campaign/story/${last}/play`, PLAY_PARTS);
		// the boss is the robot, so its window stays empty
		await expect(page.locator('robot-head .window')).toBeVisible();
		await expect(page.locator('robot-head .head')).toBeHidden();
		await expect(page.locator('robot-head .eye')).toBeHidden();

		// the restart skips the entrance of the boss and the wait of its speech, which holds the level end
		await page.keyboard.press('Escape');
		await page.locator('pause-menu .restart').click();
		await expect.poll(() => stageValue(page, 'paused')).toBe(false);
		await finishLevel(page);
		await expectScreen(page, '#/credits', ['credits-screen']);
		await expect.poll(() => stageValue(page, 'mode')).toBe('idle');

		await page.locator('credits-screen a').click();
		await expectScreen(page, '#/', ['main-menu']);
	});

	test('shows the parts of the app that shouldShow() selects', async ({ page }) => {
		await startGame(page);
		const screens = { '#/': 'main', '#/campaign/normal': 'select', '#/editor': 'editor' };
		for (const [hash, screen] of Object.entries(screens)) {
			await setHash(page, hash);
			// the app applies the route after the hashchange event, so the check polls
			const result = () =>
				page.evaluate((screen) => {
					const parts = [...document.querySelectorAll('game-app .chrome-screen')];
					return {
						parts: parts.length,
						mismatches: parts.filter((part) => part.hidden !== !part.shouldShow(screen)).map((part) => part.localName),
						stage: !document.querySelector('game-stage').hidden,
					};
				}, screen);
			await expect.poll(result).toEqual({ parts: 14, mismatches: [], stage: screen != 'main' });
		}
	});

	test('builds the markup of an element once, on its first connect', async ({ page }) => {
		await startGame(page);
		const counts = await page.evaluate(() => {
			const stage = window.__test.stage;
			const menu = document.createElement('pause-menu');
			const count = () => menu.querySelectorAll('a, button').length;
			const before = count();
			document.body.append(menu);
			const connected = count();
			menu.remove();
			document.body.append(menu);
			const reconnected = count();
			// one click handler after the second connect: a click changes the sound once
			const sound = stage.sound.get();
			menu.querySelector('.sound').click();
			const toggled = stage.sound.get() !== sound;
			stage.setSound(sound);
			menu.remove();
			return { before, connected, reconnected, toggled };
		});
		expect(counts).toEqual({ before: 0, connected: 4, reconnected: 4, toggled: true });
	});

	test('renders the attributes that are set before the first connect', async ({ page }) => {
		await startGame(page);
		// an attribute change before the build must not render, which would throw in the browser
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const result = await page.evaluate(() => {
			const panel = document.createElement('best-times');
			panel.setAttribute('campaign', 'normal');
			panel.setAttribute('level', '1');
			document.body.append(panel);
			const open = panel.classList.contains('open');
			const title = panel.querySelector('.title')?.textContent;
			panel.remove();
			return { open, title };
		});
		expect(result).toEqual({ open: true, title: 'Level 1' });
		expect(errors).toEqual([]);
	});
});
