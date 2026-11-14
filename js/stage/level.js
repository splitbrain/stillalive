/**
 * The start of a level, of a preview and of the editor map, and the doors of a level.
 */

import { playSound, sfx_field } from './audio.js';
import {
	Direction,
	MAP_HEIGHT,
	MAP_WIDTH,
	ORDERED,
	PLAYFIELD_HEIGHT,
	RANDOM,
	SparkleType,
	TILE_SIZE,
} from './constants.js';
import { AnimatedTile } from './entities/AnimatedTile.js';
import { Boss } from './entities/Boss.js';
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
import { Replay } from './replay.js';
import { game, input, ui } from './state.js';
import { TileMap } from './TileMap.js';
import { FIRST_OF_KIND, LAST_OF_KIND, Tile, TileKind, isTileKind } from './tiles.js';

/**
 * Open or close the switch doors when the player or a crate steps on or off a switch.
 *
 * @returns {void}
 */
export function manageDoors() {
	if (!game.switchPressed) {
		if (playerOnSwitch(game.player.x >> 8, game.player.y >> 8)) {
			game.switchPressed = 1;
			openSwitchDoors();
		} else if (crateOnSwitch()) {
			game.switchPressed = 1;
			openSwitchDoors();
		}
	} else {
		if (!playerOnSwitch(game.player.x >> 8, game.player.y >> 8) && !crateOnSwitch()) {
			game.switchPressed = 0;
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
	const door = FIRST_OF_KIND[TileKind.SWITCH_DOOR];
	for (let i = 0; i < 2; i++) {
		const portal = game.portals[i];
		if (!portal.used) continue;
		let x = portal.x >> 8;
		let y = portal.y >> 8;
		if (portal.direction == Direction.UP) y += 6;
		else if (portal.direction == Direction.LEFT) x += 6;
		else if (portal.direction == Direction.RIGHT) x -= 2;
		else if (portal.direction == Direction.DOWN) y -= 2;
		const onSideWall = portal.direction == Direction.LEFT || portal.direction == Direction.RIGHT;
		for (let j = 0; j < 2 * TILE_SIZE; j++) {
			if (game.map.atPixel(onSideWall ? x : x + j, onSideWall ? y + j : y) == door) {
				portal.used = false;
				removeSparkles(i, SparkleType.PORTAL_GLOW);
				break;
			}
		}
	}

	for (const crate of game.crates) {
		if (touchesSwitchDoor(crate)) {
			crate.x = crate.xOrig;
			crate.y = crate.yOrig;
			crate.vx = 0;
			crate.vy = 0;
		}
	}

	for (const ball of game.plasmaBall) {
		if (touchesSwitchDoor(ball)) ball.reset();
	}
}

/**
 * Check if a 16 by 16 object touches a switch door with one of its corners.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {boolean} True if a corner of the object is on a switch door tile.
 */
function touchesSwitchDoor(obj) {
	const door = FIRST_OF_KIND[TileKind.SWITCH_DOOR];
	const x = obj.x >> 8;
	const y = obj.y >> 8;
	const corners = [
		[x, y],
		[x + TILE_SIZE - 1, y],
		[x, y + TILE_SIZE - 1],
		[x + TILE_SIZE - 1, y + TILE_SIZE - 1],
	];
	return corners.some(([cx, cy]) => game.map.atPixel(cx, cy) == door);
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
			game.map.setTile(game.animatedTiles[i].place, game.animatedTiles[i].min);
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
			game.map.setTile(game.animatedTiles[i].place, Tile.EMPTY);
		}
	}
}

/**
 * Check if the player stands on a switch. The test points lie a few pixels inside the tile below the feet.
 *
 * @param {number} x The x coordinate of the player in pixels.
 * @param {number} y The y coordinate of the player in pixels.
 * @returns {boolean} True if a switch tile is below the player.
 */
function playerOnSwitch(x, y) {
	if (game.map.atPixel(x, y + game.player.pY + 5) == Tile.SWITCH) return true;
	else if (game.map.atPixel(x + 15, y + game.player.pY + 5) == Tile.SWITCH) return true;
	return false;
}

/**
 * Check if a crate stands on a switch. The test points lie a few pixels inside the tile below the crate.
 *
 * @returns {boolean} True if a switch tile is below a crate.
 */
