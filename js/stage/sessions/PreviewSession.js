/**
 * The PreviewSession object.
 */

import { beginFrame } from '../browser/canvas.js';
import { StageMode } from '../constants.js';
import { PreviewScene } from '../render/PreviewScene.js';
import { World } from '../world/World.js';

/**
 * The still picture of a level or of a map.
 */
export class PreviewSession {
	/** @type {World} The World of the preview. */
	world;

	/** @type {PreviewScene} The scene that draws the World of the preview. */
	scene;

	/** @type {import('../browser/InputState.js').InputState} The keys and the mouse. */
	#input;

	/**
	 * Create the preview of a level or of a map.
	 *
	 * @param {{tiles: number[], bg: number, boss?: number}} level The level or the map.
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse.
	 */
	constructor(level, input) {
		this.world = World.forPreview(level);
		this.scene = new PreviewScene();
		this.#input = input;
	}

	/**
	 * Get the mode of the stage for the session.
	 *
	 * @returns {string} StageMode.PREVIEW.
	 */
	get mode() {
		return StageMode.PREVIEW;
	}

	/**
	 * Draw a frame of the World with the shake of its effects.
	 *
	 * @returns {void}
	 */
	draw() {
		beginFrame(this.world.effects.shakeX, this.world.effects.shakeY);
		this.scene.draw(this.world);
	}

	/**
	 * Run one tick. Only the input changes, and the picture stays the same.
	 *
	 * @returns {void}
	 */
	tick() {
		this.#input.update();
		this.#input.endTick();
	}
}
