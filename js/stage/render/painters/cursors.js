/**
 * The painters of the mouse cursors.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { TILE_SIZE, TILE_SIZE_BITS } from '../../constants.js';
import { crosshair, tileset } from '../../browser/images.js';
import { Tile, isBodyTile } from '../../map/tiles.js';
import { GRAVPIPE_DIRECTIONS } from '../../world/level.js';
import { CakePainter, CratePainter, GravPipePainter, PlatformPainter, TurretPainter } from './bodies.js';
import { PlayerPainter } from './player.js';

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
 * The state of the editor that the brush shows.
 *
 * @typedef {object} BrushState
 * @property {number} brush The tile id or the body tile id that the editor paints.
 * @property {{column: number, row: number}|null} brushCell The tile under the mouse, or null while the pointer is
 *     outside the canvas or the mouse is outside the map.
 */

/**
 * The painter of the brush of the editor: the tile or the body that the editor paints, at the mouse.
 */
export class BrushPainter {
	/** @type {BrushState} The brush and the tile under the mouse. */
	#state;

	/** @type {Map<number, (x: number, y: number) => void>} The functions that draw each body brush, by body tile id. */
	#bodies;

	/**
	 * Create the painter of the brush.
	 *
	 * @param {BrushState} state The brush and the tile under the mouse.
	 */
	constructor(state) {
		this.#state = state;
		const cake = new CakePainter();
		const crate = new CratePainter();
		const turret = new TurretPainter();
		const platform = new PlatformPainter({ arrows: true });
		const gravPipe = new GravPipePainter();
		const player = new PlayerPainter({ pose: 'start' });
		this.#bodies = new Map([
			[Tile.TURRET_LEFT, (x, y) => turret.drawBrush(x, y, -1)],
			[Tile.TURRET_RIGHT, (x, y) => turret.drawBrush(x, y, 1)],
			[Tile.CRATE, (x, y) => crate.drawBrush(x, y)],
			[Tile.CAKE, (x, y) => cake.drawBrush(x, y)],
			[Tile.PLAYER_START, (x, y) => player.drawBrush(x, y)],
			[Tile.PLATFORM_RIGHT, (x, y) => platform.drawBrush(x, y, 1)],
			[Tile.PLATFORM_LEFT, (x, y) => platform.drawBrush(x, y, -1)],
		]);
		for (const [tile, direction] of Object.entries(GRAVPIPE_DIRECTIONS)) {
			this.#bodies.set(Number(tile), (x, y) => gravPipe.drawBrush(x, y, direction));
		}
	}

	/**
	 * Draw the brush on the tile under the mouse.
	 *
	 * @returns {void}
	 */
	draw() {
		const { brush, brushCell } = this.#state;
		if (!brushCell) return;
		const x = brushCell.column << TILE_SIZE_BITS;
		const y = brushCell.row << TILE_SIZE_BITS;
		if (isBodyTile(brush)) this.#bodies.get(brush)?.(x, y);
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
