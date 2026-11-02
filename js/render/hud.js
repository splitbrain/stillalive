/**
 * Drawing of the HUD texts and the replay keys.
 */

import { ctx } from '../canvas.js';
import { KEY_D, KEY_E, KEY_Q, KEY_S, KEY_Z, MSE_L, MSE_R, Menu } from '../constants.js';
import { key, mouseIcon } from '../images.js';
import { campaigns } from '../level.js';
import { game, input, settings, ui } from '../state.js';

/**
 * Draw the pressed keys and mouse buttons during a replay.
 *
 * @returns {void}
 */
export function drawKeys() {
	ctx.font = 'bold 12px Arial';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	const z = KEY_Z & input.keys ? 1 : 0;
	const q = KEY_Q & input.keys ? 1 : 0;
	const d = KEY_D & input.keys ? 1 : 0;
	const e = KEY_E & input.keys ? 1 : 0;
	const s = KEY_S & input.keys ? 1 : 0;
	const ml = MSE_L & input.keys ? 1 : 0;
	const mr = MSE_R & input.keys ? 1 : 0;

	ctx.drawImage(key, 0, z * 24, 24, 24, 525, 485, 24, 24);
	ctx.fillText('Z', 525 + 6, 485 + 16);
	ctx.drawImage(key, 0, e * 24, 24, 24, 525 + 26, 485, 24, 24);
	ctx.fillText('E', 525 + 26 + 6, 485 + 16);
	ctx.drawImage(key, 0, q * 24, 24, 24, 525 - 26, 485 + 26, 24, 24);
	ctx.fillText('Q', 525 - 26 + 6, 485 + 26 + 16);
	ctx.drawImage(key, 0, s * 24, 24, 24, 525, 485 + 26, 24, 24);
	ctx.fillText('S', 525 + 6, 485 + 26 + 16);
	ctx.drawImage(key, 0, d * 24, 24, 24, 525 + 26, 485 + 26, 24, 24);
	ctx.fillText('D', 525 + 26 + 6, 485 + 26 + 16);

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
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.font = '13px Arial';
	if (ui.txtLines.length == 0 && ui.currentMenu != Menu.TUTORIAL) {
		const txt = campaigns[ui.campaign].texts[ui.currentLevel - 1];
		let l = 0;
		let line = '';
		while (l < txt.length) {
			let word = '';
			while (txt[l] != ' ' && l < txt.length) {
				word += txt[l];
				l++;
			}
			const metrics = ctx.measureText(line + ' ' + word);
			if (metrics.width < 447) {
				line += word + ' ';
			} else {
				ui.txtLines.push(line);
				line = word + ' ';
			}
			l++;
		}
		ui.txtLines.push(line);
	}

	let toWrite = parseInt(ui.timeWriting);

	for (i in ui.txtLines) {
		if (toWrite >= 0 && settings.quality > 0) {
			if (ui.txtLines[i].length < toWrite) {
				ctx.fillText(ui.txtLines[i], x, y + i * size);
				toWrite -= ui.txtLines[i].length;
				if (i == ui.txtLines.length - 1) {
					ui.timeWriting = -1;
				}
			} else if (toWrite != 0) {
				ctx.fillText(ui.txtLines[i].substring(0, toWrite), x, y + i * size);
				toWrite = 0;
			}
		} else {
			ctx.fillText(ui.txtLines[i], x, y + i * size);
		}
	}

	if (ui.timeWriting >= 0 && !ui.escapeMenu) ui.timeWriting += 0.75;
}

/**
 * Draw the life, the cakes left, the steps and the number of portal shots in the HUD.
 *
 * @returns {void}
 */
export function drawHudText() {
	ctx.font = 'bold 14px Arial';
	ctx.fillStyle = 'rgb(255, 255, 255)';

	ctx.fillText((game.perso.vie >> 8 > 0 ? game.perso.vie >> 8 : 0) + '', 20, 150);
	ctx.fillText(game.CAKELEFT + '', 26, 215);
	ctx.fillText((game.STEPS >> 8) + '', 26, 275);
	ctx.fillText(game.PORTALS + '', 26, 335);
}
