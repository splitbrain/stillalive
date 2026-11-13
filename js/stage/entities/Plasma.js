/**
 * The Plasma object and its helper functions.
 */

import { Body } from './Body.js';
import { playSound, setSoundVolume, sfx_bounce, sfx_plasmaField } from '../audio.js';
import { Direction, MAP_SIZE, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../constants.js';
import { getCollision } from '../physics.js';
import { isInPortal, passPortals } from '../portals.js';
import { game } from '../state.js';
import { Tile, TileKind, isTileKind } from '../tiles.js';
import { getDistance, random } from '../utils.js';

/**
 * A plasma ball. It bounces off walls and fills the plasma slots. It kills the player and the turrets.
 */
export class Plasma extends Body {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 */
	constructor(x, y, vx, vy) {
		super(x, y, TILE_SIZE, TILE_SIZE);
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
		/** @type {string} The entity type, used by the shared object functions. */
		this.type = 'plasma';
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
		if (game.time % 10 != 0) return;
		let r;
		do {
			r = random(0, 3);
		} while (this.animFrame == r);
		this.animFrame = r;
	}

	/**
	 * Move the ball for one tick. The ball returns to its start when it leaves the playfield or touches acid. In the
	 * boss levels 3 and 4, the ball follows the player.
	 *
	 * @returns {void}
	 */
	move() {
		if (game.time % 10 == 0) {
			this.scale += 1 * this.scaleDir;
			if (this.scale < -2 || this.scale > 2) this.scaleDir = -this.scaleDir;
		}

		this.x += this.vx;
		this.y += this.vy;

		const vx = this.vx;
		const vy = this.vy;

		if (!passPortals(this)) {
			this.checkCollision();
			if (game.boss?.shootsPlasma()) {
				if (this.x < game.player.x) this.vx += 4;
				else if (this.x > game.player.x) this.vx -= 4;
				if (this.y < game.player.y) this.vy += 4;
				else if (this.y > game.player.y) this.vy -= 4;

				const maxSpeed = 3;

				if (this.vx > maxSpeed << 8) this.vx = maxSpeed << 8;
				else if (this.vx < -(maxSpeed << 8)) this.vx = -(maxSpeed << 8);
				if (this.vy > maxSpeed << 8) this.vy = maxSpeed << 8;
				else if (this.vy < -(maxSpeed << 8)) this.vy = -(maxSpeed << 8);

				if (this.x > game.tubeX) this.needKill = true;
			}
		}

		if (!game.boss) {
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
			const t = game.map.atPixel((this.x >> 8) + TILE_SIZE / 2, (this.y >> 8) + TILE_SIZE / 2);
			if (isTileKind(t, TileKind.ACID, TileKind.ACIDPOOL)) {
				this.reset();
			}
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
		for (i = 0; i < game.animatedTiles.length; i++) {
			if (isTileKind(game.animatedTiles[i].current, TileKind.PLASMA_DOOR)) {
				game.animatedTiles[i].used = false;
				game.map.setTile(game.animatedTiles[i].place, Tile.EMPTY);
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
		game.map.set(game.map.index(column, row), Tile.WALL);
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
			if (game.map.tiles[i] == Tile.PLASMA_SLOT) return 1;
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
		let dist = getDistance(this.x >> 8, this.y >> 8, game.player.x >> 8, game.player.y >> 8);
		if (dist > PLAYFIELD_HEIGHT) dist = PLAYFIELD_HEIGHT;
		setSoundVolume(sfx_bounce, 1 - dist / PLAYFIELD_HEIGHT);

		if (getCollision(this) == Direction.LEFT) {
			playSound(sfx_bounce);
			do {
				this.x += 128;
			} while (getCollision(this) == Direction.LEFT);
			this.vx = -this.vx;

			x = (this.x >> 8) - 1;
			y = this.y >> 8;
			for (i = 2; i <= 14 && !game.boss; i++) {
				if (game.map.atPixel(x, y + i) == Tile.PLASMA_SLOT) {
					this.#fillSlot(x >> TILE_SIZE_BITS, (y + i) >> TILE_SIZE_BITS);
					break;
				}
			}
		} else if (getCollision(this) == Direction.RIGHT) {
			playSound(sfx_bounce);
			do {
				this.x -= 128;
			} while (getCollision(this) == Direction.RIGHT);
			this.vx = -this.vx;

			x = (this.x >> 8) + TILE_SIZE;
			y = this.y >> 8;
			for (i = 2; i <= 14 && !game.boss; i++) {
				if (game.map.atPixel(x, y + i) == Tile.PLASMA_SLOT) {
					this.#fillSlot(x >> TILE_SIZE_BITS, (y + i) >> TILE_SIZE_BITS);
					break;
				}
			}
		} else if (getCollision(this) == Direction.UP) {
			playSound(sfx_bounce);
			do {
				this.y += 128;
			} while (getCollision(this) == Direction.UP);
			this.vy = -this.vy;

			x = this.x >> 8;
			y = (this.y >> 8) - 1;
			for (i = 4; i <= 12 && !game.boss; i++) {
				if (game.map.atPixel(x + i, y) == Tile.PLASMA_SLOT) {
					this.#fillSlot((x + i) >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS);
					break;
				}
			}
		} else if (getCollision(this) == Direction.DOWN) {
			playSound(sfx_bounce);
			do {
				this.y -= 128;
			} while (getCollision(this) == Direction.DOWN);
			this.vy = -this.vy;

			x = this.x >> 8;
			y = (this.y >> 8) + TILE_SIZE;
			for (i = 4; i <= 12 && !game.boss; i++) {
				if (game.map.atPixel(x + i, y) == Tile.PLASMA_SLOT) {
					this.#fillSlot((x + i) >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS);
					break;
				}
			}
		}
	}
}

/**
 * Check if a plasma ball overlaps an object.
 *
 * @param {import('./Body.js').Body} obj The object.
 * @returns {number} 1 if a ball overlaps the object, else 0.
 */
export function plasmaTouching(obj) {
	let i;
	for (i = 0; i < game.plasmaBall.length; i++) {
		if (game.plasmaBall[i].used && game.plasmaBall[i].overlaps(obj)) return 1;
	}

	return 0;
}

/**
 * Advance the animation of the plasma balls, move them and remove the dead ones. The balls stand still during the
 * level transitions.
 *
 * @returns {void}
 */
export function updatePlasma() {
	for (let pi = 0; pi < game.plasmaBall.length; pi++) {
		const ball = game.plasmaBall[pi];
		if (!ball.used) continue;
		ball.animate();
		if (game.player.fadeNextLevel == -1) {
			ball.move();
			if (!game.objectInPortal) game.objectInPortal = isInPortal(ball);
			if (ball.needKill) {
				game.plasmaBall.splice(pi, 1);
				pi--;
			}
		}
	}
}
