/**
 * Drawing of the HUD texts and the replay keys.
 */

import { ctx } from '../canvas.js';
import { KEY_CLEAR, KEY_DOWN, KEY_JUMP, KEY_LEFT, KEY_RIGHT, MOUSE_LEFT, MOUSE_RIGHT } from '../constants.js';
import { key, mouseIcon } from '../images.js';
import { keyLabels } from '../keys.js';
import { prepareTextLines } from '../robotText.js';
import { game, input, ui } from '../state.js';

/**
 * Draw the pressed keys and mouse buttons during a replay.
 *
 * @returns {void}
 */
export function drawKeys() {
	ctx.font = 'bold 12px Arial';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	const w = KEY_JUMP & input.keys ? 1 : 0;
	const a = KEY_LEFT & input.keys ? 1 : 0;
	const d = KEY_RIGHT & input.keys ? 1 : 0;
	const e = KEY_CLEAR & input.keys ? 1 : 0;
	const s = KEY_DOWN & input.keys ? 1 : 0;
	const ml = MOUSE_LEFT & input.keys ? 1 : 0;
	const mr = MOUSE_RIGHT & input.keys ? 1 : 0;

	ctx.textAlign = 'center';
	ctx.drawImage(key, 0, w * 24, 24, 24, 525, 485, 24, 24);
	ctx.fillText(keyLabels.KeyW, 525 + 12, 485 + 16);
	ctx.drawImage(key, 0, e * 24, 24, 24, 525 + 26, 485, 24, 24);
	ctx.fillText(keyLabels.KeyE, 525 + 26 + 12, 485 + 16);
	ctx.drawImage(key, 0, a * 24, 24, 24, 525 - 26, 485 + 26, 24, 24);
	ctx.fillText(keyLabels.KeyA, 525 - 26 + 12, 485 + 26 + 16);
	ctx.drawImage(key, 0, s * 24, 24, 24, 525, 485 + 26, 24, 24);
	ctx.fillText(keyLabels.KeyS, 525 + 12, 485 + 26 + 16);
	ctx.drawImage(key, 0, d * 24, 24, 24, 525 + 26, 485 + 26, 24, 24);
	ctx.fillText(keyLabels.KeyD, 525 + 26 + 12, 485 + 26 + 16);
	ctx.textAlign = 'left';

	ctx.drawImage(mouseIcon, 0, ml * 40, 24, 40, 525 - 26 - 26, 485, 24, 40);
	ctx.drawImage(mouseIcon, 0, mr * 40, 24, 40, 525 + 26 + 26, 485, 24, 40);
}

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
 * Draw the life, the cakes left, the steps and the number of portal shots in the HUD.
 *
 * @returns {void}
 */
export function drawHudText() {
	ctx.font = 'bold 14px Arial';
	ctx.fillStyle = 'rgb(255, 255, 255)';

	ctx.fillText((game.player.life >> 8 > 0 ? game.player.life >> 8 : 0) + '', 20, 150);
	ctx.fillText(game.cakesLeft + '', 26, 215);
	ctx.fillText((game.steps >> 8) + '', 26, 275);
	ctx.fillText(game.portalShots + '', 26, 335);
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
	ctx.fillRect(game.offsetX + x, game.offsetY + y, w, h);

	ctx.lineWidth = 4;
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.strokeRect(game.offsetX + x, game.offsetY + y, w, h);
	ctx.font = '16px Arial';
}
