/**
 * The EditorScene object.
 */

import { ctx, drawImage } from '../browser/canvas.js';
import { MAP_HEIGHT, MAP_WIDTH, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE } from '../constants.js';
import { bg } from '../browser/images.js';
import { Tile } from '../map/tiles.js';
import { plasmaLaunch } from '../world/level.js';
import { LayerCache } from './LayerCache.js';
import { Scene } from './Scene.js';
import { CakePainter, CratePainter, GravPipePainter, PlatformPainter, TurretPainter } from './painters/bodies.js';
import { BrushPainter } from './painters/cursors.js';
import { PlayerPainter } from './painters/player.js';
import { drawTiles } from './painters/tiles.js';

/**
 * The drawing of the editor: the map with its bodies and the brush at the mouse.
 */
export class EditorScene {
	/**
	 * @type {LayerCache} The cached background, plasma start markers, tiles and bodies of the editor map. The bodies of
	 *     the editor come from the map, so the layer changes only with the map and the background.
	 */
	#cache = new LayerCache();

	/** @type {Scene} The bodies of the editor map in the draw order. */
	#bodies = new Scene([
		new CakePainter(),
		new TurretPainter(),
		new CratePainter(),
		new PlatformPainter({ arrows: true }),
		new GravPipePainter(),
		new PlayerPainter({ pose: 'start' }),
	]);

	/** @type {BrushPainter} The painter of the brush at the mouse. */
	#brush;

	/**
	 * Create the drawing of the editor.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The mouse, for the brush.
	 */
	constructor(input) {
		this.#brush = new BrushPainter(input);
	}

	/**
	 * Draw the editor map and the brush.
	 *
	 * @param {import('../editor/Editor.js').Editor} editor The editor.
	 * @returns {void}
	 */
	draw(editor) {
		this.#cache.draw(editor.map, editor.background, () => this.#drawLayer(editor));
		this.#brush.draw(editor.brush);
	}

	/**
	 * Draw the layer of the editor: the background, the plasma start markers, the tiles and the bodies.
	 *
	 * @param {import('../editor/Editor.js').Editor} editor The editor.
	 * @returns {void}
	 */
	#drawLayer(editor) {
		const map = editor.map;
		drawImage(bg[editor.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
		const start = map.tiles.indexOf(Tile.PLASMA_START);
		if (start >= 0) {
			const x = map.column(start);
			const y = map.row(start);
			if (!plasmaLaunch(map, x, y)) {
				if (y - 1 >= 0) ctx.fillRect(x * TILE_SIZE, (y - 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				if (y + 1 < MAP_HEIGHT) ctx.fillRect(x * TILE_SIZE, (y + 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				if (x - 1 >= 0) ctx.fillRect((x - 1) * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				if (x + 1 < MAP_WIDTH) ctx.fillRect((x + 1) * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
			}
		}

		drawTiles(map);
		this.#bodies.draw(editor.world);
	}
}
