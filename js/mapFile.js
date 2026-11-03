/**
 * Export and import of editor maps as files.
 *
 * A map file is JSON with these properties:
 *
 * - format: the version of the file format, always 1
 * - tiles: the 768 tile ids of the 32 x 24 tiles, row by row
 * - bg: the index of the background image
 * - boss: optional, the boss of the level from 1 to 4. Only a boss level can contain the tube. The editor does not
 *   support boss levels.
 * - text: optional, the text that the robot shows during the level. The campaign levels use the same format. The
 *   editor does not use the text.
 */

import { NUM_TILES } from './constants.js';
import { downloadJson, pickJsonFile } from './files.js';
import { bg } from './images.js';
import { Tile, isObjectTile } from './tiles.js';

/** @type {number} The version of the map file format. */
export const MAP_FORMAT = 1;

/** @type {number} The number of tiles of a map. */
const MAP_SIZE = 768;

/** @type {number} The number of bosses. */
const BOSS_COUNT = 4;

/**
 * Check if a tile id is valid in a map.
 *
 * @param {*} tile The tile id.
 * @param {boolean} isBossLevel True for a boss level, which can contain the tube.
 * @returns {boolean} True for a tile id of the tile set or an object id from 100 to 111. The tube 111 is only valid
 *     in a boss level.
 */
function isValidTile(tile, isBossLevel) {
	if (tile === Tile.TUBE && !isBossLevel) return false;
	return Number.isInteger(tile) && ((tile >= 0 && tile < NUM_TILES) || isObjectTile(tile));
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
 * Check the data of a map file.
 *
 * @param {*} data The parsed content of a map file.
 * @returns {{tiles: number[], bg: number, boss: number}} The tile ids, the background index and the boss, or 0 for a
 *     level without a boss.
 * @throws {Error} If the data is not a valid map.
 */
export function parseMap(data) {
	const boss = data?.boss ?? 0;
	if (
		data?.format !== MAP_FORMAT ||
		!Number.isInteger(boss) ||
		boss < 0 ||
		boss > BOSS_COUNT ||
		!Array.isArray(data.tiles) ||
		data.tiles.length !== MAP_SIZE ||
		!data.tiles.every((tile) => isValidTile(tile, boss > 0)) ||
		!Number.isInteger(data.bg) ||
		data.bg < 0 ||
		data.bg >= bg.length
	) {
		throw new Error('This is not a valid StillAliveJS map file.');
	}
	return { tiles: data.tiles, bg: data.bg, boss };
}

/**
 * Let the player select a map file and read it.
 *
 * @returns {Promise<{tiles: number[], bg: number, boss: number}>} The tile ids, the background index and the boss,
 *     which is always 0.
 * @throws {Error} If the file is not a valid map file or is a boss level.
 */
export async function importEditorMap() {
	const map = parseMap(await pickJsonFile());
	if (map.boss > 0) throw new Error('The editor does not support boss levels.');
	return map;
}
