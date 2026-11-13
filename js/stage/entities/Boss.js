/**
 * The Boss object.
 */

import { playLoop, playSound, sfx_bossAlarm, sfx_bossHit, sfx_bossRumble } from '../audio.js';
import { MAP_WIDTH, SparkleType, TILE_SIZE } from '../constants.js';
import { Crate } from './Crate.js';
import { Plasma } from './Plasma.js';
import { Projectile } from './Projectile.js';
import { createCakeOrSmokeSparkles } from './Sparkle.js';
import { isWaiting, triggerEvents } from '../events.js';
import { game } from '../state.js';
import { FIRST_OF_KIND, TileKind } from '../tiles.js';
import { getCos, getDistance, getSin, random } from '../utils.js';

/** @type {number} The x position of the boss in pixels while it fights. */
const BOSS_X = 449;
/** @type {number} The y position of the boss in pixels. */
const BOSS_Y = 150;
/** @type {number} The distance in pixels that the boss moves to the left while it comes in. */
const BOSS_ENTRY_DISTANCE = 50;
/** @type {number} The x position in pixels where the boss is out of the playfield after its death. */
const BOSS_GONE_X = 530;

/**
 * The boss of a boss level. It comes in from the right, attacks the player and dies after three hits with a crate.
 */
export class Boss {
	/**
	 * Create the boss outside of the playfield. It comes in after the waits of the start events.
	 *
	 * @param {number} number The number of the boss, from 1 to 4.
	 */
	constructor(number) {
		/** @type {number} The number of the boss, from 1 to 4. */
		this.number = number;
		/** @type {number} The x position in pixels. */
		this.x = BOSS_X + BOSS_ENTRY_DISTANCE;
		/** @type {number} The y position in pixels. */
		this.y = BOSS_Y;
		/** @type {number} The number of hits that the boss took, from 0 to 3. */
		this.hits = 0;
		/** @type {boolean} True while the boss comes in. */
		this.entering = true;
		/** @type {number} The distance that the boss moved while it comes in, in 1/256 pixels. */
		this.entryDistance = 0;
		/** @type {number} The number of ticks since the boss started to come in. */
		this.entryTicks = 0;
	}

	/**
	 * Check if the boss makes new crates. Then a crate that is used up goes away and does not return.
	 *
	 * @returns {boolean} True for the bosses 1, 3 and 4.
	 */
	makesCrates() {
		return this.number == 1 || this.number == 3 || this.number == 4;
	}

	/**
	 * Check if the boss throws crates.
	 *
	 * @returns {boolean} True for the bosses 1 and 4.
	 */
	throwsCrates() {
		return this.number == 1 || this.number == 4;
	}

	/**
	 * Check if the boss shoots razor wheels.
	 *
	 * @returns {boolean} True for the bosses 2 and 4.
	 */
	shootsWheels() {
		return this.number == 2 || this.number == 4;
	}

	/**
	 * Check if the boss shoots plasma balls. These balls follow the player.
	 *
	 * @returns {boolean} True for the bosses 3 and 4.
	 */
	shootsPlasma() {
		return this.number == 3 || this.number == 4;
	}

	/**
	 * Skip the entrance of the boss. The boss is at its place at once.
	 *
	 * @returns {void}
	 */
	skipEntry() {
		this.entering = false;
		this.entryDistance = 0;
		this.x = BOSS_X;
		this.entryTicks = 0;
		triggerEvents('bossArrived');
	}

