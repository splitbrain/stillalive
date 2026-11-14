/**
 * The World object.
 */

import {
	Direction,
	FADE_START,
	LevelPhase,
	MAP_SIZE,
	ORDERED,
	PLAYFIELD_HEIGHT,
	RANDOM,
	TILE_SIZE,
} from './constants.js';
import { AnimatedTile } from './entities/AnimatedTile.js';
import { Boss } from './entities/Boss.js';
import { Cake } from './entities/Cake.js';
import { Camera } from './entities/Camera.js';
import { Crate } from './entities/Crate.js';
import { GravPipe } from './entities/GravPipe.js';
import { Plasma } from './entities/Plasma.js';
import { Platform } from './entities/Platform.js';
import { Player } from './entities/Player.js';
import { Portal } from './entities/Portal.js';
import { Turret } from './entities/Turret.js';
import { GRAVPIPE_DIRECTIONS, plasmaLaunch } from './level.js';
import { Replay } from './replay.js';
import { TileMap } from './TileMap.js';
import { FIRST_OF_KIND, LAST_OF_KIND, Tile, TileKind, isTileKind } from './tiles.js';

/** @type {{kind: string, type: number, speed: number}[]} The tile kinds that become animated tiles in a level. */
const ANIMATED_KINDS = [
	{ kind: TileKind.PLASMA_DOOR, type: RANDOM, speed: 6 },
	{ kind: TileKind.SWITCH_DOOR, type: RANDOM, speed: 6 },
	{ kind: TileKind.WHEEL, type: ORDERED, speed: 15 },
	{ kind: TileKind.ACID, type: ORDERED, speed: 15 },
	{ kind: TileKind.ENERGYWALL, type: RANDOM, speed: 6 },
	{ kind: TileKind.FORCE_FIELD, type: ORDERED, speed: 6 },
	{ kind: TileKind.BELT_RIGHT, type: ORDERED, speed: 10 },
	{ kind: TileKind.BELT_LEFT, type: ORDERED, speed: 10 },
];

/**
 * The state of one level, one preview or one editor map. Each level start creates a new World.
 */
