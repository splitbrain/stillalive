/**
 * Drawing of the parts of the page around the canvas: the robot, the narrator text, the values of the HUD, the replay
 * keys and the menus. The page shows and hides its parts by the screen attribute of the game element and by the menu
 * attribute of the overlay over the stage.
 */

import { isSoundAvailable, isSoundOn } from '../audio.js';
import {
	CAMPAIGN_FINISHED,
	CampaignId,
	KEY_CLEAR,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	Menu,
	MOUSE_LEFT,
	MOUSE_RIGHT,
} from '../constants.js';
import { canContinue, isLevelLocked } from '../intermission.js';
import { keyLabels } from '../keys.js';
import { campaigns } from '../level.js';
import { hasModeButton } from '../navigation.js';
import { game, input, ui } from '../state.js';
import { getEditorMap, maxLevel } from '../storage.js';
import { toTime } from '../utils.js';

/** @type {string} The narrator text of the level selection. */
const SELECTION_TEXT =
	"Welcome to the campaign mode of StillAliveJS. Here you can select a map on the right and click 'Play' to play it. Good Luck !";

/** @type {string} The narrator text of the editor and of its save and load screen. */
const EDITOR_TEXT =
	'Welcome to the StillAliveJS Level Editor ! Here is a place where you can easily create your own maps. You can use your mouse to select tiles or object and draw them on the screen. Then, try out your map. Have Fun !';

/** @type {string} The narrator text of the test run of the editor map. */
const TEST_TEXT = 'Press <Enter> or <Escape> key to stop testing.';

/** @type {Object<string, HTMLElement>} The elements of the page by id. */
const elements = {};

/**
 * Get an element of the page by its id.
 *
 * @param {string} id The id.
 * @returns {HTMLElement} The element.
 */
function el(id) {
	return (elements[id] ??= document.getElementById(id));
}

/**
 * Set the text of an element if it changed.
 *
 * @param {HTMLElement} element The element.
 * @param {string} text The text.
 * @returns {void}
 */
function setText(element, text) {
	if (element.textContent !== text) element.textContent = text;
}

/**
 * Set a style property of an element if it changed.
 *
 * @param {HTMLElement} element The element.
 * @param {string} name The property name.
 * @param {string} value The value.
 * @returns {void}
 */
function setStyle(element, name, value) {
	if (element.style[name] !== value) element.style[name] = value;
}

/**
 * Get the name of the current screen for the page: loading, main, select, level, editor, editor-file (the save or
 * load screen of the editor) or credits.
 *
 * @returns {string} The name.
 */
function screenName() {
	if (ui.drawCredits) return 'credits';
	if (ui.currentMenu == Menu.PLAY) return 'level';
	if (ui.currentMenu == Menu.EDITOR) {
		if (ui.isTestingLevel) return 'level';
		return ui.editor.askLoading || ui.editor.askSaving ? 'editor-file' : 'editor';
	}
	if (ui.currentMenu == Menu.MAIN) return ui.selectMenu == 0 ? 'main' : 'select';
	return 'loading';
}

/**
 * Show the robot head in the robot panel with the eye of the boss of the current story level. The robot leaves the
 * panel in the boss levels.
 *
 * @returns {void}
 */
function renderRobot() {
	setStyle(el('robot'), 'visibility', game.bossNum > 0 ? 'hidden' : 'visible');
	let eye = 0;
	if (ui.campaign == CampaignId.STORY) {
		if (ui.currentLevel <= 7) eye = 0;
		else if (ui.currentLevel <= 14) eye = 1;
		else if (ui.currentLevel <= 21) eye = 2;
		else eye = 3;
	}
	setStyle(el('robot-eye'), 'backgroundImage', `url("sprites/robotEye${eye + 1}.svg")`);
}

/**
 * Show the pressed keys and mouse buttons of a replay.
 *
 * @returns {void}
 */
function renderKeys() {
	if (!game.replayMode) return;
	const pressed = {
		KeyW: KEY_JUMP,
		KeyA: KEY_LEFT,
		KeyS: KEY_DOWN,
		KeyD: KEY_RIGHT,
		KeyE: KEY_CLEAR,
		left: MOUSE_LEFT,
		right: MOUSE_RIGHT,
	};
	for (const [name, bit] of Object.entries(pressed)) {
		const cap = el(`key-${name}`);
		cap.classList.toggle('pressed', (input.keys & bit) != 0);
		if (name in keyLabels) setText(cap, keyLabels[name]);
	}
}

/**
 * Show or hide an element.
 *
 * @param {HTMLElement} element The element.
 * @param {boolean} shown True to show the element.
 * @returns {void}
 */
function show(element, shown) {
	if (element.hidden === shown) element.hidden = !shown;
}

/**
 * Update the main menu: the buttons fade with the canvas, and only the clicked button stays during the fade out.
 *
 * @returns {void}
 */
function renderMainMenu() {
	let opacity = 1;
	if (ui.goMenu) opacity = ui.goMenu / 60;
	else if (ui.fadeMenu > 0) opacity = 1 - ui.fadeMenu / 30;
	setStyle(el('main-menu'), 'opacity', String(opacity));
	for (const button of el('main-menu').querySelectorAll('[data-menu="main"]')) {
		show(button, !ui.goMenu || Number(button.dataset.button) == ui.menuButton);
	}
	setText(el('main-classic'), 'Classic Mode' + (maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED ? ' +' : ''));
	const sound = el('sound-button');
	show(sound, isSoundAvailable() && !ui.goMenu);
	sound.classList.toggle('off', !isSoundOn());
}

