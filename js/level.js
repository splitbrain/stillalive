/**
 * Loading of the campaigns, the levels, the level editor maps and the credits, and the doors of a level.
 */

import { playSound, sfx_tick } from './audio.js';
import { setupBoss } from './boss.js';
import {
	CAMPAIGN_FOLDERS,
	CampaignId,
	Direction,
	MAP_HEIGHT,
	MAP_WIDTH,
	Menu,
	ORDERED,
	PLAYFIELD_HEIGHT,
	RANDOM,
	SparkleType,
} from './constants.js';
import { AnimatedTile } from './entities/AnimatedTile.js';
import { Cake, openExit } from './entities/Cake.js';
import { Camera } from './entities/Camera.js';
import { Crate } from './entities/Crate.js';
import { Plasma } from './entities/Plasma.js';
import { Platform } from './entities/Platform.js';
import { Player } from './entities/Player.js';
import { Portal } from './entities/Portal.js';
import { Robot } from './entities/Robot.js';
import { removeSparkles } from './entities/Sparkle.js';
import { Tunnel } from './entities/Tunnel.js';
import { Turret } from './entities/Turret.js';
import { parseMap } from './mapFile.js';
import { getTileSimple } from './physics.js';
import { Replay } from './replay.js';
import { game, input, ui } from './state.js';
import { FIRST_OF_KIND, LAST_OF_KIND, Tile, TileKind, isTileKind } from './tiles.js';

/** @type {Campaign[]} The loaded campaigns, by campaign id. */
export let campaigns;
/** @type {number} The number of loaded campaign and level files. */
export let levelsLoaded = 0;
/** @type {number} The number of campaign and level files to load. The campaign files add their level files. */
export let levelsToLoad = 5;
/** @type {string[]} The URLs of the campaign and level files that could not be loaded. */
const missingFiles = [];

/**
 * Mark the tile layer as changed, so the next frame draws it again.
 *
 * @returns {void}
 */
export function reloadTiles() {
	game.tilesChanged = true;
}

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
	playSound(sfx_tick);
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
	playSound(sfx_tick);
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
 * A campaign with its levels.
 */
export class Campaign {
	/**
	 * @param {string} folder The folder name of the campaign below maps/.
	 */
	constructor(folder) {
		/** @type {string} The folder name of the campaign below maps/. */
		this.folder = folder;
		/** @type {number[][]} The 768 tile ids of each level. */
		this.levels = new Array();
		/** @type {number[]} The background index of each level. */
		this.backgrounds = new Array();
		/** @type {number[]} The boss of each level, or 0 for a level without a boss. */
		this.bosses = new Array();
		/** @type {string[]} The text that the robot shows in each level. */
		this.texts = new Array();
	}
}

/**
 * Create the campaigns and start to load their files.
 *
 * @returns {void}
 */
export function loadCampaigns() {
	let c;
	campaigns = CAMPAIGN_FOLDERS.map((folder) => new Campaign(folder));

	for (c = 0; c < campaigns.length; c++) {
		loadCampaignFiles(c);
	}
}

/**
 * Load the level list of a campaign and then its level files.
 *
 * @param {number} camp The index of the campaign.
 */
function loadCampaignFiles(camp) {
	const folder = 'maps/' + campaigns[camp].folder + '/';
	loadLevelJsonFile(folder + 'campaign.json', function (data) {
		levelsToLoad += data.levels.length;
		for (let i = 0; i < data.levels.length; i++) {
			loadLevelFile(camp, i, folder + data.levels[i]);
		}
		levelsLoaded++;
	});
}

/**
 * Load a level file of a campaign.
 *
 * @param {number} camp The index of the campaign.
 * @param {number} index The index of the level in the campaign, starting at 0.
 * @param {string} url The URL of the level file.
 */
function loadLevelFile(camp, index, url) {
	loadLevelJsonFile(url, function (data) {
		const level = parseMap(data);
		campaigns[camp].levels[index] = level.tiles;
		campaigns[camp].backgrounds[index] = level.bg;
		campaigns[camp].bosses[index] = level.boss;
		campaigns[camp].texts[index] = typeof data.text == 'string' ? data.text : '';
		levelsLoaded++;
	});
}

