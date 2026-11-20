/**
 * The painters of the editor layer and of the body tiles of the editor.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { MAP_HEIGHT, MAP_WIDTH, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE } from '../../constants.js';
import { bg } from '../../browser/images.js';
import { Tile } from '../../map/tiles.js';
import { GRAVPIPE_DIRECTIONS, plasmaLaunch } from '../../world/level.js';
import { LayerCache } from '../LayerCache.js';
import { CakePainter, CratePainter, GravPipePainter, PlatformPainter, TurretPainter } from './bodies.js';
import { PlayerPainter } from './player.js';
import { drawTiles } from './tiles.js';

/**
 * The state of the editor that the editor scene draws.
 *
 * @typedef {object} EditorState
 * @property {import('../../world/TileMap.js').TileMap} map The editor map.
 * @property {number} background The index of the background image.
 * @property {number} brush The tile id or the body tile id that the editor paints.
 * @property {{column: number, row: number}|null} brushCell The tile under the mouse, or null.
 */

/**
 * @type {number[][]} The body tile ids of the editor map in the draw order of their kinds. Within a kind, the bodies
 *     follow the map order.
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
 * The painter of the body tiles of the editor. It draws the body of a body tile at a position. A player
 * start tile and a player launch tile both show the player in the start pose.
 */
export class BodyTilePainter {
	/** @type {Map<number, (x: number, y: number) => void>} The functions that draw each body tile, by body tile id. */
	#bodies;

	/**
	 * Create the painter of the body tiles.
	 */
	constructor() {
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
			[Tile.PLAYER_LAUNCH_UP, (x, y) => player.drawBrush(x, y)],
			[Tile.PLATFORM_RIGHT, (x, y) => platform.drawBrush(x, y, 1)],
			[Tile.PLATFORM_LEFT, (x, y) => platform.drawBrush(x, y, -1)],
		]);
		for (const [tile, direction] of Object.entries(GRAVPIPE_DIRECTIONS)) {
			this.#bodies.set(Number(tile), (x, y) => gravPipe.drawBrush(x, y, direction));
		}
	}

	/**
	 * Draw the body of a body tile. A tile id without a body draws nothing.
	 *
	 * @param {number} tile The body tile id.
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @returns {void}
	 */
	drawTile(tile, x, y) {
		this.#bodies.get(tile)?.(x, y);
	}
}

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
	 * @param {EditorState} state The state of the editor.
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
