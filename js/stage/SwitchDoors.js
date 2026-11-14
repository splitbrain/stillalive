/**
 * The SwitchDoors object.
 */

import { Direction, DIRECTIONS, TILE_SIZE } from './constants.js';
import { PortalGlow } from './entities/sparkles.js';
import { FIRST_OF_KIND, Tile, TileKind } from './tiles.js';
import { toPixels } from './utils.js';

/**
 * @type {Object<number, {x: number, y: number}>} The pixel offsets from the position of a portal to the line of test
 *     points for a switch door in the wall of the portal, by the direction of the portal.
 */
const DOOR_TEST_OFFSETS = {
	[Direction.UP]: { x: 0, y: 6 },
	[Direction.DOWN]: { x: 0, y: -2 },
	[Direction.LEFT]: { x: 6, y: 0 },
	[Direction.RIGHT]: { x: -2, y: 0 },
};

/**
 * The switches and the switch doors of a level. The switch doors are open while the player or a crate stands on a
 * switch.
 */
export class SwitchDoors {
	/** @type {import('./World.js').World} The World of the switches. */
	#world;
	/** @type {boolean} True while the player or a crate holds a switch and the switch doors are open. */
	pressed = false;

	/**
	 * @param {import('./World.js').World} world The World of the switches.
	 */
	constructor(world) {
		this.#world = world;
	}

	/**
	 * Open or close the switch doors when the player or a crate steps on or off a switch.
	 *
	 * @returns {void}
	 */
	update() {
		const held = this.#playerOnSwitch() || this.#crateOnSwitch();
		if (held === this.pressed) return;
		this.pressed = held;
		this.#world.setDoors(TileKind.SWITCH_DOOR, held);
		if (!held) this.#clearBlockers();
	}

	/**
	 * Remove everything that blocks a closed switch door. Portals on the door go away. Crates and plasma balls in the
	 * door go back to their start positions.
	 *
	 * @returns {void}
	 */
	#clearBlockers() {
		const world = this.#world;
		const door = FIRST_OF_KIND[TileKind.SWITCH_DOOR];
		for (const [i, portal] of world.portals.list.entries()) {
			if (!portal.used) continue;
			const offset = DOOR_TEST_OFFSETS[portal.direction];
			const x = toPixels(portal.x) + offset.x;
			const y = toPixels(portal.y) + offset.y;
			const onSideWall = DIRECTIONS[portal.direction].horizontal;
			for (let j = 0; j < 2 * TILE_SIZE; j++) {
				if (world.map.atPixel(onSideWall ? x : x + j, onSideWall ? y + j : y) === door) {
					portal.used = false;
					world.removeSparkles(PortalGlow, i);
					break;
				}
			}
		}

		for (const crate of world.crates) {
			if (this.#touchesDoor(crate)) {
				crate.x = crate.startX;
				crate.y = crate.startY;
				crate.vx = 0;
				crate.vy = 0;
			}
		}

		for (const ball of world.plasmaBall) {
			if (this.#touchesDoor(ball)) ball.reset();
		}
	}

	/**
	 * Check if a 16 by 16 object touches a switch door with one of its corners.
	 *
	 * @param {import('./entities/Body.js').Body} obj The object.
	 * @returns {boolean} True if a corner of the object is on a switch door tile.
	 */
	#touchesDoor(obj) {
		const door = FIRST_OF_KIND[TileKind.SWITCH_DOOR];
		const x = obj.pixelX;
		const y = obj.pixelY;
		const corners = [
			[x, y],
			[x + TILE_SIZE - 1, y],
			[x, y + TILE_SIZE - 1],
			[x + TILE_SIZE - 1, y + TILE_SIZE - 1],
		];
		return corners.some(([cx, cy]) => this.#world.map.atPixel(cx, cy) === door);
	}

	/**
	 * Check if the player stands on a switch. The test points lie a few pixels inside the tile below the feet.
	 *
	 * @returns {boolean} True if a switch tile is below the player.
	 */
	#playerOnSwitch() {
		const { map, player } = this.#world;
		const x = player.pixelX;
		const below = player.pixelY + player.height + 5;
		return map.atPixel(x, below) === Tile.SWITCH || map.atPixel(x + 15, below) === Tile.SWITCH;
	}

	/**
	 * Check if a crate stands on a switch. The test points lie a few pixels inside the tile below the crate.
	 *
	 * @returns {boolean} True if a switch tile is below a crate.
	 */
	#crateOnSwitch() {
		const map = this.#world.map;
		return this.#world.crates.some((crate) => {
			const x = crate.pixelX;
			const y = crate.pixelY + crate.height + 3;
			return map.atPixel(x, y) === Tile.SWITCH || map.atPixel(x + TILE_SIZE - 1, y) === Tile.SWITCH;
		});
	}
}
