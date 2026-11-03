/**
 * The level editor.
 */

import { ctx } from './canvas.js';
import {
	EditorButton,
	EditorMenuButton,
	LEVELS_PER_CAMPAIGN,
	MAP_HEIGHT,
	MAP_SIZE,
	MAP_WIDTH,
	Menu,
	MouseButton,
	NUM_TILES,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
} from './constants.js';
import { alertDialog } from './dialog.js';
import { animateTiles } from './entities/AnimatedTile.js';
import { openExit, updateCakes } from './entities/Cake.js';
import { updateCrates } from './entities/Crate.js';
import { rebuildTunnelFields } from './entities/TunnelField.js';
import { updatePlasma } from './entities/Plasma.js';
import { updatePlatforms } from './entities/Platform.js';
import { Player } from './entities/Player.js';
import { Portal, updatePortals } from './entities/Portal.js';
import { drawSparkles, updateSparkles } from './entities/Sparkle.js';
import { updateTurrets } from './entities/Turret.js';
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
} from './images.js';
import { mouseInZone, unclick } from './input.js';
import { loadEditorObjects, loadLevelEditor, loadPreviewMap, manageDoors } from './level.js';
import { exportEditorMap, importEditorMap } from './mapFile.js';
import { atExit } from './physics.js';
import { inPortal } from './portals.js';
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
	drawTunnels,
	drawTurrets,
} from './render/game.js';
import { drawText } from './render/hud.js';
import { drawPreviewMap, drawTinyButton } from './render/menus.js';
import { game, input, ui } from './state.js';
import { getEditorMap, saveEditorMap } from './storage.js';
import { Tile, TileKind, isTileKind, isTunnelTile } from './tiles.js';
import { getAngle } from './utils.js';

/** @type {number} The index of the selected tile in the palette, or -1. */
let selectedTile;
/** @type {number} The tile id of the selected object of the palette, or 0. */
let selectedSprite;
/** @type {number[]} The tile ids of the palette. */
let tilesToDraw;
/** @type {boolean} True when the tile layer must be drawn again. */
let redrawTiles;
/** @type {OffscreenCanvas} The copy of the tile layer. */
let tilesBuff;
/** @type {number[][]} The map after each change, for undo and redo. */
let undoMap;
/** @type {number} The index of the current map in undoMap. */
let undoIndex;
/** @type {number} The mouse release state of the previous tick. */
let oldMouseReleased = 0;
/** @type {boolean} True while the player tests the map. */
export let isTestingLevel;
/** @type {number} The background of the map while the save or load screen is open. */
let oldBG;
/** @type {boolean} True while the load screen is open. */
let askLoading;
/** @type {boolean} True while the save screen is open. */
let askSaving;

/**
 * Start the test run of the map.
 *
 * @returns {void}
 */
export function startPlayingLevel() {
	let i;
	isTestingLevel = true;
	game.oldMap = new Array();
	for (i = 0; i < game.map.length; i++) game.oldMap.push(game.map[i]);
	loadLevelEditor();
	if (game.CAKELEFT == 0) openExit();
	game.player.fadeNextLevel = -1;
	prepareLvlEditorPlayTxt();
}

/**
 * End the test run and go back to the editor.
 *
 * @returns {void}
 */
export function stopPlayingLevel() {
	let i;
	game.portals = new Array();
	game.portals.push(new Portal());
	game.portals.push(new Portal());
	unclick();
	isTestingLevel = false;
	game.map = new Array();
	for (i = 0; i < game.oldMap.length; i++) game.map.push(game.oldMap[i]);
	redrawTiles = true;
	drawTileMap();
	prepareLvlEditorTxt();
}

/**
 * Run one tick of the test run and draw it. The test run ends when the player dies.
 *
 * @returns {void}
 */
