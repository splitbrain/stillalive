/**
 * The game loop.
 *
 * The game logic runs in ticks of 1/60 second. The loop runs one tick for each 1/60 second of real time, so the game
 * speed does not depend on the refresh rate of the monitor. Each tick also draws the screen.
 */

/** @type {number} The length of a tick in milliseconds. */
const TICK_LENGTH = 1000 / 60;

/** @type {number} The maximum number of ticks in one frame. After a longer stop, the game does not catch up. */
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

/** @type {function(): void} The function that runs one tick. */
let tickFunction = () => {};

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
 * Handle one animation frame of the browser.
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

	fpsTime ??= now;
	fpsFrames++;
	if (now - fpsTime >= FPS_INTERVAL) {
		fps = Math.round((fpsFrames * 1000) / (now - fpsTime));
		fpsFrames = 0;
		fpsTime = now;
	}
}

/**
 * Start the game loop.
 *
 * @param {function(): void} tick The function that runs one tick.
 * @returns {void}
 */
export function startLoop(tick) {
	tickFunction = tick;
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

Object.assign(window, { startLoop, getFps });
