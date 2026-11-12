/**
 * The start of a level, of a preview and of the editor map, and the doors of a level.
 */

import { playSound, sfx_field } from './audio.js';
import { setupBoss, skipComingBoss } from './boss.js';
import { Direction, MAP_HEIGHT, MAP_WIDTH, ORDERED, PLAYFIELD_HEIGHT, RANDOM, SparkleType } from './constants.js';
import { AnimatedTile } from './entities/AnimatedTile.js';
import { Cake, openExit } from './entities/Cake.js';
import { Camera } from './entities/Camera.js';
import { Crate } from './entities/Crate.js';
import { Plasma } from './entities/Plasma.js';
import { Platform } from './entities/Platform.js';
import { Player } from './entities/Player.js';
import { Portal } from './entities/Portal.js';
import { removeSparkles } from './entities/Sparkle.js';
import { GravPipe } from './entities/GravPipe.js';
import { Turret } from './entities/Turret.js';
import { startEvents } from './events.js';
import { getTileSimple } from './physics.js';
import { Replay } from './replay.js';
import { game, input, ui } from './state.js';
import { FIRST_OF_KIND, LAST_OF_KIND, Tile, TileKind, isTileKind } from './tiles.js';

/**
 * Open or close the switch doors when the player or a crate steps on or off a switch.
 *
 * @returns {void}
 */
export function manageDoors() {
	if (!game.player.switchPressed) {
		if (playerOnSwitch(game.player.x >> 8, game.player.y >> 8)) {
			game.player.switchPressed = 1;
			openSwitchDoors();
		} else if (crateOnSwitch()) {
			game.player.switchPressed = 1;
			openSwitchDoors();
		}
	} else {
		if (!playerOnSwitch(game.player.x >> 8, game.player.y >> 8) && !crateOnSwitch()) {
			game.player.switchPressed = 0;
			closeSwitchDoors();
		}
	}
}

/**
 * Remove everything that blocks a closed switch door. Portals on the door go away. Crates and plasma balls in the door
 * go back to their start positions.
 *
 * @returns {void}
 */
function clearDoorBlockers() {
	let x, y, i, j;
	for (i = 0; i < 2; i++) {
		if (game.portals[i].used) {
			x = game.portals[i].x >> 8;
			y = game.portals[i].y >> 8;
			if (game.portals[i].direction == Direction.UP) y += 6;
			else if (game.portals[i].direction == Direction.LEFT) x += 6;
			else if (game.portals[i].direction == Direction.RIGHT) x -= 2;
			else if (game.portals[i].direction == Direction.DOWN) y -= 2;

			if (game.portals[i].direction == Direction.LEFT || game.portals[i].direction == Direction.RIGHT) {
				for (j = 0; j < 32; j++) {
					if (getTileSimple(x, y + j) == FIRST_OF_KIND[TileKind.SWITCH_DOOR]) {
						game.portals[i].used = false;
						removeSparkles(i, SparkleType.PORTAL_GLOW);
						j = 32;
					}
				}
			} else {
				for (j = 0; j < 32; j++) {
					if (getTileSimple(x + j, y) == FIRST_OF_KIND[TileKind.SWITCH_DOOR]) {
						game.portals[i].used = false;
						removeSparkles(i, SparkleType.PORTAL_GLOW);
						j = 32;
					}
				}
			}
		}
	}

	for (i = 0; i < game.crates.length; i++) {
		x = game.crates[i].x >> 8;
		y = game.crates[i].y >> 8;
		if (
			getTileSimple(x, y) == FIRST_OF_KIND[TileKind.SWITCH_DOOR] ||
			getTileSimple(x + 15, y) == FIRST_OF_KIND[TileKind.SWITCH_DOOR] ||
			getTileSimple(x, y + 15) == FIRST_OF_KIND[TileKind.SWITCH_DOOR] ||
			getTileSimple(x + 15, y + 15) == FIRST_OF_KIND[TileKind.SWITCH_DOOR]
		) {
			game.crates[i].x = game.crates[i].xOrig;
			game.crates[i].y = game.crates[i].yOrig;
			game.crates[i].vx = 0;
			game.crates[i].vy = 0;
		}
	}

	for (i = 0; i < game.plasmaBall.length; i++) {
		x = game.plasmaBall[i].x >> 8;
		y = game.plasmaBall[i].y >> 8;
		if (
			getTileSimple(x, y) == FIRST_OF_KIND[TileKind.SWITCH_DOOR] ||
			getTileSimple(x + 15, y) == FIRST_OF_KIND[TileKind.SWITCH_DOOR] ||
			getTileSimple(x, y + 15) == FIRST_OF_KIND[TileKind.SWITCH_DOOR] ||
			getTileSimple(x + 15, y + 15) == FIRST_OF_KIND[TileKind.SWITCH_DOOR]
		) {
			game.plasmaBall[i].vx = game.plasmaBall[i].origVx;
			game.plasmaBall[i].vy = game.plasmaBall[i].origVy;
			game.plasmaBall[i].x = game.plasmaBall[i].xOrig;
			game.plasmaBall[i].y = game.plasmaBall[i].yOrig;
		}
	}
}

