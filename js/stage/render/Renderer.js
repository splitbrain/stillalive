/**
 * The Renderer object.
 */

import { beginFrame, canvasGeneration, copyCanvas, drawCopy } from '../canvas.js';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from '../constants.js';
import { drawCursor, drawEditorLayer } from './editor.js';
import { drawLevel, drawPreviewMap, drawTileLayer } from './game.js';

/**
 * The map, the version of the map, the background and the canvas generation that a cached layer shows.
 *
 * @typedef {object} LayerSource
 * @property {import('../TileMap.js').TileMap} map The map.
 * @property {number} version The version of the map.
 * @property {number} background The index of the background image.
 * @property {number} generation The generation of the canvas buffer.
 */

/**
 * Get the source of a cached layer for a map, a background and the current canvas buffer.
 *
 * @param {import('../TileMap.js').TileMap} map The map.
 * @param {number} background The index of the background image.
 * @returns {LayerSource} The source.
 */
function layerSource(map, background) {
	return { map, version: map.version, background, generation: canvasGeneration() };
}

/**
 * Check if two layer sources are the same, so a cached layer of one source can show the other.
 *
 * @param {LayerSource|null} cached The source of the cached layer, or null for no cached layer.
 * @param {LayerSource} source The source to show.
 * @returns {boolean} True if the sources are the same.
 */
function isSameSource(cached, source) {
	return (
		cached != null &&
		cached.map === source.map &&
		cached.version === source.version &&
		cached.background === source.background &&
		cached.generation === source.generation
	);
}

/**
 * A session that the Renderer draws: a level, a preview or the editor.
 *
 * @typedef {object} DrawnSession
 * @property {import('../World.js').World} world The World of the session, with the screen shake.
 * @property {function(Renderer): void} draw The function that draws the session with the methods of the Renderer.
 */

/**
 * The drawing of the stage. It keeps the cached layers and the label layouts for the next frames.
 */
export class Renderer {
	/** @type {import('../InputState.js').InputState} The keys and the mouse. */
	#input;

	/** @type {OffscreenCanvas|null} The copy of the background and the tiles of a level or a preview. */
	#tileLayer = null;

	/** @type {LayerSource|null} The source of the tile layer, or null before the first copy. */
	#tileLayerSource = null;

	/** @type {OffscreenCanvas|null} The copy of the background, the tiles and the objects of the editor map. */
	#editorLayer = null;

	/** @type {LayerSource|null} The source of the editor layer, or null before the first copy. */
	#editorLayerSource = null;

	/** @type {import('./game.js').LabelLayouts} The layouts of the labels that were measured with the label font. */
	#labelLayouts = new WeakMap();

	/**
	 * Create the drawing of the stage.
	 *
	 * @param {import('../InputState.js').InputState} input The keys and the mouse, for the crosshair and the cursor.
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
		beginFrame(session.world.shakeX, session.world.shakeY);
		session.draw(this);
	}

	/**
	 * Draw a level.
	 *
	 * @param {import('../World.js').World} world The World of the level.
	 * @returns {void}
	 */
	drawLevel(world) {
		this.#drawTileLayer(world);
		drawLevel(world, this.#input, this.#labelLayouts);
	}

	/**
	 * Draw the preview of a level or of a map.
	 *
	 * @param {import('../World.js').World} world The World of the preview.
	 * @returns {void}
	 */
	drawPreview(world) {
		this.#drawTileLayer(world);
		drawPreviewMap(world, this.#input);
	}

	/**
	 * Draw the editor map and the cursor. The cached editor layer holds the background, the tiles and the objects.
	 *
	 * @param {import('../Editor.js').Editor} editor The editor.
	 * @returns {void}
	 */
	drawEditor(editor) {
		const source = layerSource(editor.map, editor.background);
		if (isSameSource(this.#editorLayerSource, source)) {
			drawCopy(this.#editorLayer, 0, 0);
		} else {
			drawEditorLayer(editor);
			this.#editorLayer = copyCanvas(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
			this.#editorLayerSource = source;
		}
		drawCursor(editor.brush, this.#input);
	}

	/**
	 * Draw the background and the tiles of a World from the cached tile layer. A new map, a change of the map or the
	 * background and a new canvas buffer draw the layer again.
	 *
	 * @param {import('../World.js').World} world The World.
	 * @returns {void}
	 */
	#drawTileLayer(world) {
		const source = layerSource(world.map, world.background);
		if (!isSameSource(this.#tileLayerSource, source)) {
			drawTileLayer(world);
			this.#tileLayer = copyCanvas(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
			this.#tileLayerSource = source;
		}
		drawCopy(this.#tileLayer, 0, 0);
	}
}