/**
 * Update the level selection: the list of the levels and the buttons.
 *
 * @returns {void}
 */
function renderSelection() {
	setText(el('narrator'), SELECTION_TEXT);
	for (const button of el('level-list').children) {
		const level = Number(button.dataset.level);
		const locked = level > maxLevel[ui.campaign];
		if (button.disabled !== locked) button.disabled = locked;
		button.classList.toggle('selected', level == ui.previewMap);
	}
	show(el('selection-play'), ui.previewMap > 0);
	show(el('selection-mode'), hasModeButton());
	setText(el('selection-mode'), ui.campaign == CampaignId.NORMAL ? 'Hard Mode' : 'Normal Mode');
}

/**
 * Update the pause menu and the intermission screen over the stage.
 *
 * @returns {string} The name of the menu that the overlay shows, or an empty string.
 */
function renderLevelMenus() {
	if (ui.escapeMenu) {
		show(el('pause-sound'), isSoundAvailable());
		setText(el('pause-sound'), 'Sounds : ' + (isSoundOn() ? 'On' : 'Off'));
		return 'pause';
	}
	if (ui.drawIntermission && game.player.fadeNextLevel == 0) {
		const ready = game.player.intermissionFade == 0;
		setText(el('intermission-time'), ready ? 'Your time : ' + toTime(game.time) : '');
		setText(el('intermission-message'), ready ? ui.highscoreMessage : '');
		show(el('intermission-restart'), !isLevelLocked());
		show(el('intermission-continue'), canContinue());
		show(el('intermission-replay'), campaigns[ui.campaign].records);
		return 'intermission';
	}
	return '';
}

/**
 * Update the editor: the selected tile or object in the palettes.
 *
 * @returns {void}
 */
function renderEditor() {
	setText(el('narrator'), EDITOR_TEXT);
	for (const button of el('editor-tiles').children) {
		button.classList.toggle('selected', Number(button.dataset.index) == ui.editor.selectedTile);
	}
	for (const button of el('editor-objects').querySelectorAll('button[data-sprite]')) {
		button.classList.toggle('selected', Number(button.dataset.sprite) == ui.editor.selectedSprite);
	}
}

/**
 * Update the save or load screen of the editor: the slots and the buttons. The stored slots are read when the screen
 * opens, because the storage does not change while it is open.
 *
 * @param {boolean} opened True in the first frame of the screen.
 * @returns {void}
 */
function renderEditorFile(opened) {
	setText(el('narrator'), EDITOR_TEXT);
	const saving = ui.editor.askSaving;
	for (const button of el('slot-list').children) {
		const slot = Number(button.dataset.slot);
		if (opened) {
			const stored = getEditorMap(slot) != null;
			button.classList.toggle('stored', stored);
			button.disabled = !saving && !stored;
		}
		button.classList.toggle('selected', slot == ui.previewMap);
	}
	setText(el('editor-accept'), saving ? 'Save' : 'Load');
	show(el('editor-accept'), ui.previewMap > 0);
	show(el('editor-export'), saving || ui.previewMap > 0);
}

/** @type {string} The screen of the previous frame. */
let lastScreen = '';

/**
 * Update the parts of the page for the current screen.
 *
 * @returns {void}
 */
export function renderPage() {
	const page = el('game');
	const screen = screenName();
	if (page.dataset.screen !== screen) page.dataset.screen = screen;
	const opened = screen !== lastScreen;
	lastScreen = screen;

	show(el('robot'), screen === 'level');
	show(el('speech'), screen === 'level' || screen === 'select' || screen.startsWith('editor'));
	show(el('stats'), screen === 'level');
	show(el('editor-tiles'), screen === 'editor');
	show(el('editor-objects'), screen === 'editor');
	show(el('side'), screen === 'level' || screen === 'select' || screen === 'editor-file');
	show(el('level-list'), screen === 'select');
	show(el('slot-list'), screen === 'editor-file');
	show(el('highscores'), screen === 'level' || screen === 'select');
	show(el('keys'), screen === 'level' && game.replayMode);

	let menu = '';
	if (screen === 'main') {
		menu = 'main';
		renderMainMenu();
	} else if (screen === 'select') {
		menu = 'selection';
		renderSelection();
	} else if (screen === 'editor') {
		menu = 'editor';
		renderEditor();
	} else if (screen === 'editor-file') {
		menu = 'editor-file';
		renderEditorFile(opened);
	} else if (screen === 'level') {
		setText(el('narrator'), ui.isTestingLevel ? TEST_TEXT : game.message);
		renderRobot();
		setText(el('stat-life'), String(game.player.life >> 8 > 0 ? game.player.life >> 8 : 0));
		setText(el('stat-cakes'), String(game.cakesLeft));
		setText(el('stat-steps'), String(game.steps >> 8));
		setText(el('stat-portals'), String(game.portalShots));
		renderKeys();
		menu = renderLevelMenus();
	}
	const overlay = el('overlay');
	if (overlay.dataset.menu !== menu) overlay.dataset.menu = menu;
}
