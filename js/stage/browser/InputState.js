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
} from '../constants.js';

/**
 * @type {Array<[number, number]>} The key bit and the MouseButton value of each mouse button, in the order in which
 *     the tick checks them.
 */
const MOUSE_BUTTONS = [
	[MOUSE_LEFT, MouseButton.LEFT],
	[MOUSE_RIGHT, MouseButton.RIGHT],
	[MOUSE_MIDDLE, MouseButton.MIDDLE],
];

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
	/** @type {boolean} True while a replay plays without a pause. */
	mouseLocked = false;
	/** @type {boolean} True from the press of a mouse button until its release. */
	mousePressed = false;
	/** @type {boolean} True after the release of a mouse button. */
	mouseReleased = false;
	/** @type {number} The mouse button of the last press or release, a value of MouseButton. */
	mouseButton = 0;
	/** @type {boolean} True in the first tick of a left click. */
	mouseNewPress = false;
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
		this.mouseNewPress = Boolean(this.keys & MOUSE_LEFT) && !this.mousePressed;

		const pressed = MOUSE_BUTTONS.find(([bit]) => !(this.oldKeys & bit) && this.keys & bit);
		if (pressed) {
			this.mouseButton = pressed[1];
			this.mousePressed = true;
			this.mouseReleased = false;
		}

		const released = MOUSE_BUTTONS.find(([bit]) => this.oldKeys & bit && !(this.keys & bit));
		if (released) {
			this.mouseButton = released[1];
			this.mouseReleased = true;
			this.mousePressed = false;
		}

		this.clearPressed = (this.keys & KEY_CLEAR) !== 0 && (this.oldKeys & KEY_CLEAR) === 0;
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
		this.mousePressed = false;
		this.mouseReleased = false;
		this.mouseNewPress = false;
		this.keys &= ~(MOUSE_LEFT | MOUSE_RIGHT | MOUSE_MIDDLE);
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
	 * @param {import('../bodies/Player.js').Player} player The player of the level.
	 * @returns {number[]} The old keys, the mouse state and the jump and clear state of the player, as 8 numbers.
	 */
	capture(player) {
		return [
			this.oldKeys,
			this.mousePressed ? 1 : 0,
			this.mouseReleased ? 1 : 0,
			this.mouseButton,
			this.mouseNewPress ? 1 : 0,
			...player.captureKeys(),
		];
	}

	/**
	 * Restore a replay state from capture().
	 *
	 * @param {import('../bodies/Player.js').Player} player The player of the level.
	 * @param {number[]} state The replay state.
	 * @returns {void}
	 */
	restore(player, state) {
		this.oldKeys = state[0];
		this.mousePressed = state[1] === 1;
		this.mouseReleased = state[2] === 1;
		this.mouseButton = state[3];
		this.mouseNewPress = state[4] === 1;
		player.restoreKeys(state.slice(5));
	}
}
