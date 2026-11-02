/**
 * Keyboard and pointer input.
 *
 * The handlers write the pressed keys and mouse buttons into the key bitmask of the game, and the mouse position in
 * canvas pixels. The game reads both once per tick.
 */

import { toggleSound } from './audio.js';
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
	MouseButton,
} from './constants.js';
import { isTestingLevel, startPlayingLevel, stopPlayingLevel } from './editor.js';
import { reportBrokenReplay } from './game.js';
import { inPortal } from './portals.js';
import { rescaleReplay } from './replay.js';
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
 * Handle a key press.
 *
 * @param {KeyboardEvent} event The key event.
 * @returns {void}
 */
function onKeyDown(event) {
	if (isForeignTarget(event)) return;
	if (event.code in KEY_BITS) input.keys |= KEY_BITS[event.code];
	if (event.key === 'm' || event.key === 'M') toggleSound();
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
		if ((ui.currentMenu === Menu.PLAY || ui.currentMenu === Menu.TUTORIAL) && !ui.drawIntermission) {
			ui.escapeMenu = !ui.escapeMenu;
			if (game.replayMode) {
				if (ui.escapeMenu) {
					input.replayPauseInput = captureInput();
					unclick();
					input.keys = 0;
				} else {
					rescaleReplay();
				}
			}
		} else if (ui.currentMenu === Menu.EDITOR && isTestingLevel) {
			stopPlayingLevel();
		}
	}

	if (event.key === 'Enter' && ui.currentMenu === Menu.EDITOR) {
		if (isTestingLevel) stopPlayingLevel();
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
		input.mouseX = ((event.clientX - rect.left - canvas.clientLeft) * canvas.width) / canvas.clientWidth;
		input.mouseY = ((event.clientY - rect.top - canvas.clientTop) * canvas.height) / canvas.clientHeight;
	}
}

/**
 * Add the input handlers.
 *
 * @returns {void}
 */
function setupInput() {
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);

	const canvas = document.getElementById('canvas');
	for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
		canvas.addEventListener(type, onPointer);
	}
	canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

setupInput();

/**
 * Release all mouse buttons and clear the pressed and released state.
 *
 * @returns {void}
 */
export function unclick() {
	input.mousePressed = 0;
	input.mouseReleased = 0;
	input.mouseNewPress = 0;

	input.keys &= ~MOUSE_LEFT;
	input.keys &= ~MOUSE_RIGHT;
	input.keys &= ~MOUSE_MIDDLE;
}

/**
 * Get the input state that the game derives from the keys of the previous ticks.
 *
 * @returns {number[]} The old keys, the mouse state and the jump and clear state of the player.
 */
function captureInput() {
	return [
		input.oldKeys,
		input.mousePressed,
		input.mouseReleased,
		input.mouseButton,
		input.mouseNewPress,
		game.player.isJump,
		game.player.oldIsJump,
		game.player.askClear ? 1 : 0,
	];
}

/**
 * Restore an input state from captureInput().
 *
 * @param {number[]} state The input state.
 */
export function restoreInput(state) {
	input.oldKeys = state[0];
	input.mousePressed = state[1];
	input.mouseReleased = state[2];
	input.mouseButton = state[3];
	input.mouseNewPress = state[4];
	game.player.isJump = state[5];
	game.player.oldIsJump = state[6];
	game.player.askClear = state[7] == 1;
}

/**
 * Process the input of one tick.
 *
 * The function records or plays back the replay. It derives the mouse button state from the key bitmask of this tick
 * and the previous tick. It sets the movement flags of the player.
 *
 * @returns {void}
 */