export class World {
	/** @type {TileMap} The tiles of the map. */
	map;
	/** @type {import('./level.js').Level|null} The level that runs, or null for a preview or an editor map. */
	level = null;
	/** @type {number[]|null} The tile ids of the level at the level start, or null for a preview or an editor map. */
	oldMap = null;
	/** @type {Replay|null} The recording of the level, or the replay that plays. Null for a preview or an editor map. */
	replay = null;
	/** @type {boolean} True while a replay plays. */
	replayMode = false;
	/** @type {import('./entities/Cake.js').Cake[]} The cakes. */
	cakes = [];
	/** @type {import('./entities/Crate.js').Crate[]} The crates. */
	crates = [];
	/** @type {import('./entities/Turret.js').Turret[]} The turrets. */
	turrets = [];
	/** @type {import('./entities/Plasma.js').Plasma[]} The plasma balls. */
	plasmaBall = [];
	/** @type {import('./entities/Platform.js').Platform[]} The moving platforms. */
	platforms = [];
	/** @type {import('./entities/GravPipe.js').GravPipe[]} The gravitational pipes. */
	gravPipes = [];
	/** @type {object[]} The fields of the gravitational pipes. */
	gravPipeFields = [];
	/** @type {import('./entities/AnimatedTile.js').AnimatedTile[]} The animated tiles. */
	animatedTiles = [];
	/** @type {import('./entities/Projectile.js').Projectile[]} The projectiles of the boss. */
	projectiles = [];
	/** @type {import('./entities/Sparkle.js').Sparkle[]} The sparkles. */
	sparkles = [];
	/** @type {Player} The player. */
	player;
	/** @type {Portal[]} The two portals. */
	portals = [new Portal(), new Portal()];
	/** @type {Boss|null} The boss of the level, or null for a level without a boss. */
	boss = null;
	/** @type {Camera|null} The security camera, or null for a preview or an editor map. */
	camera = null;
	/** @type {number} The x position of the tube in 1/256 pixels, or -1 for a level without a tube. */
	tubeX = -1;
	/** @type {number} The y position of the tube in 1/256 pixels, or -1 for a level without a tube. */
	tubeY = -1;
	/** @type {number} The x start position of the plasma shots of the boss in 1/256 pixels. */
	plasmaX = 0;
	/** @type {number} The y start position of the plasma shots of the boss in 1/256 pixels. */
	plasmaY = 0;
	/** @type {number} The level time in ticks. */
	time = 0;
	/** @type {number} The walked distance of the player for the step counter. */
	steps = 0;
	/** @type {number} The number of portals that the player shot. */
	portalShots = 0;
	/** @type {number} The number of cakes that the player has not eaten yet. */
	cakesLeft = 0;
	/** @type {{jump: boolean, portals: boolean}} The abilities of the player. */
	abilities = { jump: false, portals: false };
	/** @type {import('./mapFile.js').MapLabel[]} The texts at positions of the playfield. */
	labels = [];
	/** @type {number} The index of the background image. */
	background = 0;
	/** @type {number} The x shift of the drawing in playfield units: the screen shake of the boss levels, else 0. */
	shakeX = 0;
	/** @type {number} The y shift of the drawing in playfield units: the screen shake of the boss levels, else 0. */
	shakeY = 0;
	/** @type {number} The phase of the level, a value of LevelPhase. */
	phase;
	/** @type {number} The progress of the opening and the closing transition, from FADE_START down to 0. */
	fade;
	/** @type {number} 1 while the player or a crate holds a switch and the switch doors are open. */
	switchPressed = 0;
	/**
	 * @type {Portal|null} The portal that an object is in during this tick, or null. The drawing then draws the tiles
	 *     around the portals over the objects.
	 */
	objectInPortal = null;
	/** @type {import('./LevelEvents.js').LevelEvents|null} The events of the level, or null outside a level. */
	events = null;

	/**
	 * Create a World without objects at the start of the opening transition.
	 *
	 * @param {TileMap} [map] The map. The World uses the object and does not copy it.
	 */
	constructor(map = new TileMap(new Array(MAP_SIZE).fill(Tile.EMPTY))) {
		this.map = map;
		this.player = new Player();
		this.resetPhase();
	}

	/**
	 * Create the World of a level start. The object tiles leave the map, the exits close, and the animated tiles and
	 * the plasma balls start. Outside a replay, the World starts a new replay recording.
	 *
	 * @param {import('./level.js').Level} level The level.
	 * @param {object} [options] The options.
	 * @param {Replay|null} [options.replay] The replay that plays, or null to let the player play.
	 * @returns {World} The World.
	 */
	static forLevel(level, { replay = null } = {}) {
		const world = new World(new TileMap(level.tiles));
		world.level = level;
		world.oldMap = level.tiles.slice();
		world.replayMode = replay !== null;
		world.replay = replay ?? new Replay();
		if (level.fromBelow) world.#jumpInFromBelow();
		world.boss = level.boss ? new Boss(level.boss) : null;
		world.#parse({ levelStart: true, boss: level.boss });
		world.camera = new Camera(world.player.x, world.player.y);
		world.cakesLeft = world.cakes.length;
		world.background = level.bg;
		world.abilities = { ...level.abilities };
		world.labels = level.labels;
		return world;
	}

