/**
 * The painters of the tiles.
 */

import { drawImage } from '../../browser/canvas.js';
import { NUM_TILES, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../../constants.js';
import { bg, tileset } from '../../browser/images.js';
import { LayerCache } from '../LayerCache.js';

/**
 * Draw the display layer of a map.
 *
 * @param {import('../../world/TileMap.js').TileMap} map The map.
 * @returns {void}
 */
export function drawTiles(map) {
	for (const [i, tile] of map.display.entries()) {
		if (tile > 0 && tile < NUM_TILES) {
			drawImage(tileset[tile], map.column(i) * TILE_SIZE, map.row(i) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
		}
	}
}

/**
 * The painter of the background and the tiles of a World, from a cached layer.
 */
export class TileLayerPainter {
	/** @type {LayerCache} The cached background and tiles of a level or a preview. */
	#cache = new LayerCache();

	/**
	 * Draw the background and the display layer of the map of a World.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		this.#cache.draw(world.map, world.background, () => {
			drawImage(bg[world.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
			drawTiles(world.map);
		});
	}
}

/**
 * The painter of the animated tiles.
 */
export class AnimatedTilePainter {
	/**
	 * Draw the current frames of the animated tiles.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		for (const tile of world.animatedTiles) {
			if (!tile.used) continue;
			drawImage(tileset[tile.frame], tile.x << TILE_SIZE_BITS, tile.y << TILE_SIZE_BITS, TILE_SIZE, TILE_SIZE);
		}
	}
}
