/**
 * The level editor.
 */

import {
	EditorButton,
	EditorMenuButton,
	LEVELS_PER_CAMPAIGN,
	MAP_HEIGHT,
	MAP_SIZE,
	MAP_WIDTH,
	Menu,
	MouseButton,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	PLAYFIELD_X,
	PLAYFIELD_Y,
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
import { updateSparkles } from './entities/Sparkle.js';
import { updateTurrets } from './entities/Turret.js';
import { bg } from './images.js';
import { mouseInZone, unclick } from './inputState.js';
import { isTileHere, isWallAt, loadEditorObjects, loadLevelEditor, loadPreviewMap, manageDoors } from './level.js';
import { exportEditorMap, importEditorMap } from './mapFile.js';
import { atExit } from './physics.js';
import { isInPortal } from './portals.js';
import { game, input, ui } from './state.js';
import { getEditorMap, saveEditorMap } from './storage.js';
import { Tile, isTunnelTile } from './tiles.js';

/** @type {number[][]} The map after each change, for undo and redo. */
let undoMap;
/** @type {number} The index of the current map in undoMap. */
let undoIndex;
/** @type {number} The mouse release state of the previous tick. */
let oldMouseReleased = 0;
/** @type {number} The background of the map while the save or load screen is open. */
let oldBG;

/**
 * Start the test run of the map.
 *
 * @returns {void}
 */
export function startPlayingLevel() {
	let i;
	ui.isTestingLevel = true;
	game.oldMap = new Array();
	for (i = 0; i < game.map.length; i++) game.oldMap.push(game.map[i]);
	loadLevelEditor();
	if (game.cakesLeft == 0) openExit();
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
	ui.isTestingLevel = false;
	game.map = new Array();
	for (i = 0; i < game.oldMap.length; i++) game.map.push(game.oldMap[i]);
	ui.editor.redrawTiles = true;
	rebuildObjects();
	prepareLvlEditorTxt();
}

/**
 * Run one tick of the test run. The test run ends when the player dies.
 *
 * @returns {void}
 */
function updateTestLevel() {
	game.needRedrawTiles = 0;
	game.time++;
	if (!game.player.dead && game.player.fadeNextLevel == -1) {
		game.player.move();
		if (game.needRedrawTiles == 0) game.needRedrawTiles = isInPortal(game.player);
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

	if (game.player.dead) stopPlayingLevel();
}

/**
 * Mark the map as changed, so the update creates the objects again and the drawing draws the tile layer again.
 *
 * @returns {void}
 */
function mapChanged() {
	ui.editor.redrawTiles = true;
	ui.editor.objectsChanged = true;
}

/**
 * Create the objects of the editor map again.
 *
 * @returns {void}
 */
function rebuildObjects() {
	loadEditorObjects();
	ui.editor.objectsChanged = false;
}

/**
 * Open the editor with an empty map.
 *
 * @returns {void}
 */
export function lvlEditorSetup() {
	let i;
	const editor = ui.editor;
	game.background = 0;
	editor.askLoading = false;
	editor.askSaving = false;
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

	editor.tilesToDraw = new Array();
	editor.tilesToDraw.push(0);
	editor.tilesToDraw.push(1);
	for (i = 17; i < 24; i++) editor.tilesToDraw.push(i);
	editor.tilesToDraw.push(29);
	editor.tilesToDraw.push(36);
	editor.tilesToDraw.push(38);
	editor.tilesToDraw.push(40);
	editor.tilesToDraw.push(46);
	editor.tilesToDraw.push(47);
	editor.tilesToDraw.push(49);
	editor.tilesToDraw.push(55);
	editor.tilesToDraw.push(57);

	unclick();
	editor.selectedTile = 1;
	editor.selectedSprite = 0;

	game.player = new Player();
	game.player.x = -(16 << 8);
	game.player.y = 0;

	prepareLvlEditorTxt();
	editor.redrawTiles = true;
	rebuildObjects();
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
 * Run one tick of the editor screen that is open: the test run, the load screen, the save screen or the editor. When
 * the map of the editor changed, its objects are created again.
 *
 * @returns {void}
 */
export function updateLevelEditor() {
	const editor = ui.editor;
	if (ui.isTestingLevel) {
		updateTestLevel();
		if (atExit()) stopPlayingLevel();
	} else if (editor.askLoading) {
		updateLoadScreen();
	} else if (editor.askSaving) {
		updateSaveScreen();
	} else {
		updateEditor();
	}
	if (!ui.isTestingLevel && !editor.askLoading && !editor.askSaving && editor.objectsChanged) rebuildObjects();
}

/**
 * Find the hovered slot and button of the save screen and take the clicks.
 *
 * @returns {void}
 */
function updateSaveScreen() {
	const editor = ui.editor;
	let i;
	editor.slotHover = -1;
	if (mouseInZone(529, 117, 90, 29 * 12)) {
		const y = Math.trunc((input.mouseY - 105) / 12);
		if (y <= LEVELS_PER_CAMPAIGN) {
			editor.slotHover = y;
			if (input.mouseNewPress && y != ui.previewMap) {
				unclick();
				ui.previewMap = y;
				showEditorMap(y);
			}
		}
	}

	let overMenu = -1;
	if (mouseInZone(20, 495, 120, 24)) overMenu = EditorMenuButton.EXIT;
	if (ui.previewMap > 0 && mouseInZone(515, 495, 120, 24)) overMenu = EditorMenuButton.ACCEPT;
	if (mouseInZone(180, 495, 120, 24)) overMenu = EditorMenuButton.EXPORT;
	if (mouseInZone(340, 495, 120, 24)) overMenu = EditorMenuButton.IMPORT;
	editor.menuHover = overMenu;

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
			game.background = oldBG;
			editor.askSaving = false;
			mapChanged();
			game.offsetX = PLAYFIELD_X;
			game.offsetY = PLAYFIELD_Y;
		} else if (overMenu == EditorMenuButton.EXIT) {
			game.offsetX = PLAYFIELD_X;
			game.offsetY = PLAYFIELD_Y;
			editor.askSaving = false;

			game.map = new Array();
			for (i = 0; i < game.oldMap.length; i++) game.map.push(game.oldMap[i]);
			game.background = oldBG;
			mapChanged();
		} else if (overMenu == EditorMenuButton.EXPORT) {
			exportEditorMap(game.oldMap, oldBG);
		} else if (overMenu == EditorMenuButton.IMPORT) {
			startMapImport();
		}
	}
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
	game.background = stored.bg;
	loadPreviewMap(-1);
}

/**
 * Let the player select a map file and open it in the editor.
 */
function startMapImport() {
	importEditorMap()
		.then(function (data) {
			if (ui.currentMenu != Menu.EDITOR || !(ui.editor.askSaving || ui.editor.askLoading)) return;
			game.map = data.tiles.slice();
			game.background = data.bg;
			loadPreviewMap(-1);
			ui.editor.askSaving = false;
			ui.editor.askLoading = false;
			game.offsetX = PLAYFIELD_X;
			game.offsetY = PLAYFIELD_Y;
			mapChanged();
			undoMap = new Array();
			undoIndex = -1;
			addUndo();
		})
		.catch(function (e) {
			alertDialog(e.message, 'Import map');
		});
}

/**
 * Find the hovered slot and button of the load screen and take the clicks.
 *
 * @returns {void}
 */
function updateLoadScreen() {
	const editor = ui.editor;
	let i;
	editor.slotHover = -1;
	if (mouseInZone(529, 117, 90, 29 * 12)) {
		const y = Math.trunc((input.mouseY - 105) / 12);
		if (y <= LEVELS_PER_CAMPAIGN && getEditorMap(y) != null) {
			editor.slotHover = y;
			if (input.mouseNewPress && y != ui.previewMap) {
				unclick();
				ui.previewMap = y;
				showEditorMap(y);
			}
		}
	}

	let overMenu = -1;
	if (mouseInZone(20, 495, 120, 24)) overMenu = EditorMenuButton.EXIT;
	if (ui.previewMap > 0) {
		if (mouseInZone(515, 495, 120, 24)) overMenu = EditorMenuButton.ACCEPT;
		if (mouseInZone(180, 495, 120, 24)) overMenu = EditorMenuButton.EXPORT;
	}
	if (mouseInZone(340, 495, 120, 24)) overMenu = EditorMenuButton.IMPORT;
	editor.menuHover = overMenu;

	if (input.mouseNewPress && overMenu > 0) {
		unclick();
		if (overMenu == EditorMenuButton.ACCEPT) {
			editor.askLoading = false;
			mapChanged();
			game.offsetX = PLAYFIELD_X;
			game.offsetY = PLAYFIELD_Y;

			undoMap = new Array();
			undoIndex = -1;
			addUndo();
		} else if (overMenu == EditorMenuButton.EXIT) {
			game.offsetX = PLAYFIELD_X;
			game.offsetY = PLAYFIELD_Y;

			game.map = new Array();
			for (i = 0; i < game.oldMap.length; i++) game.map.push(game.oldMap[i]);
			game.background = oldBG;
			editor.askLoading = false;
			mapChanged();
		} else if (overMenu == EditorMenuButton.EXPORT) {
			exportEditorMap(game.map, game.background);
		} else if (overMenu == EditorMenuButton.IMPORT) {
			startMapImport();
		}
	}
}

/**
 * Take the edits of the map, the selections in the palettes and the clicks on the buttons.
 *
 * @returns {void}
 */
function updateEditor() {
	let i;
	updateDrawTile();
	updateDrawSprite();
	manageUndoRedo();

	updateTileSelection();
	updateSpriteSelection();

	if (oldMouseReleased == 1 && input.mouseReleased == 1) input.mouseReleased = 0;
	oldMouseReleased = input.mouseReleased;

	let overMenu = -1;
	if (mouseInZone(game.offsetX + PLAYFIELD_WIDTH - 250, game.offsetY + 394, 120, 24)) overMenu = EditorButton.LOAD;
	else if (mouseInZone(game.offsetX + PLAYFIELD_WIDTH - 120, game.offsetY + 394, 120, 24)) overMenu = EditorButton.SAVE;
	else if (mouseInZone(game.offsetX, game.offsetY + 394, 120, 24)) overMenu = EditorButton.EXIT;
	else if (mouseInZone(game.offsetX + 130, game.offsetY + 394, 120, 24)) overMenu = EditorButton.CLEAR;
	else if (mouseInZone(game.offsetX + 60, game.offsetY + 420, 120, 24)) overMenu = EditorButton.TRY;
	else if (mouseInZone(game.offsetX + 60 + 130, game.offsetY + 420, 120, 24)) overMenu = EditorButton.HELP;

	ui.editor.buttonHover = overMenu;

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
			ui.editor.askSaving = true;
			ui.previewMap = -1;
			game.offsetX = 0;
			game.offsetY = PLAYFIELD_Y;
			game.oldMap = new Array();
			for (i = 0; i < game.map.length; i++) game.oldMap.push(game.map[i]);
			oldBG = game.background;
		} else if (overMenu == EditorButton.LOAD) {
			ui.editor.askLoading = true;
			ui.previewMap = -1;
			game.offsetX = 0;
			game.offsetY = PLAYFIELD_Y;
			game.oldMap = new Array();
			for (i = 0; i < game.map.length; i++) game.oldMap.push(game.map[i]);
			oldBG = game.background;
		} else if (overMenu == EditorButton.CLEAR) {
			for (i = 0; i < game.map.length; i++) game.map[i] = 0;
			addUndo();
			mapChanged();
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
		mapChanged();
	} else if (input.rightReleased && undoIndex + 1 < undoMap.length) {
		undoIndex++;
		game.map = new Array();
		for (i = 0; i < MAP_SIZE; i++) game.map.push(undoMap[undoIndex][i]);
		mapChanged();
	}
	input.leftReleased = 0;
	input.rightReleased = 0;
}

