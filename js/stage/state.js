/**
 * The shared state of the stage.
 */

import { InputState } from './InputState.js';

/** @type {InputState} The keys and the mouse, and the changes of each tick. */
export const input = new InputState();
