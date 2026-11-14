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
	 * Follow the beam of the turret in steps of 14 pixels until it hits a wall, a crate or the player.
	 *
	 * @returns {{target: string|null, x: number}} The target "crate" or "player", or null for a wall or the edge of
	 *     the playfield, and the x coordinate of the hit in pixels.
	 */
	#traceBeam() {
		const y = (this.y >> 8) + 12;
		let x = this.dir == 1 ? (this.x >> 8) + TILE_SIZE : this.x >> 8;
		while (x >= 0 && x < PLAYFIELD_WIDTH) {
			if (this.world.getTile(x, y) != Tile.EMPTY) break;
			if (this.world.anyCrateAt(x, y)) return { target: 'crate', x };
			if (this.world.player.contains(x, y)) return { target: 'player', x };
			x += this.dir * 14;
		}
		return { target: null, x };
	}

	/**
	 * Shoot at the player if the player is in the line of sight. The shot stops at walls and crates.
	 *
	 * @returns {void}
	 */
	shoot() {
		const player = this.world.player;
		const facesPlayer = (this.dir == -1 && this.x > player.x) || (this.dir == 1 && this.x < player.x);
		const inLine = Math.abs((this.y >> 8) + 13 - ((player.y >> 8) + 16)) <= this.pY;

		if (this.dead || !facesPlayer || !inLine || player.dead) {
			if (!this.dead) {
				this.animFrame = 0;
				this.rotation = 10;
			}
			return;
		}

		this.coolTime = Math.max(this.coolTime - 1, 0);
		if (this.coolTime > 0) {
			this.animFrame = 0;
			return;
		}

		const beam = this.#traceBeam();
		if (beam.target == null) {
			this.rotation = Math.min(this.rotation + 1, 10);
			return;
		}

		this.ex = beam.x << 8;
		this.rotation = Math.max(this.rotation - 1, 0);
		if (beam.target != 'player' || this.rotation > 0) return;

		this.animFrame = 1 - this.animFrame;
		player.life -= 640; // 2.5 life points
		player.recoveryTime = 300;
		player.vx += this.dir << 8;
		this.coolTime = COOL_TIME;
		playSound(sfx_shoot);
		playSoundIfFinished(sfx_pain);

		for (let i = 0; i < 5; i++) {
			this.world.sparkles.push(
				new Sparkle(
					this.world,
					SparkleType.SHOT_HIT,
					player.x + (this.pX << 7) + random(-8 << 8, 8 << 8),
					player.y + (this.pY << 6),
					random(512, 1024) * this.dir,
					random(-3 << 8, 0),
					50,
					4,
				),
			);
		}
	}
}
