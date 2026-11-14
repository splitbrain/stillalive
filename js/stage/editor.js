/**
 * The level editor and the test run of the editor map.
 */

import { MAP_HEIGHT, MAP_SIZE, MAP_WIDTH, MouseButton, TILE_SIZE_BITS } from './constants.js';
import { Portal } from './entities/Portal.js';
import { bg } from './images.js';
import { mouseOnPlayfield, unclick } from './inputState.js';
import { isTileHere, isWallAt, loadEditorObjects, loadLevel } from './level.js';
import { MAP_FORMAT, parseMap } from './mapFile.js';
import { game, input, stageEvents, ui } from './state.js';
import { TileMap } from './TileMap.js';
import { Tile, isGravPipeTile, isObjectTile } from './tiles.js';

/** @type {{tiles: number[], properties: object}[]} The map after each change, for undo and redo. */
let undoMap;
/** @type {number} The index of the current map in undoMap. */
let undoIndex;
/** @type {number} The mouse release state of the previous tick. */
let oldMouseReleased = 0;
/** @type {{tiles: number[], bg: number}} The editor map while the stage shows something else. */
let storedMap = { tiles: new Array(MAP_SIZE).fill(Tile.EMPTY), bg: 0 };
/**
 * The properties of the editor map other than the format, the tiles and the background, e.g. the title and the
 * events. The editor replaces the object as a whole, so the undo list can share it.
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
	game.portals = [new Portal(), new Portal()];
	unclick();
	ui.mode = 'edit';
	game.map = new TileMap(game.oldMap);
	game.events.message = null;
	rebuildObjects();
	if (report) stageEvents.push({ type: 'died', detail: null });
}

/**
 * Mark the map as changed, so the update creates the objects again.
 *
 * @returns {void}
 */
function mapChanged() {
	ui.editor.objectsChanged = true;
}

/**
 * Show the edited logic tiles in the display layer, and mark the map as changed if a tile changed. Before the edit,
 * the two layers are equal, so the version increases only for a tile with a new id.
 *
 * @param {number} version The version of the map before the edit.
 * @returns {void}
 */
function mapChangedSince(version) {
	const map = game.map;
	for (let i = 0; i < map.tiles.length; i++) {
		if (map.display[i] != map.tiles[i]) map.setDisplay(i, map.tiles[i]);
	}
	if (map.version != version) mapChanged();
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
	game.boss = null;
	game.shakeX = 0;
	game.shakeY = 0;
	game.map = new TileMap(storedMap.tiles);
	game.background = storedMap.bg;
	if (map || !undoMap) {
		undoMap = new Array();
		undoIndex = -1;
		addUndo();
	}

	unclick();
	game.sparkles = new Array();
	rebuildObjects();
}

/**
 * Keep the editor map while the stage shows something else.
 *
 * @returns {void}
 */
export function leaveEditor() {
	storedMap = { tiles: game.map.tiles.slice(), bg: game.background };
}

/**
 * Get the editor map.
 *
 * @returns {object} The editor map in the map file format without the format property, with a copy of the tiles.
 */
