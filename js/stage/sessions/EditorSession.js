/**
 * The EditorSession object.
 */

import { beginFrame } from '../browser/canvas.js';
import { StageMode } from '../constants.js';
import { EditorScene } from '../render/EditorScene.js';

/**
 * The level editor on the stage. It runs the ticks of the Editor until the stage shows another session.
 */
export class EditorSession {
	/** @type {EditorScene} The scene that draws the editor map and the brush. */
	scene = new EditorScene();

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
	 * Draw a frame of the editor without a shake.
	 *
	 * @returns {void}
	 */
	draw() {
		beginFrame(0, 0);
		this.scene.draw(this.#editor);
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
