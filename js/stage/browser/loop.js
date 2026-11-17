/**
 * The game loop. The game logic runs in ticks of 1/60 second of real time.
 */

/** @type {number} The length of a tick in milliseconds. */
const TICK_LENGTH = 1000 / 60;

/** @type {number} The maximum number of ticks in one frame. After a longer stop, the game skips the lost time. */
const MAX_TICKS_PER_FRAME = 5;

/** @type {number} The time in milliseconds between two updates of the frame rate. */
const FPS_INTERVAL = 500;

/** @type {number|null} The time of the previous frame, or null before the first frame. */
let lastFrameTime = null;

/** @type {number} The real time in milliseconds that the ticks have not used yet. */
let pendingTime = 0;

/** @type {number} The number of frames since the last update of the frame rate. */
let fpsFrames = 0;

/** @type {number|null} The time of the last update of the frame rate, or null before the first frame. */
let fpsTime = null;

/** @type {number} The measured number of frames per second. */
let fps = 0;

/** @type {() => void} The function that runs one tick. */
let tickFunction = () => {};

/** @type {() => void} The function that draws the canvas. */
let renderFunction = () => {};

/**
 * Run one tick. An error in a tick does not stop the loop.
 *
 * @returns {void}
 */
function runTick() {
	try {
		tickFunction();
	} catch (error) {
		console.error(error);
	}
}

/**
 * Run the ticks for the real time since the previous frame, then draw the canvas once.
 *
 * @param {DOMHighResTimeStamp} now The time of the frame.
 * @returns {void}
 */
function frame(now) {
	requestAnimationFrame(frame);

	pendingTime += now - (lastFrameTime ?? now);
	lastFrameTime = now;
	let ticks = Math.floor(pendingTime / TICK_LENGTH);
	if (ticks > MAX_TICKS_PER_FRAME) {
		ticks = MAX_TICKS_PER_FRAME;
		pendingTime = 0;
	} else {
		pendingTime -= ticks * TICK_LENGTH;
	}
	for (let i = 0; i < ticks; i++) runTick();
	if (ticks > 0) {
		try {
			renderFunction();
		} catch (error) {
			console.error(error);
		}
	}

	fpsTime ??= now;
	fpsFrames++;
	if (now - fpsTime >= FPS_INTERVAL) {
		fps = Math.round((fpsFrames * 1000) / (now - fpsTime));
		fpsFrames = 0;
		fpsTime = now;
	}
}

/**
 * Forget the time of the previous frame. The browser shows no frames while the tab is hidden, so the game continues
 * without a catch-up when the tab is visible again.
 *
 * @returns {void}
 */
function onVisibilityChange() {
	lastFrameTime = null;
	pendingTime = 0;
}

/**
 * Start the game loop.
 *
 * @param {() => void} tick The function that runs one tick.
 * @param {() => void} render The function that draws the canvas after the ticks of a frame.
 * @returns {void}
 */
export function startLoop(tick, render) {
	tickFunction = tick;
	renderFunction = render;
	document.addEventListener('visibilitychange', onVisibilityChange);
	requestAnimationFrame(frame);
}

/**
 * Get the measured frame rate.
 *
 * @returns {number} The number of frames per second that the browser shows.
 */
export function getFps() {
	return fps;
}
