/**
 * The creation of the bodies of a map.
 */

import { DIRECTIONS, ORDERED, RANDOM, TILE_SIZE } from '../constants.js';
import { AnimatedTile } from './AnimatedTile.js';
import { Cake } from '../bodies/Cake.js';
import { Crate } from '../bodies/Crate.js';
import { GravPipe } from '../bodies/GravPipe.js';
import { Platform } from '../bodies/Platform.js';
import { Turret } from '../bodies/Turret.js';
import { GRAVPIPE_DIRECTIONS, PLAYER_LAUNCH_DIRECTIONS, plasmaLaunch } from './level.js';
import { FIRST_OF_KIND, LAST_OF_KIND, Tile, TileKind, isTileKind } from '../map/tiles.js';
import { toSubpixels } from '../utils.js';

/** @type {{kind: string, type: number, speed: number}[]} The tile kinds that become animated tiles in a level. */
const ANIMATED_KINDS = [
	{ kind: TileKind.PLASMA_DOOR, type: RANDOM, speed: 6 },
	{ kind: TileKind.SWITCH_DOOR, type: RANDOM, speed: 6 },
	{ kind: TileKind.RAZOR_WHEEL, type: ORDERED, speed: 15 },
	{ kind: TileKind.ACID, type: ORDERED, speed: 15 },
	{ kind: TileKind.ENERGYWALL, type: RANDOM, speed: 6 },
	{ kind: TileKind.FORCE_FIELD, type: ORDERED, speed: 6 },
	{ kind: TileKind.BELT_RIGHT, type: ORDERED, speed: 10 },
	{ kind: TileKind.BELT_LEFT, type: ORDERED, speed: 10 },
];

/**
 * A position in 1/256 pixels.
 *
 * @typedef {{x: number, y: number}} Position
 */

/**
 * The start of the player from a player start tile or a player launch tile.
 *
 * @typedef {object} PlayerStart
 * @property {number} x The x position of the tile in 1/256 pixels.
 * @property {number} y The y position of the tile in 1/256 pixels.
 * @property {number|null} launch The direction of the launch, a value of Direction, or null for a player start
 *     without a launch.
 */

/**
 * The bodies of a map at their start positions.
 *
 * @typedef {object} MapBodies
 * @property {Cake[]} cakes The cakes.
 * @property {Turret[]} turrets The turrets.
 * @property {Crate[]} crates The crates.
 * @property {GravPipe[]} gravPipes The gravitational pipes.
 * @property {Platform[]} platforms The moving platforms.
 * @property {AnimatedTile[]} animatedTiles The animated tiles.
 * @property {PlayerStart|null} playerStart The last player start or player launch tile, or null for a map without
 *     one.
 * @property {Position|null} tube The position of the last tube tile, or null for a map without it.
 * @property {import('./level.js').PlasmaLaunch[]} plasmaLaunches The starts of the plasma balls, one for each plasma
 *     start tile with a valid launch.
 */

/**
 * Create the bodies of a level start at their start positions, in map order, and prepare the map for the level. The
 * body tiles leave the map, the gravitational pipes block their tiles, the exits close, and the animated tiles and
 * the plasma launches start.
 *
 * @param {import('./World.js').World} world The World of the bodies. The function changes the map of the World.
 * @returns {MapBodies} The bodies.
 */
export function createBodies(world) {
	/** @type {MapBodies} */
	const bodies = {
		cakes: [],
		turrets: [],
		crates: [],
		gravPipes: [],
		platforms: [],
		animatedTiles: [],
		playerStart: null,
		tube: null,
		plasmaLaunches: [],
	};

	const map = world.map;
	for (const [i, tile] of map.tiles.entries()) {
		const x = map.column(i);
		const y = map.row(i);
		const animated = ANIMATED_KINDS.find((entry) => isTileKind(tile, entry.kind));

		if (tile in GRAVPIPE_DIRECTIONS) {
			const dir = GRAVPIPE_DIRECTIONS[tile];
			bodies.gravPipes.push(new GravPipe(world, toSubpixels(x * TILE_SIZE), toSubpixels(y * TILE_SIZE), dir));
			// a gravitational pipe covers two tiles
			const next = DIRECTIONS[dir].horizontal ? map.index(x, y + 1) : map.index(x + 1, y);
			map.setTile(i, Tile.GRAVPIPE_BLOCK);
			map.setTile(next, Tile.GRAVPIPE_BLOCK);
			map.setDisplay(i, Tile.EMPTY);
			map.setDisplay(next, Tile.EMPTY);
			continue;
		}
		if (tile === Tile.EXIT) {
			map.setTile(i, Tile.EXIT_CLOSED);
			map.setDisplay(i, Tile.EXIT_CLOSED);
			continue;
		}
		if (animated) {
			map.setDisplay(i, Tile.EMPTY);
			bodies.animatedTiles.push(
				new AnimatedTile(
					world,
					x,
					y,
					FIRST_OF_KIND[animated.kind],
					LAST_OF_KIND[animated.kind],
					animated.type,
					i,
					animated.speed,
				),
			);
			continue;
		}

		const px = toSubpixels(x * TILE_SIZE);
		const py = toSubpixels(y * TILE_SIZE);
		switch (tile) {
			case Tile.CAKE:
				bodies.cakes.push(new Cake(world, px, py));
				map.setTile(i, Tile.EMPTY);
				break;
			case Tile.TURRET_LEFT:
			case Tile.TURRET_RIGHT:
				map.set(i, Tile.EMPTY);
				bodies.turrets.push(new Turret(world, px, py, tile === Tile.TURRET_LEFT ? -1 : 1));
				break;
			case Tile.CRATE:
				map.set(i, Tile.EMPTY);
				bodies.crates.push(new Crate(world, px, py));
				break;
			case Tile.PLAYER_START:
			case Tile.PLAYER_LAUNCH_UP:
				bodies.playerStart = { x: px, y: py, launch: PLAYER_LAUNCH_DIRECTIONS[tile] ?? null };
				map.setTile(i, Tile.EMPTY);
				break;
			case Tile.PLATFORM_RIGHT:
			case Tile.PLATFORM_LEFT:
				bodies.platforms.push(new Platform(world, px, py, tile === Tile.PLATFORM_RIGHT ? 256 : -256, 0));
				map.setTile(i, Tile.EMPTY);
				break;
			case Tile.TUBE:
				bodies.tube = { x: px, y: py };
				map.set(i, Tile.EMPTY);
				break;
			case Tile.PLASMA_START: {
				// the launch depends on the tiles around the start, as the loop left them so far
				const launch = plasmaLaunch(map, x, y);
				if (launch) bodies.plasmaLaunches.push(launch);
				break;
			}
		}
	}
	return bodies;
}
