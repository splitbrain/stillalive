/**
 * The Crate object.
 */

import { Throwable } from './Throwable.js';
import { playSound, sfx_crateLand, sfx_dissolve, sfx_wallBreak, sfx_wallCrack } from '../audio.js';
import { BELT_SPEED, Ground, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE } from '../constants.js';
import { isTileKind, LAST_OF_KIND, Tile, TileKind } from '../tiles.js';
import { toPixels, toSubpixels } from '../utils.js';

/**
 * A crate. The player can carry and throw it, and it can press switches and stop turret shots.
 */
export class Crate extends Throwable {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(world, x, y) {
		super(world, x, y, TILE_SIZE, TILE_SIZE);
		/** @type {number} The x position of the start, where the crate returns after a reset. */
		this.xOrig = x;
		/** @type {number} The y position of the start, where the crate returns after a reset. */
		this.yOrig = y;
		/** @type {import('./Platform.js').Platform|null} The platform that the crate stands on, or null. */
		this.platform = null;
		/** @type {number} The direction of the conveyor belt under the crate: 1 to the right, -1 to the left, 0 for none. */
		this.belt = 0;
		/** @type {number} The countdown of the shrink animation after a force field destroyed the crate, or 0. */
		this.shrink = 0;
		/** @type {boolean} True when the crate must go away in the next tick. */
		this.needKill = false;
		/** @type {number} Ticks after a throw before the crate can push the player again. */
		this.invincibility = 0;
		/** @type {number} Ticks after a throw in which the crate stays when the boss has too many crates. */
		this.noRemove = 0;
	}

	/**
	 * Update the crate for one tick. The crate advances the boss blocks that it touches. Outside the playfield, on a
	 * deadly tile or at a plasma ball, the crate returns to its start or goes away in a boss level. In a force field,
	 * the crate shrinks.
	 *
	 * @returns {void}
	 */
	update() {
		if (this.invincibility > 0) this.invincibility--;
		if (this.noRemove > 0) this.noRemove--;

		if (this.shrink !== 0) {
			this.shrink -= 4;
			if (this.shrink === 0 && this.#destroyOrReset()) return;
		} else if (this.carried) {
			this.belt = 0;
			this.place();
		} else if (this.#moveLoose()) {
			return;
		}

		if (this.shrink === 0 && this.inForceField()) {
			if (this.carried) this.world.player.carrying = null;
			this.shrink = 60;
			playSound(sfx_dissolve);
		}
	}

	/**
	 * Move the crate when nobody carries it: it falls, it rides on platforms, it tumbles in the air, and it does not
	 * fall into the player. Outside the playfield, on a deadly tile or at a plasma ball, the crate returns to its start
	 * or goes away.
	 *
	 * @returns {boolean} True if the crate went away or was used up, which ends its update.
	 */
	#moveLoose() {
		const falling = this.vy > 0;
		this.move();
		if (falling && this.vy === 0 && this.touchingGround() !== Ground.AIR) playSound(sfx_crateLand);

		if (this.world.boss && this.#hitBoss()) return true;

		const platform = this.world.onPlatform(this);
		this.platform = platform;
		if (platform) {
			this.x += platform.vx;
			if (platform.vx < 0 && this.leftCollision()) this.x -= platform.vx;
			else if (platform.vx > 0 && this.rightCollision()) this.x -= platform.vx;
		}

		this.angle = this.touchingGround() === Ground.AIR ? this.angle + (toPixels(this.vx) << 1) : 0;
		if (this.angle >= 360) this.angle -= 360;
		if (this.landsOnPlayer()) {
			while (this.landsOnPlayer()) this.y -= toSubpixels(1);
			this.vy = 0;
			this.angle = 0;
		}

		const x = this.pixelX;
		const y = this.pixelY;
		const lost =
			x < -TILE_SIZE ||
			x > PLAYFIELD_WIDTH ||
			y < -TILE_SIZE ||
			y > PLAYFIELD_HEIGHT ||
			this.touchesDeadlyTile() ||
			this.world.plasmaTouching(this);
		return lost && this.#destroyOrReset();
	}

	/**
	 * Let the crate hit the boss or crack the boss block in front of it. In a boss level that throws crates, the crate
	 * also shrinks in the tube.
	 *
	 * @returns {boolean} True if the crate cracked a boss block, which uses it up.
	 */
	#hitBoss() {
		const boss = this.world.boss;
		if (boss.throwsCrates()) this.#shrinkInTube();

		const t = this.world.map.atPixel(this.pixelX + this.width + 1, this.pixelY);
		if (isTileKind(t, TileKind.BOSS_BLOCK)) {
			playSound(t < LAST_OF_KIND[TileKind.BOSS_BLOCK] ? sfx_wallCrack : sfx_wallBreak);
			this.world.map.replaceAll(t, t < LAST_OF_KIND[TileKind.BOSS_BLOCK] ? t + 1 : Tile.EMPTY);
			boss.useUpCrate(this);
			return true;
		}

		boss.hit(this);
		return false;
	}

