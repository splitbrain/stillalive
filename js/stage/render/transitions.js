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
 * Draw the first part of the rows of the line transitions, in their random order.
 *
 * @param {number} scale The part of the rows to draw, from 0 to 1.
 * @param {number} height The height of a row in pixels.
 * @returns {void}
 */
function drawRows(scale, height) {
	for (const row of lineOrder.slice(0, Math.round(scale * lineOrder.length))) {
		ctx.fillRect(0, row * 3, PLAYFIELD_WIDTH, height);
	}
}

/**
 * Draw the first part of the columns of the line transitions, in their random order.
 *
 * @param {number} scale The part of the columns to draw, from 0 to 1.
 * @returns {void}
 */
function drawColumns(scale) {
	for (const column of lineOrder.slice(0, Math.round(scale * lineOrder.length))) {
		ctx.fillRect(column * 4, 0, 6, PLAYFIELD_HEIGHT);
	}
}

/**
 * Draw the closing transition of the current effect.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawClosingTransition(world) {
	ctx.fillStyle = 'rgb(0, 0, 0)';
	const scale = 1 - world.fade / FADE_START;
	const width = Math.trunc(PLAYFIELD_WIDTH * scale);
	const height = Math.trunc(PLAYFIELD_HEIGHT * scale);
	switch (world.transition) {
		case Transition.TOP_LEFT:
			ctx.fillRect(0, 0, width, height);
			break;
		case Transition.LEFT_TO_RIGHT:
			ctx.fillRect(0, 0, width, PLAYFIELD_HEIGHT);
			break;
		case Transition.TOP_TO_BOTTOM:
			ctx.fillRect(0, 0, PLAYFIELD_WIDTH, height);
			break;
		case Transition.HORIZONTAL_LINES:
			drawRows(scale, 3);
			break;
		case Transition.VERTICAL_LINES:
			drawColumns(scale);
			break;
		case Transition.SQUARE:
			ctx.fillRect((PLAYFIELD_WIDTH - width) >> 1, (PLAYFIELD_HEIGHT - height) >> 1, width, height);
			break;
	}
}

/**
 * Draw the opening transition of the current effect.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawOpeningTransition(world) {
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	const scale = world.fade / FADE_START;
	const width = Math.trunc(PLAYFIELD_WIDTH * scale);
	const height = Math.trunc(PLAYFIELD_HEIGHT * scale);
	const x = PLAYFIELD_WIDTH - width;
	const y = PLAYFIELD_HEIGHT - height;

	switch (world.transition) {
		case Transition.TOP_LEFT:
			ctx.fillRect(x, y, width, height);
			break;
		case Transition.LEFT_TO_RIGHT:
			ctx.fillRect(x, 0, width, PLAYFIELD_HEIGHT);
			break;
		case Transition.TOP_TO_BOTTOM:
			ctx.fillRect(0, y, PLAYFIELD_WIDTH, height);
			break;
		case Transition.HORIZONTAL_LINES:
			drawRows(scale, 5);
			break;
		case Transition.VERTICAL_LINES:
			drawColumns(scale);
			break;
		case Transition.SQUARE:
			ctx.lineWidth = PLAYFIELD_HEIGHT * scale;
			ctx.strokeRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
			break;
	}
}
