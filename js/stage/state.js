/**
 * The shared state of the stage.
 */

import { Transition } from './constants.js';

/** @type {object} The state of the current level. */
export const game = {
	/** @type {import('./replay.js').Replay} The recording of the current level, or the replay that plays. */
	replay: undefined,
	/** @type {boolean} True while a replay plays. */
	replayMode: false,
	/** @type {number} The number of cakes that the player has not eaten yet. */
	cakesLeft: undefined,
	/** @type {number} The walked distance of the player for the step counter. */
	steps: undefined,
	/** @type {number} The number of portals that the player shot. */
	portalShots: undefined,
	/** @type {number} The index of the background image. */
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
	/** @type {number} The level time in ticks. */
	time: undefined,
	/** @type {import('./entities/Cake.js').Cake[]} The cakes. */
	cakes: undefined,
	/** @type {import('./entities/Crate.js').Crate[]} The crates. */
	crates: undefined,
	/** @type {import('./entities/GravPipe.js').GravPipe[]} The gravitational pipes. */
	gravPipes: undefined,
	/** @type {object[]} The fields of the gravitational pipes. */
	gravPipeFields: undefined,
	/** @type {import('./entities/Platform.js').Platform[]} The moving platforms. */
	platforms: undefined,
	/** @type {import('./entities/Turret.js').Turret[]} The turrets. */
	turrets: undefined,
	/** @type {import('./entities/Sparkle.js').Sparkle[]} The sparkles. */
	sparkles: undefined,
	/** @type {import('./entities/AnimatedTile.js').AnimatedTile[]} The animated tiles. */
	animatedTiles: undefined,
	/** @type {import('./entities/Projectile.js').Projectile[]} The projectiles of the boss. */
	projectiles: undefined,
	/** @type {import('./TileMap.js').TileMap} The tiles of the map. */
	map: undefined,
	/** @type {number[]} The tile ids of the level at the level start. */
	oldMap: undefined,
	/** @type {import('./entities/Player.js').Player} The player. */
	player: undefined,
	/** @type {import('./entities/Portal.js').Portal[]} The two portals. */
	portals: undefined,
	/** @type {import('./entities/Plasma.js').Plasma[]} The plasma balls. */
	plasmaBall: undefined,
	/** @type {import('./entities/Camera.js').Camera} The security camera. */
	camera: undefined,
	/** @type {boolean} True when the tiles changed, so the drawing must draw the tile layer again. */
	tilesChanged: undefined,
	/**
	 * @type {number} The portal index plus 1 of a portal that an object is in during this tick, or 0. The drawing then
	 *     draws the tiles around the portals over the objects.
	 */
	objectInPortal: undefined,
	/** @type {number} The x position of the tube in 1/256 pixels, or -1 for a level without a tube. */
	tubeX: undefined,
	/** @type {number} The y position of the tube in 1/256 pixels, or -1 for a level without a tube. */
	tubeY: undefined,
	/** @type {number} The x start position of the plasma shots of the boss in 1/256 pixels. */
	plasmaX: undefined,
	/** @type {number} The y start position of the plasma shots of the boss in 1/256 pixels. */
	plasmaY: undefined,
	/** @type {import('./entities/Boss.js').Boss|null} The boss of the level, or null for a level without a boss. */
	boss: null,
	/**
	 * @type {{text: string, wait: boolean, portrait: number}|null} The message of the events of the level, or null.
	 *     The property wait is true while the message waits for a click. The portrait is 0 for the robot or the number
	 *     of the boss. Each event creates a new object.
	 */
	message: null,
	/** @type {import('./level.js').Level} The level that runs. */
	level: undefined,
};

/** @type {object} The state of the stage. */
export const ui = {
	/** @type {string} The mode of the stage, "idle", "play", "preview", "edit" or "test". */
	mode: 'idle',
	/** @type {boolean} True while the level time stands still for a pause. */
	paused: false,
	/** @type {number} The transition effect of the level end, chosen at random. */
	transition: Transition.HORIZONTAL_LINES,
	/** @type {object} The state of the level editor. */
	editor: {
		/** @type {number} The tile id or the object id that the editor paints. */
		brush: 1,
		/** @type {boolean} True when the drawing must draw the tile layer of the editor again. */
		redrawTiles: true,
		/** @type {boolean} True when the objects of the editor map must be created again. */
		objectsChanged: false,
	},
};

/** @type {{type: string, detail: *}[]} The events of the stage from a tick. The stage element dispatches them. */
export const stageEvents = [];

/** @type {object} The keys and the mouse, and the input state that the game derives from them. */
export const input = {
	/** @type {number} The key bitmask of the keys and the mouse buttons that are down. */
	keys: 0,
	/** @type {number} The key bitmask of the previous tick. */
	oldKeys: 0,
	/** @type {number} The x position of the mouse in playfield units. */
	mouseX: 0,
	/** @type {number} The y position of the mouse in playfield units. */
	mouseY: 0,
	/** @type {boolean} True while the pointer is over the canvas. */
	mouseOver: false,
	/** @type {number} 1 from the press of a mouse button until its release, else 0. */
	mousePressed: 0,
	/** @type {number} 1 after the release of a mouse button, else 0. */
	mouseReleased: 0,
	/** @type {number} The mouse button of the last press or release, a value of MouseButton. */
	mouseButton: 0,
	/** @type {number} 1 in the first tick of a left click, else 0. */
	mouseNewPress: 0,
	/** @type {number} 1 after the undo key was pressed, until the editor takes it. */
	undoPressed: undefined,
	/** @type {number} 1 after the redo key was pressed, until the editor takes it. */
	redoPressed: undefined,
	/** @type {number[]|null} The input state from captureInput() at the pause of a replay. */
	replayPauseInput: null,
	/** @type {boolean} True if the level ran in the play mode, without a pause, in the previous tick. */
	lastTickInGame: false,
};
