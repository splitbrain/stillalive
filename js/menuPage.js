/**
 * The buttons of the menus in the page: the main menu, the pause menu, the level selection, the intermission screen
 * and the editor with its palettes and its save and load screens. The handlers write the hovered and the clicked
 * button into the state, and the menu logic takes the click in the next tick. A click also sets the mouse position,
 * so the effects of the menus start at the mouse.
 */

import { screenPoint } from './canvas.js';
import { EDITOR_TILES, LEVELS_PER_CAMPAIGN } from './constants.js';
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
 * Create the tile palette of the editor from the tile set, and add the handlers of the object palette, the
 * background arrows and the slots of the save and load screens.
 *
 * @returns {void}
 */
function setupEditorPage() {
	const tiles = document.getElementById('editor-tiles');
	EDITOR_TILES.forEach((tile, index) => {
		const button = document.createElement('button');
		button.dataset.index = String(index);
		button.title = tile == 0 ? 'Eraser' : 'Tile ' + tile;
		const image = document.createElement('img');
		image.src = `tiles/tile_${tile}.svg`;
		image.alt = '';
		button.append(image);
		button.addEventListener('click', () => {
			ui.editorTileClick = index;
		});
		tiles.append(button);
	});
	for (const button of document.querySelectorAll('#editor-objects button[data-sprite]')) {
		button.addEventListener('click', () => {
			ui.editorSpriteClick = Number(button.dataset.sprite);
		});
	}
	for (const button of document.querySelectorAll('#editor-bg button')) {
		button.addEventListener('click', () => {
			ui.editorBgClick = Number(button.dataset.bg);
		});
	}
	const slots = document.getElementById('slot-list');
	for (let slot = 1; slot <= LEVELS_PER_CAMPAIGN; slot++) {
		const button = document.createElement('button');
		button.textContent = 'Slot ' + slot;
		button.dataset.slot = String(slot);
		button.addEventListener('click', () => {
			ui.editorSlotClick = slot;
		});
		slots.append(button);
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
	setupEditorPage();
}
