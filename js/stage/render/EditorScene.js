/**
 * The EditorScene object.
 */

import { Scene } from './Scene.js';
import { BrushPainter } from './painters/cursors.js';
import { EditorLayerPainter } from './painters/editor.js';

/**
 * The scene of the editor: the editor map with its bodies and the brush at the mouse.
 */
export class EditorScene extends Scene {
	/**
	 * Create the scene of the editor.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The mouse, for the brush.
	 * @param {() => number} brush The function that gets the tile id or the body tile id that the editor paints.
	 */
	constructor(input, brush) {
		super([new EditorLayerPainter(), new BrushPainter(input, brush)]);
	}
}