	/**
	 * Create the World of a preview of a level or of a map. The objects stand at their start positions, and a map
	 * without cakes shows the open exit.
	 *
	 * @param {{tiles: number[], bg: number, boss?: number, fromBelow?: boolean}} level The level or the editor map.
	 * @returns {World} The World.
	 */
	static forPreview(level) {
		const world = new World(new TileMap(level.tiles));
		world.#parse();
		if (level.fromBelow) world.#jumpInFromBelow();
		world.boss = level.boss ? new Boss(level.boss) : null;
		world.cakesLeft = world.cakes.length;
		if (world.cakesLeft == 0) {
			const map = world.map;
			for (let i = 0; i < map.display.length; i++) {
				if (map.display[i] == Tile.EXIT_CLOSED) map.setDisplay(i, Tile.EXIT);
			}
		}
		world.background = level.bg;
		return world;
	}

	/**
	 * Create the World of the editor map with the objects of the map.
	 *
	 * @param {TileMap} map The editor map. The World uses the object and does not copy it.
	 * @returns {World} The World.
	 */
	static forEditor(map) {
		const world = new World(map);
		world.createEditorObjects();
		return world;
	}

	/**
	 * Create the objects of the editor map again. The player stays outside the playfield if the map has no player
	 * start tile.
	 *
	 * @returns {void}
	 */
	createEditorObjects() {
		this.player = new Player();
		this.player.x = -(TILE_SIZE << 8);
		this.resetPhase();
		this.#parse({ editor: true });
	}

