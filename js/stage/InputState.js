/**
 * The keys and the mouse, and the changes of each tick.
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

/**
 * The keys and the mouse. The input handlers write the keys and the mouse position, and the tick finds the changes.
 */
export class InputState {
	/** @type {number} The key bitmask of the keys and the mouse buttons that are down. */
	keys = 0;
	/** @type {number} The key bitmask of the previous tick. */
	oldKeys = 0;
	/** @type {number} The x position of the mouse in playfield units. */
	mouseX = 0;
	/** @type {number} The y position of the mouse in playfield units. */
	mouseY = 0;
	/** @type {boolean} True while the pointer is over the canvas. */
	mouseOver = false;
	/** @type {number} 1 from the press of a mouse button until its release, else 0. */
	mousePressed = 0;
	/** @type {number} 1 after the release of a mouse button, else 0. */
	mouseReleased = 0;
	/** @type {number} The mouse button of the last press or release, a value of MouseButton. */
	mouseButton = 0;
	/** @type {number} 1 in the first tick of a left click, else 0. */
	mouseNewPress = 0;
	/** @type {boolean} True in the tick of a press of the clear key. */
	clearPressed = false;
	/** @type {boolean} True after the undo key was pressed, until the editor takes it. */
	undoPressed = false;
	/** @type {boolean} True after the redo key was pressed, until the editor takes it. */
	redoPressed = false;

	/**
	 * Find the mouse changes and the press of the clear key of the tick. A held clear key loses its bit, and the auto
	 * repeat of the keyboard sets the bit again.
	 *
	 * @returns {void}
	 */
	update() {
		// check for a new left click
		if (this.keys & MOUSE_LEFT) {
			if (this.mousePressed == 0) {
				this.mouseNewPress = 1;
			} else {
				this.mouseNewPress = 0;
			}
		} else this.mouseNewPress = 0;

		//check if a mouse button was just pressed
		if (!(this.oldKeys & MOUSE_LEFT) && this.keys & MOUSE_LEFT) {
			this.mouseButton = MouseButton.LEFT;
			this.mousePressed = 1;
			this.mouseReleased = 0;
		} else if (!(this.oldKeys & MOUSE_RIGHT) && this.keys & MOUSE_RIGHT) {
			this.mouseButton = MouseButton.RIGHT;
			this.mousePressed = 1;
			this.mouseReleased = 0;
		} else if (!(this.oldKeys & MOUSE_MIDDLE) && this.keys & MOUSE_MIDDLE) {
			this.mouseButton = MouseButton.MIDDLE;
			this.mousePressed = 1;
			this.mouseReleased = 0;
		}

		//check if a mouse button was just released
		if (this.oldKeys & MOUSE_LEFT && !(this.keys & MOUSE_LEFT)) {
			this.mouseButton = MouseButton.LEFT;
			this.mouseReleased = 1;
			this.mousePressed = 0;
		} else if (this.oldKeys & MOUSE_RIGHT && !(this.keys & MOUSE_RIGHT)) {
			this.mouseButton = MouseButton.RIGHT;
			this.mouseReleased = 1;
			this.mousePressed = 0;
		} else if (this.oldKeys & MOUSE_MIDDLE && !(this.keys & MOUSE_MIDDLE)) {
			this.mouseButton = MouseButton.MIDDLE;
			this.mouseReleased = 1;
			this.mousePressed = 0;
		}

		this.clearPressed = (this.keys & KEY_CLEAR) != 0 && (this.oldKeys & KEY_CLEAR) == 0;
		if (this.keys & KEY_CLEAR && this.oldKeys & KEY_CLEAR) this.keys &= ~KEY_CLEAR;
	}

	/**
	 * Store the keys of the tick as the old keys.
	 *
	 * @returns {void}
	 */
	endTick() {
		this.oldKeys = this.keys;
	}

	/**
	 * Release all mouse buttons and clear the pressed and released state.
	 *
	 * @returns {void}
	 */
	unclick() {
		this.mousePressed = 0;
		this.mouseReleased = 0;
		this.mouseNewPress = 0;

		this.keys &= ~MOUSE_LEFT;
		this.keys &= ~MOUSE_RIGHT;
		this.keys &= ~MOUSE_MIDDLE;
	}

	/**
	 * Check if the mouse is on the playfield.
	 *
	 * @returns {boolean} True if the mouse is on the playfield.
	 */
	mouseOnPlayfield() {
		return this.mouseX >= 0 && this.mouseX < PLAYFIELD_WIDTH && this.mouseY >= 0 && this.mouseY < PLAYFIELD_HEIGHT;
	}

	/**
	 * Get the replay state: the input state that the tick derives from the keys of the previous ticks.
	 *
	 * @param {import('./entities/Player.js').Player} player The player of the level.
	 * @returns {number[]} The old keys, the mouse state and the jump and clear state of the player, as 8 numbers.
	 */
	capture(player) {
		return [
			this.oldKeys,
			this.mousePressed,
			this.mouseReleased,
			this.mouseButton,
			this.mouseNewPress,
			player.jump ? 1 : 0,
			player.oldJump ? 1 : 0,
			player.askClear ? 1 : 0,
		];
	}

	/**
	 * Restore a replay state from capture().
	 *
	 * @param {import('./entities/Player.js').Player} player The player of the level.
	 * @param {number[]} state The replay state.
	 * @returns {void}
	 */
	restore(player, state) {
		this.oldKeys = state[0];
		this.mousePressed = state[1];
		this.mouseReleased = state[2];
		this.mouseButton = state[3];
		this.mouseNewPress = state[4];
		player.jump = state[5] == 1;
		player.oldJump = state[6] == 1;
		player.askClear = state[7] == 1;
	}
}
