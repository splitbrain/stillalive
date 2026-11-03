/**
 * Loading of the campaigns, the levels, the level editor maps and the credits, and the doors of a level.
 */

import { playSound, sfx_tick } from './audio.js';
import { setupBoss } from './boss.js';
import { CAMPAIGN_FOLDERS, CampaignId, Direction, Menu, ORDERED, RANDOM } from './constants.js';
import { AnimatedTile } from './entities/AnimatedTile.js';
import { Cake } from './entities/Cake.js';
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
						game.portals[i].used = 0;
						removeSparkles(i, 3);
						j = 32;
					}
				}
			} else {
				for (j = 0; j < 32; j++) {
					if (getTileSimple(x + j, y) == FIRST_OF_KIND[TileKind.SWITCH_DOOR]) {
						game.portals[i].used = 0;
						removeSparkles(i, 3);
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
		if (getTileSimple(game.crates[i].x >> 8, (game.crates[i].y >> 8) + 19) == 19) {
			return 1;
		} else if (getTileSimple((game.crates[i].x >> 8) + 15, (game.crates[i].y >> 8) + 19) == 19) {
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
		const level = parseMap(data, true);
		campaigns[camp].levels[index] = level.tiles;
		campaigns[camp].backgrounds[index] = level.bg;
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

/**
 * Start the map of the level editor as a level for a test run. The map stays in game.map.
 *
 * @returns {void}
 */
export function loadLevelEditor() {
	let vx, up, down, left, right, i, y2, vy;
	game.tubeX = game.tubeY = -1;
	game.displayMap = new Array();
	for (i = 0; i < game.map.length; i++) {
		game.displayMap.push(game.map[i]);
	}

	game.robot = new Robot();

	game.portals = new Array();
	game.portals.push(new Portal());
	game.portals.push(new Portal());
	game.cakes = new Array();
	game.sparkles = new Array();
	game.crates = new Array();
	game.tunnels = new Array();
	game.forceFields = new Array();
	game.platforms = new Array();
	game.animatedTiles = new Array();
	game.plasmaBall = new Array();
	game.turrets = new Array();
	ui.txtLines = new Array();
	game.TIME = 0;
	game.STEPS = 0;
	game.PORTALS = 0;
	ui.timeWriting = 0;
	ui.escapeMenu = false;
	input.keys = 0;
	input.oldKeys = 0;

	game.player = new Player();

	for (i = 0; i < game.map.length; i++) {
		const y = i >> 5;
		const x = i - (y << 5);

		if (game.map[i] == Tile.TUNNEL_RIGHT) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.RIGHT));
			game.map[i] = Tile.TUNNEL_BLOCK;
			game.map[x + ((y + 1) << 5)] = 199;
			game.displayMap[i] = 0;
			game.displayMap[x + ((y + 1) << 5)] = 0;
		} else if (game.map[i] == Tile.TUNNEL_LEFT) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.LEFT));
			game.map[i] = Tile.TUNNEL_BLOCK;
			game.map[x + ((y + 1) << 5)] = 199;
			game.displayMap[i] = 0;
			game.displayMap[x + ((y + 1) << 5)] = 0;
		} else if (game.map[i] == Tile.TUNNEL_UP) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.UP));
			game.map[i] = Tile.TUNNEL_BLOCK;
			game.map[x + 1 + (y << 5)] = 199;
			game.displayMap[i] = 0;
			game.displayMap[x + 1 + (y << 5)] = 0;
		} else if (game.map[i] == Tile.TUNNEL_DOWN) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.DOWN));
			game.map[i] = Tile.TUNNEL_BLOCK;
			game.map[x + 1 + (y << 5)] = 199;
			game.displayMap[i] = 0;
			game.displayMap[x + 1 + (y << 5)] = 0;
		} else if (game.map[i] == Tile.EXIT) {
			game.map[i] = Tile.EXIT_CLOSED;
			game.displayMap[i] = Tile.EXIT_CLOSED;
			continue;
		} else if (isTileKind(game.map[i], TileKind.PLASMA_DOOR)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.PLASMA_DOOR], LAST_OF_KIND[TileKind.PLASMA_DOOR], RANDOM, i, 6),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.SWITCH_DOOR)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.SWITCH_DOOR], LAST_OF_KIND[TileKind.SWITCH_DOOR], RANDOM, i, 6),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.WHEEL)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.WHEEL], LAST_OF_KIND[TileKind.WHEEL], ORDERED, i, 15),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.ACID)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.ACID], LAST_OF_KIND[TileKind.ACID], ORDERED, i, 15),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.NO_PORTAL)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.NO_PORTAL], LAST_OF_KIND[TileKind.NO_PORTAL], RANDOM, i, 6),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.FORCE_FIELD)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.FORCE_FIELD], LAST_OF_KIND[TileKind.FORCE_FIELD], ORDERED, i, 6),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.BELT_RIGHT)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.BELT_RIGHT], LAST_OF_KIND[TileKind.BELT_RIGHT], ORDERED, i, 10),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.BELT_LEFT)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.BELT_LEFT], LAST_OF_KIND[TileKind.BELT_LEFT], ORDERED, i, 10),
			);
			continue;
		} else if (game.map[i] == Tile.CAKE) {
			game.cakes.push(new Cake((x * 16) << 8, (y * 16) << 8));
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.TURRET_LEFT) {
			game.displayMap[i] = 0;
			game.map[i] = 0;
			game.turrets.push(new Turret((x * 16) << 8, (y * 16) << 8, -1));
			continue;
		} else if (game.map[i] == Tile.TURRET_RIGHT) {
			game.displayMap[i] = 0;
			game.map[i] = 0;
			game.turrets.push(new Turret((x * 16) << 8, (y * 16) << 8, 1));
			continue;
		} else if (game.map[i] == Tile.CRATE) {
			game.displayMap[i] = 0;
			game.map[i] = 0;
			game.crates.push(new Crate((x * 16) << 8, (y * 16) << 8));
			continue;
		} else if (game.map[i] == Tile.PLAYER_START) {
			game.player.x = (x * 16) << 8;
			game.player.y = (y * 16) << 8;
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.PLATFORM_RIGHT) {
			vx = 256;
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.PLATFORM_LEFT) {
			vx = -256;
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.PLASMA_START) {
			if (x + 1 < 32) right = game.map[x + 1 + (y << 5)];
			else right = 1;
			if (x - 1 >= 0) left = game.map[x - 1 + (y << 5)];
			else left = 1;
			if (y + 1 < 24) down = game.map[x + ((y + 1) << 5)];
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

			if (push) game.plasmaBall.push(new Plasma(x2, y2, vx, vy));
		}
	}

	game.camera = new Camera(game.player.x, game.player.y);
	game.CAKELEFT = game.cakes.length;

	game.needLoad = true;
}

