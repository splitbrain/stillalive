/**
 * Generator for reproducible player input.
 *
 * The input is a list of segments. During a segment, the keys, the mouse buttons and the mouse position stay the
 * same, as with a real player who holds keys for some time.
 */

import {
	KEY_CLEAR,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	MOUSE_LEFT,
	MOUSE_RIGHT,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
} from '../js/constants.js';

/**
 * Create a pseudo-random generator with the mulberry32 algorithm.
 *
 * @param {number} seed The 32-bit seed.
 * @returns {function(): number} A function that returns a number from 0 (inclusive) to 1 (exclusive).
 */
export function createRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Generate the input for a number of ticks.
 *
 * Each segment takes 5 to 40 ticks. The player moves right in 40 percent of the segments and left in 30 percent.
 * The player jumps in 30 percent and presses down in 5 percent. The player clears the portals in 3 percent, in the
 * first tick of the segment only. The left and the right mouse button are each held in 15 percent of the segments.
 * The mouse moves to a new position in the playfield at the start of each segment.
 *
 * @param {number} seed The seed for the pseudo-random generator.
 * @param {number} ticks The number of ticks.
 * @returns {number[][]} For each tick the key bitmask, the mouse x and the mouse y position.
 */
export function generateInputs(seed, ticks) {
	const random = createRandom(seed);
	const randomInt = (min, max) => min + Math.floor(random() * (max - min + 1));
	const inputs = [];

	while (inputs.length < ticks) {
		const length = randomInt(5, 40);
		let keys = 0;

		const direction = random();
		if (direction < 0.4) keys |= KEY_RIGHT;
		else if (direction < 0.7) keys |= KEY_LEFT;
		if (random() < 0.3) keys |= KEY_JUMP;
		if (random() < 0.05) keys |= KEY_DOWN;

		const button = random();
		if (button < 0.15) keys |= MOUSE_LEFT;
		else if (button < 0.3) keys |= MOUSE_RIGHT;

		const clear = random() < 0.03;
		const x = randomInt(0, PLAYFIELD_WIDTH - 1);
		const y = randomInt(0, PLAYFIELD_HEIGHT - 1);

		for (let i = 0; i < length && inputs.length < ticks; i++) {
			inputs.push([clear && i === 0 ? keys | KEY_CLEAR : keys, x, y]);
		}
	}

	return inputs;
}
