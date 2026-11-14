/**
 * Drawing of the transitions between levels.
 */

import { ctx } from '../canvas.js';
import { FADE_START, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, Transition } from '../constants.js';
import { lineOrder } from '../images.js';

/**
 * Draw the transition of the level phase with the progress of the fade. While an exit event waits and in the exit
 * freeze after the level end, the playfield is black.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function drawTransition(world) {
	if (world.isOpening()) {
		drawOpeningTransition(world);
	} else if (world.isClosing()) {
		drawClosingTransition(world);
	} else if (world.isExitWait() || world.isEnded()) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}
}

/**
 * Draw the closing transition of the current effect.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawClosingTransition(world) {
	let lineCount, i;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	const scale = 1 - world.fade / FADE_START;
	switch (world.transition) {
		case Transition.TOP_LEFT:
			ctx.fillRect(0, 0, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
			break;
		case Transition.LEFT_TO_RIGHT:
			ctx.fillRect(0, 0, Math.trunc(PLAYFIELD_WIDTH * scale), PLAYFIELD_HEIGHT);
			break;
		case Transition.TOP_TO_BOTTOM:
			ctx.fillRect(0, 0, PLAYFIELD_WIDTH, Math.trunc(PLAYFIELD_HEIGHT * scale));
			break;
		case Transition.HORIZONTAL_LINES:
			lineCount = Math.round(scale * lineOrder.length);
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(0, lineOrder[i] * 3, PLAYFIELD_WIDTH, 3);
			}
			break;
		case Transition.VERTICAL_LINES:
			lineCount = Math.round(scale * lineOrder.length);
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(lineOrder[i] * 4, 0, 6, PLAYFIELD_HEIGHT);
			}
			break;
		case Transition.SQUARE: {
			const x = PLAYFIELD_WIDTH - Math.trunc(PLAYFIELD_WIDTH * scale);
			const y = PLAYFIELD_HEIGHT - Math.trunc(PLAYFIELD_HEIGHT * scale);
			ctx.fillRect(x >> 1, y >> 1, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
			break;
		}
	}
}

/**
 * Draw the opening transition of the current effect.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawOpeningTransition(world) {
	let lineCount, i;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	const scale = world.fade / FADE_START;
	const x = PLAYFIELD_WIDTH - Math.trunc(PLAYFIELD_WIDTH * scale);
	const y = PLAYFIELD_HEIGHT - Math.trunc(PLAYFIELD_HEIGHT * scale);

	switch (world.transition) {
		case Transition.TOP_LEFT:
			ctx.fillRect(x, y, Math.trunc(PLAYFIELD_WIDTH * scale), Math.trunc(PLAYFIELD_HEIGHT * scale));
			break;
		case Transition.LEFT_TO_RIGHT:
			ctx.fillRect(x, 0, Math.trunc(PLAYFIELD_WIDTH * scale), PLAYFIELD_HEIGHT);
			break;
		case Transition.TOP_TO_BOTTOM:
			ctx.fillRect(0, y, PLAYFIELD_WIDTH, Math.trunc(PLAYFIELD_HEIGHT * scale));
			break;
		case Transition.HORIZONTAL_LINES:
			lineCount = Math.round(scale * lineOrder.length);
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(0, lineOrder[i] * 3, PLAYFIELD_WIDTH, 5);
			}
			break;
		case Transition.VERTICAL_LINES:
			lineCount = Math.round(scale * lineOrder.length);
			for (i = 0; i < lineCount; i++) {
				ctx.fillRect(lineOrder[i] * 4, 0, 6, PLAYFIELD_HEIGHT);
			}
			break;
		case Transition.SQUARE:
			ctx.strokeStyle = 'rgb(0, 0, 0)';
			ctx.lineWidth = PLAYFIELD_HEIGHT * scale;
			ctx.strokeRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
			break;
	}
}
