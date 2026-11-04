/**
 * The temporary page around the stage.
 *
 * The module fills the screens of the editor with the HTML elements of the page until the chrome elements exist: the
 * editor palettes and the slots of the save and load screen. It runs the actions that do not change the URL. The app
 * element shows the screens, drives the stage for the routes and tells the module the current screen.
 */

import { EDITOR_TILE_TITLES, EDITOR_TILES, LEVELS_PER_CAMPAIGN } from '../stage/constants.js';
import { MAP_FORMAT, parseMap } from '../stage/mapFile.js';
import { navigate } from '../router.js';
import { alertDialog } from './dialog.js';
import { downloadJson, pickJsonFile } from './files.js';
import { editorMap, saveEditorMap } from './storage.js';

/** @type {string} The text of the help dialog of the editor. */
const EDITOR_HELP =
	'Left click : Put tile or object\n' +
	'Right click : Remove tile or object\n' +
	'Middle click : Fill\n' +
	'ctrl + z : Undo\n' +
	'ctrl + y : Redo\n' +
	'Return : Try Map / Stop trying\n' +
	'Escape : Stop trying';

/** @type {import('../stage/GameStage.js').GameStage} The stage element. */
let stage;

/** @type {string} The screen of the route: loading, main, select, play, editor, editor-file or credits. */
let screen = 'loading';

/** @type {string|null} The mode of the route: play, replay, save, load, or null for none. */
let mode = null;

/** @type {number} The selected slot of the save or load screen, or 0 for none. */
let slot = 0;

/**
 * Get an element of the page by its id.
 *
 * @param {string} id The id.
 * @returns {HTMLElement} The element.
 */
function el(id) {
	return document.getElementById(id);
}

/**
 * Show or hide an element.
 *
 * @param {HTMLElement} element The element.
 * @param {boolean} shown True to show the element.
 * @returns {void}
 */
function show(element, shown) {
	element.hidden = !shown;
}

/**
 * Update the save or load screen of the editor: the slots and the buttons.
 *
 * @returns {void}
 */
function renderEditorFile() {
	const saving = mode == 'save';
	for (const button of el('slot-list').children) {
		const n = Number(button.dataset.slot);
		const stored = editorMap(n).get() != null;
		button.classList.toggle('stored', stored);
		button.disabled = !saving && !stored;
		button.classList.toggle('selected', n == slot);
	}
	el('editor-accept').textContent = saving ? 'Save' : 'Load';
	show(el('editor-accept'), slot > 0);
	show(el('editor-export'), saving || slot > 0);
}

/**
 * Show the selected tile or object in the palettes of the editor.
 *
 * @returns {void}
 */
function renderBrush() {
	const brush = stage.brush.get();
	for (const button of el('editor-tiles').children) {
		button.classList.toggle('selected', Number(button.dataset.tile) == brush);
	}
	for (const button of el('editor-objects').querySelectorAll('button[data-sprite]')) {
		button.classList.toggle('selected', Number(button.dataset.sprite) == brush);
	}
}

/**
 * Select a slot of the save or load screen and show its map. The load screen selects only stored slots.
 *
 * @param {number} n The slot number.
 * @returns {void}
 */
function selectSlot(n) {
	const stored = editorMap(n).get();
	if (n == slot || (mode == 'load' && stored == null)) return;
	slot = n;
	if (stored) stage.preview(stored);
	else stage.stop();
	renderEditorFile();
}

/**
 * Save the editor map into the selected slot, or load the map of the selected slot into the editor. Then go back to
 * the editor. The editor replaces the file screen in the history, so the back button does not open the file screen
 * again.
 *
 * @returns {void}
 */