function crateOnSwitch() {
	let i;
	for (i = 0; i < game.crates.length; i++) {
		if (game.map.atPixel(game.crates[i].x >> 8, (game.crates[i].y >> 8) + game.crates[i].pY + 3) == Tile.SWITCH) {
			return true;
		} else if (
			game.map.atPixel((game.crates[i].x >> 8) + TILE_SIZE - 1, (game.crates[i].y >> 8) + game.crates[i].pY + 3) ==
			Tile.SWITCH
		) {
			return true;
		}
	}
	return false;
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
		cx < 0 || cx >= MAP_WIDTH || cy < 0 || cy >= MAP_HEIGHT || game.map.tiles[game.map.index(cx, cy)] != Tile.EMPTY;
	const up = closed(x, y - 1);
	const down = closed(x, y + 1);
	const left = closed(x - 1, y);
	const right = closed(x + 1, y);

	if (up && down && left) return { x: ((x + 1) * TILE_SIZE) << 8, y: (y * TILE_SIZE) << 8, vx: 424, vy: 0 };
	if (up && down && right) return { x: ((x - 1) * TILE_SIZE) << 8, y: (y * TILE_SIZE) << 8, vx: -424, vy: 0 };
	if (right && down && left) return { x: (x * TILE_SIZE) << 8, y: ((y - 1) * TILE_SIZE) << 8, vx: 0, vy: -424 };
	if (left && right && up) return { x: (x * TILE_SIZE) << 8, y: ((y + 1) * TILE_SIZE) << 8, vx: 0, vy: 424 };
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
 * - "preview" for the preview of a level or of an editor map: the logic layer stays the same, and only the display
 *   layer shows the closed exits.
 * - "editor" for the objects in the editor: both layers stay the same.
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

	const map = game.map;
	for (let i = 0; i < map.tiles.length; i++) {
		const x = map.column(i);
		const y = map.row(i);
		const tile = map.tiles[i];
		const animated = play ? ANIMATED_KINDS.find((a) => isTileKind(tile, a.kind)) : undefined;

		if (tile in GRAVPIPE_DIRECTIONS) {
			const dir = GRAVPIPE_DIRECTIONS[tile];
			game.gravPipes.push(new GravPipe((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, dir));
			if (play) {
				// a gravitational pipe covers two tiles
				const next = dir == Direction.RIGHT || dir == Direction.LEFT ? map.index(x, y + 1) : map.index(x + 1, y);
				map.setTile(i, Tile.GRAVPIPE_BLOCK);
				map.setTile(next, Tile.GRAVPIPE_BLOCK);
				map.setDisplay(i, Tile.EMPTY);
				map.setDisplay(next, Tile.EMPTY);
			}
		} else if (tile == Tile.EXIT) {
			if (play) map.setTile(i, Tile.EXIT_CLOSED);
			if (mode != 'editor') map.setDisplay(i, Tile.EXIT_CLOSED);
		} else if (animated) {
			map.setDisplay(i, Tile.EMPTY);
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
			game.cakes.push(new Cake((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8));
			if (play) map.setTile(i, Tile.EMPTY);
		} else if (tile == Tile.TURRET_LEFT || tile == Tile.TURRET_RIGHT) {
			if (play) map.set(i, Tile.EMPTY);
			game.turrets.push(new Turret((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, tile == Tile.TURRET_LEFT ? -1 : 1));
		} else if (tile == Tile.CRATE) {
			if (play) map.set(i, Tile.EMPTY);
			game.crates.push(new Crate((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8));
		} else if (tile == Tile.PLAYER_START) {
			game.player.x = (x * TILE_SIZE) << 8;
			game.player.y = (y * TILE_SIZE) << 8;
			if (play) map.setTile(i, Tile.EMPTY);
		} else if (tile == Tile.PLATFORM_RIGHT || tile == Tile.PLATFORM_LEFT) {
			vx = tile == Tile.PLATFORM_RIGHT ? 256 : -256;
			game.platforms.push(new Platform((x * TILE_SIZE) << 8, (y * TILE_SIZE) << 8, vx, 0));
			if (play) map.setTile(i, Tile.EMPTY);
		} else if (tile == Tile.TUBE) {
			if (mode == 'editor') continue;
			game.tubeX = (x * TILE_SIZE) << 8;
			game.tubeY = (y * TILE_SIZE) << 8;
			if (play) map.set(i, Tile.EMPTY);
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
 * Reset the level state for a new level.
 *
 * @returns {void}
 */
function resetLevelState() {
	game.portals = [new Portal(), new Portal()];
	game.sparkles = new Array();
	game.projectiles = new Array();
	game.time = 0;
	game.steps = 0;
	game.portalShots = 0;
	game.shakeX = 0;
	game.shakeY = 0;
	game.switchPressed = 0;
	game.resetPhase();
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
	game.player.x = (8 * TILE_SIZE) << 8;
	game.player.y = PLAYFIELD_HEIGHT << 8;
}

/**
 * Start a level. Outside a replay, the function starts a new replay recording. A restart skips the waits of the events
 * and the entrance of the boss.
 *
 * @param {Level} level The level.
 * @param {boolean} [restart] True for a restart of the same level, for example after a death.
 * @returns {void}
 */
export function loadLevel(level, restart = false) {
	game.level = level;
	game.map = new TileMap(level.tiles);
	game.oldMap = level.tiles.slice();

	resetLevelState();
	if (!game.replayMode) game.replay = new Replay();

	game.player = new Player();
	if (level.fromBelow) jumpInFromBelow();

	game.boss = level.boss ? new Boss(level.boss) : null;
	parseObjects('play', level.boss);

	game.camera = new Camera(game.player.x, game.player.y);
	game.cakesLeft = game.cakes.length;
	if (game.cakesLeft == 0) openExit();

	game.background = level.bg;
	game.abilities = { ...level.abilities };
	game.events = level.events;
	game.labels = level.labels;
	startEvents(restart);
	if (game.boss && (restart || game.replayMode)) game.boss.skipEntry();
}

/**
 * Prepare a map for a preview. The objects stand at their start positions, and a map without cakes shows the open
 * exit.
 *
 * @param {{tiles: number[], bg: number, boss?: number, fromBelow?: boolean}} level The level or the editor map.
 * @returns {void}
 */
export function loadPreviewMap(level) {
	game.map = new TileMap(level.tiles);
	game.portals = [new Portal(), new Portal()];
	game.sparkles = new Array();
	game.animatedTiles = new Array();
	game.plasmaBall = new Array();
	game.projectiles = new Array();

	game.player = new Player();
	game.resetPhase();
	parseObjects('preview');

	if (level.fromBelow) jumpInFromBelow();

	game.boss = level.boss ? new Boss(level.boss) : null;
	if (game.boss && game.replayMode) game.boss.skipEntry();

	game.cakesLeft = game.cakes.length;
	if (game.cakesLeft == 0) {
		for (let i = 0; i < game.map.display.length; i++) {
			if (game.map.display[i] == Tile.EXIT_CLOSED) game.map.setDisplay(i, Tile.EXIT);
		}
	}

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
	game.player.x = -(TILE_SIZE << 8);
	game.resetPhase();
	parseObjects('editor');
}

/**
 * Check if a map position holds a wall.
 *
 * @param {TileMap} map The map. The function reads the logic layer.
 * @param {number} index The index in the map.
 * @returns {boolean} True for a wall tile.
 */
export function isWallAt(map, index) {
	return isTileKind(map.tiles[index], TileKind.WALL);
}

/**
 * Check if a map position is solid for the edges of the walls. Positions outside the map count as solid.
 *
 * @param {TileMap} map The map. The function reads the logic layer.
 * @param {number} x The column.
 * @param {number} y The row.
 * @returns {number} 1 for a wall, a decor tile or a conveyor belt, else 0.
 */
export function isTileHere(map, x, y) {
	if (x < 0 || x > MAP_WIDTH - 1 || y < 0 || y > MAP_HEIGHT - 1) return 1;
	if (isTileKind(map.tiles[map.index(x, y)], TileKind.BELT_RIGHT, TileKind.BELT_LEFT)) return 1;
	return isTileKind(map.tiles[map.index(x, y)], TileKind.WALL, TileKind.DECOR) ? 1 : 0;
}
