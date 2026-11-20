/**
 * The EditorScene object.
 */

import { Scene } from './Scene.js';
import { BrushPainter } from './painters/cursors.js';
import { EditorLayerPainter } from './painters/editor.js';

/**
 * The state of the editor that the editor scene draws.
 *
 * @typedef {object} EditorState
 * @property {import('../world/TileMap.js').TileMap} map The editor map.
 * @property {number} background The index of the background image.
 * @property {number} brush The tile id or the body tile id that the editor paints.
 * @property {{column: number, row: number}|null} brushCell The tile under the mouse, or null while the pointer is
 *     outside the canvas or the mouse is outside the map.
 */

/**
 * The scene of the editor: the editor map with its body tiles and the brush at the mouse.
 *
 * @extends {Scene<EditorState>}
 */
export class EditorScene extends Scene {
	/**
	 * Create the scene of the editor.
	 */
	constructor() {
		super([new EditorLayerPainter(), new BrushPainter()]);
	}
}
