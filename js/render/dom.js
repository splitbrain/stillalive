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
import { hasModeButton } from '../navigation.js';
import { game, input, ui } from '../state.js';
import { maxLevel } from '../storage.js';
import { toTime } from '../utils.js';

/** @type {number} The width of the robot panel in screen units. */
const ROBOT_PANEL_WIDTH = 120;

/** @type {number} The height of the robot panel in screen units. */
const ROBOT_PANEL_HEIGHT = 96;

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
 * Get the name of the current screen for the page: loading, main, select, level, editor or credits.
 *
 * @returns {string} The name.
 */
function screenName() {
	if (ui.drawCredits) return 'credits';
	if (ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) return 'level';
	if (ui.currentMenu == Menu.EDITOR) return ui.isTestingLevel ? 'level' : 'editor';
	if (ui.currentMenu == Menu.MAIN) return ui.selectMenu == 0 ? 'main' : 'select';
	return 'loading';
}

/**
 * Get the text of the narrator with the typewriter effect: the first characters of the lines of the level text.
 *
 * @returns {string} The visible text.
 */
function narratorText() {
	if (ui.currentMenu == Menu.EDITOR) return '';
	if (ui.currentMenu == Menu.PLAY && game.player.fadeNextLevel != -1) return '';
	const lines = ui.txtLines ?? [];
	let toWrite = Math.trunc(ui.timeWriting);
	const parts = [];
	for (const line of lines) {
		if (toWrite < 0 || line.length < toWrite) {
			parts.push(line.trimEnd());
			if (toWrite >= 0) toWrite -= line.length;
		} else {
			parts.push(line.substring(0, toWrite).trimEnd());
			break;
		}
	}
	return parts.join(' ');
}

/**
 * Place the robot head and its eye in the robot panel. The robot leaves the panel in the boss levels.
 *
 * @returns {void}
 */
function renderRobot() {
	const robot = el('robot');
	setStyle(robot, 'visibility', game.bossNum > 0 || !game.robot ? 'hidden' : 'visible');
	if (!game.robot) return;
	let eye = 0;
	if (ui.campaign == CampaignId.STORY) {
		if (ui.currentLevel <= 7) eye = 0;
		else if (ui.currentLevel <= 14) eye = 1;
		else if (ui.currentLevel <= 21) eye = 2;
		else eye = 3;
	}
	const head = el('robot-head');
	setStyle(head, 'left', `${((game.robot.x >> 8) / ROBOT_PANEL_WIDTH) * 100}%`);
	setStyle(head, 'top', `${((game.robot.y >> 8) / ROBOT_PANEL_HEIGHT) * 100}%`);
	const eyeElement = el('robot-eye');
	setStyle(eyeElement, 'left', `${((game.robot.ex >> 8) / ROBOT_PANEL_WIDTH) * 100}%`);
	setStyle(eyeElement, 'top', `${((game.robot.ey >> 8) / ROBOT_PANEL_HEIGHT) * 100}%`);
	setStyle(eyeElement, 'backgroundImage', `url("sprites/robotEye${eye + 1}.png")`);
	setStyle(eyeElement, 'backgroundPositionY', `${(game.robot.eye * 100) / 3}%`);
}

/**
 * Show the pressed keys and mouse buttons of a replay.
 *
 * @returns {void}
 */
function renderKeys() {
	const keys = el('keys');
	setStyle(keys, 'visibility', game.replayMode ? 'visible' : 'hidden');
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
	setText(el('narrator'), (ui.txtLines ?? []).join(' '));
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
		show(el('pause-restart'), ui.currentMenu != Menu.TUTORIAL);
		show(el('pause-sound'), ui.currentMenu != Menu.TUTORIAL && isSoundAvailable());
		setText(el('pause-sound'), 'Sounds : ' + (isSoundOn() ? 'On' : 'Off'));
		return 'pause';
	}
	if (ui.drawIntermission && game.player.fadeNextLevel == 0) {
		const ready = game.player.intermissionFade == 0;
		setText(el('intermission-time'), ready ? 'Your time : ' + toTime(game.time) : '');
		setText(el('intermission-message'), ready ? ui.highscoreMessage : '');
		show(el('intermission-restart'), !isLevelLocked());
		show(el('intermission-continue'), canContinue());
		return 'intermission';
	}
	return '';
}

/**
 * Update the parts of the page for the current screen.
 *
 * @returns {void}
 */
export function renderPage() {
	const page = el('game');
	const screen = screenName();
	if (page.dataset.screen !== screen) page.dataset.screen = screen;

	let menu = '';
	if (screen === 'main') {
		menu = 'main';
		renderMainMenu();
	} else if (screen === 'select') {
		menu = 'selection';
		renderSelection();
	} else if (screen === 'level') {
		setText(el('narrator'), narratorText());
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
