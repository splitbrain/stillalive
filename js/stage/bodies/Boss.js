/**
 * The Boss object.
 */

import { playLoop, playSound, sfx_bossAlarm, sfx_bossHit, sfx_bossRumble } from '../browser/audio.js';
import { MAP_WIDTH, TILE_SIZE } from '../constants.js';
import { Body } from './Body.js';
import { Crate } from './Crate.js';
import { Plasma } from './Plasma.js';
import { Projectile } from './Projectile.js';
import { PuffSparkle } from '../effects/sparkles.js';
import { FIRST_OF_KIND, TileKind } from '../map/tiles.js';
import { getCos, getDistance, getSin, random, toPixels, toSubpixels } from '../utils.js';

/** @type {number} The x position of the boss image in pixels while the boss fights. */
const BOSS_X = 449;
/** @type {number} The y position of the boss image and of the hit box in pixels. */
const BOSS_Y = 150;
/** @type {number} The distance in pixels that the boss moves to the left while it comes in. */
const BOSS_ENTRY_DISTANCE = 50;
/** @type {number} The x position of the boss image in pixels where the boss is out of the playfield after its death. */
const BOSS_GONE_X = 530;
/** @type {number} The distance in pixels from the left edge of the boss image to the left edge of the hit box. */
const HIT_BOX_OFFSET = 16;
/** @type {number} The width in pixels of the hit box. The boss image has the same width. */
const BOSS_WIDTH = 74;
/** @type {number} The height in pixels of the hit box. The boss image has the same height. */
const BOSS_HEIGHT = 58;
/** @type {number} The x offset in pixels from the left edge of the boss image to the front edge for the player. */
const CONTACT_OFFSET = 15;
/** @type {number} The x offset in pixels of the smoke puffs from the left edge of the boss image. */
const SMOKE_OFFSET_X = 14;
/** @type {number} The y offset in pixels of the smoke puffs from the top edge of the boss image. */
const SMOKE_OFFSET_Y = 18;
/** @type {number} The number of crate hits that destroy the boss. */
const BOSS_LIVES = 3;

/**
 * The boss of a boss level. It comes in from the right, attacks the player and dies after three hits with a crate.
 * The subclasses in bosses.js define the attacks and set the abilities.
 *
 * The position and the size of the body are the hit box for the crates. The boss image is HIT_BOX_OFFSET pixels to the
 * left of the hit box, at imageX.
 */
export class Boss extends Body {
	/**
	 * Create the boss outside of the playfield. It comes in after the waits of the start events.
	 *
	 * @param {import('../world/World.js').World} world The World of the body.
	 * @param {number} number The number of the boss, from 1 to 4. It selects the eye, the portrait and the tube image.
	 */
	constructor(world, number) {
		super(
			world,
			toSubpixels(BOSS_X + BOSS_ENTRY_DISTANCE + HIT_BOX_OFFSET),
			toSubpixels(BOSS_Y),
			BOSS_WIDTH,
			BOSS_HEIGHT,
		);
		/** @type {number} The number of the boss, from 1 to 4. It selects the eye, the portrait and the tube image. */
		this.number = number;
		/** @type {number} The number of hits that the boss took, from 0 to BOSS_LIVES. */
		this.hits = 0;
		/** @type {boolean} True while the boss comes in. */
		this.entering = true;
		/** @type {number} The distance that the boss moved while it comes in, in 1/256 pixels. */
		this.entryDistance = 0;
		/** @type {number} The number of ticks since the boss started to come in. */
		this.entryTicks = 0;
		/** @type {boolean} True if the boss makes new crates. A used up crate goes away and does not return. */
		this.makesCrates = false;
		/** @type {boolean} True if the boss throws crates. */
		this.throwsCrates = false;
		/** @type {boolean} True if the boss shoots razor wheels. */
		this.shootsWheels = false;
		/** @type {boolean} True if the boss shoots plasma balls. These balls follow the player. */
		this.shootsPlasma = false;
	}

