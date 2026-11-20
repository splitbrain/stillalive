/**
 * The Editor object.
 */

import { BACKGROUND_COUNT, MouseButton, TILE_SIZE_BITS } from '../constants.js';
import { allowTile, build, eraseBodyAbove, eraseBodies, fill } from './mapEdit.js';
import { emptyTiles, TileMap } from '../world/TileMap.js';
import { Tile, isBodyTile } from '../map/tiles.js';
import { UndoList } from './UndoList.js';
import { levelFromMap } from '../world/level.js';

/**
 * The state of the level editor: the editor map, its background, the brush and the undo list. It exists as long as
 * the stage, so the editor map stays during a test run.
 */
export class Editor {
	/** @type {number} The tile id or the body id that the editor paints. */
	brush = Tile.WALL;

	/**
	 * @type {{column: number, row: number}|null} The tile under the mouse, or null while the pointer is outside the
	 *     canvas or the mouse is outside the map.
	 */
	brushCell = null;

	/**
	 * @type {object} The properties of the editor map other than the format, the tiles and the background, e.g. the
	 *     title and the events. The editor replaces the object as a whole, so the undo list can share it.
	 */
	#properties = {};

	/** @type {TileMap} The tiles of the editor map. */
	#map = new TileMap(emptyTiles());

	/** @type {number} The index of the background image of the editor map. */
	#background = 0;

	/** @type {UndoList} The maps after each change. It starts with the empty map. */
	#undoList = new UndoList();

	/** @type {boolean} The mouse release state of the previous tick. */
	#oldMouseReleased = false;

	/**
	 * Create the editor with an empty map.
	 */
	constructor() {
		this.#addUndo();
	}

	/**
	 * Get the tiles of the editor map.
	 *
	 * @returns {TileMap} The editor map.
	 */
	get map() {
		return this.#map;
	}

	/**
	 * Get the background of the editor map.
	 *
	 * @returns {number} The index of the background image.
	 */
	get background() {
		return this.#background;
	}

	/**
	 * Get a copy of the editor map as a level for the test run.
	 *
	 * @returns {import('../world/level.js').Level} The level.
	 */
	testLevel() {
		return levelFromMap(this.getMap(), '', 0);
	}

	/**
	 * Put a new map into the editor and start a new undo list.
	 *
	 * @param {import('../map/mapFile.js').MapFile} map The new map in the map file format.
	 * @returns {void}
	 */
	open(map) {
		const { tiles, bg, ...rest } = map;
		delete rest.format;
		this.#map = new TileMap(tiles);
		this.#background = bg;
		this.#properties = rest;
		this.#undoList = new UndoList();
		this.#addUndo();
	}

	/**
	 * Get the editor map.
	 *
	 * @returns {import('../map/mapFile.js').MapFile} The editor map in the map file format without the format property, with
	 *     a copy of the tiles.
	 */
	getMap() {
		return { ...this.#properties, bg: this.#background, tiles: [...this.#map.tiles] };
	}

	/**
	 * Run one tick: find the tile under the mouse, change the map at the mouse, and undo or redo a change.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse of the tick.
	 * @returns {void}
	 */
	tick(input) {
		this.brushCell =
			input.mouseOver && input.mouseOnPlayfield()
				? { column: input.mouseX >> TILE_SIZE_BITS, row: input.mouseY >> TILE_SIZE_BITS }
				: null;
		this.#updateDrawTile(input);
		this.#updateDrawBody(input);
		this.#manageUndoRedo(input);

		if (this.#oldMouseReleased && input.mouseReleased) input.mouseReleased = false;
		this.#oldMouseReleased = input.mouseReleased;
	}

	/**
	 * Remove all tiles, bodies and other properties of the editor map.
	 *
	 * @returns {void}
	 */
	clear() {
		this.#map.replace(emptyTiles());
		this.#properties = {};
		this.#addUndo();
	}

	/**
	 * Set the background of the editor map. A number outside the range of the backgrounds wraps around.
	 *
	 * @param {number} index The background index.
	 * @returns {void}
	 */
	setBackground(index) {
		this.#background = ((index % BACKGROUND_COUNT) + BACKGROUND_COUNT) % BACKGROUND_COUNT;
	}

	/**
	 * Go back to the map before the last change.
	 *
	 * @returns {void}
	 */
	undo() {
		this.#restore(this.#undoList.undo());
	}

	/**
	 * Go forward to the map of the next change after an undo.
	 *
	 * @returns {void}
	 */
	redo() {
		this.#restore(this.#undoList.redo());
	}

	/**
	 * Put a map of the undo list into the editor.
	 *
	 * @param {import('./UndoList.js').UndoEntry|null} entry The map, or null for no change.
	 * @returns {void}
	 */
	#restore(entry) {
		if (!entry) return;
		this.#map.replace(entry.tiles);
		this.#properties = entry.properties;
	}

	/**
	 * Show the edited logic tiles in the display layer.
	 *
	 * @returns {void}
	 */
	#showEditedTiles() {
		const map = this.#map;
		for (const [i, tile] of map.tiles.entries()) {
			if (map.display[i] !== tile) map.setDisplay(i, tile);
		}
	}

