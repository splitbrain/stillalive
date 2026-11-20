/**
 * The painter of the editor layer.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { MAP_HEIGHT, MAP_WIDTH, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE } from '../../constants.js';
import { bg } from '../../browser/images.js';
import { Tile } from '../../map/tiles.js';
import { plasmaLaunch } from '../../world/level.js';
import { LayerCache } from '../LayerCache.js';
import { CakePainter, CratePainter, GravPipePainter, PlatformPainter, TurretPainter } from './bodies.js';
import { PlayerPainter } from './player.js';
import { drawTiles } from './tiles.js';

/**
 * The painter of the background, the plasma start markers, the tiles and the bodies of the editor map, from a cached
 * layer.
 */
export class EditorLayerPainter {
	/** @type {LayerCache} The cached layer. The bodies of the editor come from the map, so they change only with it. */
	#cache = new LayerCache();

	/** @type {import('../Scene.js').Painter[]} The painters of the bodies of the editor map in the draw order. */
	#bodies = [
		new CakePainter(),
		new TurretPainter(),
		new CratePainter(),
		new PlatformPainter({ arrows: true }),
		new GravPipePainter(),
		new PlayerPainter({ pose: 'start' }),
	];

	/**
	 * Draw the layer of the editor map of a World.
	 *
	 * @param {import('../../world/World.js').World} world The World of the editor map.
	 * @returns {void}
	 */
	draw(world) {
		this.#cache.draw(world.map, world.background, () => this.#drawLayer(world));
	}

	/**
	 * Draw the layer onto the canvas. A plasma start that cannot launch its ball gets red markers on the tiles next
	 * to it.
	 *
	 * @param {import('../../world/World.js').World} world The World of the editor map.
	 * @returns {void}
	 */
	#drawLayer(world) {
		const map = world.map;
		drawImage(bg[world.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
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
		for (const painter of this.#bodies) painter.draw(world);
	}
}
