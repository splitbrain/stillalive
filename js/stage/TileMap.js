/**
 * The tiles of a map.
 */

import { MAP_SIZE, MAP_WIDTH, MAP_WIDTH_BITS, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE_BITS } from './constants.js';
import { Tile } from './tiles.js';

/**
 * Make the tile ids of an empty map.
 *
 * @returns {number[]} One Tile.EMPTY for each map position.
 */
export function emptyTiles() {
	return Array.from({ length: MAP_SIZE }, () => Tile.EMPTY);
}

/**
 * The logic tiles and the display tiles of a map. The game logic reads the logic layer, and the drawing shows the
 * display layer. The two layers can differ, e.g. a closed door is in the logic layer only. The version increases with
 * each write to the display layer, so the drawing can find out when its cached tile layer is old.
 */
export class TileMap {
	/**
	 * @param {number[]} tiles The tile ids for both layers. The map keeps copies.
	 */
	constructor(tiles) {
		/** @type {number[]} The tile ids that the game logic uses, one for each map position. */
		this.tiles = [...tiles];
		/** @type {number[]} The tile ids that the drawing shows, one for each map position. */
		this.display = [...tiles];
		/** @type {number} The number of writes to the display layer. */
		this.version = 0;
	}

	/**
	 * Get the map index of a position.
	 *
	 * @param {number} column The column.
	 * @param {number} row The row.
	 * @returns {number} The map index.
	 */
	index(column, row) {
		return (row << MAP_WIDTH_BITS) + column;
	}

	/**
	 * Get the column of a map index.
	 *
	 * @param {number} index The map index.
	 * @returns {number} The column.
	 */
	column(index) {
		return index & (MAP_WIDTH - 1);
	}

	/**
	 * Get the row of a map index.
	 *
	 * @param {number} index The map index.
	 * @returns {number} The row.
	 */
	row(index) {
		return index >> MAP_WIDTH_BITS;
	}

	/**
	 * Get the logic tile at a point.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {number} The tile id, or 0 outside the playfield.
	 */
	atPixel(x, y) {
		if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
		return this.tiles[this.index(x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS)];
	}

	/**
	 * Set a tile in both layers.
	 *
	 * @param {number} index The map index.
	 * @param {number} tile The tile id.
	 * @returns {void}
	 */
	set(index, tile) {
		this.tiles[index] = tile;
		this.display[index] = tile;
		this.version++;
	}

	/**
	 * Set a tile in the logic layer only.
	 *
	 * @param {number} index The map index.
	 * @param {number} tile The tile id.
	 * @returns {void}
	 */
	setTile(index, tile) {
		this.tiles[index] = tile;
	}

	/**
	 * Set a tile in the display layer only.
	 *
	 * @param {number} index The map index.
	 * @param {number} tile The tile id.
	 * @returns {void}
	 */
	setDisplay(index, tile) {
		this.display[index] = tile;
		this.version++;
	}

	/**
	 * Replace a tile id in both layers at each position where the logic layer has it.
	 *
	 * @param {number} from The tile id to replace.
	 * @param {number} to The new tile id.
	 * @returns {void}
	 */
	replaceAll(from, to) {
		for (const [i, tile] of this.tiles.entries()) {
			if (tile == from) this.set(i, to);
		}
	}

	/**
	 * Replace all tiles of both layers.
	 *
	 * @param {number[]} tiles The new tile ids. The map keeps copies.
	 * @returns {void}
	 */
	replace(tiles) {
		this.tiles = [...tiles];
		this.display = [...tiles];
		this.version++;
	}
}
