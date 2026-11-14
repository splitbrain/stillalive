/**
 * The Boss object.
 */

import { playLoop, playSound, sfx_bossAlarm, sfx_bossHit, sfx_bossRumble } from '../audio.js';
import { MAP_WIDTH, SparkleType, TILE_SIZE } from '../constants.js';
import { Crate } from './Crate.js';
import { Plasma } from './Plasma.js';
import { Projectile } from './Projectile.js';
import { createCakeOrSmokeSparkles } from './Sparkle.js';
import { FIRST_OF_KIND, TileKind } from '../tiles.js';
import { getCos, getDistance, getSin, random, toPixels, toSubpixels } from '../utils.js';

/** @type {number} The x position of the boss in pixels while it fights. */
const BOSS_X = 449;
/** @type {number} The y position of the boss in pixels. */
const BOSS_Y = 150;
/** @type {number} The distance in pixels that the boss moves to the left while it comes in. */
const BOSS_ENTRY_DISTANCE = 50;
/** @type {number} The x position in pixels where the boss is out of the playfield after its death. */
const BOSS_GONE_X = 530;
/** @type {number} The number of crate hits that destroy the boss. */
const BOSS_LIVES = 3;

/**
 * The boss of a boss level. It comes in from the right, attacks the player and dies after three hits with a crate.
 */
export class Boss {
	/**
	 * Create the boss outside of the playfield. It comes in after the waits of the start events.
	 *
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} number The number of the boss, from 1 to 4.
	 */
	constructor(world, number) {
		/** @type {import('../World.js').World} The World of the object. */
		this.world = world;
		/** @type {number} The number of the boss, from 1 to 4. */
		this.number = number;
		/** @type {number} The x position in pixels. */
		this.x = BOSS_X + BOSS_ENTRY_DISTANCE;
		/** @type {number} The y position in pixels. */
		this.y = BOSS_Y;
		/** @type {number} The number of hits that the boss took, from 0 to BOSS_LIVES. */
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
		return this.number === 1 || this.number === 3 || this.number === 4;
	}

	/**
	 * Check if the boss throws crates.
	 *
	 * @returns {boolean} True for the bosses 1 and 4.
	 */
	throwsCrates() {
		return this.number === 1 || this.number === 4;
	}

	/**
	 * Check if the boss shoots razor wheels.
	 *
	 * @returns {boolean} True for the bosses 2 and 4.
	 */
	shootsWheels() {
		return this.number === 2 || this.number === 4;
	}

	/**
	 * Check if the boss shoots plasma balls. These balls follow the player.
	 *
	 * @returns {boolean} True for the bosses 3 and 4.
	 */
	shootsPlasma() {
		return this.number === 3 || this.number === 4;
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
		this.world.events.trigger('bossArrived');
	}

	/**
	 * Update the boss for one tick. The boss comes in after the waits of the start events, attacks the player, and
	 * kills the player on contact.
	 *
	 * @returns {void}
	 */
	update() {
		if (this.entering) {
			this.#enter();
			return;
		}

		const player = this.world.player;
		if (this.hits < BOSS_LIVES && !player.dead && this.#touchesPlayer()) {
			player.takeFatalHit();
			return;
		}
		if (player.dead) {
			this.world.projectiles = [];
			this.world.plasmaBall = [];
			return;
		}
		if (this.hits < BOSS_LIVES && this.world.phase.isRunning()) this.#attack();
	}

