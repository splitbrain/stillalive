/**
 * Tests of the level editor with a map file that has properties beyond the tiles and the background.
 */

import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
	finishLevel,
	isSameLevelRun,
	levelAbilities,
	levelLabels,
	rememberLevelRun,
	setPlayer,
	stageValue,
	startGame,
	waitForLevelTime,
	waitForNarrator,
} from './adapter.js';

/** @type {object} A map file with a title, abilities, events and labels. */
const MAP = JSON.parse(readFileSync(new URL('../maps/tutorial/level04.json', import.meta.url)));

/**
 * Get the editor map of the stage in the map file format.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<object>} The editor map with the format.
 */
function editorMap(page) {
	return page.evaluate(() => ({ format: 1, ...window.__test.stage.getMap() }));
}

/**
 * Click a button of the editor buttons after the narrator has typed its text, so that the button stays in place.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {string} name The label of the button, e.g. "Export".
 * @returns {Promise<void>}
 */
async function clickButton(page, name) {
	await waitForNarrator(page);
	await page.locator('editor-buttons').getByRole('button', { name, exact: true }).click();
}

/**
 * Start the game and open the editor on an imported map file.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @param {object} map The content of the map file.
 * @returns {Promise<void>}
 */
async function openMap(page, map) {
	await startGame(page);
	await page.evaluate(() => (location.hash = '#/editor'));
	await expect.poll(() => stageValue(page, 'mode')).toBe('edit');
	const chooser = page.waitForEvent('filechooser');
	await clickButton(page, 'Import');
	const buffer = Buffer.from(JSON.stringify(map));
	await (await chooser).setFiles({ name: 'map.json', mimeType: 'application/json', buffer });
	await expect.poll(() => editorMap(page).then((stored) => stored.title)).toBe(map.title);
}

/**
 * Hold the left mouse button on the stage until the wait of an event ends. The stage reads the mouse button once per
 * tick, so the button stays down until the stage ends the wait.
 *
 * @param {import('@playwright/test').Page} page The Playwright page.
 * @returns {Promise<void>}
 */
async function clickThroughWait(page) {
	const stage = await page.locator('game-stage').boundingBox();
	await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
	await page.mouse.down();
	await expect.poll(() => page.evaluate(() => window.__test.stage.message.get()?.wait ?? false)).toBe(false);
	await page.mouse.up();
}

test.describe('editor', () => {
	test('exports the properties of the imported map file unchanged', async ({ page }) => {
		await openMap(page, MAP);
		const download = page.waitForEvent('download');
		await clickButton(page, 'Export');
		const file = await (await download).path();
		expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(MAP);
	});

	test('keeps the properties in a save slot', async ({ page }) => {
		await openMap(page, MAP);
		await clickButton(page, 'Save');
		await page.locator('slot-list button[data-choice="1"]').click();
		await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/editor');

		await clickButton(page, 'Clear');
		await clickButton(page, 'Load');
		await page.locator('slot-list button[data-choice="1"]').click();
		await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/editor');
		expect(await editorMap(page)).toEqual(MAP);
	});

	test('removes the properties with Clear and brings them back with Undo', async ({ page }) => {
		await openMap(page, MAP);
		await clickButton(page, 'Clear');
		expect(Object.keys(await page.evaluate(() => window.__test.stage.getMap())).sort()).toEqual(['bg', 'tiles']);
		await clickButton(page, 'Undo');
		expect(await editorMap(page)).toEqual(MAP);
	});

	test('plays the map in the test run like a level', async ({ page }) => {
		await openMap(page, { ...MAP, abilities: { jump: false, portals: false } });
		await clickButton(page, 'Try');
		await expect.poll(() => stageValue(page, 'mode')).toBe('test');
		await expect.poll(() => stageValue(page, 'message')).toMatchObject({ text: /^Your portal gun/, wait: true });
		await waitForNarrator(page);
		expect(await levelLabels(page)).toEqual(MAP.labels);

		await clickThroughWait(page);
		await expect.poll(() => stageValue(page, 'message')).toMatchObject({ text: /^Shoot a portal/ });
		// the first event unlocks the portals
		expect(await levelAbilities(page)).toEqual({ jump: false, portals: true });

		// the death of the player restarts the level and keeps the test run
		await rememberLevelRun(page);
		await setPlayer(page, { life: -100000 });
		await expect.poll(() => isSameLevelRun(page)).toBe(false);
		expect(await stageValue(page, 'mode')).toBe('test');

		await page.keyboard.press('Escape');
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');
		expect(await stageValue(page, 'message')).toBeNull();
	});

	test('goes back to the editor after the exit of the test run', async ({ page }) => {
		await openMap(page, { ...MAP, events: [{ on: 'exit', text: 'Goodbye', wait: 'click' }] });
		await clickButton(page, 'Try');
		await expect.poll(() => stageValue(page, 'mode')).toBe('test');
		await waitForLevelTime(page);
		await finishLevel(page);
		await expect.poll(() => stageValue(page, 'message')).toMatchObject({ text: 'Goodbye', wait: true });

		await clickThroughWait(page);
		await expect.poll(() => stageValue(page, 'mode')).toBe('edit');
		expect(await page.evaluate(() => location.hash)).toBe('#/editor');
	});
});
