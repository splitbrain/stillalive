/**
 * Conversion of replays to and from the replay file format.
 *
 * A replay file is JSON with these properties:
 *
 * - format: the version of the file format, always 2
 * - campaign: the folder name of the campaign, e.g. "normal"
 * - level: the level number, starting at 1
 * - ticks: the number of recorded ticks
 * - inputs: a list of [count, keys, mouseX, mouseY] entries. Each entry stands for count ticks with the same key
 *   bitmask and mouse position. The mouse position is in playfield units.
 * - states: a list of [time, ...state] entries with the input state from captureInput(). The game processes input
 *   while the level time stands still, e.g. in a pause. The playback restores the state when the time continues.
 */

/** @type {number} The length of an input state from captureInput(). */
const STATE_LENGTH = 8;

/** @type {number} The version of the replay file format. */
const REPLAY_FORMAT = 2;

/**
 * Convert a recorded replay into the file format.
 *
 * @param {Replay} replay The recorded replay of the game.
 * @param {string} campaign The folder name of the campaign.
 * @param {number} level The level number, starting at 1.
 * @returns {object} The replay in the file format.
 */
export function encodeReplay(replay, campaign, level) {
	const inputs = [];
	for (let i = 0; i < replay.inputs.length; i++) {
		const last = inputs[inputs.length - 1];
		const keys = replay.inputs[i];
		const x = replay.mouseX[i];
		const y = replay.mouseY[i];
		if (last && last[1] === keys && last[2] === x && last[3] === y) last[0]++;
		else inputs.push([1, keys, x, y]);
	}
	const states = Object.entries(replay.states).map(([time, state]) => [Number(time), ...state]);
	return {
		format: REPLAY_FORMAT,
		campaign,
		level,
		ticks: replay.inputs.length,
		inputs,
		states,
	};
}

/**
 * Check if a value is a list of lists of integers.
 *
 * @param {*} list The value to check.
 * @param {number} length The length of each inner list.
 * @returns {boolean} True if the value is valid.
 */
function isIntegerTable(list, length) {
	return (
		Array.isArray(list) &&
		list.every((entry) => Array.isArray(entry) && entry.length === length && entry.every(Number.isInteger))
	);
}

/**
 * Convert a replay in the file format into a replay for the game.
 *
 * @param {object} data The replay in the file format.
 * @returns {Replay} The replay for the game.
 * @throws {Error} If the data is not a valid replay.
 */
export function decodeReplay(data) {
	if (
		data?.format !== REPLAY_FORMAT ||
		typeof data.campaign !== 'string' ||
		!Number.isInteger(data.level) ||
		!Array.isArray(data.inputs)
	) {
		throw new Error('This is not a Still Alive replay file.');
	}

	if (
		!isIntegerTable(data.inputs, 4) ||
		!data.inputs.every((entry) => entry[0] > 0) ||
		data.inputs.reduce((sum, entry) => sum + entry[0], 0) !== data.ticks ||
		!isIntegerTable(data.states, STATE_LENGTH + 1)
	) {
		throw new Error('The replay file is damaged.');
	}

	const replay = new Replay();
	for (const [count, keys, x, y] of data.inputs) {
		for (let i = 0; i < count; i++) {
			replay.inputs.push(keys);
			replay.mouseX.push(x);
			replay.mouseY.push(y);
		}
	}
	for (const [time, ...state] of data.states) replay.states[time] = state;
	return replay;
}

/**
 * The recording of a level: the input of each tick and the input state at the points where the level time continues
 * after a stop.
 */
export class Replay {
	/**
	 * Create an empty recording.
	 */
	constructor() {
		/** @type {number[]} The key bitmask of each tick. */
		this.inputs = new Array();
		/** @type {number[]} The mouse x position of each tick. */
		this.mouseX = new Array();
		/** @type {number[]} The mouse y position of each tick. */
		this.mouseY = new Array();
		/** @type {Object<number, number[]>} The input state from captureInput() by level time. */
		this.states = {};
	}
}
