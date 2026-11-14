/**
 * The input state that the game derives from the keys and the mouse in each tick.
 */

import {
	KEY_CLEAR,
	MOUSE_LEFT,
	MOUSE_MIDDLE,
	MOUSE_RIGHT,
	MouseButton,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
} from './constants.js';
import { input, ui } from './state.js';

/**
 * Release all mouse buttons and clear the pressed and released state.
 *
 * @param {object} input The keys and the mouse.
 * @returns {void}
 */
export function unclick(input) {
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
 * @param {import('./World.js').World} world The World of the level.
 * @returns {number[]} The old keys, the mouse state and the jump and clear state of the player.
 */
export function captureInput(world) {
	return [
		input.oldKeys,
		input.mousePressed,
		input.mouseReleased,
		input.mouseButton,
		input.mouseNewPress,
		world.player.isJump,
		world.player.oldIsJump,
		world.player.askClear ? 1 : 0,
	];
}

/**
 * Restore an input state from captureInput().
 *
 * @param {import('./World.js').World} world The World of the level.
 * @param {number[]} state The input state.
 * @returns {void}
 */
function restoreInput(world, state) {
	input.oldKeys = state[0];
	input.mousePressed = state[1];
	input.mouseReleased = state[2];
	input.mouseButton = state[3];
	input.mouseNewPress = state[4];
	world.player.isJump = state[5];
	world.player.oldIsJump = state[6];
	world.player.askClear = state[7] == 1;
}

/**
 * Continue a paused replay: restore the input state of the pause and the input of the current tick.
 *
 * @param {import('./World.js').World} world The World of the level.
 * @param {import('./replay.js').Replay} replay The replay that plays.
 * @returns {void}
 */
export function resumeReplay(world, replay) {
	restoreInput(world, input.replayPauseInput);
	input.keys = replay.inputs[world.time];
	input.mouseX = replay.mouseX[world.time];
	input.mouseY = replay.mouseY[world.time];
}

/**
 * Process the input of one tick and set the control flags of the player. In a level, the function records the input
 * for the replay or plays back the replay.
 *
 * @param {import('./World.js').World} world The World that the stage shows.
 * @param {import('./replay.js').Replay} replay The recording of the level, or the replay that plays.
 * @param {boolean} replayMode True while the replay plays.
 * @returns {boolean} True if the replay has fewer inputs than the level needs.
 */
export function manageKeys(world, replay, replayMode) {
	let broken = false;
	// Save the input state when the level time continues after a stop. A replay restores the state at this level time.
	const inGame = world.isRunning() && ui.mode == 'play' && !ui.paused;
	if (inGame && !replayMode && !input.lastTickInGame) replay.states[world.time] = captureInput(world);
	else if (inGame && replayMode && replay.states[world.time]) restoreInput(world, replay.states[world.time]);
	input.lastTickInGame = inGame;

	if (world.isRunning() && ui.mode == 'play' && !replayMode) {
		input.mouseX = Math.round(input.mouseX);
		input.mouseY = Math.round(input.mouseY);
		replay.inputs[world.time] = input.keys;
		replay.mouseX[world.time] = input.mouseX;
		replay.mouseY[world.time] = input.mouseY;
	} else if (world.isRunning() && ui.mode == 'play' && replayMode && !ui.paused) {
		if (world.time < replay.inputs.length) {
			input.keys = replay.inputs[world.time];
			input.mouseX = replay.mouseX[world.time];
			input.mouseY = replay.mouseY[world.time];
		} else {
			broken = true;
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
		input.mouseButton = MouseButton.LEFT;
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

	// a held clear key loses its bit, and the auto repeat of the keyboard sets the bit again
	if (input.keys & KEY_CLEAR && input.oldKeys & KEY_CLEAR) input.keys &= ~KEY_CLEAR;

	world.applyInput(input);

	input.oldKeys = input.keys;
	return broken;
}

/**
 * Check if the mouse is inside a rectangle of the playfield.
 *
 * @param {number} x The left edge of the rectangle in playfield units.
 * @param {number} y The top edge of the rectangle in playfield units.
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
