/**
 * The shared state of the stage.
 */

import { Transition } from './constants.js';

/** @type {object} The state of the current level: the map, the player, the objects, the level time and the boss. */
export const game = {
	replay: undefined,
	replayMode: false,
	cakesLeft: undefined,
	steps: undefined,
	portalShots: undefined,
	background: undefined,
	/** @type {{jump: boolean, portals: boolean}} The abilities of the player at the start of the level. */
	abilities: undefined,
	/** @type {import('./mapFile.js').MapEvent[]} The events of the level. */
	events: undefined,
	/** @type {import('./mapFile.js').MapLabel[]} The texts at positions of the playfield. */
	labels: undefined,
	/** @type {number} The x shift of the drawing in playfield units: the screen shake of the boss levels, else 0. */
	shakeX: 0,
	/** @type {number} The y shift of the drawing in playfield units: the screen shake of the boss levels, else 0. */
	shakeY: 0,
	time: undefined,
	cakes: undefined,
	crates: undefined,
	gravPipes: undefined,
	gravPipeFields: undefined,
	platforms: undefined,
	turrets: undefined,
	sparkles: undefined,
	animatedTiles: undefined,
	projectiles: undefined,
	map: undefined,
	displayMap: undefined,
	oldMap: undefined,
	player: undefined,
	portals: undefined,
	plasmaBall: undefined,
	camera: undefined,
	/** @type {boolean} True when the tiles changed, so the drawing must draw the tile layer again. */
	tilesChanged: undefined,
	/**
	 * @type {number} The portal index plus 1 of a portal that an object is in during this tick, or 0. The drawing then
	 *     draws the tiles around the portals over the objects.
	 */
	objectInPortal: undefined,
	tubeX: undefined,
	tubeY: undefined,
	plasmaX: undefined,
	plasmaY: undefined,
	bossX: undefined,
	bossY: undefined,
	bossNum: 0,
	bossLife: undefined,
	bossIsComing: undefined,
	bossComingTime: undefined,
	rumbleTime: undefined,
	/**
	 * @type {{text: string, wait: boolean, portrait: number}|null} The message of the events of the level, or null:
	 *     the text, true while the message waits for a click, and the speaker, 0 for the robot or the number of the
	 *     boss. Each event creates a new object.
	 */
	message: null,
	/** @type {import('./level.js').Level} The level that runs. */
	level: undefined,
};

/** @type {object} The state of the stage: the mode, the pause, the level end effect and the editor. */
export const ui = {
	/** @type {string} What the stage shows: "idle", "play", "preview", "edit" or "test". */
	mode: 'idle',
	/** @type {boolean} True while the level time stands still for a pause. */
	paused: false,
	/** @type {number} The transition effect of the level end, chosen at random. */
	transition: Transition.HORIZONTAL_LINES,
	/**
	 * @type {object} The state of the level editor: the brush and the flags for the drawing and the objects of the
	 *     map.
	 */
	editor: {
		/** @type {number} The tile id or the object id that the editor paints. */
		brush: 1,
		/** @type {boolean} True when the drawing must draw the tile layer of the editor again. */
		redrawTiles: true,
		/** @type {boolean} True when the objects of the editor map must be created again. */
		objectsChanged: false,
	},
};

/** @type {{type: string, detail: *}[]} The events of the stage from a tick, which the stage element dispatches after the tick. */
export const stageEvents = [];

/** @type {object} The keys and the mouse, and the input state that the game derives from them. */
export const input = {
	keys: 0,
	oldKeys: 0,
	mouseX: 0,
	mouseY: 0,
	mouseOver: false,
	mousePressed: 0,
	mouseReleased: 0,
	mouseButton: 0,
	mouseNewPress: 0,
	/** @type {number} 1 after the undo key was pressed, until the editor takes it. */
	undoPressed: undefined,
	/** @type {number} 1 after the redo key was pressed, until the editor takes it. */
	redoPressed: undefined,
	replayPauseInput: null,
	lastTickInGame: false,
};
