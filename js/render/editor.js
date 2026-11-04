/**
 * Drawing of the level editor: the map with its objects, the previews of the save and load screens and the test run.
 */

import { copyCanvas, ctx, drawCopy, drawImage } from '../canvas.js';
import { MAP_HEIGHT, MAP_WIDTH, NUM_TILES, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from '../constants.js';
import {
	bg,
	body,
	cake,
	crateImage,
	crosshair,
	head,
	noLevel,
	platform,
	portalGun,
	tileset,
	tunnel,
	tunnel2,
	turretImages,
} from '../images.js';
import { mouseInZone } from '../inputState.js';
import { isTileHere } from '../level.js';
import { game, input, ui } from '../state.js';
import { getEditorMap } from '../storage.js';
import { Tile } from '../tiles.js';
import { getAngle } from '../utils.js';
import {
	createBuff,
	drawAnimatedTiles,
	drawArrow,
	drawCakes,
	drawCrates,
	drawFrontTiles,
	drawPlasma,
	drawPlatforms,
	drawPlayer,
	drawPortals,
	drawSparkles,
	drawTileLayer,
	drawTunnels,
	drawTurrets,
} from './game.js';
import { drawPreviewMap } from './menus.js';

/** @type {OffscreenCanvas|undefined} The copy of the background, the tiles and the objects of the editor map. */
let tilesBuff;

/**
 * Draw the screen of the editor that is open: the test run, the load screen, the save screen or the editor.
 *
 * @returns {void}
 */
export function drawLevelEditor() {
	const editor = ui.editor;
	if (ui.isTestingLevel) drawTestLevel();
	else if (editor.askLoading) drawLoadScreen();
	else if (editor.askSaving) drawSaveScreen();
	else drawEditor();
}

/**
 * Draw one frame of the test run.
 *
 * @returns {void}
 */
function drawTestLevel() {
	if (game.tilesChanged) createBuff();
	drawTileLayer();

	drawAnimatedTiles();

	const a = getAngle(
		(game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX,
		(game.player.y >> 8) + (game.player.pY >> 1) + game.offsetY,
		input.mouseX,
		input.mouseY,
	);
	ctx.save();
	ctx.translate(
		(game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX,
		(game.player.y >> 8) + (game.player.pY >> 1) + game.offsetY,
	);
	ctx.rotate(a);
	drawImage(portalGun, -5, -5);
	ctx.restore();

	drawTunnels();

	const flipDx = game.player.flip < 0 ? 1 : 0;
	drawImage(
		head[flipDx],
		game.player.animationFrame * 16,
		0,
		15,
		12,
		(game.player.x >> 8) + game.offsetX,
		(game.player.y >> 8) + game.offsetY,
		16,
		12,
	);
	drawImage(
		body[flipDx],
		game.player.animationFrame * 16,
		0,
		16,
		27,
		(game.player.x >> 8) + game.offsetX,
		(game.player.y >> 8) + game.offsetY,
		16,
		27,
	);

	drawCakes();
	drawTurrets();
	drawPlasma();
	drawSparkles();
	drawCrates();
	drawPlatforms();

	drawFrontTiles();
	drawPortals();

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the preview of the save screen. The page draws the slots and the buttons.
 *
 * @returns {void}
 */
function drawSaveScreen() {
	if (ui.previewMap < 1 || getEditorMap(ui.previewMap) == null) drawImage(noLevel, game.offsetX, game.offsetY);
	else if (ui.previewMap > 0) drawPreviewMap();
	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the preview of the load screen. The page draws the slots and the buttons.
 *
 * @returns {void}
 */
function drawLoadScreen() {
	if (ui.previewMap < 1) drawImage(noLevel, game.offsetX, game.offsetY);
	if (ui.previewMap > 0) drawPreviewMap();
	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the editor: the map and the cursor. The page draws the palettes, the buttons and the text.
 *
 * @returns {void}
 */
function drawEditor() {
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
	drawTunnels();
	drawPlayer((game.player.x >> 8) + game.offsetX, (game.player.y >> 8) + game.offsetY, 0);
}

/**
 * Draw the tile layer of the editor with the plasma start markers and the objects, and keep a copy for the next
 * frames.
 *
 * @returns {void}
 */
function drawTileMap() {
	let y, x, up, down, left, right, i;
	if (ui.editor.redrawTiles) {
		drawImage(bg[game.background], game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
		for (i = 0; i < game.map.length; i++) {
			if (game.map[i] == Tile.PLASMA_START) {
				y = i >> 5;
				x = i - (y << 5);

				up = isTileHere(x, y - 1);
				down = isTileHere(x, y + 1);
				left = isTileHere(x - 1, y);
				right = isTileHere(x + 1, y);

				if (up + down + left + right < 3) {
					if (y - 1 >= 0) ctx.fillRect(x * 16 + game.offsetX, (y - 1) * 16 + game.offsetY, 16, 16);
					if (y + 1 < MAP_HEIGHT) ctx.fillRect(x * 16 + game.offsetX, (y + 1) * 16 + game.offsetY, 16, 16);
					if (x - 1 >= 0) ctx.fillRect((x - 1) * 16 + game.offsetX, y * 16 + game.offsetY, 16, 16);
					if (x + 1 < MAP_WIDTH) ctx.fillRect((x + 1) * 16 + game.offsetX, y * 16 + game.offsetY, 16, 16);
				}

				break;
			}
		}

		for (i = 0; i < game.map.length; i++) {
			if (game.map[i] < NUM_TILES && game.map[i] > 0) {
				y = i >> 5;
				x = i - (y << 5);
				drawImage(tileset[game.map[i]], x * 16 + game.offsetX, y * 16 + game.offsetY);
			}
		}
		drawSprites();
		tilesBuff = copyCanvas(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		ui.editor.redrawTiles = false;
	} else {
		drawCopy(tilesBuff, game.offsetX, game.offsetY);
	}
}

/**
 * Draw the selected tile at the mouse while the mouse is over the map.
 *
 * @returns {void}
 */
function drawTileCursor() {
	const editor = ui.editor;
	if (!mouseInZone(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT) || editor.selectedTile < 0) return;
	const x = (input.mouseX >> 4) << 4;
	const y = (input.mouseY >> 4) << 4;
	drawImage(tileset[editor.tilesToDraw[editor.selectedTile]], x, y);
	ctx.strokeStyle = 'rgb(255, 0, 0)';
	ctx.lineWidth = 1;
	ctx.strokeRect(x, y, 16, 16);
}

/**
 * Draw the selected object at the mouse while the mouse is over the map.
 *
 * @returns {void}
 */
function drawSpriteCursor() {
	const sprite = ui.editor.selectedSprite;
	if (!mouseInZone(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT) || sprite <= 0) return;
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
	else if (sprite == Tile.TUNNEL_RIGHT) {
		drawImage(tunnel, 0, 0, 16, 32, x, y, 16, 32);
	} else if (sprite == Tile.TUNNEL_LEFT) {
		drawImage(tunnel, 0, 32, 16, 32, x, y, 16, 32);
	} else if (sprite == Tile.TUNNEL_UP) {
		drawImage(tunnel2, 0, 0, 32, 16, x, y, 32, 16);
	} else if (sprite == Tile.TUNNEL_DOWN) {
		drawImage(tunnel2, 32, 0, 32, 16, x, y, 32, 16);
	}
}
