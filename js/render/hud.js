/**
 * Drawing of the HUD texts and the replay keys.
 */

import { ctx } from '../canvas.js';
import { KEY_CLEAR, KEY_DOWN, KEY_JUMP, KEY_LEFT, KEY_RIGHT, MOUSE_LEFT, MOUSE_RIGHT, Menu } from '../constants.js';
import { key, mouseIcon } from '../images.js';
import { campaigns } from '../level.js';
import { game, input, ui } from '../state.js';

/**
 * Draw the pressed keys and mouse buttons during a replay.
 *
 * @returns {void}
 */
export function drawKeys() {
	ctx.font = 'bold 12px Arial';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	const z = KEY_JUMP & input.keys ? 1 : 0;
	const q = KEY_LEFT & input.keys ? 1 : 0;
	const d = KEY_RIGHT & input.keys ? 1 : 0;
	const e = KEY_CLEAR & input.keys ? 1 : 0;
	const s = KEY_DOWN & input.keys ? 1 : 0;
	const ml = MOUSE_LEFT & input.keys ? 1 : 0;
	const mr = MOUSE_RIGHT & input.keys ? 1 : 0;

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
 * Wrap the text of the current level into lines, if the lines are empty. The tutorial sets its own lines.
 *
 * @returns {void}
 */
function prepareTextLines() {
	if (ui.txtLines.length > 0 || ui.currentMenu == Menu.TUTORIAL) return;
	ctx.font = '13px Arial';
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

/**
 * Advance the typewriter effect of the robot text while the text is on the screen.
 *
 * @returns {void}
 */
export function updateText() {
	const visible = ui.currentMenu == Menu.TUTORIAL || game.player.fadeNextLevel == -1;
	if (!visible) return;
	prepareTextLines();
	let toWrite = parseInt(ui.timeWriting);
	if (toWrite >= 0) {
		for (const line of ui.txtLines) {
			if (line.length < toWrite) toWrite -= line.length;
			else return advanceText();
		}
		ui.timeWriting = -1;
	}
	advanceText();
}

/**
 * Advance the typewriter effect by one tick.
 *
 * @returns {void}
 */
function advanceText() {
	if (ui.timeWriting >= 0 && !ui.escapeMenu) ui.timeWriting += 0.75;
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

	let toWrite = parseInt(ui.timeWriting);

	for (i in ui.txtLines) {
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
	ctx.fillText(game.CAKELEFT + '', 26, 215);
	ctx.fillText((game.STEPS >> 8) + '', 26, 275);
	ctx.fillText(game.PORTALS + '', 26, 335);
}