	/**
	 * Update the boss for one tick. The boss comes in after the waits of the start events, attacks the player, and
	 * kills the player on contact.
	 *
	 * @returns {void}
	 */
	update() {
		if (this.entering) {
			if (!isWaiting()) {
				playLoop(sfx_bossRumble);
				playLoop(sfx_bossAlarm);
				this.entryDistance += 32;
				this.entryTicks++;
				this.x = BOSS_X + BOSS_ENTRY_DISTANCE - (this.entryDistance >> 8);
				if (this.x == BOSS_X) {
					this.entering = false;
					game.shakeX = 0;
					game.shakeY = 0;
					triggerEvents('bossArrived');
				}
				if (this.entryTicks % 3 == 0) {
					game.shakeX = random(-3, 3);
					game.shakeY = random(-3, 3);
				}
			}
		} else {
			if (this.hits < 3) {
				if (!game.player.dead && this.#touchesPlayer()) {
					game.player.life = -200;
					game.player.recoveryTime = 180;
					return;
				}
			}

			if (game.player.dead) {
				game.projectiles = new Array();
				game.plasmaBall = new Array();
				return;
			}

			if (this.hits < 3 && this.number == 1) {
				if (game.player.fadeNextLevel == -1 && game.time % (90 - 30 * this.hits) == 0) {
					this.#throwCrate(6, 18);
				}
			} else if (this.hits < 3 && this.number == 2) {
				if (game.player.fadeNextLevel == -1 && game.time % (90 - 15 * this.hits) == 0) {
					this.#shootWheel(435, 50, 1200, 1200 - game.player.vx);

					if (this.hits == 2) {
						this.#shootWheel(TILE_SIZE, 3 * TILE_SIZE, 1200);
					}
				}
			} else if (this.hits < 3 && this.number == 3) {
				const limit = this.hits + 1;
				if (
					game.player.fadeNextLevel == -1 &&
					game.time % (90 - 30 * this.hits) == 0 &&
					game.plasmaBall.length < limit
				) {
					this.#shootPlasma(800);
				}

				if (game.player.fadeNextLevel == -1 && game.time % (90 - 30 * this.hits) == 0 && game.crates.length == 0) {
					game.crates.push(new Crate(((MAP_WIDTH - 1) * TILE_SIZE) << 8, (18 * TILE_SIZE) << 8));
					game.crates[game.crates.length - 1].vx = -(12 << 8);
					game.crates[game.crates.length - 1].vy = -(2 << 8);
				}
			} else if (this.hits < 3 && this.number == 4) {
				if (game.player.fadeNextLevel == -1 && game.time % (90 - 20 * this.hits) == 0) {
					this.#throwCrate(5, 20);
				}

				if (this.hits > 0 && game.player.fadeNextLevel == -1 && game.time % (180 - 20 * this.hits) == 0) {
					this.#shootWheel(27 * TILE_SIZE, 2 * TILE_SIZE, 600);
				}

				if (this.hits > 1 && game.player.fadeNextLevel == -1 && game.plasmaBall.length == 0) {
					this.#shootPlasma(400);
				}
			}
		}
	}

