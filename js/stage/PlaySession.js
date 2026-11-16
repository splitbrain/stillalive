/**
 * The PlaySession object.
 */

import { StageMode } from './constants.js';
import { Recorder, ReplayPlayer, encodeReplay } from './replay.js';
import { World } from './World.js';

/**
 * The function that gets the events of a play session.
 *
 * The events are "finished" with the level time and the recorded replay at the end of a level, "testend" at the end of
 * a test run, "brokenreplay" when a replay cannot continue, "replaystop" for the Escape key during a replay, and
 * "focuslost" when a level that can pause loses the focus.
 *
 * @callback SessionReport
 * @param {string} type The event type.
 * @param {{time: number, replay: import('./replay.js').ReplayFile}|null} [detail] The level time and the replay of the
 *     event "finished", else null.
 * @returns {void}
 */

/**
 * A level that plays, a replay that plays, or the test run of the editor map. After a death, the session starts the
 * level again in a new World.
 */
export class PlaySession {
	/** @type {World} The World of the current level start. */
	world;
	/** @type {import('./level.js').Level} The level. */
	level;
	/** @type {Recorder|ReplayPlayer|null} The input source of the level, or null in a test run. */
	source = null;
	/** @type {boolean} True for the test run of the editor map. A test run does not record and cannot pause. */
	testRun;
	/** @type {number} The effect of the next opening transition, a value of Transition. */
	transition;

	/** @type {boolean} True while the level time stands still for a pause. */
	#paused = false;
	/** @type {import('./InputState.js').InputState} The keys and the mouse. */
	#input;
	/** @type {SessionReport} The function that gets the events of the session. */
	#report;

	/**
	 * Start a level, the playback of a replay of the level, or a test run.
	 *
	 * @param {import('./level.js').Level} level The level.
	 * @param {object} options The options.
	 * @param {import('./InputState.js').InputState} options.input The keys and the mouse.
	 * @param {SessionReport} options.report The function that gets the events of the session.
	 * @param {number} options.transition The effect of the opening transition, a value of Transition.
	 * @param {import('./replay.js').Replay|null} [options.replay] The replay to play, or null to let the player play.
	 * @param {boolean} [options.restart] True for a restart of the same level. A restart skips the waits of the events
	 *     and the entrance of the boss.
	 * @param {boolean} [options.testRun] True for the test run of the editor map.
	 */
	constructor(level, { input, report, transition, replay = null, restart = false, testRun = false }) {
		this.level = level;
		this.testRun = testRun;
		this.transition = transition;
		this.#input = input;
		this.#report = report;
		this.#start(restart, replay);
		input.unclick();
	}

	/**
	 * Get the mode of the stage for the session.
	 *
	 * @returns {string} StageMode.TEST for a test run, else StageMode.PLAY.
	 */
	get mode() {
		return this.testRun ? StageMode.TEST : StageMode.PLAY;
	}

	/**
	 * Check if the level time stands still for a pause.
	 *
	 * @returns {boolean} True during a pause.
	 */
	get paused() {
		return this.#paused;
	}

	/**
	 * Check if a replay plays.
	 *
	 * @returns {boolean} True from the start of a replay until the start of its closing transition or the end of the
	 *     playback.
	 */
	get replaying() {
		return this.source instanceof ReplayPlayer && this.source.playing;
	}

