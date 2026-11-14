/**
 * The replays: the conversion to and from the replay file format, and the input sources of a level, the Recorder and
 * the ReplayPlayer.
 */

/**
 * A replay in the file format. A replay file is this object as JSON.
 *
 * @typedef {object} ReplayFile
 * @property {number} format The version of the file format, always 2.
 * @property {string} campaign The folder name of the campaign, e.g. "normal".
 * @property {number} level The level number, starting at 1.
 * @property {number} ticks The number of recorded ticks.
 * @property {number[][]} inputs A list of [count, keys, mouseX, mouseY] entries. Each entry stands for count ticks
 *     with the same key bitmask and mouse position. The mouse position is in playfield units.
 * @property {number[][]} states A list of [time, ...state] entries with the replay state from InputState.capture().
 *     The game processes input while the level time stands still, e.g. in a pause. The playback restores the state
 *     when the time continues.
 */

/** @type {number} The length of a replay state from InputState.capture(). */
const STATE_LENGTH = 8;

/** @type {number} The version of the replay file format. */
const REPLAY_FORMAT = 2;

/**
 * Convert a recorded replay into the file format.
 *
 * @param {Replay} replay The recorded replay of the game.
 * @param {string} campaign The folder name of the campaign.
 * @param {number} level The level number, starting at 1.
 * @returns {ReplayFile} The replay in the file format.
 */
export function encodeReplay(replay, campaign, level) {
	const inputs = [];
	for (const [i, keys] of replay.inputs.entries()) {
		const last = inputs.at(-1);
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
 * @param {*} data The replay in the file format.
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
		this.inputs = [];
		/** @type {number[]} The mouse x position of each tick. */
		this.mouseX = [];
		/** @type {number[]} The mouse y position of each tick. */
		this.mouseY = [];
		/** @type {Object<number, number[]>} The replay states from InputState.capture() by level time. */
		this.states = {};
	}
}

/**
 * The input source of a level that the player plays. It records the keys and the mouse position of each running tick,
 * and the replay state when the level time continues after a stop.
 */
export class Recorder {
	/** @type {Replay} The recording of the level. */
	replay = new Replay();
	/** @type {boolean} True if the level ran without a pause in the previous tick. */
	lastTickInGame = false;

	/**
	 * Record the input of one tick. The recording continues in a pause.
	 *
	 * @param {import('./World.js').World} world The World of the level.
	 * @param {import('./InputState.js').InputState} input The keys and the mouse.
	 * @param {boolean} paused True while the level time stands still for a pause.
	 * @returns {void}
	 */
	run(world, input, paused) {
		const inGame = world.phase.isRunning() && !paused;
		if (inGame && !this.lastTickInGame) this.replay.states[world.time] = input.capture(world.player);
		this.lastTickInGame = inGame;

		if (world.phase.isRunning()) {
			input.mouseX = Math.round(input.mouseX);
			input.mouseY = Math.round(input.mouseY);
			this.replay.inputs[world.time] = input.keys;
			this.replay.mouseX[world.time] = input.mouseX;
			this.replay.mouseY[world.time] = input.mouseY;
		}
	}
}

/**
 * The input source of a replay that plays. It sets the keys and the mouse position of each running tick from the
 * recording, and it restores the replay states.
 */
export class ReplayPlayer {
	/** @type {boolean} True until the playback ends. */
	playing = true;
	/** @type {number[]|null} The replay state at the start of the last pause, or null. */
	#pauseState = null;

	/**
	 * Create the playback of a replay.
	 *
	 * @param {Replay} replay The replay to play.
	 */
	constructor(replay) {
		/** @type {Replay} The replay that plays. */
		this.replay = replay;
	}

	/**
	 * Set the input of one tick from the replay. A replay with fewer inputs than the level needs sets the outcome
	 * "brokenReplay".
	 *
	 * @param {import('./World.js').World} world The World of the level.
	 * @param {import('./InputState.js').InputState} input The keys and the mouse.
	 * @param {boolean} paused True while the level time stands still for a pause.
	 * @returns {void}
	 */
	run(world, input, paused) {
		if (!this.playing || !world.phase.isRunning() || paused) return;
		const state = this.replay.states[world.time];
		if (state) input.restore(world.player, state);

		if (world.time < this.replay.inputs.length) {
			input.keys = this.replay.inputs[world.time];
			input.mouseX = this.replay.mouseX[world.time];
			input.mouseY = this.replay.mouseY[world.time];
		} else {
			world.outcome = 'brokenReplay';
		}
	}

	/**
	 * Keep the replay state for the resume, and release the keys and the mouse buttons for the pause.
	 *
	 * @param {import('./World.js').World} world The World of the level.
	 * @param {import('./InputState.js').InputState} input The keys and the mouse.
	 * @returns {void}
	 */
	pause(world, input) {
		this.#pauseState = input.capture(world.player);
		input.unclick();
		input.keys = 0;
	}

	/**
	 * Restore the replay state of the pause and set the input of the current tick from the replay.
	 *
	 * @param {import('./World.js').World} world The World of the level.
	 * @param {import('./InputState.js').InputState} input The keys and the mouse.
	 * @returns {void}
	 */
	resume(world, input) {
		input.restore(world.player, this.#pauseState);
		input.keys = this.replay.inputs[world.time];
		input.mouseX = this.replay.mouseX[world.time];
		input.mouseY = this.replay.mouseY[world.time];
	}

	/**
	 * End the playback. The ended playback sets no input.
	 *
	 * @returns {void}
	 */
	stop() {
		this.playing = false;
	}
}
