/**
 * The shared state of the stage.
 */

/** @type {object} The state of the stage. */
export const ui = {
	/** @type {string} The mode of the stage, "idle", "play", "preview", "edit" or "test". */
	mode: 'idle',
	/** @type {boolean} True while the level time stands still for a pause. */
	paused: false,
};

/** @type {{type: string, detail: *}[]} The events of the stage from a tick. The stage element dispatches them. */
export const stageEvents = [];

/** @type {object} The keys and the mouse, and the input state that the game derives from them. */
export const input = {
	/** @type {number} The key bitmask of the keys and the mouse buttons that are down. */
	keys: 0,
	/** @type {number} The key bitmask of the previous tick. */
	oldKeys: 0,
	/** @type {number} The x position of the mouse in playfield units. */
	mouseX: 0,
	/** @type {number} The y position of the mouse in playfield units. */
	mouseY: 0,
	/** @type {boolean} True while the pointer is over the canvas. */
	mouseOver: false,
	/** @type {number} 1 from the press of a mouse button until its release, else 0. */
	mousePressed: 0,
	/** @type {number} 1 after the release of a mouse button, else 0. */
	mouseReleased: 0,
	/** @type {number} The mouse button of the last press or release, a value of MouseButton. */
	mouseButton: 0,
	/** @type {number} 1 in the first tick of a left click, else 0. */
	mouseNewPress: 0,
	/** @type {number} 1 after the undo key was pressed, until the editor takes it. */
	undoPressed: undefined,
	/** @type {number} 1 after the redo key was pressed, until the editor takes it. */
	redoPressed: undefined,
	/** @type {number[]|null} The input state from captureInput() at the pause of a replay. */
	replayPauseInput: null,
	/** @type {boolean} True if the level ran in the play mode, without a pause, in the previous tick. */
	lastTickInGame: false,
};
