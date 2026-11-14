/**
 * The level editor, the session of the mode "edit". It also provides the level for the test run of the editor map.
 */

import { MouseButton, TILE_SIZE_BITS } from './constants.js';
import { bg } from './images.js';
import { allowTile, build, eraseObjectAbove, eraseSprites, fill } from './mapEdit.js';
import { MAP_FORMAT, parseMap } from './mapFile.js';
import { emptyTiles, TileMap } from './TileMap.js';
import { Tile, isObjectTile } from './tiles.js';
import { UndoList } from './UndoList.js';
import { World } from './World.js';

/**
 * The level editor, the session of the mode "edit". It holds the editor map, its objects and its undo list as long as
 * the stage exists.
 */
export class Editor {
	/** @type {number} The tile id or the object id that the editor paints. */
	brush = Tile.WALL;

	/**
	 * @type {object} The properties of the editor map other than the format, the tiles and the background, e.g. the
	 *     title and the events. The editor replaces the object as a whole, so the undo list can share it.
	 */
	#properties = {};

	/** @type {TileMap} The tiles of the editor map. */
	#map = new TileMap(emptyTiles());

	/** @type {number} The index of the background image of the editor map. */
	#background = 0;

	/** @type {World} The World with the objects of the editor map. It uses the TileMap of the editor. */
	#world = World.forEditor(this.#map);

	/** @type {UndoList|null} The maps after each change, or null before the editor opens for the first time. */
	#undoList = null;

	/** @type {boolean} The mouse release state of the previous tick. */
	#oldMouseReleased = false;

	/** @type {boolean} True when the objects of the editor map must be created again. */
	#objectsChanged = false;

	/** @type {import('./InputState.js').InputState} The keys and the mouse. */
	#input;

	/**
	 * Create the editor with an empty map.
	 *
	 * @param {import('./InputState.js').InputState} input The keys and the mouse.
	 */
	constructor(input) {
		this.#input = input;
	}

	/**
	 * Get the mode text of the session.
	 *
	 * @returns {string} "edit".
	 */
	get mode() {
		return 'edit';
	}

	/**
	 * Get the tiles of the editor map.
	 *
	 * @returns {TileMap} The TileMap of the editor.
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
	 * Get the World with the objects of the editor map.
	 *
	 * @returns {World} The World of the editor.
	 */
	get world() {
		return this.#world;
	}

	/**
	 * Get a copy of the editor map as a level for the test run.
	 *
	 * @returns {import('./level.js').Level} The level.
	 */
	testLevel() {
		return { ...parseMap({ format: MAP_FORMAT, ...this.getMap() }), campaign: '', number: 0, fromBelow: false };
	}

	/**
	 * Open the editor on a new map, or on the editor map from before, e.g. after a test run. A new map starts a new
	 * undo list. The editor creates the objects of the map again.
	 *
	 * @param {object} [map] The new map in the map file format, or nothing for the editor map from before.
	 * @returns {void}
	 */
	open(map) {
		if (map) {
			const { tiles, bg, ...rest } = map;
			delete rest.format;
			this.#map = new TileMap(tiles);
			this.#world = World.forEditor(this.#map);
			this.#background = bg;
			this.#properties = rest;
		} else {
			this.#world.createEditorObjects();
		}
		if (map || !this.#undoList) {
			this.#undoList = new UndoList();
			this.#addUndo();
		}

		this.#input.unclick();
		this.#objectsChanged = false;
	}

