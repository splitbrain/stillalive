/**
 * Drawing of a frame: the mode of the stage on the canvas and the frame rate.
 */

import { beginFrame, ctx } from '../canvas.js';
import { getFps } from '../loop.js';
import { ui } from '../state.js';
import { drawLevelEditor } from './editor.js';
import { drawLevel, drawPreviewMap } from './game.js';

/**
 * Draw the canvas after the ticks of a frame. The idle stage draws nothing.
 *
 * @returns {void}
 */
export function render() {
	if (ui.mode == 'idle') return;
	beginFrame();
	if (ui.mode == 'edit' || ui.mode == 'test') drawLevelEditor();
	else if (ui.mode == 'play') drawLevel();
	else if (ui.mode == 'preview') drawPreviewMap();
	ctx.font = 'bold 10px Arial';
	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.fillText('' + getFps(), 5, 10);
}
