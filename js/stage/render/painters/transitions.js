/**
 * The TransitionPainter object.
 */

import { ctx } from '../../browser/canvas.js';
import { FADE_START, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, Transition } from '../../constants.js';
import { lineOrder } from '../../browser/images.js';

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
 * The painter of the transitions between levels.
 */
export class TransitionPainter {
	/**
	 * Draw the transition of the level phase with the progress of the fade. While an exit event waits and in the exit
	 * freeze after the level end, the playfield is black.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		const phase = world.phase;
		if (phase.isOpening()) {
			this.#drawOpening(phase);
		} else if (phase.isClosing()) {
			this.#drawClosing(phase);
		} else if (phase.isExitWait() || phase.isEnded()) {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		}
	}

	/**
	 * Draw the closing transition of the current effect.
	 *
	 * @param {import('../../world/LevelPhase.js').LevelPhase} phase The phase of the level.
	 * @returns {void}
	 */
	#drawClosing(phase) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
		const scale = 1 - phase.fade / FADE_START;
		const width = Math.trunc(PLAYFIELD_WIDTH * scale);
		const height = Math.trunc(PLAYFIELD_HEIGHT * scale);
		switch (phase.transition) {
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
	 * @param {import('../../world/LevelPhase.js').LevelPhase} phase The phase of the level.
	 * @returns {void}
	 */
	#drawOpening(phase) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		const scale = phase.fade / FADE_START;
		const width = Math.trunc(PLAYFIELD_WIDTH * scale);
		const height = Math.trunc(PLAYFIELD_HEIGHT * scale);
		const x = PLAYFIELD_WIDTH - width;
		const y = PLAYFIELD_HEIGHT - height;

		switch (phase.transition) {
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
}
