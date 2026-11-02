/**
 * Keyboard and pointer input.
 *
 * The handlers write the pressed keys and mouse buttons into the key bitmask of the game, and the mouse position in
 * canvas pixels. The game reads both once per tick.
 */

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
	return (
		target.isContentEditable ||
		target.closest('input, textarea, select, dialog') !== null
	);
}

/**
 * Handle a key press.
 *
 * @param {KeyboardEvent} event The key event.
 * @returns {void}
 */
function onKeyDown(event) {
	if (isForeignTarget(event)) return;
	if (event.code in KEY_BITS) keys |= KEY_BITS[event.code];
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
	if (event.code in KEY_BITS && event.code !== 'KeyE') keys &= ~KEY_BITS[event.code];

	const key = event.key.toLowerCase();
	if (event.ctrlKey && key === 'z') leftReleased = 1;
	if (event.ctrlKey && key === 'y') rightReleased = 1;

	if (event.key === 'Escape') {
		if ((currentMenu === 2 || currentMenu === 6) && !drawIntermission) {
			escapeMenu = !escapeMenu;
			if (replayMode) {
				if (escapeMenu) {
					replayPauseInput = captureInput();
					unclick();
					keys = 0;
				} else {
					rescaleReplay();
				}
			}
		} else if (currentMenu === 3 && isTestingLevel) {
			stopPlayingLevel();
		}
	}

	if (event.key === 'Enter' && currentMenu === 3) {
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
	keys = (keys & ~MOUSE_BITS) | buttons;

	if (!replayMode || escapeMenu) {
		const rect = canvas.getBoundingClientRect();
		mouseX = ((event.clientX - rect.left - canvas.clientLeft) * canvas.width) / canvas.clientWidth;
		mouseY = ((event.clientY - rect.top - canvas.clientTop) * canvas.height) / canvas.clientHeight;
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
