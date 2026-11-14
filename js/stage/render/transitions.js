/**
 * Drawing of the transitions between levels.
 */

import { ctx } from '../canvas.js';
import { FADE_START, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, Transition } from '../constants.js';
import { linesHoriz, linesVerti } from '../images.js';
import { game, ui } from '../state.js';

/**
 * Draw the transition of the level phase with the progress of the fade. While an exit event waits and in the exit
 * freeze after the level end, the playfield is black.
 *
 * @returns {void}
 */
export function drawTransition() {
	if (game.isOpening()) {
		drawOpeningTransition();
	} else if (game.isClosing()) {
		drawClosingTransition();
	} else if (game.isExitWait() || game.isEnded()) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}
}

/**
 * Draw the closing transition of the current effect.
 *
 * @returns {void}
 */
function drawClosingTransition() {
	let lineCount, i;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	const scale = 1 - game.fade / FADE_START;
	if (ui.transition == Transition.TOP_LEFT) {
		ctx.fillRect(0, 0, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(0, 0, Math.trunc(PLAYFIELD_WIDTH * scale), PLAYFIELD_HEIGHT);
	} else if (ui.transition == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.HORIZONTAL_LINES) {
		lineCount = Math.round(scale * linesHoriz.length);
		for (i = 0; i < lineCount; i++) {
			ctx.fillRect(0, linesHoriz[i] * 3, PLAYFIELD_WIDTH, 3);
		}
	} else if (ui.transition == Transition.VERTICAL_LINES) {
		lineCount = Math.round(scale * linesVerti.length);
		for (i = 0; i < lineCount; i++) {
			ctx.fillRect(linesVerti[i] * 4, 0, 6, PLAYFIELD_HEIGHT);
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
function drawOpeningTransition() {
	let lineCount, i;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	const scale = game.fade / FADE_START;
	const x = PLAYFIELD_WIDTH - Math.trunc(PLAYFIELD_WIDTH * scale);
	const y = PLAYFIELD_HEIGHT - Math.trunc(PLAYFIELD_HEIGHT * scale);

	if (ui.transition == Transition.TOP_LEFT) {
		ctx.fillRect(x, y, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.LEFT_TO_RIGHT) {
		ctx.fillRect(x, 0, Math.trunc(PLAYFIELD_WIDTH * scale), PLAYFIELD_HEIGHT);
	} else if (ui.transition == Transition.TOP_TO_BOTTOM) {
		ctx.fillRect(0, y, PLAYFIELD_WIDTH, Math.trunc(PLAYFIELD_HEIGHT * scale));
	} else if (ui.transition == Transition.HORIZONTAL_LINES) {
		lineCount = Math.round(scale * linesHoriz.length);
		for (i = 0; i < lineCount; i++) {
			ctx.fillRect(0, linesHoriz[i] * 3, PLAYFIELD_WIDTH, 5);
		}
	} else if (ui.transition == Transition.VERTICAL_LINES) {
		lineCount = Math.round(scale * linesVerti.length);
		for (i = 0; i < lineCount; i++) {
			ctx.fillRect(linesVerti[i] * 4, 0, 6, PLAYFIELD_HEIGHT);
		}
	} else if (ui.transition == Transition.SQUARE) {
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = PLAYFIELD_HEIGHT * scale;
		ctx.strokeRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}
}