/**
 * Start a level of the current campaign.
 *
 * The function copies the map, creates the player, the objects and the animated tiles, resets the level time and starts
 * a new replay recording. In level 8 of the normal and the advanced campaign, the player drops into the level from a
 * fixed position.
 *
 * @param {number} level The level number, starting at 1.
 * @returns {void}
 */
export function loadLevel(level) {
	let vx, up, down, left, right, i, y2, vy;
	game.tubeX = game.tubeY = -1;

	if (level > -1) {
		game.map = new Array();
		game.oldMap = new Array();
		game.displayMap = new Array();
		for (i = 0; i < campaigns[ui.campaign].levels[level - 1].length; i++) {
			game.map.push(campaigns[ui.campaign].levels[level - 1][i]);
			game.oldMap.push(campaigns[ui.campaign].levels[level - 1][i]);
			game.displayMap.push(campaigns[ui.campaign].levels[level - 1][i]);
		}
	} else {
		game.displayMap = new Array();
		game.map = new Array();
		for (i = 0; i < game.oldMap.length; i++) {
			game.map.push(game.oldMap[i]);
			game.displayMap.push(game.oldMap[i]);
		}
	}

	game.robot = new Robot();
	game.portals = new Array();
	game.portals.push(new Portal());
	game.portals.push(new Portal());
	game.cakes = new Array();
	game.sparkles = new Array();
	game.tunnels = new Array();
	game.forceFields = new Array();
	game.crates = new Array();
	game.platforms = new Array();
	game.animatedTiles = new Array();
	game.plasmaBall = new Array();
	game.turrets = new Array();
	ui.txtLines = new Array();

	if (ui.currentMenu == Menu.TUTORIAL) {
		ui.txtLines.push('');
		ui.txtLines.push('');
		ui.txtLines.push('Follow the on-screen instructions to progress through the tutorial.');
	}

	game.TIME = 0;
	game.STEPS = 0;
	game.PORTALS = 0;
	ui.timeWriting = 0;
	ui.escapeMenu = false;
	input.keys = 0;
	input.oldKeys = 0;
	if (!game.replayMode) game.replay = new Replay();

	game.player = new Player();

	if (level > -1) {
		if (level == 8 && ui.campaign <= CampaignId.ADVANCED) {
			game.player.vy = -2400;
			game.player.x = 128 << 8;
			game.player.y = 384 << 8;
		}
	}

	for (i = 0; i < game.map.length; i++) {
		const y = i >> 5;
		const x = i - (y << 5);

		if (game.map[i] == Tile.TUNNEL_RIGHT) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.RIGHT));
			game.map[i] = Tile.TUNNEL_BLOCK;
			game.map[x + ((y + 1) << 5)] = 199;
			game.displayMap[i] = 0;
			game.displayMap[x + ((y + 1) << 5)] = 0;
		} else if (game.map[i] == Tile.TUNNEL_LEFT) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.LEFT));
			game.map[i] = Tile.TUNNEL_BLOCK;
			game.map[x + ((y + 1) << 5)] = 199;
			game.displayMap[i] = 0;
			game.displayMap[x + ((y + 1) << 5)] = 0;
		} else if (game.map[i] == Tile.TUNNEL_UP) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.UP));
			game.map[i] = Tile.TUNNEL_BLOCK;
			game.map[x + 1 + (y << 5)] = 199;
			game.displayMap[i] = 0;
			game.displayMap[x + 1 + (y << 5)] = 0;
		} else if (game.map[i] == Tile.TUNNEL_DOWN) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.DOWN));
			game.map[i] = Tile.TUNNEL_BLOCK;
			game.map[x + 1 + (y << 5)] = 199;
			game.displayMap[i] = 0;
			game.displayMap[x + 1 + (y << 5)] = 0;
		} else if (game.map[i] == Tile.EXIT) {
			game.map[i] = Tile.EXIT_CLOSED;
			game.displayMap[i] = Tile.EXIT_CLOSED;
			continue;
		} else if (isTileKind(game.map[i], TileKind.PLASMA_DOOR)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.PLASMA_DOOR], LAST_OF_KIND[TileKind.PLASMA_DOOR], RANDOM, i, 6),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.SWITCH_DOOR)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.SWITCH_DOOR], LAST_OF_KIND[TileKind.SWITCH_DOOR], RANDOM, i, 6),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.WHEEL)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.WHEEL], LAST_OF_KIND[TileKind.WHEEL], ORDERED, i, 15),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.ACID)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.ACID], LAST_OF_KIND[TileKind.ACID], ORDERED, i, 15),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.NO_PORTAL)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.NO_PORTAL], LAST_OF_KIND[TileKind.NO_PORTAL], RANDOM, i, 6),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.FORCE_FIELD)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.FORCE_FIELD], LAST_OF_KIND[TileKind.FORCE_FIELD], ORDERED, i, 6),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.BELT_RIGHT)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.BELT_RIGHT], LAST_OF_KIND[TileKind.BELT_RIGHT], ORDERED, i, 10),
			);
			continue;
		} else if (isTileKind(game.map[i], TileKind.BELT_LEFT)) {
			game.displayMap[i] = 0;
			game.animatedTiles.push(
				new AnimatedTile(x, y, FIRST_OF_KIND[TileKind.BELT_LEFT], LAST_OF_KIND[TileKind.BELT_LEFT], ORDERED, i, 10),
			);
			continue;
		} else if (game.map[i] == Tile.CAKE) {
			game.cakes.push(new Cake((x * 16) << 8, (y * 16) << 8));
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.TURRET_LEFT) {
			game.displayMap[i] = 0;
			game.map[i] = 0;
			game.turrets.push(new Turret((x * 16) << 8, (y * 16) << 8, -1));
			continue;
		} else if (game.map[i] == Tile.TURRET_RIGHT) {
			game.displayMap[i] = 0;
			game.map[i] = 0;
			game.turrets.push(new Turret((x * 16) << 8, (y * 16) << 8, 1));
			continue;
		} else if (game.map[i] == Tile.CRATE) {
			game.displayMap[i] = 0;
			game.map[i] = 0;
			game.crates.push(new Crate((x * 16) << 8, (y * 16) << 8));
			continue;
		} else if (game.map[i] == Tile.PLAYER_START) {
			game.player.x = (x * 16) << 8;
			game.player.y = (y * 16) << 8;
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.PLATFORM_RIGHT) {
			vx = 256;
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.PLATFORM_LEFT) {
			vx = -256;
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.TUBE) {
			game.tubeX = (x * 16) << 8;
			game.tubeY = (y * 16) << 8;
			game.displayMap[i] = 0;
			game.map[i] = 0;
			continue;
		} else if (game.map[i] == Tile.PLASMA_START) {
			if (x + 1 < 32) right = game.map[x + 1 + (y << 5)];
			else right = 1;
			if (x - 1 >= 0) left = game.map[x - 1 + (y << 5)];
			else left = 1;
			if (y + 1 < 24) down = game.map[x + ((y + 1) << 5)];
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

			if (push && game.bossNum == 0) game.plasmaBall.push(new Plasma(x2, y2, vx, vy));
			else if (push && (game.bossNum == 3 || game.bossNum == 4)) {
				game.plasmaX = x2;
				game.plasmaY = y2;
			}
		}
	}

	game.camera = new Camera(game.player.x, game.player.y);
	game.CAKELEFT = game.cakes.length;

	game.needLoad = true;

	if (level > -1) {
		game.BG = campaigns[ui.campaign].backgrounds[level - 1];
	}

	if (ui.campaign == CampaignId.STORY) {
		if (level == 7 || level == 14 || level == 21 || level == 28) {
			game.bossNum = level / 7;
			setupBoss();
		} else game.bossNum = 0;
	} else game.bossNum = 0;
}