function acceptEditorFile() {
	if (slot < 1) return;
	if (mode == 'load') {
		stage.edit(editorMap(slot).get());
		navigate('#/editor', true);
		return;
	}
	const map = stage.getMap();
	if (!saveEditorMap(slot, map.tiles, map.bg)) {
		alertDialog(
			'The map could not be saved, because the browser blocks the storage or the storage is full. ' +
				'Use Export to save the map as a file.',
			'Save map',
		);
		return;
	}
	navigate('#/editor', true);
}

/**
 * Let the browser download the editor map, or in the load screen the map of the selected slot, as a JSON file.
 *
 * @returns {void}
 */
function exportEditorMap() {
	const map = mode == 'save' ? stage.getMap() : editorMap(slot).get();
	if (!map) return;
	downloadJson({ format: MAP_FORMAT, tiles: map.tiles, bg: map.bg }, 'stillalivejs-map.json');
}

/**
 * Let the player select a map file, open it in the editor and go back to the editor. The editor replaces the file
 * screen in the history.
 *
 * @returns {Promise<void>}
 */
async function importEditorMap() {
	const data = await pickJsonFile();
	if (data === null || screen != 'editor-file') return;
	const map = parseMap(data);
	if (map.boss > 0) throw new Error('The editor does not support boss levels.');
	stage.edit(map);
	navigate('#/editor', true);
}

/**
 * Add a click handler to a button of the page.
 *
 * @param {string} id The id of the button.
 * @param {function(): void} handler The handler.
 * @returns {void}
 */
function onClick(id, handler) {
	el(id).addEventListener('click', handler);
}

/**
 * Create the list of the slots and the tile palette, and add the handlers of the buttons. The links of the page need no
 * handlers.
 *
 * @returns {void}
 */
function setupButtons() {
	for (const tile of EDITOR_TILES) {
		const button = document.createElement('button');
		button.dataset.tile = String(tile);
		button.title = EDITOR_TILE_TITLES[tile];
		const image = Object.assign(document.createElement('img'), { src: `tiles/tile_${tile}.svg`, alt: '' });
		button.append(image);
		button.addEventListener('click', () => stage.setBrush(tile));
		el('editor-tiles').append(button);
	}
	for (const button of document.querySelectorAll('#editor-objects button[data-sprite]')) {
		button.addEventListener('click', () => stage.setBrush(Number(button.dataset.sprite)));
	}
	for (const button of document.querySelectorAll('#editor-bg button')) {
		button.addEventListener('click', () => stage.setBackground(stage.getMap().bg + Number(button.dataset.bg)));
	}
	onClick('editor-clear', () => stage.clearMap());
	onClick('editor-try', () => stage.test());
	onClick('editor-help', () => alertDialog(EDITOR_HELP, 'Level Editor Shortcuts'));

	for (let n = 1; n <= LEVELS_PER_CAMPAIGN; n++) {
		const button = Object.assign(document.createElement('button'), { textContent: 'Slot ' + n });
		button.dataset.slot = String(n);
		button.addEventListener('click', () => selectSlot(n));
		el('slot-list').append(button);
		editorMap(n).subscribe(renderEditorFile);
	}
	onClick('editor-accept', acceptEditorFile);
	onClick('editor-export', exportEditorMap);
	onClick('editor-import', () => importEditorMap().catch((error) => alertDialog(error.message, 'Import map')));
}

/**
 * Set the screen of the route. The selected slot is cleared.
 *
 * @param {string} name The screen: loading, main, select, play, editor, editor-file or credits.
 * @param {string|null} [routeMode] The mode of the route: play, replay, save, load, or null for none.
 * @returns {void}
 */
export function setScreen(name, routeMode = null) {
	screen = name;
	mode = routeMode;
	slot = 0;
	renderEditorFile();
}

/**
 * Start the page: add the handlers and show the selected tile or object of the stage.
 *
 * @param {import('./GameApp.js').GameApp} element The app element.
 * @returns {void}
 */
export function startPage(element) {
	stage = element.stage;
	setupButtons();
	stage.brush.subscribe(renderBrush);
}
