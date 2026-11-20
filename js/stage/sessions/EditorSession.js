/**
 * The EditorSession object.
 */

import { StageMode } from '../constants.js';
import { EditorScene } from '../render/EditorScene.js';

/**
 * The level editor on the stage. It runs the ticks of the Editor until the stage shows another session.
 */
export class EditorSession {
	/** @type {EditorScene} The scene that draws the editor map and the brush. */
	scene;

	/** @type {import('../editor/Editor.js').Editor} The editor. */
	#editor;

	/** @type {import('../browser/InputState.js').InputState} The keys and the mouse. */
	#input;

	/**
	 * Show the editor with its current map.
	 *
	 * @param {import('../editor/Editor.js').Editor} editor The editor.
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse.
	 */
	constructor(editor, input) {
		this.#editor = editor;
		this.#input = input;
		this.scene = new EditorScene(editor);
		input.unclick();
	}

	/**
	 * Get the mode of the stage for the session.
	 *
	 * @returns {string} StageMode.EDIT.
	 */
	get mode() {
		return StageMode.EDIT;
	}

	/**
	 * Get the World with the bodies of the editor map.
	 *
	 * @returns {import('../world/World.js').World} The World of the editor.
	 */
	get world() {
		return this.#editor.world;
	}

	/**
	 * Run one tick: the input of the tick and the tick of the editor.
	 *
	 * @returns {void}
	 */
	tick() {
		this.#input.update();
		this.#input.endTick();
		this.#editor.tick(this.#input);
	}
}
