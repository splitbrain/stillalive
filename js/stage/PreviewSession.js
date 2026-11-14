/**
 * The PreviewSession object.
 */

import { World } from './World.js';

/**
 * The still picture of a level or of a map.
 */
export class PreviewSession {
	/** @type {World} The World of the preview. */
	world;

	/** @type {import('./InputState.js').InputState} The keys and the mouse. */
	#input;

	/**
	 * Create the preview of a level or of a map.
	 *
	 * @param {{tiles: number[], bg: number, boss?: number, fromBelow?: boolean}} level The level or the map.
	 * @param {import('./InputState.js').InputState} input The keys and the mouse.
	 */
	constructor(level, input) {
		this.world = World.forPreview(level);
		this.#input = input;
	}

	/**
	 * Get the mode text of the session.
	 *
	 * @returns {string} "preview".
	 */
	get mode() {
		return 'preview';
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

	/**
	 * Draw the preview.
	 *
	 * @param {import('./render/Renderer.js').Renderer} renderer The drawing of the stage.
	 * @returns {void}
	 */
	draw(renderer) {
		renderer.drawPreview(this.world);
	}
}
