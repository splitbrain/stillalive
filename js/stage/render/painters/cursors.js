/**
 * The painters of the mouse cursors.
 */

import { drawImage } from '../../browser/canvas.js';
import { crosshair } from '../../browser/images.js';

/**
 * The painter of the crosshair at the mouse.
 */
export class CrosshairPainter {
	/** @type {import('../../browser/InputState.js').InputState} The mouse position. */
	#input;

	/**
	 * Create the painter of the crosshair.
	 *
	 * @param {import('../../browser/InputState.js').InputState} input The mouse position.
	 */
	constructor(input) {
		this.#input = input;
	}

	/**
	 * Draw the crosshair at the mouse.
	 *
	 * @returns {void}
	 */
	draw() {
		drawImage(crosshair, this.#input.mouseX - 8, this.#input.mouseY - 8, 16, 16);
	}
}
