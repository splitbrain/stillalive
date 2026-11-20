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
	 * @param {import('./painters/cursors.js').BrushState} state The brush and the tile under the mouse.
	 */
	constructor(state) {
		super([new EditorLayerPainter(), new BrushPainter(state)]);
	}
}
