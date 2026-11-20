/**
 * The painters of the mouse cursors.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { TILE_SIZE, TILE_SIZE_BITS } from '../../constants.js';
import { crosshair, tileset } from '../../browser/images.js';
import { isBodyTile } from '../../map/tiles.js';
import { BodyTilePainter } from './editor.js';

/**
 * The painter of the crosshair at the mouse.
 */
export class CrosshairPainter {
	/**
	 * Draw the crosshair at the mouse position of the last tick.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		drawImage(crosshair, world.input.mouseX - 8, world.input.mouseY - 8, 16, 16);
	}
}

/**
 * The painter of the brush of the editor: the tile or the body that the editor paints, at the mouse.
 */
export class BrushPainter {
	/** @type {BodyTilePainter} The painter of the body brushes. */
	#bodyTiles = new BodyTilePainter();

	/**
	 * Draw the brush on the tile under the mouse.
	 *
	 * @param {import('./editor.js').EditorState} state The state of the editor.
	 * @returns {void}
	 */
	draw(state) {
		const { brush, brushCell } = state;
		if (!brushCell) return;
		const x = brushCell.column << TILE_SIZE_BITS;
		const y = brushCell.row << TILE_SIZE_BITS;
		if (isBodyTile(brush)) this.#bodyTiles.drawTile(brush, x, y);
		else this.#drawTile(brush, x, y);
	}

	/**
	 * Draw a tile with a red frame.
	 *
	 * @param {number} tile The tile id.
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @returns {void}
	 */
	#drawTile(tile, x, y) {
		drawImage(tileset[tile], x, y);
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
	}
}
