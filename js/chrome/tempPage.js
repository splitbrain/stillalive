/**
 * The temporary page around the stage.
 *
 * The module fills the screens with the HTML elements of the page until the chrome elements exist: the HUD, the narrator
 * text, the keys of a replay, the pause menu, the intermission screen, the editor palettes and the slots of the save and
 * load screen. It sets the links that depend on the state and runs the actions that do not change the URL. The app
 * element shows the screens, drives the stage for the routes and tells the module the current screen and the
 * intermission.
 */

import {
	CampaignId,
	EDITOR_TILE_TITLES,
	EDITOR_TILES,
	KEY_CLEAR,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	LEVELS_PER_CAMPAIGN,
	MOUSE_LEFT,
	MOUSE_RIGHT,
} from '../stage/constants.js';
import { keyLabels } from '../stage/keys.js';
import { MAP_FORMAT, parseMap } from '../stage/mapFile.js';
import { navigate } from '../router.js';
import { campaigns } from './campaigns.js';
import { alertDialog } from './dialog.js';
import { downloadJson, pickJsonFile } from './files.js';
import { editorMap, saveEditorMap } from './storage.js';

/** @type {string} The narrator text of the level selection. */
const SELECTION_TEXT =
	"Welcome to the campaign mode of StillAliveJS. Here you can select a map on the right and click 'Play' to play it. Good Luck !";

/** @type {string} The narrator text of the editor and of its save and load screen. */
const EDITOR_TEXT =
	'Welcome to the StillAliveJS Level Editor ! Here is a place where you can easily create your own maps. You can use your mouse to select tiles or object and draw them on the screen. Then, try out your map. Have Fun !';

/** @type {string} The narrator text of the test run of the editor map. */
const TEST_TEXT = 'Press <Enter> or <Escape> key to stop testing.';

/** @type {string} The text of the help dialog of the editor. */
const EDITOR_HELP =
	'Left click : Put tile or object\n' +
	'Right click : Remove tile or object\n' +
	'Middle click : Fill\n' +
	'ctrl + z : Undo\n' +
	'ctrl + y : Redo\n' +
	'Return : Try Map / Stop trying\n' +
	'Escape : Stop trying';

/** @type {Object<string, number>} The key bit of each key cap of the replay keys, by the name in the cap id. */
const KEY_CAPS = {
	KeyW: KEY_JUMP,
	KeyA: KEY_LEFT,
	KeyS: KEY_DOWN,
	KeyD: KEY_RIGHT,
	KeyE: KEY_CLEAR,
	left: MOUSE_LEFT,
	right: MOUSE_RIGHT,
};

/** @type {import('./GameApp.js').GameApp} The app element. */
let app;

/** @type {import('../stage/GameStage.js').GameStage} The stage element. */
let stage;

/** @type {string} The screen of the route: loading, main, select, play, editor, editor-file or credits. */
let screen = 'loading';

/** @type {number} The index of the campaign of the route, or -1 if the route has no campaign. */
let campaignId = -1;

/** @type {number} The level of the route: the selected level or the level that runs, or 0 for none. */
let level = 0;

/** @type {string|null} The mode of the route: play, replay, save, load, or null for none. */
let mode = null;

/** @type {string} The path that the Exit links of the play screen go to. */
let exitPath = '#/';

/**
 * The intermission screen after a level, or null. The paths of next and restart are null if the screen has no such
 * link, and the replay is null if the screen has no button for the replay.
 *
 * @type {{time: number, message: string, replay: object|null, next: string|null, restart: string|null}|null}
 */
let intermission = null;

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
 * Format a level time.
 *
 * @param {number} time The time in ticks of 1/60 second.
 * @returns {string} The time as minutes, seconds and milliseconds, e.g. "01:05.500".
 */
export function toTime(time) {
	const total = Math.round((time * 1000) / 60);
	const m = Math.floor(total / 60000);
	const s = Math.floor(total / 1000) % 60;
	const ms = total % 1000;

	return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(ms).padStart(3, '0');
}

/**
 * Set the path of a link and show it, or hide the link.
 *
 * @param {HTMLElement} link The link.
 * @param {string|null} path The path, or null to hide the link.
 * @returns {void}
 */
function setLink(link, path) {
	show(link, path !== null);
	if (path !== null) link.setAttribute('href', path);
}

/**
 * Get the level of the current campaign.
 *
 * @param {number} number The level number, starting at 1.
 * @returns {import('../stage/level.js').Level} The level.
 */
function levelOf(number) {
	return campaigns[campaignId].levels[number - 1];
}

/**
 * Get the screen that the page shows. The test run of the editor shows the play screen.
 *
 * @returns {string} The name of the screen.
 */
function shownScreen() {
	if (screen == 'editor' && stage.mode.get() == 'test') return 'play';
	return screen;
}

/**
 * Update the parts of the current screen. The app element shows and hides the screens. The keys show during the
 * playback of a replay.
 *
 * @returns {void}
 */