export function editorMap() {
	if (ui.mode == 'edit') return { ...properties, bg: game.background, tiles: game.map.tiles.slice() };
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
 * Apply the mouse edits and the undo and redo keys of one tick.
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
	game.map.replace(new Array(MAP_SIZE).fill(Tile.EMPTY));
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
	game.map.replace(undoMap[undoIndex].tiles);
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
	game.map.replace(undoMap[undoIndex].tiles);
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
	const map = game.map;
	let i;
	if (mouseOnPlayfield() && isObjectTile(brush)) {
		const x = (input.mouseX >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
		const y = (input.mouseY >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
		if (input.mousePressed) {
			const version = map.version;
			const xt = x >> TILE_SIZE_BITS;
			const yt = y >> TILE_SIZE_BITS;

			const tile = map.index(xt, yt);
			if (input.mouseButton == MouseButton.LEFT) {
				if (brush == Tile.PLAYER_START) {
					for (i = 0; i < map.tiles.length; i++) {
						if (map.tiles[i] == Tile.PLAYER_START) map.setTile(i, Tile.EMPTY);
					}
				}

				eraseSprites(brush, xt, yt);

				if (allowTile(brush)) {
					map.setTile(tile, brush);
				}
			} else if (input.mouseButton == MouseButton.RIGHT) {
				map.setTile(tile, Tile.EMPTY);
				eraseSprites(brush, xt, yt);
			}
			build();
			mapChangedSince(version);
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
	for (i = 0; i < game.map.tiles.length; i++) {
		if (game.map.tiles[i] == tile) c++;
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
	const map = game.map;
	let h, t;
	if (til == Tile.PLATFORM_RIGHT || til == Tile.PLATFORM_LEFT || til == Tile.GRAVPIPE_UP || til == Tile.GRAVPIPE_DOWN) {
		// objects wider than one tile
		for (h = 1; h < 3; h++) {
			if (h == 2 && til >= Tile.GRAVPIPE_UP) continue;
			if (xt + h < MAP_WIDTH) {
				map.setTile(map.index(xt + h, yt), Tile.EMPTY);
				if (yt - 1 >= 0) {
					t = map.tiles[map.index(xt + h, yt - 1)];
					if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isGravPipeTile(t))
						map.setTile(map.index(xt + h, yt - 1), Tile.EMPTY);
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
			map.setTile(map.index(xt, yt + 1), Tile.EMPTY);
			for (h = 1; h < 3; h++) {
				if (xt - h >= 0) {
					t = map.tiles[map.index(xt - h, yt + 1)];
					if (t == Tile.PLATFORM_RIGHT || t == Tile.PLATFORM_LEFT || t == Tile.GRAVPIPE_UP || t == Tile.GRAVPIPE_DOWN)
						map.setTile(map.index(xt - h, yt + 1), Tile.EMPTY);
				}
			}
		}
	}

	if (yt - 1 >= 0) {
		t = map.tiles[map.index(xt, yt - 1)];
		if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isGravPipeTile(t))
			map.setTile(map.index(xt, yt - 1), Tile.EMPTY);
	}
	for (h = 1; h < 3; h++) {
		if (xt - h >= 0) {
			t = map.tiles[map.index(xt - h, yt)];
			if (t == Tile.PLATFORM_RIGHT || t == Tile.PLATFORM_LEFT) map.setTile(map.index(xt - h, yt), Tile.EMPTY);
			else if ((t == Tile.GRAVPIPE_UP || t == Tile.GRAVPIPE_DOWN) && h < 2)
				map.setTile(map.index(xt - h, yt), Tile.EMPTY);
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
	const map = game.map;
	let i;
	if (mouseOnPlayfield() && !isObjectTile(brush)) {
		const x = (input.mouseX >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
		const y = (input.mouseY >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
		if (input.mousePressed) {
			const version = map.version;
			const tile = map.index(x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS);
			if (input.mouseButton == MouseButton.LEFT) {
				if (brush == Tile.PLASMA_START) {
					for (i = 0; i < map.tiles.length; i++) {
						if (map.tiles[i] == Tile.PLASMA_START) {
							map.setTile(i, Tile.EMPTY);
							break;
						}
					}
				}
				map.setTile(tile, brush);
			} else if (input.mouseButton == MouseButton.RIGHT) map.setTile(tile, Tile.EMPTY);
			// a map has one plasma start, so it does not fill
			else if (input.mouseButton == MouseButton.MIDDLE && brush != Tile.PLASMA_START)
				fill(brush, map.tiles[tile], x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS);

			const xt = x >> TILE_SIZE_BITS;
			const yt = y >> TILE_SIZE_BITS;

			if (yt - 1 >= 0) {
				const t = map.tiles[map.index(xt, yt - 1)];
				if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isGravPipeTile(t))
					map.setTile(map.index(xt, yt - 1), Tile.EMPTY);
			}

			build();
			mapChangedSince(version);
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
	undoMap[undoIndex] = { tiles: game.map.tiles.slice(), properties };

	if (undoIndex < undoMap.length - 1) {
		const r = undoMap.length - 1 - undoIndex;
		for (i = 0; i < r; i++) undoMap.pop();
	}
}

/**
 * @type {number[]} The wall tile id for each combination of neighbor walls, indexed by the flags up (8), down (4),
 *     left (2) and right (1). A wall tile draws an edge on each side without a neighbor wall.
 */
const WALL_TILES = [16, 15, 14, 10, 13, 8, 9, 3, 12, 7, 6, 5, 11, 2, 4, 1];

/**
 * Choose the wall tile of each wall from its neighbors.
 *
 * @returns {void}
 */
function build() {
	const map = game.map;
	for (let i = 0; i < MAP_SIZE; i++) {
		if (!isWallAt(map, i)) continue;
		const x = map.column(i);
		const y = map.row(i);
		const up = isTileHere(map, x, y - 1);
		const down = isTileHere(map, x, y + 1);
		const left = isTileHere(map, x - 1, y);
		const right = isTileHere(map, x + 1, y);
		map.setTile(i, WALL_TILES[(up << 3) | (down << 2) | (left << 1) | right]);
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
	const map = game.map;
	let j, k, i;
	const tmpMap = new Array();
	for (i = 0; i < MAP_SIZE; i++) {
		tmpMap.push(-1);
	}

	let current = 0;
	let count = 1;
	tmpMap[current] = map.index(x, y);

	while (current < MAP_SIZE && tmpMap[current] != -1) {
		const t = tmpMap[current];
		y = map.row(t);
		x = map.column(t);
		map.setTile(t, tile);
		if (x < MAP_WIDTH - 1 && map.tiles[map.index(x + 1, y)] == toFill) {
			j = true;
			for (k = 0; k < count; k++) {
				if (tmpMap[k] == map.index(x + 1, y)) j = false;
			}
			if (j) tmpMap[count++] = map.index(x + 1, y);
		}
		if (x > 0 && map.tiles[map.index(x - 1, y)] == toFill) {
			j = true;
			for (k = 0; k < count; k++) {
				if (tmpMap[k] == map.index(x - 1, y)) j = false;
			}
			if (j) tmpMap[count++] = map.index(x - 1, y);
		}
		if (y < MAP_HEIGHT - 1 && map.tiles[map.index(x, y + 1)] == toFill) {
			j = true;
			for (k = 0; k < count; k++) {
				if (tmpMap[k] == map.index(x, y + 1)) j = false;
			}
			if (j) tmpMap[count++] = map.index(x, y + 1);
		}
		if (y > 0 && map.tiles[map.index(x, y - 1)] == toFill) {
			j = true;
			for (k = 0; k < count; k++) {
				if (tmpMap[k] == map.index(x, y - 1)) j = false;
			}
			if (j) tmpMap[count++] = map.index(x, y - 1);
		}
		current++;
	}
}
