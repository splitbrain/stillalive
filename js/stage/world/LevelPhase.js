/**
 * The LevelPhase object.
 */

import { FADE_START, FADE_STEP, Transition } from '../constants.js';

/**
 * The phase of a level with the progress and the effect of its transitions. OPENING is the opening transition. In
 * RUNNING, the level time counts and the objects move. In HALTED, the level time stands still while an event waits for
 * a click or the boss comes in. EXIT_WAIT starts when the player reaches the exit and an exit event waits for a click.
 * CLOSING is the closing transition. ENDED is the exit freeze after the closing transition.
 */
export class LevelPhase {
	/** @type {number} The opening transition. */
	static OPENING = 0;
	/** @type {number} The level runs. */
	static RUNNING = 1;
	/** @type {number} The level time stands still. */
	static HALTED = 2;
	/** @type {number} The player is on the exit, and an exit event waits for a click. */
	static EXIT_WAIT = 3;
	/** @type {number} The closing transition. */
	static CLOSING = 4;
	/** @type {number} The exit freeze after the closing transition. */
	static ENDED = 5;

	/** @type {number} The current phase, a value of the static constants of LevelPhase. */
	current = LevelPhase.OPENING;
	/** @type {number} The progress of the opening and the closing transition, from FADE_START down to 0. */
	fade = FADE_START;
	/** @type {number} The effect of the opening and the closing transition, a value of Transition. */
	transition = Transition.HORIZONTAL_LINES;

	/**
	 * Set the start of the opening transition.
	 *
	 * @returns {void}
	 */
	reset() {
		this.current = LevelPhase.OPENING;
		this.fade = FADE_START;
	}

	/**
	 * Check if the opening transition of the level runs.
	 *
	 * @returns {boolean} True during the opening transition.
	 */
	isOpening() {
		return this.current === LevelPhase.OPENING;
	}

	/**
	 * Check if the level runs. The level time counts and the objects move.
	 *
	 * @returns {boolean} True while the level runs.
	 */
	isRunning() {
		return this.current === LevelPhase.RUNNING;
	}

	/**
	 * Check if the level time stands still while an event waits for a click or the boss comes in.
	 *
	 * @returns {boolean} True while the level is halted.
	 */
	isHalted() {
		return this.current === LevelPhase.HALTED;
	}

	/**
	 * Check if the player is on the exit and an exit event waits for a click.
	 *
	 * @returns {boolean} True while the exit event waits.
	 */
	isExitWait() {
		return this.current === LevelPhase.EXIT_WAIT;
	}

	/**
	 * Check if the closing transition of the level runs.
	 *
	 * @returns {boolean} True during the closing transition.
	 */
	isClosing() {
		return this.current === LevelPhase.CLOSING;
	}

	/**
	 * Check if the level is in the exit freeze after the closing transition.
	 *
	 * @returns {boolean} True in the exit freeze.
	 */
	isEnded() {
		return this.current === LevelPhase.ENDED;
	}

	/**
	 * Check if the closing transition started in the last tick.
	 *
	 * @returns {boolean} True in the tick in which the closing transition started.
	 */
	closingStarted() {
		return this.isClosing() && this.fade === FADE_START;
	}

	/**
	 * Check if the player reached the exit and the level end runs.
	 *
	 * @returns {boolean} True in the phases EXIT_WAIT, CLOSING and ENDED.
	 */
	reachedExit() {
		return this.isExitWait() || this.isClosing() || this.isEnded();
	}

	/**
	 * Continue the opening transition for one tick. The level runs when the fade reaches 0.
	 *
	 * @returns {void}
	 */
	advanceOpening() {
		this.fade -= FADE_STEP;
		if (this.fade <= 0) this.current = LevelPhase.RUNNING;
	}

	/**
	 * Stop the level time.
	 *
	 * @returns {void}
	 */
	halt() {
		this.current = LevelPhase.HALTED;
	}

	/**
	 * Let the level run.
	 *
	 * @returns {void}
	 */
	run() {
		this.current = LevelPhase.RUNNING;
	}

	/**
	 * Wait at the exit for the click of an exit event.
	 *
	 * @returns {void}
	 */
	waitAtExit() {
		this.current = LevelPhase.EXIT_WAIT;
	}

	/**
	 * Continue the opening transition as the closing transition. The fade keeps its value.
	 *
	 * @returns {void}
	 */
	continueAsClosing() {
		this.current = LevelPhase.CLOSING;
	}

	/**
	 * Start the closing transition.
	 *
	 * @param {number} transition The effect of the closing transition and of the next opening transition, a value of
	 *     Transition.
	 * @returns {void}
	 */
	startClosing(transition) {
		this.current = LevelPhase.CLOSING;
		this.fade = FADE_START;
		this.transition = transition;
	}

	/**
	 * Continue the closing transition for one tick. The level ends when the fade reaches 0.
	 *
	 * @returns {boolean} True if the level ended in this tick.
	 */
	advanceClosing() {
		this.fade -= FADE_STEP;
		if (this.fade > 0) return false;
		this.fade = 0;
		this.current = LevelPhase.ENDED;
		return true;
	}
}
