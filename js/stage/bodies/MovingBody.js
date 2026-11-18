/**
 * The MovingBody object and the turns of its speed at a teleport.
 */

import { Direction, DIRECTIONS, Ground, TILE_SIZE } from '../constants.js';
import { isTileKind, Tile, TileKind } from '../map/tiles.js';
import { toPixels, toSubpixels } from '../utils.js';
import { Body } from './Body.js';

/**
 * @type {Array<{side: number, opposite: number, dx: number, dy: number}>} The sides in the order in which
 *     checkCollisions() resolves them, with the step of one pixel that moves the body away from the side.
 */
const PUSH_OUT = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT].map((side) => {
	const opposite = DIRECTIONS[side].opposite;
	return { side, opposite, dx: toSubpixels(DIRECTIONS[opposite].dx), dy: toSubpixels(DIRECTIONS[opposite].dy) };
});

/**
 * @typedef {(vx: number, vy: number) => number[]} SpeedTurn A function that gets the speeds of a body before a
 *     teleport and returns the speeds [vx, vy] after the teleport.
 */

/** @type {SpeedTurn} The turn that keeps the speeds. */
export const KEEP_SPEED = (vx, vy) => [vx, vy];

/**
 * @type {Object<number, Object<number, SpeedTurn>>} The turns of the speed after a teleport, by the direction of the
 *     entry portal and then by the direction of the exit portal.
 */
const TELEPORT_TURNS = {
	[Direction.UP]: {
		[Direction.UP]: (vx) => [vx, 650],
		[Direction.DOWN]: (vx) => [vx, -1000],
		[Direction.LEFT]: (vx, vy) => [650, vy],
		[Direction.RIGHT]: (vx, vy) => [-650, vy],
	},
	[Direction.DOWN]: {
		[Direction.UP]: KEEP_SPEED,
		[Direction.DOWN]: (vx, vy) => [vx, Math.min(-vy, -1100)],
		[Direction.LEFT]: (vx, vy) => [vy, vx],
		[Direction.RIGHT]: (vx, vy) => [-vy, vx],
	},
	[Direction.LEFT]: {
		[Direction.UP]: (vx) => [vx, 650],
		[Direction.DOWN]: (vx) => [vx, -1000],
		[Direction.LEFT]: (vx, vy) => [1000, vy],
		[Direction.RIGHT]: (vx, vy) => [-650, vy],
	},
	[Direction.RIGHT]: {
		[Direction.UP]: (vx) => [vx, 650],
		[Direction.DOWN]: (vx) => [vx, -1000],
		[Direction.LEFT]: (vx, vy) => [650, vy],
		[Direction.RIGHT]: (vx, vy) => [-1000, vy],
	},
};

/**
 * A body with a speed: the player, the crates and the turrets, the plasma balls, the platforms and the razor wheels of
 * the boss. A moving body collides with the tiles, stands on the ground and goes through the portals.
 */
export class MovingBody extends Body {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} width The width in pixels.
	 * @param {number} height The height in pixels.
	 */
	constructor(world, x, y, width, height) {
		super(world, x, y, width, height);
		/** @type {number} The horizontal speed in 1/256 pixels per tick. A body starts at rest. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. A body starts at rest. */
		this.vy = 0;
	}

	/**
	 * Check what the body stands on.
	 *
	 * @returns {number} The ground, a value of Ground.
	 */
	touchingGround() {
		if (this.vy < 0) return Ground.AIR;
		const y = this.pixelY + this.height;
		const hit = this.world.getTile(this.pixelX + 1, y);
		const hit2 = this.world.getTile(this.pixelX + this.width - 1, y);

		if (isTileKind(hit, TileKind.BELT_RIGHT) || isTileKind(hit2, TileKind.BELT_RIGHT)) return Ground.BELT_RIGHT;
		if (isTileKind(hit, TileKind.BELT_LEFT) || isTileKind(hit2, TileKind.BELT_LEFT)) return Ground.BELT_LEFT;
		if (hit === Tile.ICYWALL || hit2 === Tile.ICYWALL) return Ground.ICE;
		return hit || hit2 ? Ground.FLOOR : Ground.AIR;
	}

	/**
	 * Push the body out of the solid tiles and stop its speed in that direction.
	 *
	 * @returns {boolean} True if a collision was resolved, false if there was none or the body is stuck between two
	 *     sides.
	 */
	checkCollisions() {
		for (const { side, opposite, dx, dy } of PUSH_OUT) {
			if (this.getCollision() !== side) continue;
			this.#stopAgainst(side);
			if (this.#pushOut(side, opposite, dx, dy)) return true;
		}
		return false;
	}

	/**
	 * Stop the speed towards a side that touches a solid tile. A hit at the top also halves the horizontal speed.
	 *
	 * @param {number} side The side, a value of Direction.
	 * @returns {void}
	 */
	#stopAgainst(side) {
		const { dx, dy, horizontal } = DIRECTIONS[side];
		if (horizontal) {
			if (this.vx * dx > 0) this.vx = 0;
		} else if (this.vy * dy > 0) {
			if (side === Direction.UP) this.vx >>= 1;
			this.vy = 0;
		}
	}

	/**
	 * Move the body away from a side in steps of one pixel until the side is free.
	 *
	 * @param {number} side The side that touches a solid tile, a value of Direction.
	 * @param {number} opposite The opposite side.
	 * @param {number} dx The horizontal step in 1/256 pixels.
	 * @param {number} dy The vertical step in 1/256 pixels.
	 * @returns {boolean} True if the side is free, false if the body is stuck because the opposite side touches a
	 *     solid tile. A stuck body between two side walls also stops falling.
	 */
	#pushOut(side, opposite, dx, dy) {
		do {
			this.x += dx;
			this.y += dy;
			if (this.getCollision() === opposite) {
				if (dx !== 0) this.vy = 0;
				return false;
			}
		} while (this.getCollision() === side);
		return true;
	}

	/**
	 * Check if the body can go into a portal on one side.
	 *
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {boolean} True if the body can go into the portal.
	 */
	// eslint-disable-next-line no-unused-vars
	canEnterPortal(side) {
		return true;
	}

	/**
	 * Move the body to the middle of a portal that it goes into. At a portal in a side wall, the body loses its
	 * vertical speed.
	 *
	 * @param {import('../portals/Portal.js').Portal} portal The portal.
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {void}
	 */
	alignToPortal(portal, side) {
		if (DIRECTIONS[side].horizontal) {
			const gap = (2 * TILE_SIZE - this.height) >> 1;
			this.y = toSubpixels(toPixels(portal.y) + gap);
			this.vy = 0;
		} else {
			this.x = toSubpixels(toPixels(portal.x) + TILE_SIZE / 2);
		}
	}

	/**
	 * Turn the speed of the body to the direction of the exit portal after a teleport.
	 *
	 * @param {import('../portals/Portal.js').Portal} entry The portal that the body entered.
	 * @param {import('../portals/Portal.js').Portal} exit The portal that the body came out of.
	 * @returns {void}
	 */
	teleported(entry, exit) {
		[this.vx, this.vy] = TELEPORT_TURNS[entry.direction][exit.direction](this.vx, this.vy);
	}
}
