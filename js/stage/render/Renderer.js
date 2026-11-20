/**
 * The Renderer object.
 */

import { beginFrame } from '../browser/canvas.js';
import { drawCursor, drawEditorLayer } from './editor.js';
import { LayerCache } from './LayerCache.js';
import { Scene } from './Scene.js';
import {
	CakePainter,
	CratePainter,
	GravPipePainter,
	PlasmaPainter,
	PlatformPainter,
	TurretPainter,
} from './painters/bodies.js';
import { BossPainter, RazorWheelPainter, TubePainter } from './painters/boss.js';
import { CrosshairPainter } from './painters/cursors.js';
import { CameraPainter, DeathFadePainter, SparklePainter } from './painters/effects.js';
import { LabelPainter } from './painters/labels.js';
import { PlayerPainter } from './painters/player.js';
import { FrontTilePainter, PortalPainter } from './painters/portals.js';
import { AnimatedTilePainter, TileLayerPainter } from './painters/tiles.js';
import { TransitionPainter } from './painters/transitions.js';

/**
 * A session that the Renderer draws: a level, a preview or the editor.
 *
 * @typedef {object} DrawnSession
 * @property {import('../world/World.js').World} world The World of the session, with the screen shake.
 * @property {(renderer: Renderer) => void} draw The function that draws the session with the methods of the Renderer.
 */

/**
 * The drawing of the stage with the scenes of a level and of a preview.
 */
export class Renderer {
	/** @type {import('../browser/InputState.js').InputState} The keys and the mouse. */
	#input;

	/** @type {Scene} The draw order of a level. */
	#level;

	/** @type {Scene} The draw order of a preview. */
	#preview;

	/** @type {LayerCache} The cached background, tiles and bodies of the editor map. */
	#editorLayer = new LayerCache();

	/**
	 * Create the drawing of the stage.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse, for the crosshair and the cursor.
	 */
	constructor(input) {
		this.#input = input;
		// the level and the preview share the cached tile layer
		const tileLayer = new TileLayerPainter();
		this.#level = new Scene([
			tileLayer,
			new AnimatedTilePainter(),
			new GravPipePainter(),
			new PlayerPainter({ pose: 'aim', input }),
			new CakePainter(),
			new TurretPainter(),
			new PlasmaPainter(),
			new SparklePainter(),
			new CratePainter(),
			new BossPainter(),
			new RazorWheelPainter(),
			new TubePainter(),
			new PlatformPainter({ arrows: false }),
			new FrontTilePainter(),
			new PortalPainter(),
			new CameraPainter(),
			new LabelPainter(),
			new DeathFadePainter(),
			new TransitionPainter(),
			new CrosshairPainter(input),
		]);
		this.#preview = new Scene([
			tileLayer,
			new PlayerPainter({ pose: 'still' }),
			new CakePainter(),
			new TurretPainter(),
			new CratePainter(),
			new PlatformPainter({ arrows: false }),
			new GravPipePainter(),
			new TubePainter(),
			new BossPainter(),
			new CrosshairPainter(input),
		]);
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
		this.#level.draw(world);
	}

	/**
	 * Draw the preview of a level or of a map.
	 *
	 * @param {import('../world/World.js').World} world The World of the preview.
	 * @returns {void}
	 */
	drawPreview(world) {
		this.#preview.draw(world);
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
}
