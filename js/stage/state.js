/**
 * The shared state of the stage.
 */

import { InputState } from './InputState.js';

/** @type {object} The state of the stage. */
export const ui = {
	/** @type {string} The mode of the stage, "idle", "play", "preview", "edit" or "test". */
	mode: 'idle',
	/** @type {boolean} True while the level time stands still for a pause. */
	paused: false,
};

/** @type {{type: string, detail: *}[]} The events of the stage from a tick. The stage element dispatches them. */
export const stageEvents = [];

/** @type {InputState} The keys and the mouse, and the changes of each tick. */
export const input = new InputState();
