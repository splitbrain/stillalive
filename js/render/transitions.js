/**
 * Drawing of the transitions between levels.
 */

import { ctx } from '../canvas.js';
import { Transition } from '../constants.js';
import { TRANS } from '../game.js';
import { highscore, linesHoriz, linesVerti } from '../images.js';
import { finNiveau } from '../physics.js';
import { doDrawIntermission } from './menus.js';
import { game, ui } from '../state.js';

/**
 * Draw the transition at the end of a level or at its start, with the progress of the fade of the player.
 *
 * @returns {void}
 */
export function manageTransitionDraw() {
	if (finNiveau()) {
		// closing transition at the level end
		if (game.perso.fadeNextLevel > 0) {
			drawTransitionIn();
		} else {
			if (ui.drawIntermission) {
				doDrawIntermission();
			}
		}
	} else {
		// opening transition at the level start
		if (game.perso.intermissionFade < 0) {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillRect(game.ECART_X - 1, game.ECART_Y, 512, 384);
			const a = -(game.perso.intermissionFade / 20);
			game.perso.intermissionFade++;
			ctx.globalAlpha = a;
			ctx.drawImage(highscore, game.ECART_X, game.ECART_Y);
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
	let nb, i;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	const scale = 1 - game.perso.fadeNextLevel / 120;
	if (TRANS == Transition.TOP_LEFT) {
		ctx.fillRect(game.ECART_X, game.ECART_Y, parseInt(512 * scale), parseInt(384 * scale));
	} else if (TRANS == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(game.ECART_X, game.ECART_Y, parseInt(512 * scale), 384);
	} else if (TRANS == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(game.ECART_X, game.ECART_Y, 512, parseInt(384 * scale));
	} else if (TRANS == Transition.HORIZONTAL_LINES) {
		nb = 120 - game.perso.fadeNextLevel;
		if (nb < linesHoriz.length) {
			for (i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X, game.ECART_Y + linesHoriz[i] * 3, 512, 3);
			}
		} else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	} else if (TRANS == Transition.VERTICAL_LINES) {
		nb = 120 - game.perso.fadeNextLevel;
		if (nb < linesVerti.length) {
			for (i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X + linesVerti[i] * 4, game.ECART_Y, 6, 384);
			}
		} else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	} else if (TRANS == Transition.SQUARE) {
		const x = 512 - parseInt(512 * scale);
		const y = 384 - parseInt(384 * scale);
		ctx.fillRect(game.ECART_X + (x >> 1), game.ECART_Y + (y >> 1), parseInt(512 * scale), parseInt(384 * scale));
	}
}

/**
 * Draw the opening transition of the current effect.
 *
 * @returns {void}
 */
function drawTransitionOut() {
	let nb, i;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	const scale = game.perso.fadeNextLevel / 120;
	const x = 512 - parseInt(512 * scale);
	const y = 384 - parseInt(384 * scale);

	if (TRANS == Transition.TOP_LEFT) {
		ctx.fillRect(game.ECART_X + x, game.ECART_Y + y, parseInt(512 * scale), parseInt(384 * scale));
	} else if (TRANS == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(game.ECART_X + x, game.ECART_Y, parseInt(512 * scale), 384);
	} else if (TRANS == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(game.ECART_X, game.ECART_Y + y, 512, parseInt(384 * scale));
	} else if (TRANS == Transition.HORIZONTAL_LINES) {
		nb = game.perso.fadeNextLevel;
		if (nb < linesHoriz.length) {
			for (i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X, game.ECART_Y + linesHoriz[i] * 3, 512, 5);
			}
		} else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	} else if (TRANS == Transition.VERTICAL_LINES) {
		nb = game.perso.fadeNextLevel;
		if (nb < linesVerti.length) {
			for (i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X + linesVerti[i] * 4, game.ECART_Y, 6, 384);
			}
		} else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	} else if (TRANS == Transition.SQUARE) {
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 384 * scale;
		ctx.strokeRect(game.ECART_X, game.ECART_Y, 512, 384);
	}
}