	/**
	 * Place the player below the bottom edge with a speed upward, so the player jumps into the level.
	 *
	 * @returns {void}
	 */
	#jumpInFromBelow() {
		this.player.vy = -2400;
		this.player.x = (8 * TILE_SIZE) << 8;
		this.player.y = PLAYFIELD_HEIGHT << 8;
	}

	/**
	 * Create the objects of the map at their start positions. The method sets the position of the player when the
	 * map has a player start tile. Without options, the method prepares a preview: the logic layer stays the same, the
	 * display layer shows the closed exits, and the tube tile is the tube of the boss.
	 *
	 * @param {object} [options] The options.
	 * @param {boolean} [options.levelStart] True for a level start: the object tiles leave the map, the gravitational
	 *     pipes block their tiles, the exits close, and the animated tiles and the plasma balls start. In the levels of
	 *     boss 3 and boss 4, the plasma start tile is the start point of the plasma shots of the boss.
	 * @param {boolean} [options.editor] True for the editor map: both layers stay the same, and the tube tile is a
	 *     tile of the map.
	 * @param {number} [options.boss] The boss of the level, or 0 for a level without a boss.
	 * @returns {void}
	 */
	#parse({ levelStart = false, editor = false, boss = 0 } = {}) {
		let vx;
		this.cakes = [];
		this.turrets = [];
		this.crates = [];
		this.gravPipes = [];
		this.gravPipeFields = [];
		this.platforms = [];

		const map = this.map;
		for (let i = 0; i < map.tiles.length; i++) {
			const x = map.column(i);
			const y = map.row(i);
			const tile = map.tiles[i];
			const animated = levelStart ? ANIMATED_KINDS.find((a) => isTileKind(tile, a.kind)) : undefined;

			if (tile in GRAVPIPE_DIRECTIONS) {
				const dir = GRAVPIPE_DIRECTIONS[tile];
				this.gravPipes.push(new GravPipe((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, dir));
				if (levelStart) {
					// a gravitational pipe covers two tiles
					const next = dir == Direction.RIGHT || dir == Direction.LEFT ? map.index(x, y + 1) : map.index(x + 1, y);
					map.setTile(i, Tile.GRAVPIPE_BLOCK);
					map.setTile(next, Tile.GRAVPIPE_BLOCK);
					map.setDisplay(i, Tile.EMPTY);
					map.setDisplay(next, Tile.EMPTY);
				}
			} else if (tile == Tile.EXIT) {
				if (levelStart) map.setTile(i, Tile.EXIT_CLOSED);
				if (!editor) map.setDisplay(i, Tile.EXIT_CLOSED);
			} else if (animated) {
				map.setDisplay(i, Tile.EMPTY);
				this.animatedTiles.push(
					new AnimatedTile(
						x,
						y,
						FIRST_OF_KIND[animated.kind],
						LAST_OF_KIND[animated.kind],
						animated.type,
						i,
						animated.speed,
					),
				);
			} else if (tile == Tile.CAKE) {
				this.cakes.push(new Cake((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8));
				if (levelStart) map.setTile(i, Tile.EMPTY);
			} else if (tile == Tile.TURRET_LEFT || tile == Tile.TURRET_RIGHT) {
				if (levelStart) map.set(i, Tile.EMPTY);
				this.turrets.push(new Turret((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, tile == Tile.TURRET_LEFT ? -1 : 1));
			} else if (tile == Tile.CRATE) {
				if (levelStart) map.set(i, Tile.EMPTY);
				this.crates.push(new Crate((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8));
			} else if (tile == Tile.PLAYER_START) {
				this.player.x = (x * TILE_SIZE) << 8;
				this.player.y = (y * TILE_SIZE) << 8;
				if (levelStart) map.setTile(i, Tile.EMPTY);
			} else if (tile == Tile.PLATFORM_RIGHT || tile == Tile.PLATFORM_LEFT) {
				vx = tile == Tile.PLATFORM_RIGHT ? 256 : -256;
				this.platforms.push(new Platform((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, vx, 0));
				if (levelStart) map.setTile(i, Tile.EMPTY);
			} else if (tile == Tile.TUBE) {
				if (editor) continue;
				this.tubeX = (x * TILE_SIZE) << 8;
				this.tubeY = (y * TILE_SIZE) << 8;
				if (levelStart) map.set(i, Tile.EMPTY);
			} else if (tile == Tile.PLASMA_START && levelStart) {
				const launch = plasmaLaunch(map, x, y);
				if (launch && boss == 0) this.plasmaBall.push(new Plasma(launch.x, launch.y, launch.vx, launch.vy));
				else if (launch && (boss == 3 || boss == 4)) {
					this.plasmaX = launch.x;
					this.plasmaY = launch.y;
				}
			}
		}
	}

	/**
	 * Set the phase of a new level, a preview or the editor map: the start of the opening transition.
	 *
	 * @returns {void}
	 */
	resetPhase() {
		this.phase = LevelPhase.OPENING;
		this.fade = FADE_START;
	}

	/**
	 * Check if the level runs. The level time counts and the objects move.
	 *
	 * @returns {boolean} True while the level runs.
	 */
	isRunning() {
		return this.phase == LevelPhase.RUNNING;
	}

	/**
	 * Check if the level time stands still while an event waits for a click or the boss comes in.
	 *
	 * @returns {boolean} True while the level is halted.
	 */
	isHalted() {
		return this.phase == LevelPhase.HALTED;
	}

	/**
	 * Check if the opening transition of the level runs.
	 *
	 * @returns {boolean} True during the opening transition.
	 */
	isOpening() {
		return this.phase == LevelPhase.OPENING;
	}

	/**
	 * Check if the player is on the exit and an exit event waits for a click.
	 *
	 * @returns {boolean} True while the exit event waits.
	 */
	isExitWait() {
		return this.phase == LevelPhase.EXIT_WAIT;
	}

	/**
	 * Check if the closing transition of the level runs.
	 *
	 * @returns {boolean} True during the closing transition.
	 */
	isClosing() {
		return this.phase == LevelPhase.CLOSING;
	}

	/**
	 * Check if the level is in the exit freeze after the closing transition.
	 *
	 * @returns {boolean} True in the exit freeze.
	 */
	isEnded() {
		return this.phase == LevelPhase.ENDED;
	}

	/**
	 * Check if the player reached the exit and the level end runs.
	 *
	 * @returns {boolean} True in the phases EXIT_WAIT, CLOSING and ENDED.
	 */
	reachedExit() {
		return this.isExitWait() || this.isClosing() || this.isEnded();
	}
}