/**
 * Close the switch doors.
 *
 * @returns {void}
 */
function closeSwitchDoors() {
	let i;
	playSound(sfx_field);
	for (i = 0; i < game.animatedTiles.length; i++) {
		if (isTileKind(game.animatedTiles[i].current, TileKind.SWITCH_DOOR)) {
			game.animatedTiles[i].used = true;
			game.map[game.animatedTiles[i].place] = game.animatedTiles[i].min;
		}
	}
	clearDoorBlockers();
}

/**
 * Open the switch doors.
 *
 * @returns {void}
 */
function openSwitchDoors() {
	let i;
	playSound(sfx_field);
	for (i = 0; i < game.animatedTiles.length; i++) {
		if (isTileKind(game.animatedTiles[i].current, TileKind.SWITCH_DOOR)) {
			game.animatedTiles[i].used = false;
			game.map[game.animatedTiles[i].place] = 0;
		}
	}
}

/**
 * Check if the player stands on a switch.
 *
 * @param {number} x The x coordinate of the player in pixels.
 * @param {number} y The y coordinate of the player in pixels.
 * @returns {number} 1 if a switch tile is below the player, else 0.
 */
function playerOnSwitch(x, y) {
	if (getTileSimple(x, y + 32) == Tile.SWITCH) return 1;
	else if (getTileSimple(x + 15, y + 32) == Tile.SWITCH) return 1;
	return 0;
}

/**
 * Check if a crate stands on a switch.
 *
 * @returns {number} 1 if a switch tile is below a crate, else 0.
 */
function crateOnSwitch() {
	let i;
	for (i = 0; i < game.crates.length; i++) {
		if (getTileSimple(game.crates[i].x >> 8, (game.crates[i].y >> 8) + 19) == Tile.SWITCH) {
			return 1;
		} else if (getTileSimple((game.crates[i].x >> 8) + 15, (game.crates[i].y >> 8) + 19) == Tile.SWITCH) {
			return 1;
		}
	}
	return 0;
}

/**
 * A level as the stage plays it: the data of a map file and where the level comes from.
 *
 * @typedef {object} Level
 * @property {number[]} tiles The 768 tile ids.
 * @property {number} bg The background index.
 * @property {string} title The name of the level, or an empty text for none.
 * @property {number} boss The boss, or 0 for a level without a boss.
 * @property {{jump: boolean, portals: boolean}} abilities The abilities of the player at the level start.
 * @property {import('./mapFile.js').MapEvent[]} events The events of the level.
 * @property {import('./mapFile.js').MapLabel[]} labels The texts at positions of the playfield.
 * @property {string} campaign The folder name of the campaign, for the replay file.
 * @property {number} number The level number, starting at 1, for the replay file.
 * @property {boolean} fromBelow True if the player jumps into the level from below the bottom edge.
 */

/** @type {Object<number, number>} The direction of each gravitational pipe tile. */
export const GRAVPIPE_DIRECTIONS = {
	[Tile.GRAVPIPE_RIGHT]: Direction.RIGHT,
	[Tile.GRAVPIPE_LEFT]: Direction.LEFT,
	[Tile.GRAVPIPE_UP]: Direction.UP,
	[Tile.GRAVPIPE_DOWN]: Direction.DOWN,
};

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
 * Get the launch of the plasma ball from a plasma start in game.map. Three sides of the start must be closed, and the
 * ball flies out of the open side. Each tile that is not empty closes a side, and so does the edge of the map.
 *
 * @param {number} x The column of the plasma start.
 * @param {number} y The row of the plasma start.
 * @returns {{x: number, y: number, vx: number, vy: number}|null} The start position of the ball in 1/256 pixels and its
 *     speed, or null if fewer than three sides are closed.
 */
