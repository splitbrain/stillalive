/**
 * Drawing of the parts of the page around the canvas: the robot, the narrator text, the values of the HUD and the
 * replay keys. The page shows and hides its parts by the screen attribute of the game element.
 */

import {
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
import { keyLabels } from '../keys.js';
import { game, input, ui } from '../state.js';

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
 * Update the parts of the page for the current screen.
 *
 * @returns {void}
 */
export function renderPage() {
	const page = el('game');
	const screen = screenName();
	if (page.dataset.screen !== screen) page.dataset.screen = screen;
	if (screen !== 'level') return;

	setText(el('narrator'), narratorText());
	renderRobot();
	setText(el('stat-life'), String(game.player.life >> 8 > 0 ? game.player.life >> 8 : 0));
	setText(el('stat-cakes'), String(game.cakesLeft));
	setText(el('stat-steps'), String(game.steps >> 8));
	setText(el('stat-portals'), String(game.portalShots));
	renderKeys();
}