	/**
	 * Run one tick: the input source, the input of the tick and the World. The session starts the level again after
	 * the death fade, and it reports the end of the level, the end of a test run and a broken replay.
	 *
	 * @returns {void}
	 */
	tick() {
		const world = this.world;
		const input = this.#input;
		this.source?.run(world, input, this.#paused);
		input.update();
		world.applyInput(input);
		input.endTick();
		if (this.#paused) return;

		if (world.outcome !== 'brokenReplay') {
			world.tick(input);
			this.transition = world.phase.transition;
			if (world.phase.closingStarted()) this.endPlayback();
		}
		switch (world.outcome) {
			case 'died':
				this.#start(true, null);
				break;
			case 'brokenReplay':
				this.endPlayback();
				this.#report('brokenreplay', null);
				break;
			case 'finished':
				if (this.testRun) {
					this.#report('testend', null);
				} else {
					const replay = encodeReplay(this.source.replay, this.level.campaign, this.level.number);
					this.#report('finished', { time: world.time, replay });
				}
				break;
		}
	}

	/**
	 * Draw the level.
	 *
	 * @param {import('./render/Renderer.js').Renderer} renderer The drawing of the stage.
	 * @returns {void}
	 */
	draw(renderer) {
		renderer.drawLevel(this.world);
	}

	/**
	 * Check if the level can pause.
	 *
	 * @returns {boolean} True outside a test run before the player reaches the exit.
	 */
	#canPause() {
		return !this.testRun && !this.world.phase.reachedExit();
	}

	/**
	 * Stop the level time. A replay keeps its input state for the resume.
	 *
	 * @returns {boolean} True if the pause started, false if the level cannot pause or is paused.
	 */
	pause() {
		if (!this.#canPause() || this.#paused) return false;
		this.#paused = true;
		if (this.replaying) /** @type {ReplayPlayer} */ (this.source).pause(this.world, this.#input);
		this.#updateMouseLock();
		return true;
	}

	/**
	 * Continue the level time after a pause.
	 *
	 * @returns {boolean} True if the pause ended, false without a pause.
	 */
	resume() {
		if (!this.#paused) return false;
		this.#paused = false;
		this.#input.unclick();
		if (this.replaying) /** @type {ReplayPlayer} */ (this.source).resume(this.world, this.#input);
		this.#updateMouseLock();
		return true;
	}

	/**
	 * End the playback of a replay. The level continues without the input of the replay.
	 *
	 * @returns {void}
	 */
	endPlayback() {
		if (this.replaying) /** @type {ReplayPlayer} */ (this.source).stop();
		this.#updateMouseLock();
	}

	/**
	 * End a test run with the event "testend".
	 *
	 * @returns {void}
	 */
	endTest() {
		if (this.testRun) this.#report('testend', null);
	}

	/**
	 * Handle the release of the Escape key. In a replay it reports "replaystop". Else it ends a pause, pauses the
	 * level or ends a test run.
	 *
	 * @returns {boolean} True if the pause changed.
	 */
	onEscape() {
		if (this.replaying) this.#report('replaystop', null);
		else if (this.#paused) return this.resume();
		else if (this.#canPause()) return this.pause();
		else this.endTest();
		return false;
	}

	/**
	 * Release all keys after the loss of the focus, and report "focuslost" if the level can pause. A replay ignores
	 * the lost focus, because the replay sets the keys from the recording.
	 *
	 * @returns {void}
	 */
	onFocusLost() {
		if (this.replaying) return;
		this.#input.keys = 0;
		if (this.#canPause() && !this.#paused) this.#report('focuslost', null);
	}

	/**
	 * Start the level in a new World, with the pause and the keys released.
	 *
	 * @param {boolean} restart True for a restart of the same level.
	 * @param {import('./replay.js').Replay|null} replay The replay to play, or null to let the player play.
	 * @returns {void}
	 */
	#start(restart, replay) {
		// a test run does not record
		if (this.testRun) this.source = null;
		else this.source = replay === null ? new Recorder() : new ReplayPlayer(replay);
		this.world = World.forLevel(this.level, { restart, replay: replay !== null, transition: this.transition });
		this.#paused = false;
		this.#updateMouseLock();
		this.#input.keys = 0;
		this.#input.oldKeys = 0;
	}

	/**
	 * Lock the mouse position while a replay plays without a pause, so that the pointer does not move it. Unlock it
	 * in all other cases.
	 *
	 * @returns {void}
	 */
	#updateMouseLock() {
		this.#input.mouseLocked = this.replaying && !this.#paused;
	}
}
