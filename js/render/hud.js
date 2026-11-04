/**
 * Drawing of the texts in the robot panel and of the text boxes on the playfield.
 */

import { ctx } from '../canvas.js';
import { prepareTextLines } from '../robotText.js';
import { ui } from '../state.js';

/**
 * Draw the text of the robot panel line by line, with a typewriter effect for the current line.
 *
 * @param {number} x The x coordinate of the text in canvas pixels.
 * @param {number} y The y coordinate of the first line in canvas pixels.
 * @param {number} size The line height in pixels.
 * @returns {void}
 */
export function drawText(x, y, size) {
	let i;
	prepareTextLines();
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.font = '13px Arial';

	let toWrite = Math.trunc(ui.timeWriting);

	for (i = 0; i < ui.txtLines.length; i++) {
		if (toWrite >= 0) {
			if (ui.txtLines[i].length < toWrite) {
				ctx.fillText(ui.txtLines[i], x, y + i * size);
				toWrite -= ui.txtLines[i].length;
			} else if (toWrite != 0) {
				ctx.fillText(ui.txtLines[i].substring(0, toWrite), x, y + i * size);
				toWrite = 0;
			}
		} else {
			ctx.fillText(ui.txtLines[i], x, y + i * size);
		}
	}
}

/**
 * Draw a text box on the playfield and set the font and the color for the text.
 *
 * @param {number} x The left edge in playfield pixels.
 * @param {number} y The top edge in playfield pixels.
 * @param {number} w The width in pixels.
 * @param {number} h The height in pixels.
 * @returns {void}
 */
export function prepareTxt(x, y, w, h) {
	ctx.fillStyle = 'rgb(7, 49, 63)';
	ctx.fillRect(x, y, w, h);

	ctx.lineWidth = 4;
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.strokeRect(x, y, w, h);
	ctx.font = '16px Arial';
}