export function plasmaLaunch(x, y) {
	const closed = (cx, cy) =>
		cx < 0 || cx >= MAP_WIDTH || cy < 0 || cy >= MAP_HEIGHT || game.map[cx + cy * MAP_WIDTH] != 0;
	const up = closed(x, y - 1);
	const down = closed(x, y + 1);
	const left = closed(x - 1, y);
	const right = closed(x + 1, y);

	if (up && down && left) return { x: ((x + 1) * 16) << 8, y: (y * 16) << 8, vx: 424, vy: 0 };
	if (up && down && right) return { x: ((x - 1) * 16) << 8, y: (y * 16) << 8, vx: -424, vy: 0 };
	if (right && down && left) return { x: (x * 16) << 8, y: ((y - 1) * 16) << 8, vx: 0, vy: -424 };
	if (left && right && up) return { x: (x * 16) << 8, y: ((y + 1) * 16) << 8, vx: 0, vy: 424 };
	return null;
}

/**
 * Create the objects of the map in game.map at their start positions.
 *
 * The mode selects what the function does with the map:
 *
 * - "play" for a level and for the test run of the editor: the object tiles leave the map, the gravitational pipes
 *   block their tiles, the exits close, and the animated tiles and the plasma balls start. In the levels of boss 3 and
 *   boss 4, the plasma start tile is the start point of the plasma shots of the boss.
 * - "preview" for the preview of a level or of an editor map: the map stays the same, and only game.displayMap shows
 *   the closed exits.
 * - "editor" for the objects in the editor: the map and game.displayMap stay the same.
 *
 * The function sets the position of game.player when the map has a player start tile.
 *
 * @param {string} mode "play", "preview" or "editor".
 * @param {number} [boss] The boss of the level, or 0 for a level without a boss.
 * @returns {void}
 */
function parseObjects(mode, boss = 0) {
	let vx;
	const play = mode == 'play';
	game.cakes = new Array();
	game.turrets = new Array();
	game.crates = new Array();
	game.gravPipes = new Array();
	game.gravPipeFields = new Array();
	game.platforms = new Array();
	if (play) {
		game.animatedTiles = new Array();
		game.plasmaBall = new Array();
	}
	if (mode != 'editor') game.tubeX = game.tubeY = -1;

	for (let i = 0; i < game.map.length; i++) {
		const y = i >> 5;
		const x = i - (y << 5);
		const tile = game.map[i];
		const animated = play ? ANIMATED_KINDS.find((a) => isTileKind(tile, a.kind)) : undefined;

		if (tile in GRAVPIPE_DIRECTIONS) {
			const dir = GRAVPIPE_DIRECTIONS[tile];
			game.gravPipes.push(new GravPipe((x * 16) << 8, (y * 16) << 8, dir));
			if (play) {
				// a gravitational pipe covers two tiles
				const next = dir == Direction.RIGHT || dir == Direction.LEFT ? x + ((y + 1) << 5) : x + 1 + (y << 5);
				game.map[i] = Tile.GRAVPIPE_BLOCK;
				game.map[next] = Tile.GRAVPIPE_BLOCK;
				game.displayMap[i] = 0;
				game.displayMap[next] = 0;
			}
		} else if (tile == Tile.EXIT) {
			if (play) game.map[i] = Tile.EXIT_CLOSED;
			if (mode != 'editor') game.displayMap[i] = Tile.EXIT_CLOSED;
		} else if (animated) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
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
			game.cakes.push(new Cake((x * 16) << 8, (y * 16) << 8));
			if (play) game.map[i] = 0;
		} else if (tile == Tile.TURRET_LEFT || tile == Tile.TURRET_RIGHT) {
			if (play) game.displayMap[i] = game.map[i] = 0;
			game.turrets.push(new Turret((x * 16) << 8, (y * 16) << 8, tile == Tile.TURRET_LEFT ? -1 : 1));
		} else if (tile == Tile.CRATE) {
			if (play) game.displayMap[i] = game.map[i] = 0;
			game.crates.push(new Crate((x * 16) << 8, (y * 16) << 8));
		} else if (tile == Tile.PLAYER_START) {
			game.player.x = (x * 16) << 8;
			game.player.y = (y * 16) << 8;
			if (play) game.map[i] = 0;
		} else if (tile == Tile.PLATFORM_RIGHT || tile == Tile.PLATFORM_LEFT) {
			vx = tile == Tile.PLATFORM_RIGHT ? 256 : -256;
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			if (play) game.map[i] = 0;
		} else if (tile == Tile.TUBE) {
			if (mode == 'editor') continue;
			game.tubeX = (x * 16) << 8;
			game.tubeY = (y * 16) << 8;
			if (play) game.displayMap[i] = game.map[i] = 0;
		} else if (tile == Tile.PLASMA_START && play) {
			const launch = plasmaLaunch(x, y);
			if (launch && boss == 0) game.plasmaBall.push(new Plasma(launch.x, launch.y, launch.vx, launch.vy));
			else if (launch && (boss == 3 || boss == 4)) {
				game.plasmaX = launch.x;
				game.plasmaY = launch.y;
			}
		}
	}
}

