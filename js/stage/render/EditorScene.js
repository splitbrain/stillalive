/**
 * The EditorScene object.
 */

import { Scene } from './Scene.js';
import { BrushPainter } from './painters/cursors.js';
import { EditorLayerPainter } from './painters/editor.js';

/**
 * The scene of the editor: the editor map with its body tiles and the brush at the mouse.
 *
 * @extends {Scene<import('./painters/editor.js').EditorState>}
 */
export class EditorScene extends Scene {
	/**
	 * Create the scene of the editor.
	 */
	constructor() {
		super([new EditorLayerPainter(), new BrushPainter()]);
	}
}