	/**
	 * Skip the entrance of the boss. The boss is at its place at once.
	 *
	 * @returns {void}
	 */
	skipEntry() {
		this.entering = false;
		this.entryDistance = 0;
		this.x = toSubpixels(BOSS_X + HIT_BOX_OFFSET);
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
			this.world.clearBossAttacks();
			return;
		}
		if (this.hits < BOSS_LIVES && this.world.phase.isRunning()) this.attack();
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
		// the boss moves in whole pixels, one pixel for each whole pixel of the entry distance
		this.x = toSubpixels(BOSS_X + BOSS_ENTRY_DISTANCE + HIT_BOX_OFFSET - toPixels(this.entryDistance));
		if (this.imageX === BOSS_X) {
			this.entering = false;
			this.world.effects.stopShake();
			this.world.events.trigger('bossArrived');
		}
		if (this.entryTicks % 3 === 0) {
			this.world.effects.shake(random(-3, 3), random(-3, 3));
		}
	}

	/**
	 * Attack the player in the way of the boss. Each hit makes the attacks faster or adds an attack. The subclasses
	 * define the attacks.
	 *
	 * @returns {void}
	 */
	attack() {}

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
	shootWheel(x, y, speed, speedX = speed) {
		const [dx, dy] = this.#aimAtPlayer(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
		this.world.addProjectile(
			new Projectile(this.world, toSubpixels(x), toSubpixels(y), Math.trunc(dx * speedX), Math.trunc(dy * speed)),
		);
	}

	/**
	 * Shoot a plasma ball from the plasma start of the level towards the player.
	 *
	 * @param {number} speed The speed in 1/256 pixels per tick.
	 * @returns {void}
	 */
	shootPlasma(speed) {
		const [dx, dy] = this.#aimAtPlayer(
			toPixels(this.world.plasmaX) + TILE_SIZE / 2,
			toPixels(this.world.plasmaY) + TILE_SIZE / 2,
		);
		this.world.addPlasma(new Plasma(this.world, this.world.plasmaX, this.world.plasmaY, dx * speed, dy * speed, true));
	}

	/**
	 * Throw a crate from the right edge towards the player. The speed grows with the distance to the player. When more
	 * than ten crates are in the level, the oldest crate that is not carried is removed.
	 *
	 * @param {number} row The row of the start position.
	 * @param {number} divisor The pixels of distance per unit of speed.
	 * @returns {void}
	 */
	throwCrate(row, divisor) {
		const crate = new Crate(this.world, toSubpixels((MAP_WIDTH - 1) * TILE_SIZE), toSubpixels(row * TILE_SIZE));
		this.world.addCrate(crate);
		if (this.world.crates.length > 10) {
			const oldest = this.world.crates.slice(0, 10).find((candidate) => !candidate.carried && candidate.noRemove === 0);
			if (oldest) this.world.removeCrate(oldest);
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
		if (this.hits !== BOSS_LIVES || this.imageX >= BOSS_GONE_X) return;
		playLoop(sfx_bossRumble);
		this.#shakeScreen();
		if (this.world.time % 10 === 0) {
			const smokeX = toSubpixels(this.imageX + SMOKE_OFFSET_X);
			const smokeY = toSubpixels(this.pixelY + SMOKE_OFFSET_Y);
			this.world.effects.addPuffSparkles(smokeX, smokeY, PuffSparkle.SMOKE, 3, 300);
			this.x += toSubpixels(1);
		}
		if (this.imageX >= BOSS_GONE_X) this.world.effects.stopShake();
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
		return this.imageX < BOSS_GONE_X ? 'leaving' : null;
	}

	/**
	 * Get the x position of the boss image, which is HIT_BOX_OFFSET pixels to the left of the hit box.
	 *
	 * @returns {number} The left edge of the boss image in pixels.
	 */
	get imageX() {
		return this.pixelX - HIT_BOX_OFFSET;
	}

	/**
	 * Check if the player touches the boss.
	 *
	 * @returns {boolean} True if the player touches the boss.
	 */
	#touchesPlayer() {
		// the right edge and the middle of the player against the front of the boss, which is not the hit box
		const right = this.world.player.pixelX + this.world.player.width;
		const middle = this.world.player.midY();
		return right > this.imageX + CONTACT_OFFSET && middle > this.pixelY && middle < this.pixelY + this.height;
	}

	/**
	 * Count a hit when a crate touches the boss. The boss dies after three hits.
	 *
	 * @param {Crate} crate The crate.
	 * @returns {void}
	 */
	hit(crate) {
		if (this.hits < BOSS_LIVES && crate.overlaps(this)) {
			this.useUpCrate(crate);
			this.hits++;
			playSound(sfx_bossHit);
			if (this.hits < BOSS_LIVES) {
				const block = FIRST_OF_KIND[TileKind.BOSS_BLOCK];
				// a boss gets hits only in a tick of a level, so the World has a level
				const level = /** @type {import('../world/level.js').Level} */ (this.world.level);
				for (const [i, tile] of level.tiles.entries()) {
					if (tile === block) this.world.map.set(i, block);
				}
			} else {
				this.world.clearBossAttacks();
				this.world.events.trigger('bossDied');
			}
		}
	}

	/**
	 * Take away a crate that hit the boss or a boss block. A boss that makes new crates removes it. A boss that makes
	 * no crates lets the crate drop from the top again.
	 *
	 * @param {Crate} crate The crate.
	 * @returns {void}
	 */
	useUpCrate(crate) {
		if (this.makesCrates) {
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
		this.world.effects.shake(Boss.#shakeOffset(step * 2), Boss.#shakeOffset(step * 2 + 1));
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
