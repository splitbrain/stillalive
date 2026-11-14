/**
 * The level editor and the test run of the editor map.
 */

import { MAP_SIZE, MouseButton, TILE_SIZE_BITS } from './constants.js';
import { bg } from './images.js';
import { allowTile, build, eraseSprites, fill } from './mapEdit.js';
import { MAP_FORMAT, parseMap } from './mapFile.js';
import { input, stageEvents, ui } from './state.js';
import { TileMap } from './TileMap.js';
import { Tile, isGravPipeTile, isObjectTile } from './tiles.js';
import { UndoList } from './UndoList.js';
import { World } from './World.js';

/**
 * The level editor. It holds the editor map, its objects and its undo list as long as the stage exists.
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
	#map = new TileMap(new Array(MAP_SIZE).fill(Tile.EMPTY));

	/** @type {number} The index of the background image of the editor map. */
	#background = 0;

	/** @type {World} The World with the objects of the editor map. It uses the TileMap of the editor. */
	#world = World.forEditor(this.#map);

	/** @type {UndoList|null} The maps after each change, or null before the editor opens for the first time. */
	#undoList = null;

	/** @type {number} The mouse release state of the previous tick. */
	#oldMouseReleased = 0;

	/** @type {boolean} True when the objects of the editor map must be created again. */
	#objectsChanged = false;

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
	 * Start the test run of a copy of the editor map, with the pause and the keys released.
	 *
	 * @param {number} transition The effect of the opening transition, a value of Transition.
	 * @returns {World} The World of the test run.
	 */
	startTest(transition) {
		const level = {
			...parseMap({ format: MAP_FORMAT, ...this.getMap() }),
			campaign: '',
			number: 0,
			fromBelow: false,
		};
		ui.mode = 'test';
		const test = World.forLevel(level, { transition });
		ui.paused = false;
		input.keys = 0;
		input.oldKeys = 0;
		input.unclick();
		return test;
	}

	/**
	 * End the test run and go back to the editor map.
	 *
	 * @param {boolean} [report] True to report the end with the event "died".
	 * @returns {World} The World of the editor map.
	 */
	stopTest(report = true) {
		if (report) stageEvents.push({ type: 'died', detail: null });
		return this.open();
	}

	/**
	 * Open the editor on a new map, or on the editor map from before. A new map starts a new undo list. The objects of
	 * the map are created again.
	 *
	 * @param {object} [map] The new map in the map file format, or nothing for the editor map from before.
	 * @returns {World} The World of the editor map.
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
		ui.mode = 'edit';
		if (map || !this.#undoList) {
			this.#undoList = new UndoList();
			this.#addUndo();
		}

		input.unclick();
		this.#objectsChanged = false;
		return this.#world;
	}

	/**
	 * Get the editor map.
	 *
	 * @returns {object} The editor map in the map file format without the format property, with a copy of the tiles.
	 */
	getMap() {
		return { ...this.#properties, bg: this.#background, tiles: this.#map.tiles.slice() };
	}

	/**
	 * Run one tick of the editor. When the map of the editor changed, its objects are created again.
	 *
	 * @returns {void}
	 */
	update() {
		this.#updateDrawTile();
		this.#updateDrawSprite();
		this.#manageUndoRedo();

		if (this.#oldMouseReleased == 1 && input.mouseReleased == 1) input.mouseReleased = 0;
		this.#oldMouseReleased = input.mouseReleased;

		if (this.#objectsChanged) this.#rebuildObjects();
	}

	/**
	 * Remove all tiles, objects and other properties of the editor map.
	 *
	 * @returns {void}
	 */
	clear() {
		this.#map.replace(new Array(MAP_SIZE).fill(Tile.EMPTY));
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
		for (let i = 0; i < map.tiles.length; i++) {
			if (map.display[i] != map.tiles[i]) map.setDisplay(i, map.tiles[i]);
		}
		if (map.version != version) this.#mapChanged();
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
		this.#undoList.add({ tiles: this.#map.tiles.slice(), properties: this.#properties });
	}

	/**
	 * Undo or redo a change when the player released the undo or redo keys.
	 *
	 * @returns {void}
	 */
	#manageUndoRedo() {
		if (input.undoPressed) this.undo();
		else if (input.redoPressed) this.redo();
		input.undoPressed = false;
		input.redoPressed = false;
	}

	/**
	 * Place or remove an object at the mouse while a button is pressed.
	 *
	 * @returns {void}
	 */
	#updateDrawSprite() {
		const brush = this.brush;
		const map = this.#map;
		let i;
		if (input.mouseOnPlayfield() && isObjectTile(brush)) {
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

					eraseSprites(map, brush, xt, yt);

					if (allowTile(map, brush)) {
						map.setTile(tile, brush);
					}
				} else if (input.mouseButton == MouseButton.RIGHT) {
					map.setTile(tile, Tile.EMPTY);
					eraseSprites(map, brush, xt, yt);
				}
				build(map);
				this.#mapChangedSince(version);
			} else if (input.mouseReleased) {
				input.mouseReleased = 0;
				this.#addUndo();
				this.#mapChanged();
			}
		}
	}

	/**
	 * Draw, remove or fill tiles at the mouse while a button is pressed.
	 *
	 * @returns {void}
	 */
	#updateDrawTile() {
		const brush = this.brush;
		const map = this.#map;
		let i;
		if (input.mouseOnPlayfield() && !isObjectTile(brush)) {
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
					fill(map, brush, map.tiles[tile], x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS);

				const xt = x >> TILE_SIZE_BITS;
				const yt = y >> TILE_SIZE_BITS;

				if (yt - 1 >= 0) {
					const t = map.tiles[map.index(xt, yt - 1)];
					if (t == Tile.PLAYER_START || t == Tile.TURRET_LEFT || t == Tile.TURRET_RIGHT || isGravPipeTile(t))
						map.setTile(map.index(xt, yt - 1), Tile.EMPTY);
				}

				build(map);
				this.#mapChangedSince(version);
			} else if (input.mouseReleased) {
				input.mouseReleased = 0;
				this.#addUndo();
			}
		}
	}
}