	/**
	 * Move the boss into the playfield with rumble, alarm and a shaking screen, unless an event waits.
	 *
	 * @returns {void}
	 */
	#enter() {
		if (this.world.events.isWaiting()) return;
		playLoop(sfx_bossRumble);
		playLoop(sfx_bossAlarm);
		this.entryDistance += 32;
		this.entryTicks++;
		this.x = BOSS_X + BOSS_ENTRY_DISTANCE - toPixels(this.entryDistance);
		if (this.x === BOSS_X) {
			this.entering = false;
			this.world.shakeX = 0;
			this.world.shakeY = 0;
			this.world.events.trigger('bossArrived');
		}
		if (this.entryTicks % 3 === 0) {
			this.world.shakeX = random(-3, 3);
			this.world.shakeY = random(-3, 3);
		}
	}

	/**
	 * Attack the player in the way of the boss. Each hit makes the attacks faster or adds an attack.
	 *
	 * @returns {void}
	 */
	#attack() {
		const time = this.world.time;
		const hits = this.hits;
		switch (this.number) {
			case 1:
				if (time % (90 - 30 * hits) === 0) this.#throwCrate(6, 18);
				break;
			case 2:
				if (time % (90 - 15 * hits) === 0) {
					this.#shootWheel(435, 50, 1200, 1200 - this.world.player.vx);
					if (hits === 2) this.#shootWheel(TILE_SIZE, 3 * TILE_SIZE, 1200);
				}
				break;
			case 3: {
				const due = time % (90 - 30 * hits) === 0;
				if (due && this.world.plasmaBall.length < hits + 1) this.#shootPlasma(800);
				if (due && this.world.crates.length === 0) {
					const crate = new Crate(this.world, toSubpixels((MAP_WIDTH - 1) * TILE_SIZE), toSubpixels(18 * TILE_SIZE));
					crate.vx = -toSubpixels(12);
					crate.vy = -toSubpixels(2);
					this.world.crates.push(crate);
				}
				break;
			}
			case 4:
				if (time % (90 - 20 * hits) === 0) this.#throwCrate(5, 20);
				if (hits > 0 && time % (180 - 20 * hits) === 0) this.#shootWheel(27 * TILE_SIZE, 2 * TILE_SIZE, 600);
				if (hits > 1 && this.world.plasmaBall.length === 0) this.#shootPlasma(400);
				break;
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
		const px = this.world.player.midX();
		const py = this.world.player.midY();
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
		this.world.projectiles.push(
			new Projectile(this.world, toSubpixels(x), toSubpixels(y), Math.trunc(dx * speedX), Math.trunc(dy * speed)),
		);
	}

	/**
	 * Shoot a plasma ball from the plasma start of the level towards the player.
	 *
	 * @param {number} speed The speed in 1/256 pixels per tick.
	 * @returns {void}
	 */
	#shootPlasma(speed) {
		const [dx, dy] = this.#aimAtPlayer(
			toPixels(this.world.plasmaX) + TILE_SIZE / 2,
			toPixels(this.world.plasmaY) + TILE_SIZE / 2,
		);
		this.world.plasmaBall.push(
			new Plasma(this.world, this.world.plasmaX, this.world.plasmaY, dx * speed, dy * speed, true),
		);
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
		const crate = new Crate(this.world, toSubpixels((MAP_WIDTH - 1) * TILE_SIZE), toSubpixels(row * TILE_SIZE));
		this.world.crates.push(crate);
		if (this.world.crates.length > 10) {
			for (let i = 0; i < 10; i++) {
				if (!this.world.crates[i].carried && this.world.crates[i].noRemove === 0) {
					this.world.crates.splice(i, 1);
					break;
				}
			}
		}
		const distance = getDistance(this.world.player.pixelX, this.world.player.pixelY, crate.pixelX, crate.pixelY);
		const speed = Math.min(Math.max(Math.trunc(distance / divisor), 3), 16);
		crate.vx = -toSubpixels(speed);
	}

	/**
	 * Let the boss smoke and leave after its death. The screen shakes until the boss is gone.
	 *
	 * @returns {void}
	 */
	updateRumble() {
		if (this.hits !== BOSS_LIVES || this.x >= BOSS_GONE_X) return;
		playLoop(sfx_bossRumble);
		this.#shakeScreen();
		if (this.world.time % 10 === 0) {
			createCakeOrSmokeSparkles(
				this.world,
				toSubpixels(this.x + 14),
				toSubpixels(this.y + 18),
				SparkleType.SMOKE,
				3,
				300,
			);
			this.x += 1;
		}
		if (this.x >= BOSS_GONE_X) {
			this.world.shakeX = 0;
			this.world.shakeY = 0;
		}
	}

	/**
	 * Get the phase of the boss fight.
	 *
	 * @returns {string|null} "coming" while the boss comes in, "fight" while it lives, "leaving" while it leaves after
	 *     its death, or null before the entrance and after the boss is gone.
	 */
	phase() {
		if (this.entering) return this.world.events.isWaiting() ? null : 'coming';
		if (this.hits < BOSS_LIVES) return 'fight';
		return this.x < BOSS_GONE_X ? 'leaving' : null;
	}

	/**
	 * Check if the player touches the boss.
	 *
	 * @returns {boolean} True if the player touches the boss.
	 */
	#touchesPlayer() {
		// the right edge and the middle of the player against the front of the boss
		const right = this.world.player.pixelX + this.world.player.width;
		const middle = this.world.player.midY();
		return right > this.x + 15 && middle > this.y && middle < this.y + 58;
	}

	/**
	 * Count a hit when a crate touches the boss. The boss dies after three hits.
	 *
	 * @param {Crate} crate The crate.
	 * @returns {void}
	 */
	hit(crate) {
		if (this.hits < BOSS_LIVES && crate.overlapsBox(this.x + 16, this.y, 74, 58)) {
			this.useUpCrate(crate);
			this.hits++;
			playSound(sfx_bossHit);
			if (this.hits < BOSS_LIVES) {
				const block = FIRST_OF_KIND[TileKind.BOSS_BLOCK];
				for (const [i, tile] of this.world.level.tiles.entries()) {
					if (tile === block) this.world.map.set(i, block);
				}
			} else {
				this.world.projectiles = [];
				this.world.plasmaBall = [];
				this.world.events.trigger('bossDied');
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
			crate.x = toSubpixels(5 * TILE_SIZE);
			crate.y = toSubpixels(-TILE_SIZE);
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
		const step = Math.floor(this.world.time / 3);
		this.world.shakeX = Boss.#shakeOffset(step * 2);
		this.world.shakeY = Boss.#shakeOffset(step * 2 + 1);
	}

	/**
	 * Get a pseudo-random shake offset.
	 *
	 * @param {number} index The index of the offset.
	 * @returns {number} An offset from -3 to 2 pixels, the same range as random(-3, 3).
	 */
	static #shakeOffset(index) {
		let hash = Math.imul(index ^ 0x9e3779b9, 0x85ebca6b);
		hash ^= hash >>> 13;
		hash = Math.imul(hash, 0xc2b2ae35);
		hash ^= hash >>> 16;
		return ((hash >>> 0) % 6) - 3;
	}
}