export function manageKeys() {
	// The input still changes while the level time stands still. A replay restores the input state at the same time.
	const inGame = game.player.fadeNextLevel == -1 && ui.currentMenu == Menu.PLAY && !ui.escapeMenu;
	if (inGame && !game.replayMode && !input.lastTickInGame) game.replay.states[game.TIME] = captureInput();
	else if (inGame && game.replayMode && game.replay.states[game.TIME]) restoreInput(game.replay.states[game.TIME]);
	input.lastTickInGame = inGame;

	if (game.player.fadeNextLevel == -1 && ui.currentMenu == Menu.PLAY && !game.replayMode) {
		input.mouseX = Math.round(input.mouseX);
		input.mouseY = Math.round(input.mouseY);
		game.replay.inputs[game.TIME] = input.keys;
		game.replay.mouseX[game.TIME] = input.mouseX;
		game.replay.mouseY[game.TIME] = input.mouseY;
	} else if (game.player.fadeNextLevel == -1 && ui.currentMenu == Menu.PLAY && game.replayMode && !ui.escapeMenu) {
		if (game.TIME < game.replay.inputs.length) {
			input.keys = game.replay.inputs[game.TIME];
			input.mouseX = game.replay.mouseX[game.TIME];
			input.mouseY = game.replay.mouseY[game.TIME];
		} else {
			reportBrokenReplay();
		}
	}

	// check for a new left click
	if (input.keys & MOUSE_LEFT) {
		if (input.mousePressed == 0) {
			input.mouseNewPress = 1;
		} else {
			input.mouseNewPress = 0;
		}
	} else input.mouseNewPress = 0;

	//check if a mouse button was just pressed
	if (!(input.oldKeys & MOUSE_LEFT) && input.keys & MOUSE_LEFT) {
		input.mouseButton = MouseButton.LEFT;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	} else if (!(input.oldKeys & MOUSE_RIGHT) && input.keys & MOUSE_RIGHT) {
		input.mouseButton = MouseButton.RIGHT;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	} else if (!(input.oldKeys & MOUSE_MIDDLE) && input.keys & MOUSE_MIDDLE) {
		input.mouseButton = MouseButton.MIDDLE;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	}

	//check if a mouse button was just released
	if (input.oldKeys & MOUSE_LEFT && !(input.keys & MOUSE_LEFT)) {
		input.mouseReleased = 1;
		input.mousePressed = 0;
	} else if (input.oldKeys & MOUSE_RIGHT && !(input.keys & MOUSE_RIGHT)) {
		input.mouseButton = MouseButton.RIGHT;
		input.mouseReleased = 1;
		input.mousePressed = 0;
	} else if (input.oldKeys & MOUSE_MIDDLE && !(input.keys & MOUSE_MIDDLE)) {
		input.mouseButton = MouseButton.MIDDLE;
		input.mouseReleased = 1;
		input.mousePressed = 0;
	}

	if (input.keys & KEY_CLEAR) {
		//clear portals
		if (input.oldKeys & KEY_CLEAR) input.keys &= ~KEY_CLEAR;
		else game.player.askClear = true;
	}

	if (input.keys & KEY_LEFT) game.player.isLeft = 1;
	if (!(input.keys & KEY_LEFT)) game.player.isLeft = 0;
	if (input.keys & KEY_RIGHT) game.player.isRight = 1;
	if (!(input.keys & KEY_RIGHT)) game.player.isRight = 0;
	if (input.keys & KEY_DOWN) game.player.isDown = 1;
	if (!(input.keys & KEY_DOWN)) game.player.isDown = 0;

	//jump
	if (
		input.keys & KEY_JUMP &&
		(isTestingLevel || ui.currentMenu == Menu.PLAY || (ui.currentMenu == Menu.TUTORIAL && ui.tutoJump)) &&
		!inPortal(game.player)
	) {
		if (!(input.oldKeys & KEY_JUMP)) game.player.oldIsJump = game.player.isJump;
		game.player.isJump = 1;
	}
	if (!(input.keys & KEY_JUMP)) {
		if (input.oldKeys & KEY_JUMP) game.player.oldIsJump = game.player.isJump;
		game.player.isJump = 0;
	}

	input.oldKeys = input.keys;
}

/**
 * Check if the mouse is inside a rectangle of the canvas.
 *
 * @param {number} x The left edge of the rectangle in canvas pixels.
 * @param {number} y The top edge of the rectangle in canvas pixels.
 * @param {number} w The width of the rectangle.
 * @param {number} h The height of the rectangle.
 * @returns {boolean} True if the mouse is inside.
 */
export function mouseInZone(x, y, w, h) {
	if (input.mouseX >= x && input.mouseX < x + w && input.mouseY >= y && input.mouseY < y + h) return true;
	return false;
}
