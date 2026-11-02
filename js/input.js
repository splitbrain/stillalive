/**
 * Keyboard and pointer input.
 *
 * The handlers write the pressed keys and mouse buttons into the key bitmask of the game, and the mouse position in
 * canvas pixels. The game reads both once per tick.
 */

import { toggleSound } from './audio.js';
import { KEY_D, KEY_E, KEY_Q, KEY_S, KEY_Z, LEFT, MIDDLE, MSE_L, MSE_M, MSE_R, Menu, RIGHT } from './constants.js';
import { isTestingLevel, startPlayingLevel, stopPlayingLevel } from './editor.js';
import { reportBrokenReplay } from './game.js';
import { dansUnPortal } from './portals.js';
import { rescaleReplay } from './replay.js';
import { game, input, ui } from './state.js';

/**
 * The key bits for the movement keys, by the physical position of the key. On an AZERTY keyboard, KeyW is the Z key
 * and KeyA is the Q key.
 *
 * @type {Object<string, number>}
 */
const KEY_BITS = {
	KeyW: KEY_Z,
	KeyA: KEY_Q,
	KeyD: KEY_D,
	KeyS: KEY_S,
	KeyE: KEY_E,
};

/** @type {number} All key bits of the mouse buttons. */
const MOUSE_BITS = MSE_L | MSE_R | MSE_M;

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
	if (event.buttons & 1) buttons |= MSE_L;
	if (event.buttons & 2) buttons |= MSE_R;
	if (event.buttons & 4) buttons |= MSE_M;
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

export function unclick() {
	input.mousePressed = 0;
	input.mouseReleased = 0;
	input.mouseNewPress = 0;

	input.keys &= ~MSE_L;
	input.keys &= ~MSE_R;
	input.keys &= ~MSE_M;
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
		game.perso.isJump,
		game.perso.oldIsJump,
		game.perso.askClear ? 1 : 0,
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
	game.perso.isJump = state[5];
	game.perso.oldIsJump = state[6];
	game.perso.askClear = state[7] == 1;
}

export function manageKeys() {
	// The input still changes while the level time stands still. A replay restores the input state at the same time.
	const inGame = game.perso.fadeNextLevel == -1 && ui.currentMenu == Menu.PLAY && !ui.escapeMenu;
	if (inGame && !game.replayMode && !input.lastTickInGame) game.replay.states[game.TIME] = captureInput();
	else if (inGame && game.replayMode && game.replay.states[game.TIME]) restoreInput(game.replay.states[game.TIME]);
	input.lastTickInGame = inGame;

	if (game.perso.fadeNextLevel == -1 && ui.currentMenu == Menu.PLAY && !game.replayMode) {
		input.mouseX = Math.round(input.mouseX);
		input.mouseY = Math.round(input.mouseY);
		game.replay.inputs[game.TIME] = input.keys;
		game.replay.mouseX[game.TIME] = input.mouseX;
		game.replay.mouseY[game.TIME] = input.mouseY;
	} else if (game.perso.fadeNextLevel == -1 && ui.currentMenu == Menu.PLAY && game.replayMode && !ui.escapeMenu) {
		if (game.TIME < game.replay.inputs.length) {
			input.keys = game.replay.inputs[game.TIME];
			input.mouseX = game.replay.mouseX[game.TIME];
			input.mouseY = game.replay.mouseY[game.TIME];
		} else {
			reportBrokenReplay();
		}
	}

	// check for a new left click
	if (input.keys & MSE_L) {
		if (input.mousePressed == 0) {
			input.mouseNewPress = 1;
		} else {
			input.mouseNewPress = 0;
		}
	} else input.mouseNewPress = 0;

	//check if a mouse button was just pressed
	if (!(input.oldKeys & MSE_L) && input.keys & MSE_L) {
		input.mouseButton = LEFT;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	} else if (!(input.oldKeys & MSE_R) && input.keys & MSE_R) {
		input.mouseButton = RIGHT;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	} else if (!(input.oldKeys & MSE_M) && input.keys & MSE_M) {
		input.mouseButton = MIDDLE;
		input.mousePressed = 1;
		input.mouseReleased = 0;
	}

	//check if a mouse button was just released
	if (input.oldKeys & MSE_L && !(input.keys & MSE_L)) {
		input.mouseReleased = 1;
		input.mousePressed = 0;
	} else if (input.oldKeys & MSE_R && !(input.keys & MSE_R)) {
		input.mouseButton = RIGHT;
		input.mouseReleased = 1;
		input.mousePressed = 0;
	} else if (input.oldKeys & MSE_M && !(input.keys & MSE_M)) {
		input.mouseButton = MIDDLE;
		input.mouseReleased = 1;
		input.mousePressed = 0;
	}

	if (input.keys & KEY_E) {
		//clear portals
		if (input.oldKeys & KEY_E) input.keys &= ~KEY_E;
		else game.perso.askClear = true;
	}

	if (input.keys & KEY_Q) game.perso.isLeft = 1;
	if (!(input.keys & KEY_Q)) game.perso.isLeft = 0;
	if (input.keys & KEY_D) game.perso.isRight = 1;
	if (!(input.keys & KEY_D)) game.perso.isRight = 0;
	if (input.keys & KEY_S) game.perso.isDown = 1;
	if (!(input.keys & KEY_S)) game.perso.isDown = 0;

	//jump
	if (
		input.keys & KEY_Z &&
		(isTestingLevel || ui.currentMenu == Menu.PLAY || (ui.currentMenu == Menu.TUTORIAL && ui.tutoJump)) &&
		!dansUnPortal(game.perso)
	) {
		if (!(input.oldKeys & KEY_Z)) game.perso.oldIsJump = game.perso.isJump;
		game.perso.isJump = 1;
	}
	if (!(input.keys & KEY_Z)) {
		if (input.oldKeys & KEY_Z) game.perso.oldIsJump = game.perso.isJump;
		game.perso.isJump = 0;
	}

	input.oldKeys = input.keys;
}

export function mouseInZone(x, y, w, h) {
	if (input.mouseX >= x && input.mouseX < x + w && input.mouseY >= y && input.mouseY < y + h) return true;
	return false;
}
