/**
 * The Plasma object.
 */

import { Body, KEEP_SPEED } from './Body.js';
import { playSound, setSoundVolume, sfx_bounce } from '../browser/audio.js';
import { Direction, DIRECTIONS, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../constants.js';
import { Tile, TileKind, isTileKind } from '../map/tiles.js';
import { getDistance, random, toSubpixels } from '../utils.js';

/**
 * @type {Object<number, Object<number, import('./Body.js').SpeedTurn>>} The turns of the speed of a homing ball after a
 *     teleport, by the direction of the entry portal and then by the direction of the exit portal. The ball keeps the
 *     size of its speed: a turn swaps vx and vy, changes their signs, or keeps them.
 */
const HOMING_TURNS = {
	[Direction.UP]: {
		[Direction.UP]: (vx, vy) => [vx, -vy],
		[Direction.DOWN]: KEEP_SPEED,
		[Direction.LEFT]: (vx, vy) => [-vy, vx],
		[Direction.RIGHT]: (vx, vy) => [vy, vx],
	},
	[Direction.DOWN]: {
		[Direction.UP]: KEEP_SPEED,
		[Direction.DOWN]: (vx, vy) => [vx, -vy],
		[Direction.LEFT]: (vx, vy) => [vy, vx],
		[Direction.RIGHT]: (vx, vy) => [-vy, vx],
	},
	[Direction.LEFT]: {
		[Direction.UP]: (vx, vy) => [vy, -vx],
		[Direction.DOWN]: (vx, vy) => [vy, vx],
		[Direction.LEFT]: (vx, vy) => [-vx, vy],
		[Direction.RIGHT]: KEEP_SPEED,
	},
	[Direction.RIGHT]: {
		[Direction.UP]: (vx, vy) => [vy, vx],
		[Direction.DOWN]: (vx, vy) => [vy, -vx],
		[Direction.LEFT]: KEEP_SPEED,
		[Direction.RIGHT]: (vx, vy) => [-vx, vy],
	},
};

/**
 * A plasma ball. It bounces off walls and fills the plasma slots. It kills the player and the turrets.
 */
export class Plasma extends Body {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {boolean} [homing] True for a ball of the boss, which follows the player.
	 */
	constructor(world, x, y, vx, vy, homing = false) {
		super(world, x, y, TILE_SIZE, TILE_SIZE);
		/** @type {number} The x position of the start, where the ball returns after a reset. */
		this.startX = x;
		/** @type {number} The y position of the start, where the ball returns after a reset. */
		this.startY = y;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {number} The horizontal speed of the start. */
		this.startVx = vx;
		/** @type {number} The vertical speed of the start. */
		this.startVy = vy;
		/** @type {number} The speed limit in 1/256 pixels per tick. */
		this.vMax = 424;
		/** @type {boolean} True while the ball exists. */
		this.used = true;
		/** @type {number} The offset of the drawn ball across its path, from -3 to 3 pixels. */
		this.scale = 1;
		/** @type {number} The direction of the pulse, 1 or -1. */
		this.scaleDir = -1;
		/** @type {boolean} True for a ball of the boss. It follows the player and fills no plasma slots. */
		this.homing = homing;
		/** @type {number} The frame of the ball image. */
		this.animFrame = 0;
		/** @type {boolean} True when the ball must go away in the next tick. */
		this.needKill = false;
	}

	/**
	 * Change the frame of the ball image to another random frame every 10 ticks.
	 *
	 * @returns {void}
	 */
	animate() {
		if (this.world.time % 10 !== 0) return;
		let frame;
		do {
			frame = random(0, 3);
		} while (frame === this.animFrame);
		this.animFrame = frame;
	}

	/**
	 * Move the ball for one tick. The ball returns to its start when it leaves the playfield or touches acid. A homing
	 * ball follows the player.
	 *
	 * @returns {void}
	 */
	move() {
		if (this.world.time % 10 === 0) {
			this.scale += 1 * this.scaleDir;
			if (this.scale < -2 || this.scale > 2) this.scaleDir = -this.scaleDir;
		}

		this.x += this.vx;
		this.y += this.vy;

		const vx = this.vx;
		const vy = this.vy;

		if (!this.world.portals.passPortals(this)) {
			this.checkCollision();
			if (this.homing) {
				if (this.x < this.world.player.x) this.vx += 4;
				else if (this.x > this.world.player.x) this.vx -= 4;
				if (this.y < this.world.player.y) this.vy += 4;
				else if (this.y > this.world.player.y) this.vy -= 4;

				const maxSpeed = 3;

				if (this.vx > toSubpixels(maxSpeed)) this.vx = toSubpixels(maxSpeed);
				else if (this.vx < -toSubpixels(maxSpeed)) this.vx = -toSubpixels(maxSpeed);
				if (this.vy > toSubpixels(maxSpeed)) this.vy = toSubpixels(maxSpeed);
				else if (this.vy < -toSubpixels(maxSpeed)) this.vy = -toSubpixels(maxSpeed);

				if (this.x > this.world.tubeX) this.needKill = true;
			}
		}

		if (!this.homing) {
			if (vx && this.vy) this.vx = 0;
			else if (vy && this.vx) this.vy = 0;
			if (this.vx > this.vMax) this.vx = this.vMax;
			else if (this.vx < -this.vMax) this.vx = -this.vMax;
			if (this.vy > this.vMax) this.vy = this.vMax;
			else if (this.vy < -this.vMax) this.vy = -this.vMax;
		}

		const outside =
			this.pixelY > PLAYFIELD_HEIGHT ||
			this.pixelY <= -TILE_SIZE ||
			this.pixelX > PLAYFIELD_WIDTH ||
			this.pixelX < -TILE_SIZE;
		const tile = this.world.map.atPixel(this.pixelX + TILE_SIZE / 2, this.pixelY + TILE_SIZE / 2);
		if (outside || isTileKind(tile, TileKind.ACID, TileKind.ACIDPOOL)) this.reset();
	}

	/**
	 * Check if the ball can go into a portal on one side. A ball without vertical speed does not go into a portal in a
	 * floor or a ceiling.
	 *
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {boolean} True if the ball can go into the portal.
	 */
	canEnterPortal(side) {
		return DIRECTIONS[side].horizontal || this.vy !== 0;
	}

	/**
	 * Move the ball to the middle of a portal that it goes into. A homing ball keeps its vertical speed.
	 *
	 * @param {import('../portals/Portal.js').Portal} portal The portal.
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {void}
	 */
	alignToPortal(portal, side) {
		const vy = this.vy;
		super.alignToPortal(portal, side);
		if (this.homing) this.vy = vy;
	}

	/**
	 * Turn the speed of the ball to the direction of the exit portal after a teleport. A homing ball turns its speed
	 * with the angle between the two portals.
	 *
	 * @param {import('../portals/Portal.js').Portal} entry The portal that the ball entered.
	 * @param {import('../portals/Portal.js').Portal} exit The portal that the ball came out of.
	 * @returns {void}
	 */
	teleported(entry, exit) {
		if (!this.homing) {
			super.teleported(entry, exit);
			return;
		}
		[this.vx, this.vy] = HOMING_TURNS[entry.direction][exit.direction](this.vx, this.vy);
	}

	/**
	 * Put the ball back to its start position with its start speed.
	 *
	 * @returns {void}
	 */
	reset() {
		this.x = this.startX;
		this.y = this.startY;
		this.vx = this.startVx;
		this.vy = this.startVy;
	}

	/**
	 * Fill a plasma slot with a wall. When no slot is left, the ball goes away and the plasma doors open. Else the ball
	 * returns to its start.
	 *
	 * @param {number} column The column of the slot.
	 * @param {number} row The row of the slot.
	 * @returns {void}
	 */
	#fillSlot(column, row) {
		this.world.map.set(this.world.map.index(column, row), Tile.WALL);
		if (this.hasSlot()) this.reset();
		else {
			this.used = false;
			this.world.setDoors(TileKind.PLASMA_DOOR, true);
		}
	}

	/**
	 * Check if the map still has a plasma slot.
	 *
	 * @returns {boolean} True if a slot exists.
	 */
	hasSlot() {
		return this.world.map.tiles.includes(Tile.PLASMA_SLOT);
	}

	/**
	 * Fill the first plasma slot in a column of test points beside the ball. A homing ball fills no slot.
	 *
	 * @param {number} x The x coordinate of the column in pixels.
	 * @param {number} y The y coordinate of the top edge of the ball in pixels.
	 * @returns {void}
	 */
	#fillSlotInColumn(x, y) {
		if (this.homing) return;
		for (let i = 2; i <= 14; i++) {
			if (this.world.map.atPixel(x, y + i) === Tile.PLASMA_SLOT) {
				this.#fillSlot(x >> TILE_SIZE_BITS, (y + i) >> TILE_SIZE_BITS);
				return;
			}
		}
	}

	/**
	 * Fill the first plasma slot in a row of test points above or below the ball. A homing ball fills no slot.
	 *
	 * @param {number} x The x coordinate of the left edge of the ball in pixels.
	 * @param {number} y The y coordinate of the row in pixels.
	 * @returns {void}
	 */
	#fillSlotInRow(x, y) {
		if (this.homing) return;
		for (let i = 4; i <= 12; i++) {
			if (this.world.map.atPixel(x + i, y) === Tile.PLASMA_SLOT) {
				this.#fillSlot((x + i) >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS);
				return;
			}
		}
	}

	/**
	 * Bounce the ball off walls and fill the plasma slot that the ball hits. The bounce sound is louder near the
	 * player.
	 *
	 * @returns {void}
	 */
	checkCollision() {
		const dist = Math.min(
			getDistance(this.pixelX, this.pixelY, this.world.player.pixelX, this.world.player.pixelY),
			PLAYFIELD_HEIGHT,
		);
		setSoundVolume(sfx_bounce, 1 - dist / PLAYFIELD_HEIGHT);

		const side = this.getCollision();
		if (side < 0) return;
		playSound(sfx_bounce);
		// move the ball away from the wall in steps of half a pixel
		const { dx, dy } = DIRECTIONS[DIRECTIONS[side].opposite];
		do {
			this.x += dx * 128;
			this.y += dy * 128;
		} while (this.getCollision() === side);
		// the slot is in the wall that the ball hit, one pixel behind the side of the ball
		if (DIRECTIONS[side].horizontal) {
			this.vx = -this.vx;
			this.#fillSlotInColumn(dx > 0 ? this.pixelX - 1 : this.pixelX + TILE_SIZE, this.pixelY);
		} else {
			this.vy = -this.vy;
			this.#fillSlotInRow(this.pixelX, dy > 0 ? this.pixelY - 1 : this.pixelY + TILE_SIZE);
		}
	}
}