function render() {
	const name = shownScreen();
	const playing = name === 'play' && screen === 'play';
	show(el('keys'), playing && mode === 'replay');
	show(el('pause-menu'), name === 'play' && stage.paused.get());
	show(el('intermission'), name === 'play' && !stage.paused.get() && intermission !== null);

	if (name === 'editor-file') {
		renderEditorFile();
	} else if (name === 'play') {
		renderRobot();
		renderLevelMenus();
	}
	renderNarrator();
}

/**
 * Show the narrator text of the current screen.
 *
 * @returns {void}
 */
function renderNarrator() {
	const name = shownScreen();
	let text = '';
	if (name === 'select') text = SELECTION_TEXT;
	else if (name.startsWith('editor')) text = EDITOR_TEXT;
	else if (name === 'play') text = stage.mode.get() == 'test' ? TEST_TEXT : (stage.message.get()?.text ?? '');
	el('narrator').textContent = text;
}

/**
 * Show the robot head with the eye of the boss of the current story level. The robot leaves the panel in the boss
 * levels and in the test run of the editor.
 *
 * @returns {void}
 */
function renderRobot() {
	const testing = stage.mode.get() == 'test';
	el('robot').style.visibility = !testing && levelOf(level).boss > 0 ? 'hidden' : 'visible';
	let eye = 0;
	if (!testing && campaignId == CampaignId.STORY) eye = Math.min(Math.floor((level - 1) / 7), 3);
	el('robot-eye').style.backgroundImage = `url("sprites/robotEye${eye + 1}.svg")`;
}

/**
 * Update the pause menu and the intermission screen over the stage.
 *
 * @returns {void}
 */
function renderLevelMenus() {
	el('pause-sound').textContent = 'Sounds : ' + (stage.sound.get() ? 'On' : 'Off');
	el('pause-exit').setAttribute('href', exitPath);
	if (intermission !== null) {
		el('intermission-time').textContent = 'Your time : ' + toTime(intermission.time);
		el('intermission-message').textContent = intermission.message;
		el('intermission-exit').setAttribute('href', exitPath);
		setLink(el('intermission-restart'), intermission.restart);
		setLink(el('intermission-continue'), intermission.next);
		show(el('intermission-replay'), intermission.replay !== null);
	}
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
 * Show the values of the HUD.
 *
 * @returns {void}
 */
function renderStats() {
	el('stat-life').textContent = String(stage.life.get());
	el('stat-cakes').textContent = String(stage.cakes.get());
	el('stat-steps').textContent = String(stage.steps.get());
	el('stat-portals').textContent = String(stage.portals.get());
}

/**
 * Show the pressed keys and mouse buttons of a replay.
 *
 * @returns {void}
 */
function renderKeys() {
	const keys = stage.replayKeys.get();
	const labels = keyLabels.get();
	for (const [name, bit] of Object.entries(KEY_CAPS)) {
		const cap = el(`key-${name}`);
		cap.classList.toggle('pressed', (keys & bit) != 0);
		if (name in labels) cap.textContent = labels[name];
	}
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
	render();
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
	onClick('pause-resume', () => stage.resume());
	onClick('pause-restart', () => navigate(location.hash));
	onClick('pause-sound', () => stage.setSound(!stage.sound.get()));
	onClick('intermission-replay', () => app.watch(intermission.replay));

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
		editorMap(n).subscribe(render);
	}
	onClick('editor-accept', acceptEditorFile);
	onClick('editor-export', exportEditorMap);
	onClick('editor-import', () => importEditorMap().catch((error) => alertDialog(error.message, 'Import map')));
}

/**
 * Set the screen of the route. The intermission screen and the selected slot are cleared.
 *
 * @param {string} name The screen: loading, main, select, play, editor, editor-file or credits.
 * @param {object} [route] The parts of the route.
 * @param {number} [route.campaign] The campaign index, or -1 for none.
 * @param {number} [route.level] The level number, or 0 for none.
 * @param {string|null} [route.mode] The mode of the route.
 * @param {string} [route.exit] The path that the Exit links of the play screen go to.
 * @returns {void}
 */
export function setScreen(name, route = {}) {
	screen = name;
	campaignId = route.campaign ?? -1;
	level = route.level ?? 0;
	mode = route.mode ?? null;
	exitPath = route.exit ?? '#/';
	intermission = null;
	slot = 0;
	render();
}

/**
 * Show the intermission screen after a level.
 *
 * @param {{time: number, message: string, replay: object|null, next: string|null, restart: string|null}} data The time
 *     and the message, the replay for the replay button or null, and the paths of the Continue and the Restart links or
 *     null.
 * @returns {void}
 */
export function setIntermission(data) {
	intermission = data;
	render();
}

/**
 * Start the page: add the handlers and show the values of the stage and of the storage.
 *
 * @param {import('./GameApp.js').GameApp} element The app element.
 * @returns {void}
 */
export function startPage(element) {
	app = element;
	stage = element.stage;
	setupButtons();

	stage.mode.subscribe(render);
	stage.paused.subscribe(render);
	stage.sound.subscribe(render);
	stage.message.subscribe(renderNarrator);
	stage.brush.subscribe(renderBrush);
	stage.replayKeys.subscribe(renderKeys);
	for (const value of [stage.life, stage.cakes, stage.steps, stage.portals]) value.subscribe(renderStats);

	stage.addEventListener('focuslost', () => stage.pause());
}
