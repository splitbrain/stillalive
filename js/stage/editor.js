/**
 * The level editor: the map with its objects, the painting, undo and redo, and the test run of the map.
 */

import { MAP_HEIGHT, MAP_SIZE, MAP_WIDTH, MouseButton } from './constants.js';
import { Portal } from './entities/Portal.js';
import { bg } from './images.js';
import { mouseOnPlayfield, unclick } from './inputState.js';
import { isTileHere, isWallAt, loadEditorObjects, loadLevel } from './level.js';
import { MAP_FORMAT, parseMap } from './mapFile.js';
import { game, input, stageEvents, ui } from './state.js';
import { Tile, isGravPipeTile, isObjectTile } from './tiles.js';

/** @type {{tiles: number[], properties: object}[]} The map after each change, for undo and redo. */
let undoMap;
/** @type {number} The index of the current map in undoMap. */
let undoIndex;
/** @type {number} The mouse release state of the previous tick. */
let oldMouseReleased = 0;
/** @type {{tiles: number[], bg: number}} The editor map while the stage shows something else. */
let storedMap = { tiles: new Array(MAP_SIZE).fill(0), bg: 0 };
/**
 * The properties of the editor map other than the format, the tiles and the background, e.g. the title and the
 * events. The editor does not change them, and it replaces the object instead of changing it.
 *
 * @type {object}
 */
let properties = {};

/**
 * Start the test run of the map.
 *
 * @returns {void}
 */
export function startPlayingLevel() {
	const level = { ...parseMap({ format: MAP_FORMAT, ...editorMap() }), campaign: '', number: 0, fromBelow: false };
	ui.mode = 'test';
	game.replayMode = false;
	loadLevel(level);
	unclick();
}

/**
 * End the test run and go back to the editor.
 *
 * @param {boolean} [report] True to report the end with the event "died".
 * @returns {void}
 */
