/**
 * The Turret object.
 */

import { Throwable } from './Throwable.js';
import { playSound, playSoundIfFinished, sfx_explode, sfx_pain, sfx_shoot } from '../audio.js';
import { PLAYFIELD_WIDTH, SparkleType, TILE_SIZE } from '../constants.js';
import { Platform } from './Platform.js';
import { Sparkle, createCakeOrSmokeSparkles } from './Sparkle.js';
import { Tile } from '../tiles.js';
import { random } from '../utils.js';

/** @type {number} The number of ticks between two shots. */
const COOL_TIME = 3;

/**
 * A turret. It shoots at the player in its line of sight, and the player can carry and throw it.
 */
export class Turret extends Throwable {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} dir The direction that the turret faces, -1 left or 1 right.
	 */
	constructor(world, x, y, dir) {
		super(world, x, y, TILE_SIZE, 2 * TILE_SIZE);
		/** @type {number} The direction that the turret faces, -1 left or 1 right. */
		this.dir = dir;
		/** @type {number} Ticks until the next shot. */
		this.coolTime = 0;
		/** @type {number} Ticks until the turret shoots after it saw the player, from 10 down to 0. */
		this.rotation = 10;
		/** @type {boolean} True when the turret is destroyed. */
		this.dead = false;
		/** @type {number} The frame of the turret image. Frame 1 is the shot flash, frames 2 to 10 show the destruction. */
		this.animFrame = 0;
		/** @type {boolean} True after a throw, a portal or a pipe field moved the turret. A hard landing then destroys it. */
		this.canExplode = false;
		/** @type {number} The x position where the laser sight ends, in 1/256 pixels. */
		this.ex = 0;
	}

	/**
	 * Destroy the turret with an explosion sound and smoke.
	 *
	 * @returns {void}
	 */
	#explode() {
		this.dead = true;
		this.animFrame = 2;
		playSound(sfx_explode);
		createCakeOrSmokeSparkles(this.world, this.x, this.y, SparkleType.SMOKE, 4, 255);
	}

	/**
	 * Check if the player can pick up the turret.
	 *
	 * @returns {boolean} True if the turret is not destroyed.
	 */
	canGrab() {
		return !this.dead;
	}

	/**
	 * Let a hard landing destroy the turret after the throw.
	 *
	 * @returns {void}
	 */
	thrown() {
		this.canExplode = true;
	}

	/**
	 * Let a hard landing destroy the turret after a pipe field moved it.
	 *
	 * @returns {void}
	 */
	enterPipeField() {
		this.canExplode = true;
	}

	/**
	 * Turn the speed after a teleport, and let a hard landing destroy the turret.
	 *
	 * @param {import('./Portal.js').Portal} entry The portal that the turret entered.
	 * @param {import('./Portal.js').Portal} exit The portal that the turret came out of.
	 * @returns {void}
	 */
	teleported(entry, exit) {
		this.canExplode = true;
		super.teleported(entry, exit);
	}

	/**
	 * Update the turret for one tick and shoot at the player. A hard landing, a deadly tile, a moving crate, a plasma
	 * ball or a platform destroys the turret.
	 *
	 * @returns {void}
	 */
	update() {
		if (!this.carried) {
			if (!this.touchingGround()) this.angle += (this.vx >> 8) << 1;
			else this.angle = 0;
			if (this.angle >= 360) this.angle -= 360;

			const oldVx = this.vx;
			const oldVy = this.vy;

			this.move();

			if (!this.dead) {
				if (
					this.vx == 0 &&
					Math.abs(oldVx) > 3 << 8 &&
					this.canExplode &&
					this.world.gravPipeFieldsAt(this).length == 0
				)
					this.dead = true;
				else if (
					this.vy == 0 &&
					Math.abs(oldVy) > 4 << 8 &&
					this.canExplode &&
					this.world.gravPipeFieldsAt(this).length == 0
				)
					this.dead = true;
				else if (this.touchesDeadlyTile() || this.world.movingCrateTouching(this) || this.world.plasmaTouching(this)) {
					this.dead = true;
				}
				if (this.dead) this.#explode();
			} else if (this.animFrame < 10) {
				if (this.world.time % 4 == 0) this.animFrame++;
			}

			const platform = this.world.onPlatform(this);
			if (platform) this.x += platform.vx;

			const colLeft = this.leftCollision();
			const colRight = this.rightCollision();
			if (!this.dead && (colLeft instanceof Platform || colRight instanceof Platform)) this.#explode();
		} else {
			this.place();
		}
		if (!this.dead) this.shoot();
	}

	/**
	 * Shoot at the player if the player is in the line of sight. The shot stops at walls and crates.
	 *
	 * @returns {void}
	 */
	shoot() {
		let j;
		let testShoot = false;
		if (this.dir == -1 && this.x > this.world.player.x) testShoot = true;
		else if (this.dir == 1 && this.x < this.world.player.x) testShoot = true;

		if (testShoot) {
			const y = (this.y >> 8) + 13;
			const y2 = (this.world.player.y >> 8) + 16;

			if (Math.abs(y - y2) > this.pY) testShoot = false;
		}

		if (!this.dead && testShoot && !this.world.player.dead) {
			this.coolTime--;
			if (this.coolTime < 0) this.coolTime = 0;
			if (this.coolTime == 0) {
				if (this.dir == 1) j = (this.x >> 8) + TILE_SIZE;
				else j = this.x >> 8;
				const beamY = (this.y >> 8) + 12;
				let playerInSight = 0;
				let stop = 0;
				const oldJ = j;
				while (j >= 0 && j < PLAYFIELD_WIDTH && !playerInSight && !stop) {
					const tile = this.world.getTile(j, beamY);
					if (tile != Tile.EMPTY) {
						stop = 1;
						break;
					} else {
						if (this.world.anyCrateAt(j, beamY)) {
							stop = 2;
							break;
						} else {
							if (this.world.player.contains(j, beamY)) {
								playerInSight = 1;
								break;
							}
						}
					}
					j += this.dir * 14;
					if (oldJ == j) stop = 1;
				}
				if (stop == 2) {
					this.rotation--;
					if (this.rotation < 0) this.rotation = 0;
					this.ex = j << 8;
				} else if (playerInSight) {
					this.ex = j << 8;
					this.rotation--;
					if (this.rotation < 0) this.rotation = 0;
					if (!this.rotation) {
						this.animFrame = 1 - this.animFrame;
						this.world.player.life -= 640; // 2.5 life points
						this.world.player.recoveryTime = 300;
						this.world.player.vx += this.dir << 8;
						this.coolTime = COOL_TIME;
						playSound(sfx_shoot);
						playSoundIfFinished(sfx_pain);

						for (let i = 0; i < 5; i++) {
							this.world.sparkles.push(
								new Sparkle(
									this.world,
									SparkleType.SHOT_HIT,
									this.world.player.x + (this.pX << 7) + random(-8 << 8, 8 << 8),
									this.world.player.y + (this.pY << 6),
									random(512, 1024) * this.dir,
									random(-3 << 8, 0),
									50,
									4,
								),
							);
						}
					}
				} else {
					if (++this.rotation > 10) this.rotation = 10;
				}
			} else this.animFrame = 0;
		} else {
			if (!this.dead) {
				this.animFrame = 0;
				this.rotation = 10;
			}
		}
	}
}