/**
 * Prepare a map for the preview in the level selection or in the editor menus. The objects stand at their start
 * positions.
 *
 * @param {number} level The level number of the current campaign, or a value below 1 to use the map in game.map.
 * @returns {void}
 */
export function loadPreviewMap(level) {
	let vx, i;
	game.tubeX = game.tubeY = -1;

	if (level > 0) {
		game.map = new Array();
		game.displayMap = new Array();
		for (i = 0; i < campaigns[ui.campaign].levels[level - 1].length; i++) {
			game.map.push(campaigns[ui.campaign].levels[level - 1][i]);
			game.displayMap.push(campaigns[ui.campaign].levels[level - 1][i]);
		}
	} else {
		game.displayMap = new Array();
		for (i = 0; i < game.map.length; i++) {
			game.displayMap.push(game.map[i]);
		}
	}
	game.portals = new Array();
	game.portals.push(new Portal());
	game.portals.push(new Portal());
	game.cakes = new Array();
	game.tunnels = new Array();
	game.forceFields = new Array();
	game.sparkles = new Array();
	game.crates = new Array();
	game.platforms = new Array();
	game.animatedTiles = new Array();
	game.plasmaBall = new Array();
	game.turrets = new Array();

	game.player = new Player();

	for (i = 0; i < game.map.length; i++) {
		const y = i >> 5;
		const x = i - (y << 5);

		if (game.map[i] == Tile.TUNNEL_RIGHT) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.RIGHT));
		} else if (game.map[i] == Tile.TUNNEL_LEFT) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.LEFT));
		} else if (game.map[i] == Tile.TUNNEL_UP) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.UP));
		} else if (game.map[i] == Tile.TUNNEL_DOWN) {
			game.tunnels.push(new Tunnel((x * 16) << 8, (y * 16) << 8, Direction.DOWN));
		} else if (game.map[i] == Tile.TUBE) {
			game.tubeX = (x * 16) << 8;
			game.tubeY = (y * 16) << 8;
		} else if (game.map[i] == Tile.EXIT) {
			game.displayMap[i] = Tile.EXIT_CLOSED;
			continue;
		} else if (game.map[i] == Tile.CAKE) {
			game.cakes.push(new Cake((x * 16) << 8, (y * 16) << 8));
			continue;
		} else if (game.map[i] == Tile.TURRET_LEFT) {
			game.turrets.push(new Turret((x * 16) << 8, (y * 16) << 8, -1));
			continue;
		} else if (game.map[i] == Tile.TURRET_RIGHT) {
			game.turrets.push(new Turret((x * 16) << 8, (y * 16) << 8, 1));
			continue;
		} else if (game.map[i] == Tile.CRATE) {
			game.crates.push(new Crate((x * 16) << 8, (y * 16) << 8));
			continue;
		} else if (game.map[i] == Tile.PLAYER_START) {
			game.player.x = (x * 16) << 8;
			game.player.y = (y * 16) << 8;
			continue;
		} else if (game.map[i] == Tile.PLATFORM_RIGHT) {
			vx = 256;
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			continue;
		} else if (game.map[i] == Tile.PLATFORM_LEFT) {
			vx = -256;
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			continue;
		}
	}

	if (level == 8 && ui.campaign <= CampaignId.ADVANCED) {
		game.player.vy = -2400;
		game.player.x = 128 << 8;
		game.player.y = 384 << 8;
	}

	if (ui.campaign == CampaignId.STORY) {
		if (level == 7 || level == 14 || level == 21 || level == 28) {
			game.bossNum = level / 7;
			setupBoss();
		} else game.bossNum = 0;
	} else game.bossNum = 0;

	game.CAKELEFT = game.cakes.length;
	game.needLoad = true;

	if (level > 0) game.BG = campaigns[ui.campaign].backgrounds[level - 1];
}
