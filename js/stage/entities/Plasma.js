/**
 * The Plasma object.
 */

import { Body } from './Body.js';
import { playSound, setSoundVolume, sfx_bounce, sfx_plasmaField } from '../audio.js';
import { Direction, MAP_SIZE, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../constants.js';
import { Tile, TileKind, isTileKind } from '../tiles.js';
import { getDistance, random } from '../utils.js';

/**
 * A plasma ball. It bounces off walls and fills the plasma slots. It kills the player and the turrets.
 */
export class Plasma extends Body {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {boolean} [homing] True for a ball of the boss, which follows the player.
	 */
	constructor(world, x, y, vx, vy, homing = false) {
		super(world, x, y, TILE_SIZE, TILE_SIZE);
		/** @type {number} The x position of the start, where the ball returns after a reset. */
		this.xOrig = x;
		/** @type {number} The y position of the start, where the ball returns after a reset. */
		this.yOrig = y;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {number} The horizontal speed of the start. */
		this.origVx = vx;
		/** @type {number} The vertical speed of the start. */
		this.origVy = vy;
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
		if (this.world.time % 10 != 0) return;
		let r;
		do {
			r = random(0, 3);
		} while (this.animFrame == r);
		this.animFrame = r;
	}

	/**
	 * Move the ball for one tick. The ball returns to its start when it leaves the playfield or touches acid. A homing
	 * ball follows the player.
	 *
	 * @returns {void}
	 */
	move() {
		if (this.world.time % 10 == 0) {
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

				if (this.vx > maxSpeed << 8) this.vx = maxSpeed << 8;
				else if (this.vx < -(maxSpeed << 8)) this.vx = -(maxSpeed << 8);
				if (this.vy > maxSpeed << 8) this.vy = maxSpeed << 8;
				else if (this.vy < -(maxSpeed << 8)) this.vy = -(maxSpeed << 8);

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

		if (
			this.y >> 8 > PLAYFIELD_HEIGHT ||
			this.y >> 8 <= -TILE_SIZE ||
			this.x >> 8 > PLAYFIELD_WIDTH ||
			this.x >> 8 < -TILE_SIZE
		) {
			this.reset();
		} else {
			const t = this.world.map.atPixel((this.x >> 8) + TILE_SIZE / 2, (this.y >> 8) + TILE_SIZE / 2);
			if (isTileKind(t, TileKind.ACID, TileKind.ACIDPOOL)) {
				this.reset();
			}
		}
	}

	/**
	 * Check if the ball can go into a portal on one side. A ball without vertical speed does not go into a portal in a
	 * floor or a ceiling.
	 *
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {boolean} True if the ball can go into the portal.
	 */
	canEnterPortal(side) {
		return (side != Direction.DOWN && side != Direction.UP) || this.vy != 0;
	}

	/**
	 * Move the ball to the middle of a portal that it goes into. A homing ball keeps its vertical speed.
	 *
	 * @param {import('./Portal.js').Portal} portal The portal.
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
	 * @param {import('./Portal.js').Portal} entry The portal that the ball entered.
	 * @param {import('./Portal.js').Portal} exit The portal that the ball came out of.
	 * @returns {void}
	 */
	teleported(entry, exit) {
		if (!this.homing) {
			super.teleported(entry, exit);
			return;
		}
		let swap;
		const from = entry.direction;
		const to = exit.direction;
		if ((from == Direction.DOWN && to == Direction.DOWN) || (from == Direction.UP && to == Direction.UP)) {
			this.vy = -this.vy;
		} else if ((from == Direction.DOWN && to == Direction.LEFT) || (from == Direction.UP && to == Direction.RIGHT)) {
			swap = this.vx;
			this.vx = this.vy;
			this.vy = swap;
		} else if ((from == Direction.DOWN && to == Direction.RIGHT) || (from == Direction.UP && to == Direction.LEFT)) {
			swap = this.vx;
			this.vx = -this.vy;
			this.vy = swap;
		} else if ((from == Direction.LEFT && to == Direction.DOWN) || (from == Direction.RIGHT && to == Direction.UP)) {
			swap = this.vx;
			this.vx = this.vy;
			this.vy = swap;
		} else if ((from == Direction.RIGHT && to == Direction.DOWN) || (from == Direction.LEFT && to == Direction.UP)) {
			swap = this.vx;
			this.vx = this.vy;
			this.vy = -swap;
		} else if ((from == Direction.RIGHT && to == Direction.RIGHT) || (from == Direction.LEFT && to == Direction.LEFT)) {
			this.vx = -this.vx;
		}
	}

	/**
	 * Open the plasma doors.
	 *
	 * @returns {void}
	 */
	openPlasmaDoors() {
		let i;
		playSound(sfx_plasmaField);
		for (i = 0; i < this.world.animatedTiles.length; i++) {
			if (isTileKind(this.world.animatedTiles[i].current, TileKind.PLASMA_DOOR)) {
				this.world.animatedTiles[i].used = false;
				this.world.map.setTile(this.world.animatedTiles[i].place, Tile.EMPTY);
			}
		}
	}

	/**
	 * Put the ball back to its start position with its start speed.
	 *
	 * @returns {void}
	 */
	reset() {
		this.x = this.xOrig;
		this.y = this.yOrig;
		this.vx = this.origVx;
		this.vy = this.origVy;
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
			this.openPlasmaDoors();
		}
	}

	/**
	 * Check if the map still has a plasma slot.
	 *
	 * @returns {number} 1 if a slot exists, else 0.
	 */
	hasSlot() {
		let i;
		for (i = 0; i < MAP_SIZE; i++) {
			if (this.world.map.tiles[i] == Tile.PLASMA_SLOT) return 1;
		}
		return 0;
	}

	/**
	 * Bounce the ball off walls and fill the plasma slot that the ball hits. The bounce sound is louder near the
	 * player.
	 *
	 * @returns {void}
	 */
	checkCollision() {
		let x, y, i;
		let dist = getDistance(this.x >> 8, this.y >> 8, this.world.player.x >> 8, this.world.player.y >> 8);
		if (dist > PLAYFIELD_HEIGHT) dist = PLAYFIELD_HEIGHT;
		setSoundVolume(sfx_bounce, 1 - dist / PLAYFIELD_HEIGHT);

		switch (this.getCollision()) {
			case Direction.LEFT:
				playSound(sfx_bounce);
				do {
					this.x += 128;
				} while (this.getCollision() == Direction.LEFT);
				this.vx = -this.vx;

				x = (this.x >> 8) - 1;
				y = this.y >> 8;
				for (i = 2; i <= 14 && !this.homing; i++) {
					if (this.world.map.atPixel(x, y + i) == Tile.PLASMA_SLOT) {
						this.#fillSlot(x >> TILE_SIZE_BITS, (y + i) >> TILE_SIZE_BITS);
						break;
					}
				}
				break;
			case Direction.RIGHT:
				playSound(sfx_bounce);
				do {
					this.x -= 128;
				} while (this.getCollision() == Direction.RIGHT);
				this.vx = -this.vx;

				x = (this.x >> 8) + TILE_SIZE;
				y = this.y >> 8;
				for (i = 2; i <= 14 && !this.homing; i++) {
					if (this.world.map.atPixel(x, y + i) == Tile.PLASMA_SLOT) {
						this.#fillSlot(x >> TILE_SIZE_BITS, (y + i) >> TILE_SIZE_BITS);
						break;
					}
				}
				break;
			case Direction.UP:
				playSound(sfx_bounce);
				do {
					this.y += 128;
				} while (this.getCollision() == Direction.UP);
				this.vy = -this.vy;

				x = this.x >> 8;
				y = (this.y >> 8) - 1;
				for (i = 4; i <= 12 && !this.homing; i++) {
					if (this.world.map.atPixel(x + i, y) == Tile.PLASMA_SLOT) {
						this.#fillSlot((x + i) >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS);
						break;
					}
				}
				break;
			case Direction.DOWN:
				playSound(sfx_bounce);
				do {
					this.y -= 128;
				} while (this.getCollision() == Direction.DOWN);
				this.vy = -this.vy;

				x = this.x >> 8;
				y = (this.y >> 8) + TILE_SIZE;
				for (i = 4; i <= 12 && !this.homing; i++) {
					if (this.world.map.atPixel(x + i, y) == Tile.PLASMA_SLOT) {
						this.#fillSlot((x + i) >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS);
						break;
					}
				}
				break;
		}
	}
}
