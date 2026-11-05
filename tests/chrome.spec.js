import { expect, test } from '@playwright/test';
import { CAMPAIGNS, finishLevel, startGame, waitForNarrator } from './adapter.js';

/**
 * The elements of the page that show on some screens only. The app element hides the elements that the current screen
 * does not show.
 *
 * @type {string[]}
 */
const SCREEN_PARTS = [
	'loading-screen',
	'main-menu',
	'level-selection',
	'best-times',
	'narrator-text',
	'game-stage',
	'play-screen',
	'editor-screen',
	'credits-screen',
];

/**
 * The screen parts of the level selection.
 *
 * @type {string[]}
 */
const SELECT_PARTS = ['level-selection', 'best-times', 'narrator-text', 'game-stage'];

/**
 * The screen parts of a level.
 *
 * @type {string[]}
 */
const PLAY_PARTS = ['play-screen', 'best-times', 'narrator-text', 'game-stage'];

/**
 * The screen parts of the editor and of its save and load screen.
 *
 * @type {string[]}
 */
const EDITOR_PARTS = ['editor-screen', 'narrator-text', 'game-stage'];

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

		await waitForNarrator(page);
		const level1 = page.locator('level-list').getByRole('link', { name: 'Level 1', exact: true });
		await level1.click();
		await expectScreen(page, '#/campaign/normal/1', SELECT_PARTS);
		await expect(level1).toHaveClass('selected');
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
		await expectScreen(page, '#/campaign/normal/1', SELECT_PARTS);
		await expect.poll(() => stageValue(page, 'mode')).toBe('preview');

		// the Exit link replaces the entry of the level, so the back button goes to the entry before the level
		await page.goBack();
		await expectScreen(page, '#/campaign/normal/1', SELECT_PARTS);

		await waitForNarrator(page);
		await page.locator('level-selection .exit').click();
		await expectScreen(page, '#/', ['main-menu']);

		await page.getByRole('link', { name: 'Level Editor' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('tile-palette')).toBeVisible();
		await expect(page.locator('object-palette')).toBeVisible();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		await waitForNarrator(page);
		await page.locator('editor-buttons').getByRole('link', { name: 'Save' }).click();
		await expectScreen(page, '#/editor/save', EDITOR_PARTS);
		await expect(page.locator('slot-list')).toBeVisible();
		await expect(page.locator('slot-list button').first()).toBeVisible();
		await expect(page.locator('tile-palette')).toBeHidden();

		await page.goBack();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('tile-palette')).toBeVisible();
		await expect(page.locator('object-palette')).toBeVisible();
		await expect(page.locator('slot-list')).toBeHidden();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		await page.locator('editor-buttons').getByRole('link', { name: 'Save' }).click();
		await expectScreen(page, '#/editor/save', EDITOR_PARTS);
		await page.locator('editor-file-buttons').getByRole('link', { name: 'Exit' }).click();
		await expectScreen(page, '#/editor', EDITOR_PARTS);
		await expect(page.locator('tile-palette')).toBeVisible();
		await expect(page.locator('slot-list')).toBeHidden();
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');

		await page.locator('editor-buttons').getByRole('link', { name: 'Exit' }).click();
		await expectScreen(page, '#/', ['main-menu']);
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
		await page.addInitScript((last) => localStorage.setItem('sajs_progress', JSON.stringify({ story: last })), last);
		await startGame(page);
		await setHash(page, `#/campaign/story/${last}`);
		await expectScreen(page, `#/campaign/story/${last}`, SELECT_PARTS);

		await waitForNarrator(page);
		await page.locator('level-selection .play').click();
		await expectScreen(page, `#/campaign/story/${last}/play`, PLAY_PARTS);

		// the restart skips the entrance of the boss and the waits of its speeches, which hold the level end
		await page.keyboard.press('Escape');
		await page.locator('pause-menu .restart').click();
		await expect.poll(() => stageValue(page, 'paused')).toBe(false);
		await finishLevel(page);
		await expectScreen(page, '#/credits', ['credits-screen']);
		await expect.poll(() => stageValue(page, 'mode')).toBe('idle');

		await page.locator('credits-screen a').click();
		await expectScreen(page, '#/', ['main-menu']);
	});
});
