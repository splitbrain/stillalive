/**
 * The Renderer object.
 */

import { beginFrame } from '../browser/canvas.js';
import { drawCursor, drawEditorLayer } from './editor.js';
import { drawLevel, drawPreviewMap, drawTileLayer } from './game.js';
import { LayerCache } from './LayerCache.js';

/**
 * A session that the Renderer draws: a level, a preview or the editor.
 *
 * @typedef {object} DrawnSession
 * @property {import('../world/World.js').World} world The World of the session, with the screen shake.
 * @property {(renderer: Renderer) => void} draw The function that draws the session with the methods of the Renderer.
 */

/**
 * The drawing of the stage. It keeps the cached layers and the label layouts for the next frames.
 */
export class Renderer {
	/** @type {import('../browser/InputState.js').InputState} The keys and the mouse. */
	#input;

	/** @type {LayerCache} The cached background and tiles of a level or a preview. */
	#tileLayer = new LayerCache();

	/** @type {LayerCache} The cached background, tiles and bodies of the editor map. */
	#editorLayer = new LayerCache();

	/** @type {import('./game.js').LabelLayouts} The layouts of the labels that were measured with the label font. */
	#labelLayouts = new WeakMap();

	/**
	 * Create the drawing of the stage.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse, for the crosshair and the cursor.
	 */
	constructor(input) {
		this.#input = input;
	}

	/**
	 * Draw a frame of a session. Without a session, the canvas stays the same.
	 *
	 * @param {DrawnSession|null} session The session.
	 * @returns {void}
	 */
	render(session) {
		if (!session) return;
		beginFrame(session.world.effects.shakeX, session.world.effects.shakeY);
		session.draw(this);
	}

	/**
	 * Draw a level.
	 *
	 * @param {import('../world/World.js').World} world The World of the level.
	 * @returns {void}
	 */
	drawLevel(world) {
		this.#drawTileLayer(world);
		drawLevel(world, this.#input, this.#labelLayouts);
	}

	/**
	 * Draw the preview of a level or of a map.
	 *
	 * @param {import('../world/World.js').World} world The World of the preview.
	 * @returns {void}
	 */
	drawPreview(world) {
		this.#drawTileLayer(world);
		drawPreviewMap(world, this.#input);
	}

	/**
	 * Draw the editor map and the cursor. The cached editor layer holds the background, the tiles and the bodies.
	 *
	 * @param {import('../editor/Editor.js').Editor} editor The editor.
	 * @returns {void}
	 */
	drawEditor(editor) {
		this.#editorLayer.draw(editor.map, editor.background, () => drawEditorLayer(editor));
		drawCursor(editor.brush, this.#input);
	}

	/**
	 * Draw the background and the tiles of a World from the cached tile layer.
	 *
	 * @param {import('../world/World.js').World} world The World.
	 * @returns {void}
	 */
	#drawTileLayer(world) {
		this.#tileLayer.draw(world.map, world.background, () => drawTileLayer(world));
	}
}
