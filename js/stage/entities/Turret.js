/**
 * The Turret object and its helper functions.
 */

import { playSound, playSoundIfFinished, sfx_explode, sfx_pain, sfx_shoot } from '../audio.js';
import { PLAYFIELD_WIDTH, SparkleType, TILE_SIZE } from '../constants.js';
import { isInPortal } from '../portals.js';
import { anyCrateAt, movingCrateTouching } from './Crate.js';
import { gravPipeFieldsAt } from './GravPipeField.js';
import { plasmaTouching } from './Plasma.js';
import { onPlatform } from './Platform.js';
import { Sparkle, createCakeOrSmokeSparkles } from './Sparkle.js';
import {
	getTile,
	leftCollision,
	moveObject,
	placeObject,
	rightCollision,
	touchesDeadlyTile,
	touchingGround,
} from '../physics.js';
import { game } from '../state.js';
import { isPlatformCode, PLATFORM_CODE, Tile } from '../tiles.js';
import { random } from '../utils.js';

/** @type {number} The number of ticks between two shots. */
const COOL_TIME = 3;

/**
 * A turret. It shoots at the player in its line of sight, and the player can carry and throw it.
 */
export class Turret {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} dir The direction that the turret faces, -1 left or 1 right.
	 */
	constructor(x, y, dir) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} The rotation in degrees while the turret flies. */
		this.angle = 0;
		/** @type {number} The direction that the turret faces, -1 left or 1 right. */
		this.dir = dir;
		/** @type {number} Ticks until the next shot. */
		this.coolTime = 0;
		/** @type {number} Ticks until the turret shoots after it saw the player, from 10 down to 0. */
		this.rotation = 10;
		/** @type {boolean} True when the turret is destroyed. */
		this.dead = false;
		/** @type {boolean} True while the player carries the turret. */
		this.carried = false;
		/** @type {number} The width in pixels. */
		this.pX = TILE_SIZE;
		/** @type {number} The height in pixels. */
		this.pY = 2 * TILE_SIZE;
		/** @type {number} The frame of the turret image. Frame 1 is the shot flash, frames 2 to 10 show the destruction. */
		this.animFrame = 0;
		/** @type {boolean} True after a throw, a portal or a pipe field moved the turret. A hard landing then destroys it. */
		this.canExplode = false;
		/** @type {string} The entity type, used by the shared object functions. */
		this.type = 'turret';
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
		createCakeOrSmokeSparkles(this.x, this.y, SparkleType.SMOKE, 4, 255);
	}

	/**
	 * Move the turret for one tick and shoot at the player. A hard landing, a deadly tile, a moving crate, a plasma ball
	 * or a platform destroys the turret.
	 *
	 * @returns {void}
	 */
	move() {
		if (!this.carried) {
			if (!touchingGround(this)) this.angle += (this.vx >> 8) << 1;
			else this.angle = 0;
			if (this.angle >= 360) this.angle -= 360;

			const oldVx = this.vx;
			const oldVy = this.vy;

			moveObject(this);

			if (!this.dead) {
				if (this.vx == 0 && Math.abs(oldVx) > 3 << 8 && this.canExplode && gravPipeFieldsAt(this).length == 0)
					this.dead = true;
				else if (this.vy == 0 && Math.abs(oldVy) > 4 << 8 && this.canExplode && gravPipeFieldsAt(this).length == 0)
					this.dead = true;
				else if (touchesDeadlyTile(this) || movingCrateTouching(this) || plasmaTouching(this)) {
					this.dead = true;
				}
				if (this.dead) this.#explode();
			} else if (this.animFrame < 10) {
				if (game.time % 4 == 0) this.animFrame++;
			}

			let pi = onPlatform(this);
			if (pi) {
				pi -= PLATFORM_CODE;
				this.x += game.platforms[pi].vx;
			}

			const colLeft = leftCollision(this);
			const colRight = rightCollision(this);
			if (!this.dead && (isPlatformCode(colLeft) || isPlatformCode(colRight))) this.#explode();
		} else {
			placeObject(this);
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
		if (this.dir == -1 && this.x > game.player.x) testShoot = true;
		else if (this.dir == 1 && this.x < game.player.x) testShoot = true;

		if (testShoot) {
			const y = (this.y >> 8) + 13;
			const y2 = (game.player.y >> 8) + 16;

			if (Math.abs(y - y2) > this.pY) testShoot = false;
		}

		if (!this.dead && testShoot && !game.player.dead) {
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
					const tile = getTile(j, beamY);
					if (tile != Tile.EMPTY) {
						stop = 1;
						break;
					} else {
						if (anyCrateAt(j, beamY)) {
							stop = 2;
							break;
						} else {
							const t = pointInPlayer(j, beamY);
							if (t) {
								playerInSight = t;
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
						game.player.life -= 640; // 2.5 life points
						game.player.recoveryTime = 300;
						game.player.vx += this.dir << 8;
						this.coolTime = COOL_TIME;
						playSound(sfx_shoot);
						playSoundIfFinished(sfx_pain);

						for (let i = 0; i < 5; i++) {
							const s = new Sparkle();
							s.x = game.player.x + (this.pX << 7) + random(-8 << 8, 8 << 8);
							s.y = game.player.y + (this.pY << 6);
							s.type = SparkleType.SHOT_HIT;
							s.vx = random(512, 1024) * this.dir;
							s.vy = random(-3 << 8, 0);
							s.fading = 50;
							s.color = 4;
							s.portalNum = -1;
							game.sparkles.push(s);
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

/**
 * Check if a point of the laser line is inside the player.
 *
 * @param {number} j The x coordinate in pixels.
 * @param {number} beamY The y coordinate of the laser line in pixels.
 * @returns {number} 1 if the point is inside the player, else 0.
 */
function pointInPlayer(j, beamY) {
	const x = game.player.x >> 8;
	const y = game.player.y >> 8;
	// the box is 4 px higher than the player. A fix would change the gameplay.
	if (j >= x && j < x + 15 && beamY >= y && beamY < y + 31) return 1;
	return 0;
}

/**
 * Move the turrets. The turrets stand still during the level transitions.
 *
 * @returns {void}
 */
export function updateTurrets() {
	if (game.player.fadeNextLevel != -1) return;
	for (const t of game.turrets) {
		t.move();
		if (game.objectInPortal == 0) game.objectInPortal = isInPortal(t);
	}
}
