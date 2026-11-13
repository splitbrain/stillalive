/**
 * Drawing of a frame of the stage.
 */

import { beginFrame } from '../canvas.js';
import { ui } from '../state.js';
import { drawEditor } from './editor.js';
import { drawLevel, drawPreviewMap } from './game.js';

/**
 * Draw the canvas after the ticks of a frame.
 *
 * @returns {void}
 */
export function render() {
	if (ui.mode == 'idle') return;
	beginFrame();
	if (ui.mode == 'edit') drawEditor();
	else if (ui.mode == 'play' || ui.mode == 'test') drawLevel();
	else if (ui.mode == 'preview') drawPreviewMap();
}