/**
 * Reset the level state that a level and the test run of the editor share: the portals, the sparkles, the counters,
 * the screen shake and the input.
 *
 * @returns {void}
 */
function resetLevelState() {
	game.portals = new Array();
	game.portals.push(new Portal());
	game.portals.push(new Portal());
	game.sparkles = new Array();
	game.time = 0;
	game.steps = 0;
	game.portalShots = 0;
	game.shakeX = 0;
	game.shakeY = 0;
	ui.paused = false;
	input.keys = 0;
	input.oldKeys = 0;
}

/**
 * Place the player below the bottom edge with a speed upward, so the player jumps into the level.
 *
 * @returns {void}
 */
function jumpInFromBelow() {
	game.player.vy = -2400;
	game.player.x = 128 << 8;
	game.player.y = PLAYFIELD_HEIGHT << 8;
}

/**
 * Start a level.
 *
 * The function copies the map, creates the player, the objects and the animated tiles, resets the level time and starts
 * a new replay recording. A restart skips the waits of the events and the entrance of the boss.
 *
 * @param {Level} level The level.
 * @param {boolean} [restart] True for a restart of the same level, for example after a death.
 * @returns {void}
 */
export function loadLevel(level, restart = false) {
	game.level = level;
	game.map = level.tiles.slice();
	game.oldMap = game.map.slice();
	game.displayMap = game.map.slice();

	resetLevelState();
	if (!game.replayMode) game.replay = new Replay();

	game.player = new Player();
	if (level.fromBelow) jumpInFromBelow();

	game.bossNum = level.boss;
	parseObjects('play', game.bossNum);

	game.camera = new Camera(game.player.x, game.player.y);
	game.cakesLeft = game.cakes.length;
	game.tilesChanged = true;
	if (game.cakesLeft == 0) openExit();

	game.background = level.bg;
	game.abilities = { ...level.abilities };
	game.events = level.events;
	game.labels = level.labels;
	startEvents(restart);
	if (game.bossNum > 0) {
		setupBoss();
		if (restart) skipComingBoss();
	}
}

/**
 * Prepare a map for a preview. The objects stand at their start positions, and a map without cakes shows the open
 * exit.
 *
 * @param {{tiles: number[], bg: number, boss?: number, fromBelow?: boolean}} level The level or the editor map.
 * @returns {void}
 */
export function loadPreviewMap(level) {
	game.map = level.tiles.slice();
	game.displayMap = game.map.slice();
	game.portals = new Array();
	game.portals.push(new Portal());
	game.portals.push(new Portal());
	game.sparkles = new Array();
	game.animatedTiles = new Array();
	game.plasmaBall = new Array();

	game.player = new Player();
	parseObjects('preview');

	if (level.fromBelow) jumpInFromBelow();

	game.bossNum = level.boss ?? 0;
	if (game.bossNum > 0) setupBoss();

	game.cakesLeft = game.cakes.length;
	if (game.cakesLeft == 0) game.displayMap = game.displayMap.map((t) => (t == Tile.EXIT_CLOSED ? Tile.EXIT : t));
	game.tilesChanged = true;

	game.background = level.bg;
}

/**
 * Create the objects of the map in game.map for the editor. The player stays outside the playfield if the map has no
 * player start tile.
 *
 * @returns {void}
 */
export function loadEditorObjects() {
	game.player = new Player();
	game.player.x = -(16 << 8);
	game.player.fadeNextLevel = 0;
	parseObjects('editor');
}

/**
 * Check if a map position holds a wall.
 *
 * @param {number} index The index in the map.
 * @returns {boolean} True for a wall tile.
 */
export function isWallAt(index) {
	return isTileKind(game.map[index], TileKind.WALL);
}

/**
 * Check if a map position is solid for the edges of the walls. Positions outside the map count as solid.
 *
 * @param {number} x The column.
 * @param {number} y The row.
 * @returns {number} 1 for a wall, a decor tile or a conveyor belt, else 0.
 */
export function isTileHere(x, y) {
	if (x < 0 || x > 31 || y < 0 || y > 23) return 1;
	if (isTileKind(game.map[x + y * 32], TileKind.BELT_RIGHT, TileKind.BELT_LEFT)) return 1;
	return isTileKind(game.map[x + y * 32], TileKind.WALL, TileKind.DECOR) ? 1 : 0;
}
