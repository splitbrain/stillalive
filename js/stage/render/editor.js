/**
 * Drawing of the level editor: the map with its bodies.
 */

import { ctx, drawImage } from '../browser/canvas.js';
import { MAP_HEIGHT, MAP_WIDTH, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../constants.js';
import { bg, cakeImage, crateImage, tileset, turretImages } from '../browser/images.js';
import { GRAVPIPE_DIRECTIONS, plasmaLaunch } from '../world/level.js';
import { Tile, isBodyTile } from '../map/tiles.js';
import {
	drawCakes,
	drawCrates,
	drawGravPipe,
	drawGravPipes,
	drawPlatform,
	drawPlatforms,
	drawPlayer,
	drawTiles,
	drawTurrets,
} from './game.js';

/**
 * Draw the cursor of the editor: the tile or the body that the editor paints, at the mouse.
 *
 * @param {number} brush The tile id or the body id that the editor paints.
 * @param {import('../browser/InputState.js').InputState} input The mouse.
 * @returns {void}
 */
export function drawCursor(brush, input) {
	drawTileCursor(brush, input);
	drawBodyCursor(brush, input);
}

/**
 * Draw the bodies of the map in the editor.
 *
 * @param {import('../world/World.js').World} world The World.
 * @returns {void}
 */
function drawBodies(world) {
	drawCakes(world);
	drawTurrets(world);
	drawCrates(world);
	drawPlatforms(world, true);
	drawGravPipes(world);
	drawPlayer(world.player.pixelX, world.player.pixelY, 0);
}

/**
 * Draw the tile layer of the editor: the background, the plasma start markers, the tiles and the bodies. The bodies
 * of the editor come from the map, so the layer changes only with the map and the background.
 *
 * @param {import('../editor/Editor.js').Editor} editor The editor.
 * @returns {void}
 */
export function drawEditorLayer(editor) {
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
	drawBodies(editor.world);
}

/**
 * Draw the selected tile at the mouse while the pointer is over the canvas and the mouse is over the map.
 *
 * @param {number} brush The tile id that the editor paints.
 * @param {import('../browser/InputState.js').InputState} input The mouse.
 * @returns {void}
 */
function drawTileCursor(brush, input) {
	if (!input.mouseOver || !input.mouseOnPlayfield() || isBodyTile(brush)) return;
	const x = (input.mouseX >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
	const y = (input.mouseY >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
	drawImage(tileset[brush], x, y);
	ctx.strokeStyle = 'rgb(255, 0, 0)';
	ctx.lineWidth = 1;
	ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
}

/**
 * Draw the selected body at the mouse while the pointer is over the canvas and the mouse is over the map.
 *
 * @param {number} body The body id that the editor paints.
 * @param {import('../browser/InputState.js').InputState} input The mouse.
 * @returns {void}
 */
function drawBodyCursor(body, input) {
	if (!input.mouseOver || !input.mouseOnPlayfield() || !isBodyTile(body)) return;
	const x = (input.mouseX >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
	const y = (input.mouseY >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
	switch (body) {
		case Tile.CAKE:
			drawImage(cakeImage, x, y);
			break;
		case Tile.CRATE:
			drawImage(crateImage, x, y);
			break;
		case Tile.TURRET_LEFT:
			drawImage(turretImages[0], 0, 0, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
			break;
		case Tile.TURRET_RIGHT:
			drawImage(turretImages[1], 0, 0, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
			break;
		case Tile.PLATFORM_RIGHT:
			drawPlatform(x, y, 1, true);
			break;
		case Tile.PLATFORM_LEFT:
			drawPlatform(x, y, -1, true);
			break;
		case Tile.PLAYER_START:
			drawPlayer(x, y, 0);
			break;
		case Tile.GRAVPIPE_RIGHT:
		case Tile.GRAVPIPE_LEFT:
		case Tile.GRAVPIPE_UP:
		case Tile.GRAVPIPE_DOWN:
			drawGravPipe(GRAVPIPE_DIRECTIONS[body], x, y);
			break;
	}
}
