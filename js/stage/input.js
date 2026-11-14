/**
 * Keyboard and pointer input.
 *
 * The handlers write the keys and the mouse into the input state of the stage. The game reads the input state once
 * per tick. The Escape key, the Enter key and the lost focus call the stage element, which decides what they do.
 */

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
} from './constants.js';

/**
 * The key bits for the movement keys, by the physical position of the key.
 *
 * @type {Object<string, number>}
 */
const KEY_BITS = {
	KeyW: KEY_JUMP,
	KeyA: KEY_LEFT,
	KeyD: KEY_RIGHT,
	KeyS: KEY_DOWN,
	KeyE: KEY_CLEAR,
	ArrowUp: KEY_JUMP,
	ArrowLeft: KEY_LEFT,
	ArrowRight: KEY_RIGHT,
	ArrowDown: KEY_DOWN,
	ShiftRight: KEY_CLEAR,
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
 * The methods of the stage element for the keys and the focus.
 *
 * @typedef {object} StageCommands
 * @property {() => void} escape Handle the release of the Escape key.
 * @property {() => void} enter Handle the release of the Enter key.
 * @property {() => void} focusLost Handle the loss of the focus.
 */

/**
 * Handle a key press. While the stage shows, the arrow keys do not scroll the page.
 *
 * @param {KeyboardEvent} event The key event.
 * @param {import('./InputState.js').InputState} input The input state that the handler writes.
 * @param {import('./GameStage.js').GameStage} stage The stage element.
 * @returns {void}
 */
function onKeyDown(event, input, stage) {
	if (isForeignTarget(event)) return;
	if (event.code in KEY_BITS) input.keys |= KEY_BITS[event.code];
	if (event.code.startsWith('Arrow') && !stage.hidden) event.preventDefault();
	const modified = event.ctrlKey || event.altKey || event.metaKey;
	if ((event.key === 'm' || event.key === 'M') && !event.repeat && !modified) stage.setSound(!stage.sound.get());
}

/**
 * Handle a key release.
 *
 * @param {KeyboardEvent} event The key event.
 * @param {import('./InputState.js').InputState} input The input state that the handler writes.
 * @param {StageCommands} commands The methods of the stage element for the keys and the focus.
 * @returns {void}
 */
function onKeyUp(event, input, commands) {
	if (isForeignTarget(event)) return;
	if (event.code in KEY_BITS && KEY_BITS[event.code] !== KEY_CLEAR) input.keys &= ~KEY_BITS[event.code];

	const key = event.key.toLowerCase();
	if (event.ctrlKey && key === 'z') input.undoPressed = true;
	if (event.ctrlKey && key === 'y') input.redoPressed = true;

	if (event.key === 'Escape') commands.escape();
	if (event.key === 'Enter') commands.enter();
}

/**
 * Update the mouse buttons and the mouse position from a pointer event.
 *
 * A second button that the player presses during a drag causes a pointermove event and no pointerdown event. Thus
 * the handler reads all buttons on each event.
 *
 * @param {PointerEvent} event The pointer event.
 * @param {import('./InputState.js').InputState} input The input state that the handler writes.
 * @returns {void}
 */
function onPointer(event, input) {
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

	if (!input.mouseLocked) {
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
 * @param {HTMLCanvasElement} canvas The canvas that takes the pointer input.
 * @param {import('./GameStage.js').GameStage} stage The stage element that the keys command.
 * @param {import('./InputState.js').InputState} input The input state that the handlers write.
 * @param {StageCommands} commands The methods of the stage element for the keys and the focus.
 * @returns {void}
 */
export function setupInput(canvas, stage, input, commands) {
	window.addEventListener('keydown', (event) => onKeyDown(event, input, stage));
	window.addEventListener('keyup', (event) => onKeyUp(event, input, commands));
	window.addEventListener('blur', () => commands.focusLost());
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) commands.focusLost();
	});

	for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
		canvas.addEventListener(type, (event) => onPointer(event, input));
	}
	canvas.addEventListener('pointerenter', () => (input.mouseOver = true));
	canvas.addEventListener('pointerleave', () => (input.mouseOver = false));
	canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}