	/**
	 * Get the editor map.
	 *
	 * @returns {object} The editor map in the map file format without the format property, with a copy of the tiles.
	 */
	getMap() {
		return { ...this.#properties, bg: this.#background, tiles: [...this.#map.tiles] };
	}

	/**
	 * Run one tick: the input of the tick and the edit at the mouse. When the map of the editor changed, its objects
	 * are created again.
	 *
	 * @returns {void}
	 */
	tick() {
		this.#input.update();
		this.#input.endTick();
		this.#edit();
	}

	/**
	 * Draw the editor map and the cursor.
	 *
	 * @param {import('./render/Renderer.js').Renderer} renderer The drawing of the stage.
	 * @returns {void}
	 */
	draw(renderer) {
		renderer.drawEditor(this);
	}

	/**
	 * Change the map at the mouse, undo or redo a change, and create the objects again after a change.
	 *
	 * @returns {void}
	 */
	#edit() {
		this.#updateDrawTile();
		this.#updateDrawSprite();
		this.#manageUndoRedo();

		if (this.#oldMouseReleased && this.#input.mouseReleased) this.#input.mouseReleased = false;
		this.#oldMouseReleased = this.#input.mouseReleased;

		if (this.#objectsChanged) this.#rebuildObjects();
	}

	/**
	 * Remove all tiles, objects and other properties of the editor map.
	 *
	 * @returns {void}
	 */
	clear() {
		this.#map.replace(emptyTiles());
		this.#properties = {};
		this.#addUndo();
		this.#mapChanged();
	}

	/**
	 * Set the background of the editor map. A number outside the range of the backgrounds wraps around.
	 *
	 * @param {number} n The background index.
	 * @returns {void}
	 */
	setBackground(n) {
		this.#background = ((n % bg.length) + bg.length) % bg.length;
		this.#mapChanged();
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
		this.#mapChanged();
	}

	/**
	 * Mark the map as changed, so the update creates the objects again.
	 *
	 * @returns {void}
	 */
	#mapChanged() {
		this.#objectsChanged = true;
	}

	/**
	 * Show the edited logic tiles in the display layer, and mark the map as changed if a tile changed. Before the edit,
	 * the two layers are equal, so the version increases only for a tile with a new id.
	 *
	 * @param {number} version The version of the map before the edit.
	 * @returns {void}
	 */
	#mapChangedSince(version) {
		const map = this.#map;
		for (const [i, tile] of map.tiles.entries()) {
			if (map.display[i] !== tile) map.setDisplay(i, tile);
		}
		if (map.version !== version) this.#mapChanged();
	}

	/**
	 * Create the objects of the editor map again.
	 *
	 * @returns {void}
	 */
	#rebuildObjects() {
		this.#world.createEditorObjects();
		this.#objectsChanged = false;
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
	 * @returns {void}
	 */
	#manageUndoRedo() {
		if (this.#input.undoPressed) this.undo();
		else if (this.#input.redoPressed) this.redo();
		this.#input.undoPressed = false;
		this.#input.redoPressed = false;
	}

	/**
	 * Place or remove an object at the mouse while a button is pressed.
	 *
	 * @returns {void}
	 */
	#updateDrawSprite() {
		const input = this.#input;
		const brush = this.brush;
		const map = this.#map;
		if (!input.mouseOnPlayfield() || !isObjectTile(brush)) return;
		if (!input.mousePressed) {
			if (input.mouseReleased) {
				input.mouseReleased = false;
				this.#addUndo();
				this.#mapChanged();
			}
			return;
		}

		const version = map.version;
		const xt = input.mouseX >> TILE_SIZE_BITS;
		const yt = input.mouseY >> TILE_SIZE_BITS;
		const tile = map.index(xt, yt);
		switch (input.mouseButton) {
			case MouseButton.LEFT:
				// a map has one player start
				if (brush === Tile.PLAYER_START) {
					for (const [i, id] of map.tiles.entries()) {
						if (id === Tile.PLAYER_START) map.setTile(i, Tile.EMPTY);
					}
				}
				eraseSprites(map, brush, xt, yt);
				if (allowTile(map, brush)) map.setTile(tile, brush);
				break;
			case MouseButton.RIGHT:
				map.setTile(tile, Tile.EMPTY);
				eraseSprites(map, brush, xt, yt);
				break;
		}
		build(map);
		this.#mapChangedSince(version);
	}

	/**
	 * Draw, remove or fill tiles at the mouse while a button is pressed.
	 *
	 * @returns {void}
	 */
	#updateDrawTile() {
		const input = this.#input;
		const brush = this.brush;
		const map = this.#map;
		if (!input.mouseOnPlayfield() || isObjectTile(brush)) return;
		if (!input.mousePressed) {
			if (input.mouseReleased) {
				input.mouseReleased = false;
				this.#addUndo();
			}
			return;
		}

		const version = map.version;
		const xt = input.mouseX >> TILE_SIZE_BITS;
		const yt = input.mouseY >> TILE_SIZE_BITS;
		const tile = map.index(xt, yt);
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
				if (brush !== Tile.PLASMA_START) fill(map, brush, map.tiles[tile], xt, yt);
				break;
		}

		eraseObjectAbove(map, xt, yt);

		build(map);
		this.#mapChangedSince(version);
	}
}