	/**
	 * Get the direction from a point to the center of the player.
	 *
	 * @param {number} x The x coordinate of the point in pixels.
	 * @param {number} y The y coordinate of the point in pixels.
	 * @returns {number[]} The cosine and the sine of the direction.
	 */
	#aimAtPlayer(x, y) {
		const px = game.player.midX();
		const py = game.player.midY();
		return [getCos(px, py, x, y), getSin(px, py, x, y)];
	}

	/**
	 * Shoot a razor wheel from a point towards the player.
	 *
	 * @param {number} x The x coordinate of the start in pixels.
	 * @param {number} y The y coordinate of the start in pixels.
	 * @param {number} speed The speed in 1/256 pixels per tick.
	 * @param {number} [speedX] The speed along x, if it differs from the speed.
	 * @returns {void}
	 */
	#shootWheel(x, y, speed, speedX = speed) {
		const [dx, dy] = this.#aimAtPlayer(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
		game.projectiles.push(new Projectile(x << 8, y << 8, Math.trunc(dx * speedX), Math.trunc(dy * speed)));
	}

	/**
	 * Shoot a plasma ball from the plasma start of the level towards the player.
	 *
	 * @param {number} speed The speed in 1/256 pixels per tick.
	 * @returns {void}
	 */
	#shootPlasma(speed) {
		const [dx, dy] = this.#aimAtPlayer((game.plasmaX >> 8) + TILE_SIZE / 2, (game.plasmaY >> 8) + TILE_SIZE / 2);
		game.plasmaBall.push(new Plasma(game.plasmaX, game.plasmaY, dx * speed, dy * speed));
	}

	/**
	 * Throw a crate from the right edge towards the player. The speed grows with the distance to the player. When more
	 * than ten crates are in the level, the oldest crate that is not carried is removed.
	 *
	 * @param {number} row The row of the start position.
	 * @param {number} divisor The pixels of distance per unit of speed.
	 * @returns {void}
	 */
	#throwCrate(row, divisor) {
		const crate = new Crate(((MAP_WIDTH - 1) * TILE_SIZE) << 8, (row * TILE_SIZE) << 8);
		game.crates.push(crate);
		if (game.crates.length > 10) {
			for (let i = 0; i < 10; i++) {
				if (!game.crates[i].carried && game.crates[i].noRemove == 0) {
					game.crates.splice(i, 1);
					break;
				}
			}
		}
		let d = getDistance(game.player.x >> 8, game.player.y >> 8, crate.x >> 8, crate.y >> 8);
		d = Math.trunc(d / divisor);
		if (d > 16) d = 16;
		if (d < 3) d = 3;
		crate.vx = -(d << 8);
	}

	/**
	 * Let the boss smoke and leave after its death. The screen shakes until the boss is gone.
	 *
	 * @returns {void}
	 */
	updateRumble() {
		if (this.hits != 3 || this.x >= BOSS_GONE_X) return;
		playLoop(sfx_bossRumble);
		this.#shakeScreen();
		if (game.time % 10 == 0) {
			createCakeOrSmokeSparkles((this.x + 14) << 8, (this.y + 18) << 8, SparkleType.SMOKE, 3, 300);
			this.x += 1;
		}
		if (this.x >= BOSS_GONE_X) {
			game.shakeX = 0;
			game.shakeY = 0;
		}
	}

	/**
	 * Get the phase of the boss fight.
	 *
	 * @returns {string|null} "coming" while the boss comes in, "fight" while it lives, "leaving" while it leaves after
	 *     its death, or null before the entrance and after the boss is gone.
	 */
	phase() {
		if (this.entering) return isWaiting() ? null : 'coming';
		if (this.hits < 3) return 'fight';
		return this.x < BOSS_GONE_X ? 'leaving' : null;
	}

	/**
	 * Check if the player touches the boss.
	 *
	 * @returns {boolean} True if the player touches the boss.
	 */
	#touchesPlayer() {
		const x = (game.player.x >> 8) + game.player.pX;
		const y = game.player.midY();
		const x2 = this.x + 15;
		const y2 = this.y;

		if (x > x2 && y > y2 && y < y2 + 58) return true;

		return false;
	}

	/**
	 * Count a hit when a crate touches the boss. The boss dies after three hits.
	 *
	 * @param {Crate} crate The crate.
	 * @returns {void}
	 */
	hit(crate) {
		let i;
		if (this.hits < 3 && crate.overlapsBox(this.x + 16, this.y, 74, 58)) {
			this.useUpCrate(crate);
			this.hits++;
			playSound(sfx_bossHit);
			if (this.hits < 3) {
				for (i = 0; i < game.oldMap.length; i++) {
					if (game.oldMap[i] == FIRST_OF_KIND[TileKind.BOSS_BLOCK]) {
						game.map.set(i, FIRST_OF_KIND[TileKind.BOSS_BLOCK]);
					}
				}
			} else {
				game.projectiles = new Array();
				game.plasmaBall = new Array();
				triggerEvents('bossDied');
			}
		}
	}

	/**
	 * Take away a crate that hit the boss or a boss block. A boss that makes new crates removes it. Boss 2 makes no
	 * crates, so its crate drops from the top again.
	 *
	 * @param {Crate} crate The crate.
	 * @returns {void}
	 */
	useUpCrate(crate) {
		if (this.makesCrates()) {
			crate.needKill = true;
		} else {
			crate.x = (5 * TILE_SIZE) << 8;
			crate.y = -TILE_SIZE << 8;
			crate.vx = 0;
			crate.vy = 0;
		}
	}

	/**
	 * Shake the playfield after the boss died.
	 *
	 * The shake depends on the level time alone, so a replay shows the same shake as the play. The shake changes every
	 * third tick.
	 *
	 * @returns {void}
	 */
	#shakeScreen() {
		const step = Math.floor(game.time / 3);
		game.shakeX = Boss.#shakeOffset(step * 2);
		game.shakeY = Boss.#shakeOffset(step * 2 + 1);
	}

	/**
	 * Get a pseudo-random shake offset.
	 *
	 * @param {number} n The index of the offset.
	 * @returns {number} An offset from -3 to 2 pixels, the same range as random(-3, 3).
	 */
	static #shakeOffset(n) {
		let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
		h ^= h >>> 13;
		h = Math.imul(h, 0xc2b2ae35);
		h ^= h >>> 16;
		return ((h >>> 0) % 6) - 3;
	}
}
