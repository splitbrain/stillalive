/**
 * Drawing of the transitions between levels.
 */

import { ctx } from '../canvas.js';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, Transition } from '../constants.js';
import { linesHoriz, linesVerti } from '../images.js';
import { atExit } from '../physics.js';
import { game, ui } from '../state.js';

/**
 * Draw the transition at the end of a level or at its start, with the progress of the fade of the player. In the
 * exit freeze after the level end, the playfield is black.
 *
 * @returns {void}
 */
export function drawTransition() {
	if (atExit()) {
		// closing transition at the level end
		if (game.player.fadeNextLevel > 0) {
			drawTransitionIn();
		} else {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (game.player.fadeNextLevel > 0) {
		// opening transition at the level start
		drawTransitionOut();
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
		ctx.fillRect(0, 0, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(0, 0, Math.trunc(PLAYFIELD_WIDTH * scale), PLAYFIELD_HEIGHT);
	} else if (ui.transition == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.HORIZONTAL_LINES) {
		lineCount = 120 - game.player.fadeNextLevel;
		if (lineCount < linesHoriz.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(0, linesHoriz[i] * 3, PLAYFIELD_WIDTH, 3);
			}
		} else {
			ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.VERTICAL_LINES) {
		lineCount = 120 - game.player.fadeNextLevel;
		if (lineCount < linesVerti.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(linesVerti[i] * 4, 0, 6, PLAYFIELD_HEIGHT);
			}
		} else {
			ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.SQUARE) {
		const x = PLAYFIELD_WIDTH - Math.trunc(PLAYFIELD_WIDTH * scale);
		const y = PLAYFIELD_HEIGHT - Math.trunc(PLAYFIELD_HEIGHT * scale);
		ctx.fillRect(x >> 1, y >> 1, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
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
		ctx.fillRect(x, y, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(x, 0, Math.trunc(PLAYFIELD_WIDTH * scale), PLAYFIELD_HEIGHT);
	} else if (ui.transition == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(0, y, PLAYFIELD_WIDTH, Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.HORIZONTAL_LINES) {
		lineCount = game.player.fadeNextLevel;
		if (lineCount < linesHoriz.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(0, linesHoriz[i] * 3, PLAYFIELD_WIDTH, 5);
			}
		} else {
			ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.VERTICAL_LINES) {
		lineCount = game.player.fadeNextLevel;
		if (lineCount < linesVerti.length) {
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(linesVerti[i] * 4, 0, 6, PLAYFIELD_HEIGHT);
			}
		} else {
			ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.SQUARE) {
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = PLAYFIELD_HEIGHT * scale;
		ctx.strokeRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}
}
