/**
 * Drawing of the transitions between levels.
 */

import { ctx } from '../canvas.js';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, Transition } from '../constants.js';
import { highscore, linesHoriz, linesVerti } from '../images.js';
import { atExit } from '../physics.js';
import { drawIntermission } from './menus.js';
import { game, ui } from '../state.js';

/**
 * Draw the transition at the end of a level or at its start, with the progress of the fade of the player.
 *
 * @returns {void}
 */
export function drawTransition() {
	if (atExit()) {
		// closing transition at the level end
		if (game.player.fadeNextLevel > 0) {
			drawTransitionIn();
		} else if (ui.drawIntermission) {
			drawIntermission();
		}
	} else {
		// opening transition at the level start
		if (game.player.intermissionFade < 0) {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillRect(game.offsetX - 1, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
			const a = -(game.player.intermissionFade / 20);
			ctx.globalAlpha = a;
			ctx.drawImage(highscore, game.offsetX, game.offsetY);
			ctx.globalAlpha = 1;
		} else drawTransitionOut();
	}
}

/**
 * Draw the closing transition of the current effect.
 *
 * @returns {void}
 */
function drawTransitionIn() {
	let lineCount, i;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	const scale = 1 - game.player.fadeNextLevel / 120;
	if (ui.transition == Transition.TOP_LEFT) {
		ctx.fillRect(game.offsetX, game.offsetY, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(game.offsetX, game.offsetY, Math.trunc(PLAYFIELD_WIDTH * scale), PLAYFIELD_HEIGHT);
	} else if (ui.transition == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.HORIZONTAL_LINES) {
		lineCount = 120 - game.player.fadeNextLevel;
		if (lineCount < linesHoriz.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(game.offsetX, game.offsetY + linesHoriz[i] * 3, PLAYFIELD_WIDTH, 3);
			}
		} else {
			ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.VERTICAL_LINES) {
		lineCount = 120 - game.player.fadeNextLevel;
		if (lineCount < linesVerti.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(game.offsetX + linesVerti[i] * 4, game.offsetY, 6, PLAYFIELD_HEIGHT);
			}
		} else {
			ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.SQUARE) {
		const x = PLAYFIELD_WIDTH - Math.trunc(PLAYFIELD_WIDTH * scale);
		const y = PLAYFIELD_HEIGHT - Math.trunc(PLAYFIELD_HEIGHT * scale);
		ctx.fillRect(
			game.offsetX + (x >> 1),
			game.offsetY + (y >> 1),
			Math.trunc(PLAYFIELD_WIDTH * scale),
			Math.trunc(PLAYFIELD_HEIGHT * scale),
		);
	}
}

/**
 * Draw the opening transition of the current effect.
 *
 * @returns {void}
 */
function drawTransitionOut() {
	let lineCount, i;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	const scale = game.player.fadeNextLevel / 120;
	const x = PLAYFIELD_WIDTH - Math.trunc(PLAYFIELD_WIDTH * scale);
	const y = PLAYFIELD_HEIGHT - Math.trunc(PLAYFIELD_HEIGHT * scale);

	if (ui.transition == Transition.TOP_LEFT) {
		ctx.fillRect(
			game.offsetX + x,
			game.offsetY + y,
			Math.trunc(PLAYFIELD_WIDTH * scale),
			Math.trunc(PLAYFIELD_HEIGHT * scale),
		);
	} else if (ui.transition == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(game.offsetX + x, game.offsetY, Math.trunc(PLAYFIELD_WIDTH * scale), PLAYFIELD_HEIGHT);
	} else if (ui.transition == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(game.offsetX, game.offsetY + y, PLAYFIELD_WIDTH, Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.HORIZONTAL_LINES) {
		lineCount = game.player.fadeNextLevel;
		if (lineCount < linesHoriz.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(game.offsetX, game.offsetY + linesHoriz[i] * 3, PLAYFIELD_WIDTH, 5);
			}
		} else {
			ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.VERTICAL_LINES) {
		lineCount = game.player.fadeNextLevel;
		if (lineCount < linesVerti.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(game.offsetX + linesVerti[i] * 4, game.offsetY, 6, PLAYFIELD_HEIGHT);
			}
		} else {
			ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.SQUARE) {
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = PLAYFIELD_HEIGHT * scale;
		ctx.strokeRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}
}
