/**
 * The buttons of the menus in the page: the main menu, the pause menu, the level selection and the intermission
 * screen. The handlers write the hovered and the clicked button into the state, and the menu logic takes the click in
 * the next tick. A click also sets the mouse position, so the effects of the menus start at the mouse.
 */

import { screenPoint } from './canvas.js';
import { LEVELS_PER_CAMPAIGN } from './constants.js';
import { game, input, ui } from './state.js';

/**
 * Set the mouse position of the game from a click on the page.
 *
 * @param {MouseEvent} event The click.
 * @returns {void}
 */
function setMousePosition(event) {
	if (game.replayMode && !ui.escapeMenu) return;
	const canvas = document.getElementById('canvas');
	const rect = canvas.getBoundingClientRect();
	[input.mouseX, input.mouseY] = screenPoint(event.clientX - rect.left, event.clientY - rect.top);
}

/**
 * Add the handlers of a button. The data attributes of the button name its menu and its value.
 *
 * @param {HTMLElement} button The button.
 * @returns {void}
 */
function setupButton(button) {
	const menu = button.dataset.menu;
	const value = Number(button.dataset.button);
	button.addEventListener('pointerenter', () => {
		ui[menu + 'Hover'] = value;
	});
	button.addEventListener('pointerleave', () => {
		if (ui[menu + 'Hover'] === value) ui[menu + 'Hover'] = -1;
	});
	button.addEventListener('click', (event) => {
		setMousePosition(event);
		ui[menu + 'Click'] = value;
	});
}

/**
 * Create the list of the levels of the level selection.
 *
 * @returns {void}
 */
function setupLevelList() {
	const list = document.getElementById('level-list');
	for (let level = 1; level <= LEVELS_PER_CAMPAIGN; level++) {
		const button = document.createElement('button');
		button.textContent = 'Level ' + level;
		button.dataset.level = String(level);
		button.addEventListener('click', (event) => {
			setMousePosition(event);
			ui.selectionLevelClick = level;
		});
		list.append(button);
	}
}

/**
 * Add the handlers of the menus of the page.
 *
 * @returns {void}
 */
export function setupMenuPage() {
	for (const button of document.querySelectorAll('[data-menu]')) setupButton(button);
	document.getElementById('sound-button').addEventListener('click', () => {
		ui.soundClick = true;
	});
	setupLevelList();
}
