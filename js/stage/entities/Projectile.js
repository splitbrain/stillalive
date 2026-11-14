/**
 * The Projectile object and its helper functions.
 */

import { Body } from './Body.js';
import { playSound, sfx_bladeStick } from '../audio.js';
import { TILE_SIZE } from '../constants.js';
import { game } from '../state.js';
import { FIRST_OF_KIND, LAST_OF_KIND, TileKind } from '../tiles.js';

/**
 * A razor wheel that the boss throws.
 */
export class Projectile extends Body {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 */
	constructor(x, y, vx, vy) {
		super(x, y, TILE_SIZE, TILE_SIZE);
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {boolean} True after the wheel hit something. */
		this.needKill = false;
		/** @type {number} Ticks until the stopped wheel goes away. */
		this.timer = 0;
		/** @type {number} The tile id of the wheel frame to draw. */
		this.img = FIRST_OF_KIND[TileKind.WHEEL];
	}

	/**
	 * Move the wheel for one tick and stop it when it hits a wall, a platform or a crate.
	 *
	 * @returns {void}
	 */
	move() {
		if (!this.needKill) {
			this.x += this.vx;
			this.y += this.vy;

			if (game.time % 6 == 0) {
				if (++this.img > LAST_OF_KIND[TileKind.WHEEL]) this.img = FIRST_OF_KIND[TileKind.WHEEL];
			}

			const t = game.getTile((this.x >> 8) + TILE_SIZE / 2, (this.y >> 8) + TILE_SIZE / 2);

			if (t) {
				this.needKill = true;
				this.timer = 180;
				if (t instanceof Body) {
					this.timer = 0;
				} else playSound(sfx_bladeStick);
			} else {
				if (game.anyCrateAt(this.x >> 8, this.y >> 8)) this.needKill = true;
				else if (game.anyCrateAt((this.x >> 8) + TILE_SIZE, this.y >> 8)) this.needKill = true;
				else if (game.anyCrateAt(this.x >> 8, (this.y >> 8) + TILE_SIZE)) this.needKill = true;
				else if (game.anyCrateAt((this.x >> 8) + TILE_SIZE, (this.y >> 8) + TILE_SIZE)) this.needKill = true;
			}
		} else {
			if (--this.timer < 0) this.timer = 0;
		}
	}
}

/**
 * Move the razor wheels of the boss, kill the player on a hit and remove the stopped wheels after their timer.
 *
 * @returns {void}
 */
export function updateProjectiles() {
	for (let pi = 0; pi < game.projectiles.length; pi++) {
		const p = game.projectiles[pi];
		p.move();
		if (!p.needKill && p.overlaps(game.player)) {
			game.projectiles.splice(pi, 1);
			game.player.life = -200;
			game.player.recoveryTime = 180;
			return;
		}
		if (p.needKill && p.timer == 0) {
			game.projectiles.splice(pi, 1);
			pi--;
		}
	}
}