	/**
	 * Add the current map to the undo list.
	 *
	 * @returns {void}
	 */
	#addUndo() {
		this.#undoList.add({ tiles: [...this.#map.tiles], properties: this.#properties });
	}

	/**
	 * Undo or redo a change when the player released the undo or redo keys.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse of the tick.
	 * @returns {void}
	 */
	#manageUndoRedo(input) {
		if (input.undoPressed) this.undo();
		else if (input.redoPressed) this.redo();
		input.undoPressed = false;
		input.redoPressed = false;
	}

	/**
	 * Place or remove a body at the mouse while a button is pressed.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse of the tick.
	 * @returns {void}
	 */
	#updateDrawBody(input) {
		const brush = this.brush;
		const map = this.#map;
		if (!input.mouseOnPlayfield() || !isBodyTile(brush)) return;
		if (!input.mousePressed) {
			if (input.mouseReleased) {
				input.mouseReleased = false;
				this.#addUndo();
			}
			return;
		}

		const column = input.mouseX >> TILE_SIZE_BITS;
		const row = input.mouseY >> TILE_SIZE_BITS;
		const tile = map.index(column, row);
		switch (input.mouseButton) {
			case MouseButton.LEFT:
				// a map has one player start, and a player launch tile is a player start too
				if (brush === Tile.PLAYER_START) {
					for (const [i, id] of map.tiles.entries()) {
						if (id === Tile.PLAYER_START || id === Tile.PLAYER_LAUNCH_UP) map.setTile(i, Tile.EMPTY);
					}
				}
				eraseBodies(map, brush, column, row);
				if (allowTile(map, brush)) map.setTile(tile, brush);
				break;
			case MouseButton.RIGHT:
				map.setTile(tile, Tile.EMPTY);
				eraseBodies(map, brush, column, row);
				break;
		}
		build(map);
		this.#showEditedTiles();
	}

	/**
	 * Draw, remove or fill tiles at the mouse while a button is pressed.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys and the mouse of the tick.
	 * @returns {void}
	 */
	#updateDrawTile(input) {
		const brush = this.brush;
		const map = this.#map;
		if (!input.mouseOnPlayfield() || isBodyTile(brush)) return;
		if (!input.mousePressed) {
			if (input.mouseReleased) {
				input.mouseReleased = false;
				this.#addUndo();
			}
			return;
		}

		const column = input.mouseX >> TILE_SIZE_BITS;
		const row = input.mouseY >> TILE_SIZE_BITS;
		const tile = map.index(column, row);
		switch (input.mouseButton) {
			case MouseButton.LEFT:
				// a map has one plasma start
				if (brush === Tile.PLASMA_START) {
					const start = map.tiles.indexOf(Tile.PLASMA_START);
					if (start >= 0) map.setTile(start, Tile.EMPTY);
				}
				map.setTile(tile, brush);
				break;
			case MouseButton.RIGHT:
				map.setTile(tile, Tile.EMPTY);
				break;
			case MouseButton.MIDDLE:
				// a map has one plasma start, so it does not fill
				if (brush !== Tile.PLASMA_START) fill(map, brush, map.tiles[tile], column, row);
				break;
		}

		eraseBodyAbove(map, column, row);

		build(map);
		this.#showEditedTiles();
	}
}