	/**
	 * Protect the player from a push for three ticks and keep the crate in a boss level for 90 ticks.
	 *
	 * @returns {void}
	 */
	thrown() {
		this.invincibility = 3;
		this.noRemove = 90;
	}

	/**
	 * Give the crate the speed of the conveyor belt that it left, and store the belt under the crate.
	 *
	 * @param {number} belt The direction of the conveyor belt under the crate: 1 to the right, -1 to the left, 0 for
	 *     none.
	 * @returns {void}
	 */
	keepBeltSpeed(belt) {
		if (belt === 0 && this.belt !== 0) this.vx = BELT_SPEED * this.belt;
		this.belt = belt;
	}

	/**
	 * Check if the falling crate lands on the head of the player.
	 *
	 * @returns {boolean} True if the crate falls onto the player.
	 */
	landsOnPlayer() {
		if (this.vy <= 0 || this.world.portals.isInPortal(this)) return false;
		const y = this.pixelY + this.height;
		const x2 = this.world.player.pixelX;
		const y2 = this.world.player.pixelY;
		if (y < y2 || y >= y2 + 4) return false;
		// two test points below the crate
		return [3, 12].some((dx) => {
			const x = this.pixelX + dx;
			return x >= x2 && x < x2 + 16;
		});
	}

	/**
	 * Push the player sideways when a moving crate touches the player. Push a crate in the way: it gets the speed of
	 * this crate, and this crate loses half of its speed.
	 *
	 * @returns {boolean} True if the crate pushed another crate, which ends the movement of this tick.
	 */
	push() {
		const player = this.world.player;
		if (this.world.movingCrateTouching(player) && this.invincibility === 0) this.#pushPlayer();

		const portals = this.world.portals;
		if (this.vx === 0 || portals.isInPortal(this)) return false;
		// the test points lie in front of the crate in the direction of its move
		const x = this.pixelX + (this.vx > 0 ? TILE_SIZE : -1);
		const y = this.pixelY;
		for (const ca of this.world.crates) {
			if (portals.isInPortal(ca) || (this.x === ca.x && this.y === ca.y)) continue;
			if (ca.contains(x, y + 1) || ca.contains(x, y + TILE_SIZE / 2) || ca.contains(x, y + 13)) {
				if (ca.carried) player.vx = this.vx;
				else if (this.carried) player.vx = ca.vx;
				ca.vx = this.vx;
				this.vx >>= 1;
				return true;
			}
		}
		return false;
	}

	/**
	 * Push the player with the speed of the crate, but not into a wall.
	 *
	 * @returns {void}
	 */
	#pushPlayer() {
		const player = this.world.player;
		player.x += this.vx >> 3;
		if (this.vx < 0 && player.leftCollision()) {
			while (player.leftCollision()) player.x += 128;
			this.vx = 0;
		} else if (this.vx > 0 && player.rightCollision()) {
			while (player.rightCollision()) player.x -= 128;
			this.vx = 0;
		}
	}

	/**
	 * Shrink the crate when it enters the tube of the boss level.
	 *
	 * @returns {void}
	 */
	#shrinkInTube() {
		if (this.vx < 0) return;

		if (this.overlapsBox(toPixels(this.world.tubeX), toPixels(this.world.tubeY), 4 * TILE_SIZE, 3 * TILE_SIZE)) {
			this.shrink = 60;
		}
	}

	/**
	 * Let the crate go away in the boss levels 1, 3 and 4. In the other levels, put the crate back to its start
	 * without speed.
	 *
	 * @returns {boolean} True if the crate goes away.
	 */
	#destroyOrReset() {
		if (this.world.boss?.makesCrates()) {
			this.needKill = true;
			return true;
		}
		this.x = this.xOrig;
		this.y = this.yOrig;
		this.vx = 0;
		this.vy = 0;
		return false;
	}
}
