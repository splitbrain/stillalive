/**
 * The Crate object and its helper functions.
 */

import { Throwable } from './Throwable.js';
import { playSound, sfx_crateLand, sfx_dissolve, sfx_wallBreak, sfx_wallCrack } from '../audio.js';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE } from '../constants.js';
import { leftCollision, rightCollision, touchesDeadlyTile, touchingGround } from '../physics.js';
import { inForceField, isInPortal } from '../portals.js';
import { game } from '../state.js';
import { isTileKind, LAST_OF_KIND, Tile, TileKind } from '../tiles.js';

/**
 * A crate. The player can carry and throw it, and it can press switches and stop turret shots.
 */
export class Crate extends Throwable {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(x, y) {
		super(x, y, TILE_SIZE, TILE_SIZE);
		/** @type {number} The x position of the start, where the crate returns after a reset. */
		this.xOrig = x;
		/** @type {number} The y position of the start, where the crate returns after a reset. */
		this.yOrig = y;
		/** @type {import('./Platform.js').Platform|null} The platform that the crate stands on, or null. */
		this.platform = null;
		/** @type {number} The conveyor belt that the crate stands on: 3 to the right, 4 to the left, 0 for none. */
		this.carpet = 0;
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
		let i;
		if (this.invincibility > 0) this.invincibility--;
		if (this.noRemove > 0) this.noRemove--;

		if (this.shrink == 0) {
			if (!this.carried) {
				const falling = this.vy > 0;
				this.move();
				if (falling && this.vy == 0 && touchingGround(this)) playSound(sfx_crateLand);

				if (game.boss) {
					if (game.boss.throwsCrates()) this.#shrinkInTube();

					const t = game.map.atPixel((this.x >> 8) + this.pX + 1, this.y >> 8);
					if (isTileKind(t, TileKind.BOSS_BLOCK)) {
						playSound(t < LAST_OF_KIND[TileKind.BOSS_BLOCK] ? sfx_wallCrack : sfx_wallBreak);
						for (i = 0; i < game.map.tiles.length; i++) {
							if (game.map.tiles[i] == t) {
								if (t < LAST_OF_KIND[TileKind.BOSS_BLOCK]) game.map.set(i, t + 1);
								else game.map.set(i, Tile.EMPTY);
							}
						}
						game.boss.useUpCrate(this);
						return;
					}

					game.boss.hit(this);
				}

				const platform = game.onPlatform(this);
				if (platform) {
					this.x += platform.vx;
					this.platform = platform;
					if (platform.vx < 0 && leftCollision(this)) this.x -= platform.vx;
					else if (platform.vx > 0 && rightCollision(this)) this.x -= platform.vx;
				} else this.platform = null;

				if (!touchingGround(this)) this.angle += (this.vx >> 8) << 1;
				else this.angle = 0;
				if (this.angle >= 360) this.angle -= 360;
				if (this.landsOnPlayer()) {
					while (this.landsOnPlayer()) this.y -= 256;
					this.vy = 0;
					this.angle = 0;
				}
				const x = this.x >> 8;
				const y = this.y >> 8;
				if (
					x < -TILE_SIZE ||
					x > PLAYFIELD_WIDTH ||
					y < -TILE_SIZE ||
					y > PLAYFIELD_HEIGHT ||
					touchesDeadlyTile(this) ||
					game.plasmaTouching(this)
				) {
					if (this.#destroyOrReset()) return;
				}
			} else {
				if (this.carpet > 0) this.carpet = 0;
				this.place();
			}
		} else {
			this.shrink -= 4;
			if (this.shrink == 0 && this.#destroyOrReset()) return;
		}

		if (this.shrink == 0 && inForceField(this)) {
			if (this.carried) game.player.carrying = null;
			this.shrink = 60;
			playSound(sfx_dissolve);
		}
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
	 * @param {number} belt The conveyor belt under the crate: 3 to the right, 4 to the left, 0 for none.
	 * @returns {void}
	 */
	keepBeltSpeed(belt) {
		if (belt == 0 && this.carpet != 0) this.vx = this.carpet == 3 ? 384 : this.carpet == 4 ? -384 : 0;
		this.carpet = belt;
	}

	/**
	 * Check if the falling crate lands on the head of the player.
	 *
	 * @returns {boolean} True if the crate falls onto the player.
	 */
	landsOnPlayer() {
		if (this.vy > 0 && !isInPortal(this)) {
			let x = (this.x >> 8) + 3;
			const y = (this.y >> 8) + this.pY;
			const x2 = game.player.x >> 8;
			const y2 = game.player.y >> 8;

			if (x >= x2 && x < x2 + 16 && y >= y2 && y < y2 + 4) return true;
			else {
				x += 9;
				if (x >= x2 && x < x2 + 16 && y >= y2 && y < y2 + 4) return true;
			}
		}
		return false;
	}

	/**
	 * Push the player sideways when a moving crate touches the player. Push a crate in the way: it gets the speed of
	 * this crate, and this crate loses half of its speed.
	 *
	 * @returns {boolean} True if the crate pushed another crate, which ends the movement of this tick.
	 */
	push() {
		let c;
		if (game.movingCrateTouching(game.player) && this.invincibility == 0) {
			game.player.x += this.vx >> 3;

			if (this.vx < 0) {
				if (leftCollision(game.player)) {
					while (leftCollision(game.player)) game.player.x += 128;
					this.vx = 0;
				}
			} else if (this.vx > 0) {
				if (rightCollision(game.player)) {
					while (rightCollision(game.player)) game.player.x -= 128;
					this.vx = 0;
				}
			}
		}

		if (this.vx != 0 && !isInPortal(this)) {
			for (c = 0; c < game.crates.length; c++) {
				const ca = game.crates[c];
				if (isInPortal(ca)) continue;
				if (this.x != ca.x || this.y != ca.y) {
					const y = this.y >> 8;
					let x = this.x >> 8;

					if (this.vx > 0) x += TILE_SIZE;
					else if (this.vx < 0) x -= 1;

					if (ca.contains(x, y + 1) || ca.contains(x, y + TILE_SIZE / 2) || ca.contains(x, y + 13)) {
						if (ca.carried) game.player.vx = this.vx;
						else if (this.carried) game.player.vx = ca.vx;
						ca.vx = this.vx;
						this.vx >>= 1;
						return true;
					}
				}
			}
		}
		return false;
	}

	/**
	 * Shrink the crate when it enters the tube of the boss level.
	 *
	 * @returns {void}
	 */
	#shrinkInTube() {
		if (this.vx < 0) return;

		if (this.overlapsBox(game.tubeX >> 8, game.tubeY >> 8, 4 * TILE_SIZE, 3 * TILE_SIZE)) {
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
		if (game.boss?.makesCrates()) {
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

/**
 * Move the crates and remove the destroyed ones. A shrinking crate moves at half of its speed. The crates stand still
 * during the level transitions.
 *
 * @returns {void}
 */
export function updateCrates() {
	for (let ci = 0; ci < game.crates.length; ci++) {
		const c = game.crates[ci];
		if (c.shrink > 0) {
			c.x += c.vx >> 1;
			c.y += c.vy >> 1;
		}
		if (game.isRunning()) {
			c.update();
			if (c.needKill) {
				if (c.carried) game.player.carrying = null;
				game.crates.splice(ci, 1);
				ci--;
				continue;
			}
			if (!game.objectInPortal) game.objectInPortal = isInPortal(c);
		}
	}
}