/**
 * Place or remove an object at the mouse while a button is pressed.
 *
 * @returns {void}
 */
function updateDrawSprite() {
	const editor = ui.editor;
	let i;
	if (mouseInZone(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT) && editor.selectedSprite > 0) {
		let x = (input.mouseX >> 4) << 4;
		let y = (input.mouseY >> 4) << 4;
		if (input.mousePressed) {
			x -= game.offsetX;
			y -= game.offsetY;
			const xt = x >> 4;
			const yt = y >> 4;

			const tile = (y >> 4) * 32 + (x >> 4);
			if (input.mouseButton == MouseButton.LEFT) {
				if (editor.selectedSprite == Tile.PLAYER_START) {
					for (i = 0; i < game.map.length; i++) {
						if (game.map[i] == Tile.PLAYER_START) game.map[i] = Tile.EMPTY;
					}
				}

				eraseSprites(editor.selectedSprite, xt, yt);

				if (allowTile(editor.selectedSprite)) {
					game.map[tile] = editor.selectedSprite;
				}
			} else if (input.mouseButton == MouseButton.RIGHT) {
				game.map[tile] = 0;
				eraseSprites(editor.selectedSprite, xt, yt);
			}
			build();
			mapChanged();
		} else if (input.mouseReleased) {
			input.mouseReleased = 0;
			addUndo();
			mapChanged();
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
function updateDrawTile() {
	const editor = ui.editor;
	let i;
	if (mouseInZone(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT) && editor.selectedTile > -1) {
		let x = (input.mouseX >> 4) << 4;
		let y = (input.mouseY >> 4) << 4;
		if (input.mousePressed) {
			x -= game.offsetX;
			y -= game.offsetY;
			const tile = (y >> 4) * 32 + (x >> 4);
			if (input.mouseButton == MouseButton.LEFT) {
				if (editor.tilesToDraw[editor.selectedTile] == Tile.PLASMA_START) {
					for (i = 0; i < game.map.length; i++) {
						if (game.map[i] == Tile.PLASMA_START) {
							game.map[i] = 0;
							break;
						}
					}
				}
				game.map[tile] = editor.tilesToDraw[editor.selectedTile];
			} else if (input.mouseButton == MouseButton.RIGHT) game.map[tile] = 0;
			else if (input.mouseButton == MouseButton.MIDDLE)
				fill(editor.tilesToDraw[editor.selectedTile], game.map[tile], x >> 4, y >> 4);

			const xt = x >> 4;
			const yt = y >> 4;

			if (yt - 1 >= 0) {
				const t = game.map[(yt - 1) * 32 + xt];
				if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isTunnelTile(t))
					game.map[(yt - 1) * 32 + xt] = 0;
			}

			build();
			mapChanged();
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
 * Find the hovered object of the object palette and the hovered arrow of the background, and take the clicks on them.
 *
 * @returns {void}
 */
function updateSpriteSelection() {
	const editor = ui.editor;
	editor.spriteHover = 0;
	editor.arrowHover = 0;
	if (mouseInZone(580, 140, 56, 216)) {
		const x = 584;
		const y = 142;
		let inZone = 0;
		if (mouseInZone(x, y, 16, 16)) inZone = Tile.CAKE;
		else if (mouseInZone(x + 24, y, 16, 16)) inZone = Tile.CRATE;
		else if (mouseInZone(x, y + 24, 16, 32)) inZone = Tile.TURRET_LEFT;
		else if (mouseInZone(x + 24, y + 24, 16, 32)) inZone = Tile.TURRET_RIGHT;
		else if (mouseInZone(x, y + 24 + 40, 48, 16)) inZone = Tile.PLATFORM_RIGHT;
		else if (mouseInZone(x, y + 24 + 40 + 24, 48, 16)) inZone = Tile.PLATFORM_LEFT;
		else if (mouseInZone(x, y + 24 + 40 + 24 + 24, 16, 26)) inZone = Tile.PLAYER_START;
		else if (mouseInZone(x, y + 144, 16, 32)) inZone = Tile.TUNNEL_RIGHT;
		else if (mouseInZone(x + 24, y + 144, 16, 32)) inZone = Tile.TUNNEL_LEFT;
		else if (mouseInZone(x, y + 180, 32, 16)) inZone = Tile.TUNNEL_UP;
		else if (mouseInZone(x, y + 200, 32, 16)) inZone = Tile.TUNNEL_DOWN;
		editor.spriteHover = inZone;

		if (input.mouseNewPress) {
			unclick();
			editor.selectedSprite = inZone;
			editor.selectedTile = -1;
		}
	} else if (mouseInZone(0, 400, 62, 48)) {
		if (mouseInZone(3, 412, 27, 47)) editor.arrowHover = -1;
		else if (mouseInZone(32, 412, 27, 47)) editor.arrowHover = 1;

		if (input.mouseNewPress) {
			unclick();
			if (editor.arrowHover < 0) {
				game.background--;
				mapChanged();
				if (game.background < 0) game.background = bg.length - 1;
			} else if (editor.arrowHover > 0) {
				game.background++;
				mapChanged();
				if (game.background == bg.length) game.background = 0;
			}
		}
	}
}

/**
 * Find out if the mouse is over the tile palette, and select the tile under the mouse on a click.
 *
 * @returns {void}
 */
function updateTileSelection() {
	const editor = ui.editor;
	editor.tileHover = mouseInZone(4, 140, 56, 118);
	if (editor.tileHover && input.mouseNewPress) {
		unclick();
		editor.selectedSprite = -1;
		const x = Math.trunc(input.mouseX / 20) * 20 + 2;
		const y = Math.trunc(input.mouseY / 20) * 20 - 4;
		const xt = Math.trunc(x / 20);
		const yt = Math.trunc((y - 136) / 20);
		editor.selectedTile = xt + yt * 3;
	}
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
