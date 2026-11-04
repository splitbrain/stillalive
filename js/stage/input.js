/**
 * Keyboard and pointer input.
 *
 * The handlers write the pressed keys and mouse buttons into the key bitmask of the game, and the mouse position in
 * playfield units. The game reads both once per tick.
 */

import { toggleSound } from './audio.js';
import { playfieldPoint } from './canvas.js';
import {
	KEY_CLEAR,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	MOUSE_LEFT,
	MOUSE_MIDDLE,
	MOUSE_RIGHT,
	Menu,
} from './constants.js';
import { startPlayingLevel, stopPlayingLevel } from './editor.js';
import { captureInput, unclick } from './inputState.js';
import { resumeReplay } from './replay.js';
import { game, input, ui } from './state.js';

/**
 * The key bits for the movement keys, by the physical position of the key. On an AZERTY keyboard, KeyW is the Z key
 * and KeyA is the Q key.
 *
 * @type {Object<string, number>}
 */
const KEY_BITS = {
	KeyW: KEY_JUMP,
	KeyA: KEY_LEFT,
	KeyD: KEY_RIGHT,
	KeyS: KEY_DOWN,
	KeyE: KEY_CLEAR,
};

/** @type {number} All key bits of the mouse buttons. */
const MOUSE_BITS = MOUSE_LEFT | MOUSE_RIGHT | MOUSE_MIDDLE;

/**
 * Check if a key event belongs to a text field or a dialog. The game ignores such events.
 *
 * @param {KeyboardEvent} event The key event.
 * @returns {boolean} True if the game must ignore the event.
 */
function isForeignTarget(event) {
	const target = event.target;
	if (!(target instanceof Element)) return false;
	return target.isContentEditable || target.closest('input, textarea, select, dialog') !== null;
}

/**
 * Check if a level runs and the pause menu can open.
 *
 * @returns {boolean} True outside the menus, the editor and the intermission screen.
 */
function canPause() {
	return ui.currentMenu === Menu.PLAY && !ui.drawIntermission;
}

/**
 * Open or close the pause menu. A replay stores its input state when it pauses and restores it when it continues.
 *
 * @returns {void}
 */
function togglePause() {
	ui.escapeMenu = !ui.escapeMenu;
	if (!game.replayMode) return;
	if (ui.escapeMenu) {
		input.replayPauseInput = captureInput();
		unclick();
		input.keys = 0;
	} else {
		resumeReplay();
	}
}

/**
 * Release all keys and mouse buttons when the game loses the focus, because the release events do not reach the
 * game, and open the pause menu in a running level. A replay continues, because it sets the keys from the recording.
 *
 * @returns {void}
 */
function onFocusLost() {
	if (game.replayMode) return;
	input.keys = 0;
	if (canPause() && !ui.escapeMenu) togglePause();
}

/**
 * Handle a key press.
 *
 * @param {KeyboardEvent} event The key event.
 * @returns {void}
 */
function onKeyDown(event) {
	if (isForeignTarget(event)) return;
	if (event.code in KEY_BITS) input.keys |= KEY_BITS[event.code];
	const modified = event.ctrlKey || event.altKey || event.metaKey;
	if ((event.key === 'm' || event.key === 'M') && !event.repeat && !modified) toggleSound();
}

/**
 * Handle a key release.
 *
 * @param {KeyboardEvent} event The key event.
 * @returns {void}
 */
function onKeyUp(event) {
	if (isForeignTarget(event)) return;
	if (event.code in KEY_BITS && event.code !== 'KeyE') input.keys &= ~KEY_BITS[event.code];

	const key = event.key.toLowerCase();
	if (event.ctrlKey && key === 'z') input.leftReleased = 1;
	if (event.ctrlKey && key === 'y') input.rightReleased = 1;

	if (event.key === 'Escape') {
		if (canPause()) {
			togglePause();
		} else if (ui.currentMenu === Menu.EDITOR && ui.isTestingLevel) {
			stopPlayingLevel();
		}
	}

	if (event.key === 'Enter' && ui.currentMenu === Menu.EDITOR) {
		if (ui.isTestingLevel) stopPlayingLevel();
		else startPlayingLevel();
	}
}

/**
 * Update the mouse buttons and the mouse position from a pointer event.
 *
 * Only pointer events report a second button that the player presses during a drag, so the handler reads all
 * buttons on each event.
 *
 * @param {PointerEvent} event The pointer event.
 * @returns {void}
 */
function onPointer(event) {
	const canvas = event.currentTarget;
	if (event.type === 'pointerdown') {
		canvas.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	let buttons = 0;
	if (event.buttons & 1) buttons |= MOUSE_LEFT;
	if (event.buttons & 2) buttons |= MOUSE_RIGHT;
	if (event.buttons & 4) buttons |= MOUSE_MIDDLE;
	input.keys = (input.keys & ~MOUSE_BITS) | buttons;

	if (!game.replayMode || ui.escapeMenu) {
		const rect = canvas.getBoundingClientRect();
		[input.mouseX, input.mouseY] = playfieldPoint(
			event.clientX - rect.left - canvas.clientLeft,
			event.clientY - rect.top - canvas.clientTop,
		);
	}
}

/**
 * Add the input handlers.
 *
 * @returns {void}
 */
export function setupInput() {
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('blur', onFocusLost);
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) onFocusLost();
	});

	const canvas = document.getElementById('canvas');
	for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
		canvas.addEventListener(type, onPointer);
	}
	canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}
