/**
 * Drawing of the transitions between levels.
 */

import { ctx } from '../canvas.js';
import { Transition } from '../constants.js';
import { TRANS } from '../game.js';
import { highscore, linesHoriz, linesVerti } from '../images.js';
import { atExit } from '../physics.js';
import { doDrawIntermission } from './menus.js';
import { game, ui } from '../state.js';

/**
 * Draw the transition at the end of a level or at its start, with the progress of the fade of the player.
 *
 * @returns {void}
 */
export function manageTransitionDraw() {
	if (atExit()) {
		// closing transition at the level end
		if (game.player.fadeNextLevel > 0) {
			drawTransitionIn();
		} else {
			if (ui.drawIntermission) {
				doDrawIntermission();
			}
		}
	} else {
		// opening transition at the level start
		if (game.player.intermissionFade < 0) {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillRect(game.offsetX - 1, game.offsetY, 512, 384);
			const a = -(game.player.intermissionFade / 20);
			game.player.intermissionFade++;
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
	if (TRANS == Transition.TOP_LEFT) {
		ctx.fillRect(game.offsetX, game.offsetY, parseInt(512 * scale), parseInt(384 * scale));
	} else if (TRANS == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(game.offsetX, game.offsetY, parseInt(512 * scale), 384);
	} else if (TRANS == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(game.offsetX, game.offsetY, 512, parseInt(384 * scale));
	} else if (TRANS == Transition.HORIZONTAL_LINES) {
		lineCount = 120 - game.player.fadeNextLevel;
		if (lineCount < linesHoriz.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(game.offsetX, game.offsetY + linesHoriz[i] * 3, 512, 3);
			}
		} else {
			ctx.fillRect(game.offsetX, game.offsetY, 512, 384);
		}
	} else if (TRANS == Transition.VERTICAL_LINES) {
		lineCount = 120 - game.player.fadeNextLevel;
		if (lineCount < linesVerti.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(game.offsetX + linesVerti[i] * 4, game.offsetY, 6, 384);
			}
		} else {
			ctx.fillRect(game.offsetX, game.offsetY, 512, 384);
		}
	} else if (TRANS == Transition.SQUARE) {
		const x = 512 - parseInt(512 * scale);
		const y = 384 - parseInt(384 * scale);
		ctx.fillRect(game.offsetX + (x >> 1), game.offsetY + (y >> 1), parseInt(512 * scale), parseInt(384 * scale));
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
	const x = 512 - parseInt(512 * scale);
	const y = 384 - parseInt(384 * scale);

	if (TRANS == Transition.TOP_LEFT) {
		ctx.fillRect(game.offsetX + x, game.offsetY + y, parseInt(512 * scale), parseInt(384 * scale));
	} else if (TRANS == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(game.offsetX + x, game.offsetY, parseInt(512 * scale), 384);
	} else if (TRANS == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(game.offsetX, game.offsetY + y, 512, parseInt(384 * scale));
	} else if (TRANS == Transition.HORIZONTAL_LINES) {
		lineCount = game.player.fadeNextLevel;
		if (lineCount < linesHoriz.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(game.offsetX, game.offsetY + linesHoriz[i] * 3, 512, 5);
			}
		} else {
			ctx.fillRect(game.offsetX, game.offsetY, 512, 384);
		}
	} else if (TRANS == Transition.VERTICAL_LINES) {
		lineCount = game.player.fadeNextLevel;
		if (lineCount < linesVerti.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(game.offsetX + linesVerti[i] * 4, game.offsetY, 6, 384);
			}
		} else {
			ctx.fillRect(game.offsetX, game.offsetY, 512, 384);
		}
	} else if (TRANS == Transition.SQUARE) {
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 384 * scale;
		ctx.strokeRect(game.offsetX, game.offsetY, 512, 384);
	}
}
