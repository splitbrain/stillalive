/**
 * The start of a level and of a preview, and the doors of a level.
 */

import { playSound, sfx_field } from './audio.js';
import { Direction, MAP_HEIGHT, MAP_WIDTH, SparkleType, TILE_SIZE } from './constants.js';
import { removeSparkles } from './entities/Sparkle.js';
import { LevelEvents } from './LevelEvents.js';
import { game, input, setGame, ui } from './state.js';
import { FIRST_OF_KIND, Tile, TileKind, isTileKind } from './tiles.js';
import { World } from './World.js';

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
				removeSparkles(game, i, SparkleType.PORTAL_GLOW);
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

/**
 * Get the launch of the plasma ball from a plasma start in a map. Three sides of the start must be closed, and the
 * ball flies out of the open side. Each tile that is not empty closes a side, and so does the edge of the map.
 *
 * @param {import('./TileMap.js').TileMap} map The map.
 * @param {number} x The column of the plasma start.
 * @param {number} y The row of the plasma start.
 * @returns {{x: number, y: number, vx: number, vy: number}|null} The start position of the ball in 1/256 pixels and its
 *     speed, or null if fewer than three sides are closed.
 */
export function plasmaLaunch(map, x, y) {
	const closed = (cx, cy) =>
		cx < 0 || cx >= MAP_WIDTH || cy < 0 || cy >= MAP_HEIGHT || map.tiles[map.index(cx, cy)] != Tile.EMPTY;
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
 * Start a level. Outside a replay, the World starts a new replay recording. A restart skips the waits of the events
 * and the entrance of the boss.
 *
 * @param {Level} level The level.
 * @param {boolean} [restart] True for a restart of the same level, for example after a death.
 * @param {import('./replay.js').Replay|null} [replay] The replay that plays, or null to let the player play.
 * @returns {void}
 */
export function loadLevel(level, restart = false, replay = null) {
	setGame(World.forLevel(level, { replay }));
	ui.paused = false;
	input.keys = 0;
	input.oldKeys = 0;
	game.events = new LevelEvents(level.events, restart || game.replayMode);
	game.events.update(); // fire the start events
	if (game.boss && (restart || game.replayMode)) game.boss.skipEntry();
}

/**
 * Show a map in a preview. The objects stand at their start positions, and a map without cakes shows the open exit.
 *
 * @param {{tiles: number[], bg: number, boss?: number, fromBelow?: boolean}} level The level or the editor map.
 * @returns {void}
 */
export function loadPreviewMap(level) {
	setGame(World.forPreview(level));
}
