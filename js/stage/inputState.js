/**
 * The input state of the game: the mouse buttons, the replay input and the movement flags of the player.
 *
 * The event handlers in the input module write the keys and the mouse position. The functions of this module derive
 * the state that the game reads in each tick.
 */

import {
	KEY_CLEAR,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	MOUSE_LEFT,
	MOUSE_MIDDLE,
	MOUSE_RIGHT,
	MouseButton,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
} from './constants.js';
import { isInPortal } from './portals.js';
import { game, input, stageEvents, ui } from './state.js';

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
 * Stop a replay that has fewer inputs than the level needs or in which the player dies. The stage becomes idle and
 * reports the broken replay with the event "brokenreplay".
 *
 * @returns {void}
 */
export function reportBrokenReplay() {
	game.replayMode = false;
	ui.mode = 'idle';
	stageEvents.push({ type: 'brokenreplay', detail: null });
}

/**
 * Get the input state that the game derives from the keys of the previous ticks.
 *
 * @returns {number[]} The old keys, the mouse state and the jump and clear state of the player.
 */
export function captureInput() {
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
	const inGame = game.player.fadeNextLevel == -1 && ui.mode == 'play' && !ui.paused;
	if (inGame && !game.replayMode && !input.lastTickInGame) game.replay.states[game.time] = captureInput();
	else if (inGame && game.replayMode && game.replay.states[game.time]) restoreInput(game.replay.states[game.time]);
	input.lastTickInGame = inGame;

	if (game.player.fadeNextLevel == -1 && ui.mode == 'play' && !game.replayMode) {
		input.mouseX = Math.round(input.mouseX);
		input.mouseY = Math.round(input.mouseY);
		game.replay.inputs[game.time] = input.keys;
		game.replay.mouseX[game.time] = input.mouseX;
		game.replay.mouseY[game.time] = input.mouseY;
	} else if (game.player.fadeNextLevel == -1 && ui.mode == 'play' && game.replayMode && !ui.paused) {
		if (game.time < game.replay.inputs.length) {
			input.keys = game.replay.inputs[game.time];
			input.mouseX = game.replay.mouseX[game.time];
			input.mouseY = game.replay.mouseY[game.time];
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
		(ui.mode == 'test' || ui.mode == 'play') &&
		game.abilities.jump &&
		!isInPortal(game.player)
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
function mouseInZone(x, y, w, h) {
	if (input.mouseX >= x && input.mouseX < x + w && input.mouseY >= y && input.mouseY < y + h) return true;
	return false;
}

/**
 * Check if the mouse is on the playfield.
 *
 * @returns {boolean} True if the mouse is on the playfield.
 */
export function mouseOnPlayfield() {
	return mouseInZone(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
}