/**
 * Load a campaign or level file. A file that fails to load or that the callback rejects goes into the list of missing
 * level files.
 *
 * @param {string} url The URL of the file.
 * @param {function(*)} callback Gets the content of the file.
 */
function loadLevelJsonFile(url, callback) {
	loadJsonFile(url, callback, () => missingFiles.push(url));
}

/**
 * Load a JSON file.
 *
 * @param {string} url The URL of the file.
 * @param {function(*)} callback Gets the content of the file.
 * @param {function(): void} [onError] Called if the file fails to load or the callback throws an error.
 */
function loadJsonFile(url, callback, onError = () => {}) {
	fetch(url, { cache: 'no-cache' })
		.then(function (response) {
			if (!response.ok) throw new Error(url + ': ' + response.status);
			return response.json();
		})
		.then(callback)
		.catch(function (e) {
			console.error(url, e);
			onError();
		});
}

/**
 * Get the campaign and level files that could not be loaded.
 *
 * @returns {string[]} The URLs of the missing files.
 */
export function missingLevelFiles() {
	return missingFiles;
}

/**
 * Start to load the lines of the credits.
 *
 * @returns {void}
 */
export function loadCreditsText() {
	creditsTxt = new Array();
	loadJsonFile('credits.json', function (data) {
		creditsTxt = data.lines;
	});
}

/** @type {string[]} The lines of the credits. */
export let creditsTxt = new Array();

/** @type {Object<number, number>} The direction of each tunnel tile. */
const TUNNEL_DIRECTIONS = {
	[Tile.TUNNEL_RIGHT]: Direction.RIGHT,
	[Tile.TUNNEL_LEFT]: Direction.LEFT,
	[Tile.TUNNEL_UP]: Direction.UP,
	[Tile.TUNNEL_DOWN]: Direction.DOWN,
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
 * Create the objects of the map in game.map at their start positions.
 *
 * The mode selects what the function does with the map:
 *
 * - "play" for a level and for the test run of the editor: the object tiles leave the map, the tunnels block their
 *   tiles, the exits close, and the animated tiles and the plasma balls start. In the levels of boss 3 and boss 4, the
 *   plasma start tile is the start point of the plasma shots of the boss.
 * - "preview" for the level selection and the editor menus: the map stays the same, and only game.displayMap shows
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
	let vx, vy, up, down, left, right, y2;
	const play = mode == 'play';
	game.cakes = new Array();
	game.turrets = new Array();
	game.crates = new Array();
	game.tunnels = new Array();
	game.tunnelFields = new Array();
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

		if (tile in TUNNEL_DIRECTIONS) {
			const dir = TUNNEL_DIRECTIONS[tile];
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, dir));
			if (play) {
				// a tunnel covers two tiles
				const next = dir == Direction.RIGHT || dir == Direction.LEFT ? x + ((y + 1) << 5) : x + 1 + (y << 5);
				game.map[i] = Tile.TUNNEL_BLOCK;
				game.map[next] = Tile.TUNNEL_BLOCK;
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
			if (x + 1 < MAP_WIDTH) right = game.map[x + 1 + (y << 5)];
			else right = 1;
			if (x - 1 >= 0) left = game.map[x - 1 + (y << 5)];
			else left = 1;
			if (y + 1 < MAP_HEIGHT) down = game.map[x + ((y + 1) << 5)];
			else down = 1;
			if (y - 1 >= 0) up = game.map[x + ((y - 1) << 5)];
			else up = 1;

			let x2 = (y2 = 0);
			let push = true;

			if (up && down && left) {
				vx = 424;
				vy = 0;
				x2 = ((x + 1) << 4) << 8;
				y2 = (y << 4) << 8;
			} else if (up && down && right) {
				vx = -424;
				vy = 0;
				x2 = ((x - 1) << 4) << 8;
				y2 = (y << 4) << 8;
			} else if (right && down && left) {
				vx = 0;
				vy = -424;
				x2 = (x << 4) << 8;
				y2 = ((y - 1) << 4) << 8;
			} else if (left && right && up) {
				vx = 0;
				vy = 424;
				x2 = (x << 4) << 8;
				y2 = ((y + 1) << 4) << 8;
			} else push = false;

			if (push && boss == 0) game.plasmaBall.push(new Plasma(x2, y2, vx, vy));
			else if (push && (boss == 3 || boss == 4)) {
				game.plasmaX = x2;
				game.plasmaY = y2;
			}
		}
	}
}

