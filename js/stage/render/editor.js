/**
 * Drawing of the level editor: the map with its objects.
 */

import { copyCanvas, ctx, drawCopy, drawImage } from '../canvas.js';
import { MAP_HEIGHT, MAP_WIDTH, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../constants.js';
import { bg, cake, crateImage, tileset, turretImages } from '../images.js';
import { mouseOnPlayfield } from '../inputState.js';
import { GRAVPIPE_DIRECTIONS, plasmaLaunch } from '../level.js';
import { game, input } from '../state.js';
import { Tile, isGravPipeTile, isObjectTile } from '../tiles.js';
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
	isSameSource,
	layerSource,
} from './game.js';

/** @type {OffscreenCanvas|undefined} The copy of the background, the tiles and the objects of the editor map. */
let tilesBuff;

/** @type {import('./game.js').LayerSource|null} The source of tilesBuff, or null before the first copy. */
let tilesBuffSource = null;

/**
 * Draw the editor map and the cursor.
 *
 * @param {import('../Editor.js').Editor} editor The editor.
 * @returns {void}
 */
export function drawEditor(editor) {
	drawTileMap();
	drawTileCursor(editor.brush);
	drawSpriteCursor(editor.brush);
}

/**
 * Draw the objects of the map in the editor.
 *
 * @returns {void}
 */
function drawSprites() {
	drawCakes();
	drawTurrets();
	drawCrates();
	drawPlatforms();
	drawGravPipes();
	drawPlayer(game.player.x >> 8, game.player.y >> 8, 0);
}

/**
 * Draw the tile layer of the editor with the plasma start markers and the objects, and keep a copy for the next
 * frames. The objects of the editor come from the map, so the copy stays valid while the map does not change.
 *
 * @returns {void}
 */
function drawTileMap() {
	let y, x, i;
	const source = layerSource();
	if (!isSameSource(tilesBuffSource, source)) {
		drawImage(bg[game.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
		for (i = 0; i < game.map.tiles.length; i++) {
			if (game.map.tiles[i] == Tile.PLASMA_START) {
				x = game.map.column(i);
				y = game.map.row(i);

				if (!plasmaLaunch(game.map, x, y)) {
					if (y - 1 >= 0) ctx.fillRect(x * TILE_SIZE, (y - 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
					if (y + 1 < MAP_HEIGHT) ctx.fillRect(x * TILE_SIZE, (y + 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
					if (x - 1 >= 0) ctx.fillRect((x - 1) * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
					if (x + 1 < MAP_WIDTH) ctx.fillRect((x + 1) * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				}

				break;
			}
		}

		drawTiles(game.map);
		drawSprites();
		tilesBuff = copyCanvas(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		tilesBuffSource = source;
	} else {
		drawCopy(tilesBuff, 0, 0);
	}
}

/**
 * Draw the selected tile at the mouse while the pointer is over the canvas and the mouse is over the map.
 *
 * @param {number} brush The tile id that the editor paints.
 * @returns {void}
 */
function drawTileCursor(brush) {
	if (!input.mouseOver || !mouseOnPlayfield() || isObjectTile(brush)) return;
	const x = (input.mouseX >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
	const y = (input.mouseY >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
	drawImage(tileset[brush], x, y);
	ctx.strokeStyle = 'rgb(255, 0, 0)';
	ctx.lineWidth = 1;
	ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
}

/**
 * Draw the selected object at the mouse while the pointer is over the canvas and the mouse is over the map.
 *
 * @param {number} sprite The object id that the editor paints.
 * @returns {void}
 */
function drawSpriteCursor(sprite) {
	if (!input.mouseOver || !mouseOnPlayfield() || !isObjectTile(sprite)) return;
	const x = (input.mouseX >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
	const y = (input.mouseY >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
	if (sprite == Tile.CAKE) drawImage(cake, x, y);
	else if (sprite == Tile.CRATE) drawImage(crateImage, x, y);
	else if (sprite == Tile.TURRET_LEFT)
		drawImage(turretImages[0], 0, 0, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
	else if (sprite == Tile.TURRET_RIGHT)
		drawImage(turretImages[1], 0, 0, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
	else if (sprite == Tile.PLATFORM_RIGHT) drawPlatform(x, y, 1);
	else if (sprite == Tile.PLATFORM_LEFT) drawPlatform(x, y, -1);
	else if (sprite == Tile.PLAYER_START) drawPlayer(x, y, 0);
	else if (isGravPipeTile(sprite)) drawGravPipe(GRAVPIPE_DIRECTIONS[sprite], x, y);
}
