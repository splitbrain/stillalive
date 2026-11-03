/**
 * The text of the robot panel: the line wrap and the typewriter effect.
 */

import { ctx } from './canvas.js';
import { Menu } from './constants.js';
import { campaigns } from './level.js';
import { game, ui } from './state.js';

/**
 * Wrap the text of the current level into lines, if the lines are empty. The tutorial sets its own lines.
 *
 * @returns {void}
 */
export function prepareTextLines() {
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
	let toWrite = Math.trunc(ui.timeWriting);
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
