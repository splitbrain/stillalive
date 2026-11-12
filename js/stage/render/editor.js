/**
 * Drawing of the level editor: the map with its objects.
 */

import { copyCanvas, ctx, drawCopy, drawImage } from '../canvas.js';
import { MAP_HEIGHT, MAP_WIDTH, NUM_TILES, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from '../constants.js';
import { bg, cake, crateImage, platform, tileset, gravPipe, gravPipe2, turretImages } from '../images.js';
import { mouseOnPlayfield } from '../inputState.js';
import { plasmaLaunch } from '../level.js';
import { game, input, ui } from '../state.js';
import { Tile, isObjectTile } from '../tiles.js';
import { drawArrow, drawCakes, drawCrates, drawPlatforms, drawPlayer, drawGravPipes, drawTurrets } from './game.js';

/** @type {OffscreenCanvas|undefined} The copy of the background, the tiles and the objects of the editor map. */
let tilesBuff;

/**
 * Draw the editor: the map and the cursor. The page draws the palettes, the buttons and the text.
 *
 * @returns {void}
 */
export function drawEditor() {
	drawTileMap();
	drawTileCursor();
	drawSpriteCursor();
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
 * frames.
 *
 * @returns {void}
 */
function drawTileMap() {
	let y, x, i;
	if (ui.editor.redrawTiles) {
		drawImage(bg[game.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
		for (i = 0; i < game.map.length; i++) {
			if (game.map[i] == Tile.PLASMA_START) {
				y = i >> 5;
				x = i - (y << 5);

				if (!plasmaLaunch(x, y)) {
					if (y - 1 >= 0) ctx.fillRect(x * 16, (y - 1) * 16, 16, 16);
					if (y + 1 < MAP_HEIGHT) ctx.fillRect(x * 16, (y + 1) * 16, 16, 16);
					if (x - 1 >= 0) ctx.fillRect((x - 1) * 16, y * 16, 16, 16);
					if (x + 1 < MAP_WIDTH) ctx.fillRect((x + 1) * 16, y * 16, 16, 16);
				}

				break;
			}
		}

		for (i = 0; i < game.map.length; i++) {
			if (game.map[i] < NUM_TILES && game.map[i] > 0) {
				y = i >> 5;
				x = i - (y << 5);
				drawImage(tileset[game.map[i]], x * 16, y * 16);
			}
		}
		drawSprites();
		tilesBuff = copyCanvas(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		ui.editor.redrawTiles = false;
	} else {
		drawCopy(tilesBuff, 0, 0);
	}
}

/**
 * Draw the selected tile at the mouse while the pointer is over the canvas and the mouse is over the map.
 *
 * @returns {void}
 */
function drawTileCursor() {
	const brush = ui.editor.brush;
	if (!input.mouseOver || !mouseOnPlayfield() || isObjectTile(brush)) return;
	const x = (input.mouseX >> 4) << 4;
	const y = (input.mouseY >> 4) << 4;
	drawImage(tileset[brush], x, y);
	ctx.strokeStyle = 'rgb(255, 0, 0)';
	ctx.lineWidth = 1;
	ctx.strokeRect(x, y, 16, 16);
}

/**
 * Draw the selected object at the mouse while the pointer is over the canvas and the mouse is over the map.
 *
 * @returns {void}
 */
function drawSpriteCursor() {
	const sprite = ui.editor.brush;
	if (!input.mouseOver || !mouseOnPlayfield() || !isObjectTile(sprite)) return;
	const x = (input.mouseX >> 4) << 4;
	const y = (input.mouseY >> 4) << 4;
	if (sprite == Tile.CAKE) drawImage(cake, x, y);
	else if (sprite == Tile.CRATE) drawImage(crateImage, x, y);
	else if (sprite == Tile.TURRET_LEFT) drawImage(turretImages[0], 0, 0, 16, 32, x, y, 16, 32);
	else if (sprite == Tile.TURRET_RIGHT) drawImage(turretImages[1], 0, 0, 16, 32, x, y, 16, 32);
	else if (sprite == Tile.PLATFORM_RIGHT) {
		drawImage(platform, x, y);
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		drawArrow(x + 5, y + 8, x + 15, y + 8, 3, 1);
	} else if (sprite == Tile.PLATFORM_LEFT) {
		drawImage(platform, x, y);
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		drawArrow(x + 5, y + 8, x + 15, y + 8, 3, -1);
	} else if (sprite == Tile.PLAYER_START) drawPlayer(x, y, 0);
	else if (sprite == Tile.GRAVPIPE_RIGHT) {
		drawImage(gravPipe, 0, 0, 16, 32, x, y, 16, 32);
	} else if (sprite == Tile.GRAVPIPE_LEFT) {
		drawImage(gravPipe, 0, 32, 16, 32, x, y, 16, 32);
	} else if (sprite == Tile.GRAVPIPE_UP) {
		drawImage(gravPipe2, 0, 0, 32, 16, x, y, 32, 16);
	} else if (sprite == Tile.GRAVPIPE_DOWN) {
		drawImage(gravPipe2, 32, 0, 32, 16, x, y, 32, 16);
	}
}
