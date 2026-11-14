/**
 * Keyboard and pointer input.
 *
 * The handlers write the keys and the mouse into the input state. The game reads the input state once per tick.
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
import { stopPlayingLevel } from './editor.js';
import { game, input, ui } from './state.js';

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

/** @type {import('./GameStage.js').GameStage} The stage element that the keys command. */
let stage;

/**
 * Check if a level runs and can pause.
 *
 * @returns {boolean} True in a level before its end.
 */
export function canPause() {
	return ui.mode == 'play' && !game.reachedExit();
}

/**
 * Release all keys and mouse buttons when the game loses the focus. The release events of these keys do not reach
 * the game. In a running level, the function reports the lost focus with the event "focuslost". A replay ignores the
 * lost focus, because the replay sets the keys from the recording.
 *
 * @returns {void}
 */
function onFocusLost() {
	if (game.replayMode) return;
	input.keys = 0;
	if (canPause() && !ui.paused) stage.dispatchEvent(new Event('focuslost'));
}

/**
 * Handle a key press. While the stage shows, the arrow keys do not scroll the page.
 *
 * @param {KeyboardEvent} event The key event.
 * @returns {void}
 */
function onKeyDown(event) {
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
 * @returns {void}
 */
function onKeyUp(event) {
	if (isForeignTarget(event)) return;
	if (event.code in KEY_BITS && KEY_BITS[event.code] !== KEY_CLEAR) input.keys &= ~KEY_BITS[event.code];

	const key = event.key.toLowerCase();
	if (event.ctrlKey && key === 'z') input.undoPressed = 1;
	if (event.ctrlKey && key === 'y') input.redoPressed = 1;

	if (event.key === 'Escape') {
		if (game.replayMode) stage.dispatchEvent(new Event('replaystop'));
		else if (ui.paused) stage.resume();
		else if (canPause()) stage.pause();
		else if (ui.mode == 'test') stopPlayingLevel();
	}

	if (event.key === 'Enter' && ui.mode == 'test') stopPlayingLevel();
}

/**
 * Update the mouse buttons and the mouse position from a pointer event.
 *
 * A second button that the player presses during a drag causes a pointermove event and no pointerdown event. Thus
 * the handler reads all buttons on each event.
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

	if (!game.replayMode || ui.paused) {
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
 * @param {import('./GameStage.js').GameStage} element The stage element that the keys command.
 * @returns {void}
 */
export function setupInput(canvas, element) {
	stage = element;
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('blur', onFocusLost);
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) onFocusLost();
	});

	for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
		canvas.addEventListener(type, onPointer);
	}
	canvas.addEventListener('pointerenter', () => (input.mouseOver = true));
	canvas.addEventListener('pointerleave', () => (input.mouseOver = false));
	canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}
