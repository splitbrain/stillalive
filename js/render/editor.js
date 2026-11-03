/**
 * Drawing of the level editor: the map with its objects, the palettes, the buttons, the save and load screens and the
 * test run.
 */

import { ctx } from '../canvas.js';
import {
	EditorButton,
	EditorMenuButton,
	LEVELS_PER_CAMPAIGN,
	MAP_HEIGHT,
	MAP_WIDTH,
	NUM_TILES,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
} from '../constants.js';
import {
	bg,
	body,
	cake,
	crateImage,
	crosshair,
	head,
	levelEditorHud,
	mapSelection,
	noLevel,
	platform,
	portalGun,
	tex_leftBG,
	tex_rightBG,
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
	copyCanvas,
	createBuff,
	drawAnimatedTiles,
	drawArrow,
	drawCakes,
	drawCopy,
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
import { drawText } from './hud.js';
import { drawPreviewMap, drawTinyButton } from './menus.js';

/** @type {number} The x position of the object palette. */
const SPRITES_X = 584;
/** @type {number} The y position of the object palette. */
const SPRITES_Y = 142;

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
	ctx.drawImage(portalGun, -5, -5);
	ctx.restore();

	drawTunnels();

	const flipDx = game.player.flip < 0 ? 1 : 0;
	ctx.drawImage(
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
	ctx.drawImage(
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

	ctx.drawImage(levelEditorHud, 0, 0);

	drawLeftTiles();
	drawRightSprites();

	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
	drawText(70, 38, 11);
}

/**
 * Draw the list of the slots of the save screen and the load screen. The slots with a stored map are white.
 *
 * @returns {void}
 */
function drawSlots() {
	ctx.font = 'bold 12px Arial';
	for (let i = 0; i < LEVELS_PER_CAMPAIGN; i++) {
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		if (getEditorMap(i + 1) != null) {
			ctx.fillStyle = 'rgb(255, 255, 255)';
		} else {
			ctx.fillStyle = 'rgb(200, 200, 200)';
		}
		ctx.fillText('Level ' + (i + 1), 549, 105 + 24 + i * 12);
	}

	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the mark of the hovered slot.
 *
 * @returns {void}
 */
function drawSlotHover() {
	if (ui.editor.slotHover < 0) return;
	ctx.fillStyle = 'rgb(15, 112, 144)';
	ctx.fillRect(529, 105 + ui.editor.slotHover * 12 + 2, 90, 14);
}

/**
 * Draw the mark of the selected slot.
 *
 * @returns {void}
 */
function drawSelectedSlot() {
	ctx.fillStyle = 'rgb(15, 112, 144)';
	ctx.fillRect(529, 105 + ui.previewMap * 12 + 2, 90, 14);
}

/**
 * Draw the save screen with the slots.
 *
 * @returns {void}
 */
function drawSaveScreen() {
	const hover = ui.editor.menuHover;
	if (ui.previewMap < 1 || getEditorMap(ui.previewMap) == null) ctx.drawImage(noLevel, game.offsetX, game.offsetY);
	else if (ui.previewMap > 0) drawPreviewMap();
	ctx.drawImage(mapSelection, 0, 0);

	drawSlotHover();
	drawTinyButton(20, 495, hover == EditorMenuButton.EXIT ? 0.9 : 1, 'Exit');

	if (ui.previewMap > 0) {
		drawSelectedSlot();
		drawTinyButton(515, 495, hover == EditorMenuButton.ACCEPT ? 0.9 : 1, 'Save');
	}

	drawTinyButton(180, 495, hover == EditorMenuButton.EXPORT ? 0.9 : 1, 'Export');
	drawTinyButton(340, 495, hover == EditorMenuButton.IMPORT ? 0.9 : 1, 'Import');

	drawSlots();
}

/**
 * Draw the load screen with the slots.
 *
 * @returns {void}
 */
function drawLoadScreen() {
	const hover = ui.editor.menuHover;
	if (ui.previewMap < 1) ctx.drawImage(noLevel, game.offsetX, game.offsetY);
	if (ui.previewMap > 0) drawPreviewMap();
	ctx.drawImage(mapSelection, 0, 0);

	drawSlotHover();
	drawTinyButton(20, 495, hover == EditorMenuButton.EXIT ? 0.9 : 1, 'Exit');

	if (ui.previewMap > 0) {
		drawSelectedSlot();
		drawTinyButton(515, 495, hover == EditorMenuButton.ACCEPT ? 0.9 : 1, 'Load');
		drawTinyButton(180, 495, hover == EditorMenuButton.EXPORT ? 0.9 : 1, 'Export');
	}

	drawTinyButton(340, 495, hover == EditorMenuButton.IMPORT ? 0.9 : 1, 'Import');

	drawSlots();
}

/**
 * Draw the editor: the map, the cursor, the palettes, the buttons and the text.
 *
 * @returns {void}
 */
function drawEditor() {
	const hover = ui.editor.buttonHover;
	drawTileMap();
	drawTileCursor();
	drawSpriteCursor();

	ctx.drawImage(levelEditorHud, 0, 0);
	drawTileSelection();
	drawSpriteSelection();
	drawLeftTiles();
	drawRightSprites();

	drawTinyButton(game.offsetX, game.offsetY + 394, hover == EditorButton.EXIT ? 0.9 : 1, 'Exit');
	drawTinyButton(
		game.offsetX + PLAYFIELD_WIDTH - 250,
		game.offsetY + 394,
		hover == EditorButton.LOAD ? 0.9 : 1,
		'Load',
	);
	drawTinyButton(
		game.offsetX + PLAYFIELD_WIDTH - 120,
		game.offsetY + 394,
		hover == EditorButton.SAVE ? 0.9 : 1,
		'Save',
	);
	drawTinyButton(game.offsetX + 130, game.offsetY + 394, hover == EditorButton.CLEAR ? 0.9 : 1, 'Clear');
	drawTinyButton(game.offsetX + 60, game.offsetY + 420, hover == EditorButton.TRY ? 0.9 : 1, 'Try Map');
	drawTinyButton(game.offsetX + 60 + 130, game.offsetY + 420, hover == EditorButton.HELP ? 0.9 : 1, 'Help');

	drawText(70, 38, 11);

	if (!mouseInZone(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT))
		ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
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
		ctx.drawImage(bg[game.background], game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
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
				ctx.drawImage(tileset[game.map[i]], x * 16 + game.offsetX, y * 16 + game.offsetY);
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
	ctx.drawImage(tileset[editor.tilesToDraw[editor.selectedTile]], x, y);
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
	if (sprite == Tile.CAKE) ctx.drawImage(cake, x, y);
	else if (sprite == Tile.CRATE) ctx.drawImage(crateImage, x, y);
	else if (sprite == Tile.TURRET_LEFT) ctx.drawImage(turretImages[0], 0, 0, 16, 32, x, y, 16, 32);
	else if (sprite == Tile.TURRET_RIGHT) ctx.drawImage(turretImages[1], 0, 0, 16, 32, x, y, 16, 32);
	else if (sprite == Tile.PLATFORM_RIGHT) {
		ctx.drawImage(platform, x, y);
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		drawArrow(x + 5, y + 8, x + 15, y + 8, 3, 1);
	} else if (sprite == Tile.PLATFORM_LEFT) {
		ctx.drawImage(platform, x, y);
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		drawArrow(x + 5, y + 8, x + 15, y + 8, 3, -1);
	} else if (sprite == Tile.PLAYER_START) drawPlayer(x, y, 0);
	else if (sprite == Tile.TUNNEL_RIGHT) {
		ctx.drawImage(tunnel, 0, 0, 16, 32, x, y, 16, 32);
	} else if (sprite == Tile.TUNNEL_LEFT) {
		ctx.drawImage(tunnel, 0, 32, 16, 32, x, y, 16, 32);
	} else if (sprite == Tile.TUNNEL_UP) {
		ctx.drawImage(tunnel2, 0, 0, 32, 16, x, y, 32, 16);
	} else if (sprite == Tile.TUNNEL_DOWN) {
		ctx.drawImage(tunnel2, 32, 0, 32, 16, x, y, 32, 16);
	}
}

/**
 * Get the rectangle of the mark around an object of the object palette.
 *
 * @param {number} sprite The object id.
 * @returns {number[]|null} The x position, the y position, the width and the height, or null for an unknown id.
 */
function spriteMark(sprite) {
	const x = SPRITES_X;
	const y = SPRITES_Y;
	if (sprite == Tile.CAKE) return [x - 2, y - 2, 20, 20];
	if (sprite == Tile.CRATE) return [x + 24 - 2, y - 2, 20, 20];
	if (sprite == Tile.TURRET_LEFT) return [x - 2, y + 24 - 2, 20, 36];
	if (sprite == Tile.TURRET_RIGHT) return [x + 24 - 2, y + 24 - 2, 20, 36];
	if (sprite == Tile.PLATFORM_RIGHT) return [x - 2, y + 24 + 40 - 2, 52, 20];
	if (sprite == Tile.PLATFORM_LEFT) return [x - 2, y + 24 + 40 + 24 - 2, 52, 20];
	if (sprite == Tile.PLAYER_START) return [x - 2, y + 24 + 40 + 24 + 24 - 2, 20, 30];
	if (sprite == Tile.TUNNEL_RIGHT) return [x - 2, y + 142, 20, 36];
	if (sprite == Tile.TUNNEL_LEFT) return [x + 22, y + 142, 20, 36];
	if (sprite == Tile.TUNNEL_UP) return [x - 2, y + 178, 36, 20];
	if (sprite == Tile.TUNNEL_DOWN) return [x - 2, y + 198, 36, 20];
	return null;
}

/**
 * Draw the marks of the object palette: the hovered object in red, the background arrows and the selected object in
 * green.
 *
 * @returns {void}
 */
function drawSpriteSelection() {
	const editor = ui.editor;
	const hovered = spriteMark(editor.spriteHover);
	if (hovered) {
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.fillRect(...hovered);
	}
	if (editor.arrowHover) {
		ctx.fillStyle = 'rgb(3, 108, 134)';
		ctx.fillRect(editor.arrowHover < 0 ? 3 : 32, 412, 27, 47);
	}
	const selected = editor.selectedSprite > 0 ? spriteMark(editor.selectedSprite) : null;
	if (selected) {
		ctx.fillStyle = 'rgb(0, 255, 0)';
		ctx.fillRect(...selected);
	}
}

/**
 * Draw the marks of the tile palette: the hovered tile in red and the selected tile in green.
 *
 * @returns {void}
 */
function drawTileSelection() {
	const editor = ui.editor;
	if (editor.tileHover) {
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.fillRect(Math.trunc(input.mouseX / 20) * 20 + 2, Math.trunc(input.mouseY / 20) * 20 - 4, 20, 20);
	}
	if (editor.selectedTile > -1) {
		ctx.fillStyle = 'rgb(0, 255, 0)';
		ctx.fillRect((editor.selectedTile % 3) * 20 + 2, Math.trunc(editor.selectedTile / 3) * 20 + 136, 20, 20);
	}
}

/**
 * Draw the object palette on the right.
 *
 * @returns {void}
 */
function drawRightSprites() {
	const x = SPRITES_X;
	const y = SPRITES_Y;

	ctx.drawImage(cake, x, y);
	ctx.drawImage(crateImage, x + 24, y);
	ctx.drawImage(turretImages[0], 0, 0, 16, 32, x, y + 24, 16, 32);
	ctx.drawImage(turretImages[1], 0, 0, 16, 32, x + 24, y + 24, 16, 32);

	ctx.fillStyle = 'rgb(255, 0, 0)';
	ctx.strokeStyle = 'rgb(255, 0, 0)';

	ctx.drawImage(platform, x, y + 24 + 40);
	drawArrow(x + 5, y + 72, x + 15, y + 72, 3, 1);
	ctx.drawImage(platform, x, y + 88);
	drawArrow(x + 5, y + 96, x + 14, y + 96, 3, -1);

	drawPlayer(x, y + 112, 0);

	ctx.drawImage(tunnel, 0, 0, 16, 32, x, y + 144, 16, 32);
	ctx.drawImage(tunnel, 0, 32, 16, 32, x + 24, y + 144, 16, 32);

	ctx.drawImage(tunnel2, 0, 0, 32, 16, x, y + 180, 32, 16);
	ctx.drawImage(tunnel2, 32, 0, 32, 16, x, y + 200, 32, 16);
}

/**
 * Draw the tile palette on the left and the selected tile below it.
 *
 * @returns {void}
 */
function drawLeftTiles() {
	const editor = ui.editor;
	let x = 4;
	let y = 138;

	for (let i = 0; i < editor.tilesToDraw.length; i++) {
		ctx.drawImage(tileset[editor.tilesToDraw[i]], x, y);
		x += 20;
		if (x > 44) {
			x = 4;
			y += 20;
		}
		if (i == editor.selectedTile) ctx.drawImage(tileset[editor.tilesToDraw[i]], 14, 315, 36, 36);
	}

	ctx.drawImage(tex_leftBG, 3, 412);
	ctx.drawImage(tex_rightBG, 32, 412);
}
