/**
 * The painter of the editor layer.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { MAP_HEIGHT, MAP_WIDTH, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE } from '../../constants.js';
import { bg } from '../../browser/images.js';
import { Tile } from '../../map/tiles.js';
import { GRAVPIPE_DIRECTIONS, plasmaLaunch } from '../../world/level.js';
import { LayerCache } from '../LayerCache.js';
import { BodyTilePainter } from './bodies.js';
import { drawTiles } from './tiles.js';

/**
 * @type {number[][]} The body tile ids of the editor map in the draw order of their kinds: cakes, turrets, crates,
 *     platforms, gravitational pipes and the player. Within a kind, the bodies follow the map order.
 */
const BODY_TILE_ORDER = [
	[Tile.CAKE],
	[Tile.TURRET_LEFT, Tile.TURRET_RIGHT],
	[Tile.CRATE],
	[Tile.PLATFORM_RIGHT, Tile.PLATFORM_LEFT],
	Object.keys(GRAVPIPE_DIRECTIONS).map(Number),
	[Tile.PLAYER_START, Tile.PLAYER_LAUNCH_UP],
];

/**
 * The painter of the background, the plasma start markers, the tiles and the body tiles of the editor map, from a
 * cached layer.
 */
export class EditorLayerPainter {
	/** @type {LayerCache} The cached layer. The body tiles are part of the map, so they change only with it. */
	#cache = new LayerCache();

	/** @type {BodyTilePainter} The painter of the body tiles. */
	#bodyTiles = new BodyTilePainter();

	/**
	 * Draw the layer of the editor map.
	 *
	 * @param {import('../EditorScene.js').EditorState} state The state of the editor.
	 * @returns {void}
	 */
	draw(state) {
		this.#cache.draw(state.map, state.background, () => this.#drawLayer(state.map, state.background));
	}

	/**
	 * Draw the layer onto the canvas. A plasma start that cannot launch its ball gets red markers on the tiles next
	 * to it.
	 *
	 * @param {import('../../world/TileMap.js').TileMap} map The editor map.
	 * @param {number} background The index of the background image.
	 * @returns {void}
	 */
	#drawLayer(map, background) {
		drawImage(bg[background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
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
		for (const kind of BODY_TILE_ORDER) {
			for (const [i, tile] of map.tiles.entries()) {
				if (kind.includes(tile)) this.#bodyTiles.drawTile(tile, map.column(i) * TILE_SIZE, map.row(i) * TILE_SIZE);
			}
		}
	}
}