/**
 * Reset the level state that a level and the test run of the editor share: the robot, the portals, the sparkles, the
 * text, the counters and the input.
 *
 * @returns {void}
 */
function resetLevelState() {
	game.robot = new Robot();
	game.portals = new Array();
	game.portals.push(new Portal());
	game.portals.push(new Portal());
	game.sparkles = new Array();
	ui.txtLines = new Array();
	game.time = 0;
	game.steps = 0;
	game.portalShots = 0;
	ui.timeWriting = 0;
	ui.escapeMenu = false;
	input.keys = 0;
	input.oldKeys = 0;
}

/**
 * Start the map of the level editor as a level for a test run. The map stays in game.map.
 *
 * @returns {void}
 */
export function loadLevelEditor() {
	game.displayMap = game.map.slice();
	resetLevelState();
	game.player = new Player();
	parseObjects('play');

	game.camera = new Camera(game.player.x, game.player.y);
	game.cakesLeft = game.cakes.length;
	game.tilesChanged = true;
}

/**
 * Start a level of the current campaign.
 *
 * The function copies the map, creates the player, the objects and the animated tiles, resets the level time and starts
 * a new replay recording. In level 8 of the normal and the advanced campaign, the player drops into the level from a
 * fixed position.
 *
 * @param {number} level The level number, starting at 1, or -1 to start the map in game.oldMap again.
 * @returns {void}
 */
export function loadLevel(level) {
	if (level > -1) {
		game.map = campaigns[ui.campaign].levels[level - 1].slice();
		game.oldMap = game.map.slice();
	} else {
		game.map = game.oldMap.slice();
	}
	game.displayMap = game.map.slice();

	resetLevelState();
	if (ui.currentMenu == Menu.TUTORIAL) {
		ui.txtLines.push('');
		ui.txtLines.push('');
		ui.txtLines.push('Follow the on-screen instructions to progress through the tutorial.');
	}
	if (!game.replayMode) game.replay = new Replay();

	game.player = new Player();
	if (level == 8 && ui.campaign <= CampaignId.ADVANCED) {
		game.player.vy = -2400;
		game.player.x = 128 << 8;
		game.player.y = PLAYFIELD_HEIGHT << 8;
	}

	game.bossNum = level > 0 ? campaigns[ui.campaign].bosses[level - 1] : 0;
	parseObjects('play', game.bossNum);

	game.camera = new Camera(game.player.x, game.player.y);
	game.cakesLeft = game.cakes.length;
	game.tilesChanged = true;
	if (game.cakesLeft == 0) openExit();

	if (level > -1) game.background = campaigns[ui.campaign].backgrounds[level - 1];
	if (game.bossNum > 0) setupBoss();
}

/**
 * Prepare a map for the preview in the level selection or in the editor menus. The objects stand at their start
 * positions.
 *
 * @param {number} level The level number of the current campaign, or a value below 1 to use the map in game.map.
 * @returns {void}
 */
export function loadPreviewMap(level) {
	if (level > 0) game.map = campaigns[ui.campaign].levels[level - 1].slice();
	game.displayMap = game.map.slice();
	game.portals = new Array();
	game.portals.push(new Portal());
	game.portals.push(new Portal());
	game.sparkles = new Array();
	game.animatedTiles = new Array();
	game.plasmaBall = new Array();

	game.player = new Player();
	parseObjects('preview');

	if (level == 8 && ui.campaign <= CampaignId.ADVANCED) {
		game.player.vy = -2400;
		game.player.x = 128 << 8;
		game.player.y = PLAYFIELD_HEIGHT << 8;
	}

	game.bossNum = level > 0 ? campaigns[ui.campaign].bosses[level - 1] : 0;
	if (game.bossNum > 0) setupBoss();

	game.cakesLeft = game.cakes.length;
	game.tilesChanged = true;

	if (level > 0) game.background = campaigns[ui.campaign].backgrounds[level - 1];
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