function levelEditorTestLevel() {
	game.needRedrawTiles = 0;
	game.TIME++;
	if (!game.player.dead && game.player.fadeNextLevel == -1) {
		game.player.move();
		if (game.needRedrawTiles == 0) game.needRedrawTiles = inPortal(game.player);
	}

	manageDoors();

	animateTiles();
	game.player.flip = input.mouseX > (game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX ? 1 : -1;
	rebuildTunnelFields();
	updateCakes();
	updateTurrets();
	updatePlasma();
	updateSparkles();
	updateCrates();
	updatePlatforms();
	updatePortals();

	if (game.player.dead) {
		stopPlayingLevel();
		return;
	}

	drawTestLevel();
	drawText(70, 38, 11);
}

/**
 * Draw one tick of the test run.
 *
 * @returns {void}
 */
function drawTestLevel() {
	if (game.needLoad) createBuff();
	drawCopy(game.imgBuff, game.offsetX, game.offsetY);

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
}

/**
 * Open the editor with an empty map.
 *
 * @returns {void}
 */
export function lvlEditorSetup() {
	let i;
	game.BG = 0;
	askLoading = false;
	askSaving = false;
	game.bossNum = 0;

	game.map = new Array();
	game.displayMap = new Array();
	for (i = 0; i < MAP_SIZE; i++) {
		game.map.push(0);
		game.displayMap.push(0);
	}

	undoMap = new Array();
	undoIndex = -1;
	addUndo();

	tilesToDraw = new Array();
	tilesToDraw.push(0);
	tilesToDraw.push(1);
	for (i = 17; i < 24; i++) tilesToDraw.push(i);
	tilesToDraw.push(29);
	tilesToDraw.push(36);
	tilesToDraw.push(38);
	tilesToDraw.push(40);
	tilesToDraw.push(46);
	tilesToDraw.push(47);
	tilesToDraw.push(49);
	tilesToDraw.push(55);
	tilesToDraw.push(57);

	redrawTiles = true;

	unclick();
	selectedTile = 1;
	selectedSprite = 0;

	game.player = new Player();
	game.player.x = -(16 << 8);
	game.player.y = 0;

	prepareLvlEditorTxt();
}

/**
 * Set the text of the robot panel for the editor.
 *
 * @returns {void}
 */
function prepareLvlEditorTxt() {
	ui.timeWriting = 0;
	ui.txtLines = new Array();

	ui.txtLines.push('Welcome to the StillAliveJS Level Editor ! Here is a place where you can easily');
	ui.txtLines.push('create your own maps. You can use your mouse to select tiles or object and draw');
	ui.txtLines.push('them on the screen. Then, try out your map. Have Fun !');
}

/**
 * Set the text of the robot panel for the test run.
 *
 * @returns {void}
 */
function prepareLvlEditorPlayTxt() {
	ui.timeWriting = 0;
	ui.txtLines = new Array();

	ui.txtLines.push('Press <Enter> or <Escape> key to stop testing.');
}

/**
 * Run one tick of the editor or of the test run.
 *
 * @returns {void}
 */
export function drawLevelEditor() {
	if (isTestingLevel) {
		levelEditorTestLevel();
		if (atExit()) stopPlayingLevel();
	} else levelEditorManager();
}

/**
 * Draw the editor screen that is open: the load screen, the save screen or the editor.
 *
 * @returns {void}
 */
function levelEditorManager() {
	if (askLoading) {
		menuLoadMap();
	} else if (askSaving) {
		menuSaveMap();
	} else {
		manageEditor();
	}
}

/**
 * Draw the save screen with the slots and handle its clicks.
 *
 * @returns {void}
 */
function menuSaveMap() {
	let i;
	if (ui.previewMap < 1 || getEditorMap(ui.previewMap) == null) ctx.drawImage(noLevel, game.offsetX, game.offsetY);
	else if (ui.previewMap > 0) drawPreviewMap();
	ctx.drawImage(mapSelection, 0, 0);

	if (mouseInZone(529, 117, 90, 29 * 12)) {
		const y = Math.trunc((input.mouseY - 105) / 12);
		if (y <= LEVELS_PER_CAMPAIGN) {
			ctx.fillStyle = 'rgb(15, 112, 144)';
			ctx.fillRect(529, 105 + y * 12 + 2, 90, 14);

			if (input.mouseNewPress && y != ui.previewMap) {
				unclick();
				ui.previewMap = y;
				showEditorMap(y);
			}
		}
	}

	let overMenu = -1;
	if (mouseInZone(20, 495, 120, 24)) overMenu = EditorMenuButton.EXIT;
	const scale2 = overMenu == EditorMenuButton.EXIT ? 0.9 : 1;
	drawTinyButton(20, 495, scale2, 'Exit');

	if (ui.previewMap > 0) {
		ctx.fillStyle = 'rgb(15, 112, 144)';
		ctx.fillRect(529, 105 + ui.previewMap * 12 + 2, 90, 14);

		if (mouseInZone(515, 495, 120, 24)) overMenu = EditorMenuButton.ACCEPT;
		const scale1 = overMenu == EditorMenuButton.ACCEPT ? 0.9 : 1;

		drawTinyButton(515, 495, scale1, 'Save');
	}

	if (mouseInZone(180, 495, 120, 24)) overMenu = EditorMenuButton.EXPORT;
	drawTinyButton(180, 495, overMenu == EditorMenuButton.EXPORT ? 0.9 : 1, 'Export');
	if (mouseInZone(340, 495, 120, 24)) overMenu = EditorMenuButton.IMPORT;
	drawTinyButton(340, 495, overMenu == EditorMenuButton.IMPORT ? 0.9 : 1, 'Import');

	if (input.mouseNewPress && overMenu > 0) {
		unclick();
		if (overMenu == EditorMenuButton.ACCEPT) {
			if (!saveEditorMap(ui.previewMap, game.oldMap, oldBG)) {
				alertDialog(
					'The map could not be saved, because the browser blocks the storage or the storage is full. ' +
						'Use Export to save the map as a file.',
					'Save map',
				);
				return;
			}

			game.map = new Array();
			for (i = 0; i < game.oldMap.length; i++) game.map.push(game.oldMap[i]);
			game.BG = oldBG;
			askSaving = false;
			redrawTiles = true;
			game.offsetX = 64;
			game.offsetY = 96;
			return;
		} else if (overMenu == EditorMenuButton.EXIT) {
			game.offsetX = 64;
			game.offsetY = 96;
			askSaving = false;

			game.map = new Array();
			for (i = 0; i < game.oldMap.length; i++) game.map.push(game.oldMap[i]);
			game.BG = oldBG;
			redrawTiles = true;
			return;
		} else if (overMenu == EditorMenuButton.EXPORT) {
			exportEditorMap(game.oldMap, oldBG);
		} else if (overMenu == EditorMenuButton.IMPORT) {
			startMapImport();
		}
	}

	ctx.font = 'bold 12px Arial';
	for (i = 0; i < LEVELS_PER_CAMPAIGN; i++) {
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
 * Show a stored editor map in the preview of the save or load screen.
 *
 * @param {number} slot The slot number, starting at 1.
 */
function showEditorMap(slot) {
	const stored = getEditorMap(slot);
	if (stored == null) return;
	game.map = stored.tiles.slice();
	game.BG = stored.bg;
	loadPreviewMap(-1);
}

/**
 * Let the player select a map file and open it in the editor.
 */
function startMapImport() {
	importEditorMap()
		.then(function (data) {
			if (ui.currentMenu != Menu.EDITOR || !(askSaving || askLoading)) return;
			game.map = data.tiles.slice();
			game.BG = data.bg;
			loadPreviewMap(-1);
			askSaving = false;
			askLoading = false;
			game.offsetX = 64;
			game.offsetY = 96;
			redrawTiles = true;
			undoMap = new Array();
			undoIndex = -1;
			addUndo();
		})
		.catch(function (e) {
			alertDialog(e.message, 'Import map');
		});
}

/**
 * Draw the load screen with the slots and handle its clicks.
 *
 * @returns {void}
 */
function menuLoadMap() {
	let i;
	if (ui.previewMap < 1) ctx.drawImage(noLevel, game.offsetX, game.offsetY);
	if (ui.previewMap > 0) drawPreviewMap();
	ctx.drawImage(mapSelection, 0, 0);

	if (mouseInZone(529, 117, 90, 29 * 12)) {
		const y = Math.trunc((input.mouseY - 105) / 12);
		if (y <= LEVELS_PER_CAMPAIGN && getEditorMap(y) != null) {
			ctx.fillStyle = 'rgb(15, 112, 144)';
			ctx.fillRect(529, 105 + y * 12 + 2, 90, 14);

			if (input.mouseNewPress && y != ui.previewMap) {
				unclick();
				ui.previewMap = y;
				showEditorMap(y);
			}
		}
	}

	let overMenu = -1;
	if (mouseInZone(20, 495, 120, 24)) overMenu = EditorMenuButton.EXIT;
	const scale2 = overMenu == EditorMenuButton.EXIT ? 0.9 : 1;
	drawTinyButton(20, 495, scale2, 'Exit');

	if (ui.previewMap > 0) {
		ctx.fillStyle = 'rgb(15, 112, 144)';
		ctx.fillRect(529, 105 + ui.previewMap * 12 + 2, 90, 14);

		if (mouseInZone(515, 495, 120, 24)) overMenu = EditorMenuButton.ACCEPT;
		const scale1 = overMenu == EditorMenuButton.ACCEPT ? 0.9 : 1;

		drawTinyButton(515, 495, scale1, 'Load');

		if (mouseInZone(180, 495, 120, 24)) overMenu = EditorMenuButton.EXPORT;
		drawTinyButton(180, 495, overMenu == EditorMenuButton.EXPORT ? 0.9 : 1, 'Export');
	}

	if (mouseInZone(340, 495, 120, 24)) overMenu = EditorMenuButton.IMPORT;
	drawTinyButton(340, 495, overMenu == EditorMenuButton.IMPORT ? 0.9 : 1, 'Import');

	if (input.mouseNewPress && overMenu > 0) {
		unclick();
		if (overMenu == EditorMenuButton.ACCEPT) {
			askLoading = false;
			redrawTiles = true;
			game.offsetX = 64;
			game.offsetY = 96;

			undoMap = new Array();
			undoIndex = -1;
			addUndo();
			return;
		} else if (overMenu == EditorMenuButton.EXIT) {
			game.offsetX = 64;
			game.offsetY = 96;

			game.map = new Array();
			for (i = 0; i < game.oldMap.length; i++) game.map.push(game.oldMap[i]);
			game.BG = oldBG;
			askLoading = false;
			redrawTiles = true;
			return;
		} else if (overMenu == EditorMenuButton.EXPORT) {
			exportEditorMap(game.map, game.BG);
		} else if (overMenu == EditorMenuButton.IMPORT) {
			startMapImport();
		}
	}

	ctx.font = 'bold 12px Arial';
	for (i = 0; i < LEVELS_PER_CAMPAIGN; i++) {
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
 * Draw the editor and handle the palette, the drawing and the buttons.
 *
 * @returns {void}
 */
function manageEditor() {
	let i;
	drawTileMap();
	manageDrawTile();
	manageDrawSprite();
	manageUndoRedo();

	ctx.drawImage(levelEditorHud, 0, 0);
	manageTileSelection();
	manageSpriteSelection();
	drawLeftTiles();
	drawRightSprites();

	if (oldMouseReleased == 1 && input.mouseReleased == 1) input.mouseReleased = 0;
	oldMouseReleased = input.mouseReleased;

	let overMenu = -1;
	if (mouseInZone(game.offsetX + PLAYFIELD_WIDTH - 250, game.offsetY + 394, 120, 24)) overMenu = EditorButton.LOAD;
	else if (mouseInZone(game.offsetX + PLAYFIELD_WIDTH - 120, game.offsetY + 394, 120, 24)) overMenu = EditorButton.SAVE;
	else if (mouseInZone(game.offsetX, game.offsetY + 394, 120, 24)) overMenu = EditorButton.EXIT;
	else if (mouseInZone(game.offsetX + 130, game.offsetY + 394, 120, 24)) overMenu = EditorButton.CLEAR;
	else if (mouseInZone(game.offsetX + 60, game.offsetY + 420, 120, 24)) overMenu = EditorButton.TRY;
	else if (mouseInZone(game.offsetX + 60 + 130, game.offsetY + 420, 120, 24)) overMenu = EditorButton.HELP;

	const scale1 = overMenu == EditorButton.LOAD ? 0.9 : 1;
	const scale2 = overMenu == EditorButton.SAVE ? 0.9 : 1;
	const scale3 = overMenu == EditorButton.EXIT ? 0.9 : 1;
	const scale4 = overMenu == EditorButton.CLEAR ? 0.9 : 1;
	const scale5 = overMenu == EditorButton.TRY ? 0.9 : 1;
	const scale6 = overMenu == EditorButton.HELP ? 0.9 : 1;

	drawTinyButton(game.offsetX, game.offsetY + 394, scale3, 'Exit');
	drawTinyButton(game.offsetX + PLAYFIELD_WIDTH - 250, game.offsetY + 394, scale1, 'Load');
	drawTinyButton(game.offsetX + PLAYFIELD_WIDTH - 120, game.offsetY + 394, scale2, 'Save');
	drawTinyButton(game.offsetX + 130, game.offsetY + 394, scale4, 'Clear');
	drawTinyButton(game.offsetX + 60, game.offsetY + 420, scale5, 'Try Map');
	drawTinyButton(game.offsetX + 60 + 130, game.offsetY + 420, scale6, 'Help');

	drawText(70, 38, 11);

	if (!mouseInZone(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT))
		ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	if (overMenu > 0 && input.mouseNewPress) {
		unclick();
		if (overMenu == EditorButton.TRY) {
			startPlayingLevel();
		} else if (overMenu == EditorButton.HELP) {
			alertDialog(
				'Left click : Put tile or object\n' +
					'Right click : Remove tile or object\n' +
					'Middle click : Fill\n' +
					'ctrl + z : Undo\n' +
					'ctrl + y : Redo\n' +
					'Return : Try Map / Stop trying\n' +
					'Escape : Stop trying',
				'Level Editor Shortcuts',
			);
		} else if (overMenu == EditorButton.SAVE) {
			askSaving = true;
			ui.previewMap = -1;
			game.offsetX = 0;
			game.offsetY = 96;
			game.oldMap = new Array();
			for (i = 0; i < game.map.length; i++) game.oldMap.push(game.map[i]);
			oldBG = game.BG;
		} else if (overMenu == EditorButton.LOAD) {
			askLoading = true;
			ui.previewMap = -1;
			game.offsetX = 0;
			game.offsetY = 96;
			game.oldMap = new Array();
			for (i = 0; i < game.map.length; i++) game.oldMap.push(game.map[i]);
			oldBG = game.BG;
		} else if (overMenu == EditorButton.CLEAR) {
			for (i = 0; i < game.map.length; i++) game.map[i] = 0;
			addUndo();
			redrawTiles = true;
		} else if (overMenu == EditorButton.EXIT) {
			ui.currentMenu = Menu.MAIN;
			game.sparkles = new Array();
			ui.fadeMenu = 30;
		}
	}
}

/**
 * Undo or redo a change when the player released the undo or redo keys.
 *
 * @returns {void}
 */
function manageUndoRedo() {
	let i;
	if (input.leftReleased && undoIndex > 0) {
		game.map = new Array();
		undoIndex--;
		for (i = 0; i < MAP_SIZE; i++) game.map.push(undoMap[undoIndex][i]);
		redrawTiles = true;
	} else if (input.rightReleased && undoIndex + 1 < undoMap.length) {
		undoIndex++;
		game.map = new Array();
		for (i = 0; i < MAP_SIZE; i++) game.map.push(undoMap[undoIndex][i]);
		redrawTiles = true;
	}
	input.leftReleased = 0;
	input.rightReleased = 0;
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
 * Draw the tile layer of the editor with the plasma start markers, and keep a copy for the next ticks.
 *
 * @returns {void}
 */
function drawTileMap() {
	let y, x, up, down, left, right, i;
	if (redrawTiles) {
		ctx.drawImage(bg[game.BG], game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
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
		loadEditorObjects();
		drawSprites();
		tilesBuff = copyCanvas(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		redrawTiles = false;
	} else {
		drawCopy(tilesBuff, game.offsetX, game.offsetY);
	}
}

/**
 * Place or remove an object at the mouse while a button is pressed.
 *
 * @returns {void}
 */
function manageDrawSprite() {
	let i;
	if (mouseInZone(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT) && selectedSprite > 0) {
		let x = (input.mouseX >> 4) << 4;
		let y = (input.mouseY >> 4) << 4;
		if (selectedSprite == Tile.CAKE) ctx.drawImage(cake, x, y);
		else if (selectedSprite == Tile.CRATE) ctx.drawImage(crateImage, x, y);
		else if (selectedSprite == Tile.TURRET_LEFT) ctx.drawImage(turretImages[0], 0, 0, 16, 32, x, y, 16, 32);
		else if (selectedSprite == Tile.TURRET_RIGHT) ctx.drawImage(turretImages[1], 0, 0, 16, 32, x, y, 16, 32);
		else if (selectedSprite == Tile.PLATFORM_RIGHT) {
			ctx.drawImage(platform, x, y);
			ctx.fillStyle = 'rgb(255, 0, 0)';
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, 1);
		} else if (selectedSprite == Tile.PLATFORM_LEFT) {
			ctx.drawImage(platform, x, y);
			ctx.fillStyle = 'rgb(255, 0, 0)';
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, -1);
		} else if (selectedSprite == Tile.PLAYER_START) drawPlayer(x, y, 0);
		else if (selectedSprite == Tile.TUNNEL_RIGHT) {
			ctx.drawImage(tunnel, 0, 0, 16, 32, x, y, 16, 32);
		} else if (selectedSprite == Tile.TUNNEL_LEFT) {
			ctx.drawImage(tunnel, 0, 32, 16, 32, x, y, 16, 32);
		} else if (selectedSprite == Tile.TUNNEL_UP) {
			ctx.drawImage(tunnel2, 0, 0, 32, 16, x, y, 32, 16);
		} else if (selectedSprite == Tile.TUNNEL_DOWN) {
			ctx.drawImage(tunnel2, 32, 0, 32, 16, x, y, 32, 16);
		}

		if (input.mousePressed) {
			x -= game.offsetX;
			y -= game.offsetY;
			const xt = x >> 4;
			const yt = y >> 4;

			const tile = (y >> 4) * 32 + (x >> 4);
			if (input.mouseButton == MouseButton.LEFT) {
				if (selectedSprite == Tile.PLAYER_START) {
					for (i = 0; i < game.map.length; i++) {
						if (game.map[i] == Tile.PLAYER_START) game.map[i] = Tile.EMPTY;
					}
				}

				eraseSprites(selectedSprite, xt, yt);

				if (allowTile(selectedSprite)) {
					game.map[tile] = selectedSprite;
				}
			} else if (input.mouseButton == MouseButton.RIGHT) {
				game.map[tile] = 0;
				eraseSprites(selectedSprite, xt, yt);
			}
			build();
			redrawTiles = true;
		} else if (input.mouseReleased) {
			input.mouseReleased = 0;
			addUndo();
			redrawTiles = true;
		}
	}
}

/**
 * Check if the map can take one more object of a type. Each type has a limit.
 *
 * @param {number} tile The object id.
 * @returns {boolean} True if the object can be placed.
 */
function allowTile(tile) {
	if (tile == Tile.PLAYER_START) return true;

	if (tile == Tile.CAKE) {
		return countTile(tile) < 30;
	} else if (tile == Tile.CRATE) {
		return countTile(tile) < 15;
	} else if (tile == Tile.TURRET_LEFT || tile == Tile.TURRET_RIGHT) {
		return countTile(Tile.TURRET_LEFT) + countTile(Tile.TURRET_RIGHT) < 15;
	} else if (tile == Tile.PLATFORM_RIGHT || tile == Tile.PLATFORM_LEFT) {
		return countTile(Tile.PLATFORM_RIGHT) + countTile(Tile.PLATFORM_LEFT) < 8;
	} else if (isTunnelTile(tile)) {
		return (
			countTile(Tile.TUNNEL_RIGHT) +
				countTile(Tile.TUNNEL_LEFT) +
				countTile(Tile.TUNNEL_UP) +
				countTile(Tile.TUNNEL_DOWN) <
			8
		);
	}

	return false;
}

/**
 * Count the tiles of an id in the map.
 *
 * @param {number} tile The tile id.
 * @returns {number} The count.
 */
function countTile(tile) {
	let i;
	let c = 0;
	for (i = 0; i < game.map.length; i++) {
		if (game.map[i] == tile) c++;
	}

	return c;
}

/**
 * Remove the objects that overlap a new object, because an object covers more than one tile.
 *
 * @param {number} til The id of the new object.
 * @param {number} xt The column of the new object.
 * @param {number} yt The row of the new object.
 * @returns {void}
 */
function eraseSprites(til, xt, yt) {
	let h, t;
	if (til == Tile.PLATFORM_RIGHT || til == Tile.PLATFORM_LEFT || til == Tile.TUNNEL_UP || til == Tile.TUNNEL_DOWN) {
		// objects wider than one tile
		for (h = 1; h < 3; h++) {
			if (h == 2 && til >= Tile.TUNNEL_UP) continue;
			if (xt + h < MAP_WIDTH) {
				game.map[yt * 32 + xt + h] = 0;
				if (yt - 1 >= 0) {
					t = game.map[(yt - 1) * 32 + xt + h];
					if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isTunnelTile(t))
						game.map[(yt - 1) * 32 + xt + h] = 0;
				}
			}
		}
	}
	if (
		til == Tile.PLAYER_START ||
		til == Tile.TURRET_LEFT ||
		til == Tile.TURRET_RIGHT ||
		til == Tile.TUNNEL_RIGHT ||
		til == Tile.TUNNEL_LEFT
	) {
		// objects taller than one tile
		if (yt + 1 < MAP_HEIGHT) {
			game.map[(yt + 1) * 32 + xt] = 0;
			for (h = 1; h < 3; h++) {
				if (xt - h >= 0) {
					t = game.map[(yt + 1) * 32 + xt - h];
					if (t == Tile.PLATFORM_RIGHT || t == Tile.PLATFORM_LEFT || t == Tile.TUNNEL_UP || t == Tile.TUNNEL_DOWN)
						game.map[(yt + 1) * 32 + xt - h] = 0;
				}
			}
		}
	}

	if (yt - 1 >= 0) {
		t = game.map[(yt - 1) * 32 + xt];
		if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isTunnelTile(t))
			game.map[(yt - 1) * 32 + xt] = 0;
	}
	for (h = 1; h < 3; h++) {
		if (xt - h >= 0) {
			t = game.map[yt * 32 + xt - h];
			if (t == Tile.PLATFORM_RIGHT || t == Tile.PLATFORM_LEFT) game.map[yt * 32 + xt - h] = 0;
			else if ((t == Tile.TUNNEL_UP || t == Tile.TUNNEL_DOWN) && h < 2) game.map[yt * 32 + xt - h] = 0;
		}
	}
}

/**
 * Draw, remove or fill tiles at the mouse while a button is pressed.
 *
 * @returns {void}
 */
function manageDrawTile() {
	let i;
	if (mouseInZone(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT) && selectedTile > -1) {
		let x = (input.mouseX >> 4) << 4;
		let y = (input.mouseY >> 4) << 4;
		ctx.drawImage(tileset[tilesToDraw[selectedTile]], x, y);
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, 16, 16);

		if (input.mousePressed) {
			x -= game.offsetX;
			y -= game.offsetY;
			const tile = (y >> 4) * 32 + (x >> 4);
			if (input.mouseButton == MouseButton.LEFT) {
				if (tilesToDraw[selectedTile] == Tile.PLASMA_START) {
					for (i = 0; i < game.map.length; i++) {
						if (game.map[i] == Tile.PLASMA_START) {
							game.map[i] = 0;
							break;
						}
					}
				}
				game.map[tile] = tilesToDraw[selectedTile];
			} else if (input.mouseButton == MouseButton.RIGHT) game.map[tile] = 0;
			else if (input.mouseButton == MouseButton.MIDDLE) fill(tilesToDraw[selectedTile], game.map[tile], x >> 4, y >> 4);

			const xt = x >> 4;
			const yt = y >> 4;

			if (yt - 1 >= 0) {
				const t = game.map[(yt - 1) * 32 + xt];
				if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isTunnelTile(t))
					game.map[(yt - 1) * 32 + xt] = 0;
			}

			build();
			redrawTiles = true;
		} else if (input.mouseReleased) {
			input.mouseReleased = 0;
			addUndo();
		}
	}
}

/**
 * Add the current map to the undo list. The list holds up to eleven maps.
 *
 * @returns {void}
 */
function addUndo() {
	let i;
	if (undoIndex == 10) {
		undoMap.splice(0, 1);
		undoIndex--;
	}
	undoIndex++;
	undoMap[undoIndex] = new Array();
	for (i = 0; i < MAP_SIZE; i++) undoMap[undoIndex].push(game.map[i]);

	if (undoIndex < undoMap.length - 1) {
		const r = undoMap.length - 1 - undoIndex;
		for (i = 0; i < r; i++) undoMap.pop();
	}
}

/**
 * Select an object of the palette on a click and draw the selection.
 *
 * @returns {void}
 */
function manageSpriteSelection() {
	let x,
		y,
		inZone,
		arrow = 0;
	if (mouseInZone(580, 140, 56, 216)) {
		x = 584;
		y = 142;
		inZone = 0;
		ctx.fillStyle = 'rgb(255, 0, 0)';
		if (mouseInZone(x, y, 16, 16)) {
			inZone = Tile.CAKE;
			ctx.fillRect(x - 2, y - 2, 20, 20);
		} else if (mouseInZone(x + 24, y, 16, 16)) {
			inZone = Tile.CRATE;
			ctx.fillRect(x + 24 - 2, y - 2, 20, 20);
		} else if (mouseInZone(x, y + 24, 16, 32)) {
			inZone = Tile.TURRET_LEFT;
			ctx.fillRect(x - 2, y + 24 - 2, 20, 36);
		} else if (mouseInZone(x + 24, y + 24, 16, 32)) {
			inZone = Tile.TURRET_RIGHT;
			ctx.fillRect(x + 24 - 2, y + 24 - 2, 20, 36);
		} else if (mouseInZone(x, y + 24 + 40, 48, 16)) {
			inZone = Tile.PLATFORM_RIGHT;
			ctx.fillRect(x - 2, y + 24 + 40 - 2, 52, 20);
		} else if (mouseInZone(x, y + 24 + 40 + 24, 48, 16)) {
			inZone = Tile.PLATFORM_LEFT;
			ctx.fillRect(x - 2, y + 24 + 40 + 24 - 2, 52, 20);
		} else if (mouseInZone(x, y + 24 + 40 + 24 + 24, 16, 26)) {
			inZone = Tile.PLAYER_START;
			ctx.fillRect(x - 2, y + 24 + 40 + 24 + 24 - 2, 20, 30);
		} else if (mouseInZone(x, y + 144, 16, 32)) {
			inZone = Tile.TUNNEL_RIGHT;
			ctx.fillRect(x - 2, y + 142, 20, 36);
		} else if (mouseInZone(x + 24, y + 144, 16, 32)) {
			inZone = Tile.TUNNEL_LEFT;
			ctx.fillRect(x + 22, y + 142, 20, 36);
		} else if (mouseInZone(x, y + 180, 32, 16)) {
			inZone = Tile.TUNNEL_UP;
			ctx.fillRect(x - 2, y + 178, 36, 20);
		} else if (mouseInZone(x, y + 200, 32, 16)) {
			inZone = Tile.TUNNEL_DOWN;
			ctx.fillRect(x - 2, y + 198, 36, 20);
		}

		if (input.mouseNewPress) {
			unclick();
			selectedSprite = inZone;
			selectedTile = -1;
		}
	} else if (mouseInZone(0, 400, 62, 48)) {
		ctx.fillStyle = 'rgb(3, 108, 134)';
		if (mouseInZone(3, 412, 27, 47)) {
			arrow = -1;
			ctx.fillRect(3, 412, 27, 47);
		} else if (mouseInZone(32, 412, 27, 47)) {
			arrow = 1;
			ctx.fillRect(32, 412, 27, 47);
		}

		if (input.mouseNewPress) {
			unclick();
			if (arrow < 0) {
				game.BG--;
				redrawTiles = true;
				if (game.BG < 0) game.BG = bg.length - 1;
			} else if (arrow > 0) {
				game.BG++;
				redrawTiles = true;
				if (game.BG == bg.length) game.BG = 0;
			}
		}
	}

	if (selectedSprite > 0) {
		x = 584;
		y = 142;
		ctx.fillStyle = 'rgb(0, 255, 0)';
		if (selectedSprite == Tile.CAKE) ctx.fillRect(x - 2, y - 2, 20, 20);
		else if (selectedSprite == Tile.CRATE) ctx.fillRect(x + 24 - 2, y - 2, 20, 20);
		else if (selectedSprite == Tile.TURRET_LEFT) ctx.fillRect(x - 2, y + 24 - 2, 20, 36);
		else if (selectedSprite == Tile.TURRET_RIGHT) ctx.fillRect(x + 24 - 2, y + 24 - 2, 20, 36);
		else if (selectedSprite == Tile.PLATFORM_RIGHT) ctx.fillRect(x - 2, y + 24 + 40 - 2, 52, 20);
		else if (selectedSprite == Tile.PLATFORM_LEFT) ctx.fillRect(x - 2, y + 24 + 40 + 24 - 2, 52, 20);
		else if (selectedSprite == Tile.PLAYER_START) ctx.fillRect(x - 2, y + 24 + 40 + 24 + 24 - 2, 20, 30);
		else if (selectedSprite == Tile.TUNNEL_RIGHT) ctx.fillRect(x - 2, y + 142, 20, 36);
		else if (selectedSprite == Tile.TUNNEL_LEFT) ctx.fillRect(x + 22, y + 142, 20, 36);
		else if (selectedSprite == Tile.TUNNEL_UP) ctx.fillRect(x - 2, y + 178, 36, 20);
		else if (selectedSprite == Tile.TUNNEL_DOWN) ctx.fillRect(x - 2, y + 198, 36, 20);
	}
}

/**
 * Select a tile of the palette on a click and draw the selection.
 *
 * @returns {void}
 */
function manageTileSelection() {
	let x, y;
	if (mouseInZone(4, 140, 56, 118)) {
		x = input.mouseX;
		y = input.mouseY;

		x = Math.trunc(x / 20) * 20 + 2;
		y = Math.trunc(y / 20) * 20 - 4;
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.fillRect(x, y, 20, 20);

		if (input.mouseNewPress) {
			unclick();
			selectedSprite = -1;
			const xt = Math.trunc(x / 20);
			const yt = Math.trunc((y - 136) / 20);
			selectedTile = xt + yt * 3;
		}
	}

	if (selectedTile > -1) {
		ctx.fillStyle = 'rgb(0, 255, 0)';

		x = (selectedTile % 3) * 20 + 2;
		y = Math.trunc(selectedTile / 3) * 20 + 136;

		ctx.fillRect(x, y, 20, 20);
	}
}

/**
 * Draw the object palette on the right.
 *
 * @returns {void}
 */
function drawRightSprites() {
	const x = 584;
	const y = 142;

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
 * Draw the tile palette on the left.
 *
 * @returns {void}
 */
function drawLeftTiles() {
	let i;
	let x = 4;
	let y = 138;

	for (i = 0; i < tilesToDraw.length; i++) {
		ctx.drawImage(tileset[tilesToDraw[i]], x, y);
		x += 20;
		if (x > 44) {
			x = 4;
			y += 20;
		}
		if (i == selectedTile) ctx.drawImage(tileset[tilesToDraw[i]], 14, 315, 36, 36);
	}

	ctx.drawImage(tex_leftBG, 3, 412);
	ctx.drawImage(tex_rightBG, 32, 412);
}

/**
 * Choose the wall tile of each wall from its neighbors.
 *
 * @returns {void}
 */
function build() {
	let up, down, left, right, i;
	for (i = 0; i < MAP_SIZE; i++) {
		if (isWallAt(i)) {
			const y = i >> 5;
			const x = i - (y << 5);

			up = isTileHere(x, y - 1);
			down = isTileHere(x, y + 1);
			left = isTileHere(x - 1, y);
			right = isTileHere(x + 1, y);

			if (up && down && left && !right) {
				game.map[x + y * 32] = 4;
			} else if (up && down && !left && right) {
				game.map[x + y * 32] = 2;
			} else if (up && !down && right && left) {
				game.map[x + y * 32] = 5;
			} else if (!up && down && right && left) {
				game.map[x + y * 32] = 3;
			} else if (!up && down && right && !left) {
				game.map[x + y * 32] = 8;
			} else if (!up && down && !right && left) {
				game.map[x + y * 32] = 9;
			} else if (up && !down && !right && left) {
				game.map[x + y * 32] = 6;
			} else if (up && !down && right && !left) {
				game.map[x + y * 32] = 7;
			} else if (up && down && right && left) {
				game.map[x + y * 32] = 1;
			} else if (up && down && !right && !left) {
				game.map[x + y * 32] = 11;
			} else if (!up && !down && right && left) {
				game.map[x + y * 32] = 10;
			} else if (up && !down && !right && !left) {
				game.map[x + y * 32] = 12;
			} else if (!up && down && !right && !left) {
				game.map[x + y * 32] = 13;
			} else if (!up && !down && !right && left) {
				game.map[x + y * 32] = 14;
			} else if (!up && !down && right && !left) {
				game.map[x + y * 32] = 15;
			} else if (!up && !down && !right && !left) {
				game.map[x + y * 32] = 16;
			}
		}
	}
}

/**
 * Fill a connected area of one tile id with another tile id.
 *
 * @param {number} tile The new tile id.
 * @param {number} toFill The tile id to replace.
 * @param {number} x The column of the start.
 * @param {number} y The row of the start.
 * @returns {void}
 */
function fill(tile, toFill, x, y) {
	let j, k, i;
	const tmpMap = new Array();
	for (i = 0; i < MAP_SIZE; i++) {
		tmpMap.push(-1);
	}

	let current = 0;
	let count = 1;
	tmpMap[current] = x + (y << 5);

	while (current < MAP_SIZE && tmpMap[current] != -1) {
		const t = tmpMap[current];
		y = t >> 5;
		x = t - (y << 5);
		game.map[x + (y << 5)] = tile;
		if (x < 31 && game.map[x + 1 + (y << 5)] == toFill) {
			j = true;
			for (k = 0; k < count; k++) {
				if (tmpMap[k] == x + 1 + (y << 5)) j = false;
			}
			if (j) tmpMap[count++] = x + 1 + (y << 5);
		}
		if (x > 0 && game.map[x - 1 + (y << 5)] == toFill) {
			j = true;
			for (k = 0; k < count; k++) {
				if (tmpMap[k] == x - 1 + (y << 5)) j = false;
			}
			if (j) tmpMap[count++] = x - 1 + (y << 5);
		}
		if (y < 23 && game.map[x + ((y + 1) << 5)] == toFill) {
			j = true;
			for (k = 0; k < count; k++) {
				if (tmpMap[k] == x + ((y + 1) << 5)) j = false;
			}
			if (j) tmpMap[count++] = x + ((y + 1) << 5);
		}
		if (y > 0 && game.map[x + ((y - 1) << 5)] == toFill) {
			j = true;
			for (k = 0; k < count; k++) {
				if (tmpMap[k] == x + ((y - 1) << 5)) j = false;
			}
			if (j) tmpMap[count++] = x + ((y - 1) << 5);
		}
		current++;
	}
}

/**
 * Check if a map position holds a wall.
 *
 * @param {number} index The index in the map.
 * @returns {boolean} True for a wall tile.
 */
function isWallAt(index) {
	return isTileKind(game.map[index], TileKind.WALL);
}

/**
 * Check if a map position is solid for the edges of the walls. Positions outside the map count as solid.
 *
 * @param {number} x The column.
 * @param {number} y The row.
 * @returns {number} 1 for a wall, a decor tile or a conveyor belt, else 0.
 */
function isTileHere(x, y) {
	if (x < 0 || x > 31 || y < 0 || y > 23) return 1;
	if (isTileKind(game.map[x + y * 32], TileKind.BELT_RIGHT, TileKind.BELT_LEFT)) return 1;
	return isTileKind(game.map[x + y * 32], TileKind.WALL, TileKind.DECOR) ? 1 : 0;
}