export function stopPlayingLevel(report = true) {
	let i;
	game.portals = [new Portal(), new Portal()];
	unclick();
	ui.mode = 'edit';
	game.map = new Array();
	for (i = 0; i < game.oldMap.length; i++) game.map.push(game.oldMap[i]);
	game.message = null;
	ui.editor.redrawTiles = true;
	rebuildObjects();
	if (report) stageEvents.push({ type: 'died', detail: null });
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
 * Mark the map as changed if it differs from an earlier copy.
 *
 * @param {number[]} before The copy of the map before the edit.
 * @returns {void}
 */
function mapChangedSince(before) {
	if (game.map.some((tile, i) => tile != before[i])) mapChanged();
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
 * Open the editor on a new map, or on the editor map from before. A new map starts a new undo list.
 *
 * @param {object} [map] The new map in the map file format, or nothing for the editor map from before.
 * @returns {void}
 */
export function openEditor(map) {
	if (map) {
		const { tiles, bg, ...rest } = map;
		delete rest.format;
		storedMap = { tiles: tiles.slice(), bg };
		properties = rest;
	}
	ui.mode = 'edit';
	game.bossNum = 0;
	game.shakeX = 0;
	game.shakeY = 0;
	game.map = storedMap.tiles.slice();
	game.displayMap = game.map.slice();
	game.background = storedMap.bg;
	if (map || !undoMap) {
		undoMap = new Array();
		undoIndex = -1;
		addUndo();
	}

	unclick();
	game.sparkles = new Array();
	ui.editor.redrawTiles = true;
	rebuildObjects();
}

/**
 * Keep the editor map while the stage shows something else.
 *
 * @returns {void}
 */
export function leaveEditor() {
	storedMap = { tiles: game.map.slice(), bg: game.background };
}

/**
 * Get the editor map.
 *
 * @returns {object} The editor map in the map file format without the format, with a copy of the tiles.
 */
export function editorMap() {
	if (ui.mode == 'edit') return { ...properties, bg: game.background, tiles: game.map.slice() };
	if (ui.mode == 'test') return { ...properties, bg: game.background, tiles: game.oldMap.slice() };
	return { ...properties, bg: storedMap.bg, tiles: storedMap.tiles.slice() };
}

/**
 * Run one tick of the editor. When the map of the editor changed, its objects are created again.
 *
 * @returns {void}
 */
export function updateLevelEditor() {
	updateEditor();
	if (ui.editor.objectsChanged) rebuildObjects();
}

/**
 * Take the edits of the map and the undo and redo keys.
 *
 * @returns {void}
 */
function updateEditor() {
	updateDrawTile();
	updateDrawSprite();
	manageUndoRedo();

	if (oldMouseReleased == 1 && input.mouseReleased == 1) input.mouseReleased = 0;
	oldMouseReleased = input.mouseReleased;
}

/**
 * Remove all tiles, objects and other properties of the editor map.
 *
 * @returns {void}
 */
export function clearEditorMap() {
	game.map.fill(0);
	properties = {};
	addUndo();
	mapChanged();
}

/**
 * Set the background of the editor map. A number outside the range of the backgrounds wraps around.
 *
 * @param {number} n The background index.
 * @returns {void}
 */
export function setEditorBackground(n) {
	game.background = ((n % bg.length) + bg.length) % bg.length;
	mapChanged();
}

/**
 * Go back to the map before the last change.
 *
 * @returns {void}
 */
export function undoEditor() {
	if (undoIndex <= 0) return;
	undoIndex--;
	game.map = undoMap[undoIndex].tiles.slice();
	properties = undoMap[undoIndex].properties;
	mapChanged();
}

/**
 * Go forward to the map of the next change after an undo.
 *
 * @returns {void}
 */
export function redoEditor() {
	if (undoIndex + 1 >= undoMap.length) return;
	undoIndex++;
	game.map = undoMap[undoIndex].tiles.slice();
	properties = undoMap[undoIndex].properties;
	mapChanged();
}

/**
 * Undo or redo a change when the player released the undo or redo keys.
 *
 * @returns {void}
 */
function manageUndoRedo() {
	if (input.undoPressed) undoEditor();
	else if (input.redoPressed) redoEditor();
	input.undoPressed = 0;
	input.redoPressed = 0;
}

/**
 * Place or remove an object at the mouse while a button is pressed.
 *
 * @returns {void}
 */
function updateDrawSprite() {
	const brush = ui.editor.brush;
	let i;
	if (mouseOnPlayfield() && isObjectTile(brush)) {
		const x = (input.mouseX >> 4) << 4;
		const y = (input.mouseY >> 4) << 4;
		if (input.mousePressed) {
			const before = game.map.slice();
			const xt = x >> 4;
			const yt = y >> 4;

			const tile = (y >> 4) * 32 + (x >> 4);
			if (input.mouseButton == MouseButton.LEFT) {
				if (brush == Tile.PLAYER_START) {
					for (i = 0; i < game.map.length; i++) {
						if (game.map[i] == Tile.PLAYER_START) game.map[i] = Tile.EMPTY;
					}
				}

				eraseSprites(brush, xt, yt);

				if (allowTile(brush)) {
					game.map[tile] = brush;
				}
			} else if (input.mouseButton == MouseButton.RIGHT) {
				game.map[tile] = 0;
				eraseSprites(brush, xt, yt);
			}
			build();
			mapChangedSince(before);
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
	} else if (isGravPipeTile(tile)) {
		return (
			countTile(Tile.GRAVPIPE_RIGHT) +
				countTile(Tile.GRAVPIPE_LEFT) +
				countTile(Tile.GRAVPIPE_UP) +
				countTile(Tile.GRAVPIPE_DOWN) <
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
	if (til == Tile.PLATFORM_RIGHT || til == Tile.PLATFORM_LEFT || til == Tile.GRAVPIPE_UP || til == Tile.GRAVPIPE_DOWN) {
		// objects wider than one tile
		for (h = 1; h < 3; h++) {
			if (h == 2 && til >= Tile.GRAVPIPE_UP) continue;
			if (xt + h < MAP_WIDTH) {
				game.map[yt * 32 + xt + h] = 0;
				if (yt - 1 >= 0) {
					t = game.map[(yt - 1) * 32 + xt + h];
					if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isGravPipeTile(t))
						game.map[(yt - 1) * 32 + xt + h] = 0;
				}
			}
		}
	}
	if (
		til == Tile.PLAYER_START ||
		til == Tile.TURRET_LEFT ||
		til == Tile.TURRET_RIGHT ||
		til == Tile.GRAVPIPE_RIGHT ||
		til == Tile.GRAVPIPE_LEFT
	) {
		// objects taller than one tile
		if (yt + 1 < MAP_HEIGHT) {
			game.map[(yt + 1) * 32 + xt] = 0;
			for (h = 1; h < 3; h++) {
				if (xt - h >= 0) {
					t = game.map[(yt + 1) * 32 + xt - h];
					if (t == Tile.PLATFORM_RIGHT || t == Tile.PLATFORM_LEFT || t == Tile.GRAVPIPE_UP || t == Tile.GRAVPIPE_DOWN)
						game.map[(yt + 1) * 32 + xt - h] = 0;
				}
			}
		}
	}

	if (yt - 1 >= 0) {
		t = game.map[(yt - 1) * 32 + xt];
		if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isGravPipeTile(t))
			game.map[(yt - 1) * 32 + xt] = 0;
	}
	for (h = 1; h < 3; h++) {
		if (xt - h >= 0) {
			t = game.map[yt * 32 + xt - h];
			if (t == Tile.PLATFORM_RIGHT || t == Tile.PLATFORM_LEFT) game.map[yt * 32 + xt - h] = 0;
			else if ((t == Tile.GRAVPIPE_UP || t == Tile.GRAVPIPE_DOWN) && h < 2) game.map[yt * 32 + xt - h] = 0;
		}
	}
}

/**
 * Draw, remove or fill tiles at the mouse while a button is pressed.
 *
 * @returns {void}
 */
function updateDrawTile() {
	const brush = ui.editor.brush;
	let i;
	if (mouseOnPlayfield() && !isObjectTile(brush)) {
		const x = (input.mouseX >> 4) << 4;
		const y = (input.mouseY >> 4) << 4;
		if (input.mousePressed) {
			const before = game.map.slice();
			const tile = (y >> 4) * 32 + (x >> 4);
			if (input.mouseButton == MouseButton.LEFT) {
				if (brush == Tile.PLASMA_START) {
					for (i = 0; i < game.map.length; i++) {
						if (game.map[i] == Tile.PLASMA_START) {
							game.map[i] = 0;
							break;
						}
					}
				}
				game.map[tile] = brush;
			} else if (input.mouseButton == MouseButton.RIGHT) game.map[tile] = 0;
			// a map has one plasma start, so it does not fill
			else if (input.mouseButton == MouseButton.MIDDLE && brush != Tile.PLASMA_START)
				fill(brush, game.map[tile], x >> 4, y >> 4);

			const xt = x >> 4;
			const yt = y >> 4;

			if (yt - 1 >= 0) {
				const t = game.map[(yt - 1) * 32 + xt];
				if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isGravPipeTile(t))
					game.map[(yt - 1) * 32 + xt] = 0;
			}

			build();
			mapChangedSince(before);
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
	undoMap[undoIndex] = { tiles: game.map.slice(), properties };

	if (undoIndex < undoMap.length - 1) {
		const r = undoMap.length - 1 - undoIndex;
		for (i = 0; i < r; i++) undoMap.pop();
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
