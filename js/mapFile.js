/**
 * Export and import of editor maps as files.
 *
 * A map file is JSON with these properties:
 *
 * - format: the version of the file format, always 1
 * - tiles: the 768 tile ids of the 32 x 24 tiles, row by row
 * - bg: the index of the background image
 */

import { downloadJson, pickJsonFile } from './files.js';

/** @type {number} The version of the map file format. */
export const MAP_FORMAT = 1;

/** @type {number} The number of tiles of a map. */
const MAP_SIZE = 768;

/**
 * Check if a tile id is valid in an editor map.
 *
 * @param {*} tile The tile id.
 * @returns {boolean} True for a tile id of the tile set or an object id from 100 to 111.
 */
function isValidTile(tile) {
	return Number.isInteger(tile) && ((tile >= 0 && tile < NUM_TILES) || (tile >= 100 && tile <= 111));
}

/**
 * Let the browser download an editor map as a JSON file.
 *
 * @param {number[]} tiles The 768 tile ids.
 * @param {number} bg The background index.
 * @returns {void}
 */
export function exportEditorMap(tiles, bg) {
	downloadJson({ format: MAP_FORMAT, tiles, bg }, 'stillalivejs-map.json');
}

/**
 * Let the player select a map file and read it.
 *
 * @returns {Promise<{tiles: number[], bg: number}>} The tile ids and the background index.
 * @throws {Error} If the file is not a valid map file.
 */
export async function importEditorMap() {
	const data = await pickJsonFile();
	if (
		data?.format !== MAP_FORMAT ||
		!Array.isArray(data.tiles) ||
		data.tiles.length !== MAP_SIZE ||
		!data.tiles.every(isValidTile) ||
		!Number.isInteger(data.bg) ||
		data.bg < 0 ||
		data.bg >= bg.length
	) {
		throw new Error('This is not a valid StillAliveJS map file.');
	}
	return { tiles: data.tiles, bg: data.bg };
}

Object.assign(window, { exportEditorMap, importEditorMap });
