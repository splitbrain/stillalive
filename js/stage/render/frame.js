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
 * @param {import('../World.js').World} world The World.
 * @param {import('../Editor.js').Editor} editor The editor of the stage.
 * @returns {void}
 */
export function render(world, editor) {
	if (ui.mode == 'idle') return;
	beginFrame(world.shakeX, world.shakeY);
	if (ui.mode == 'edit') drawEditor(editor);
	else if (ui.mode == 'play' || ui.mode == 'test') drawLevel(world);
	else if (ui.mode == 'preview') drawPreviewMap(world);
}
