/**
 * The Caisse object and its helper functions.
 */

import { manageInTube, manageToucheBoss } from '../boss.js';
import { inForceField } from './ForceField.js';
import { plasmaToucheObjet } from './Plasma.js';
import { onPlateforme } from './Platform.js';
import {
	getTileSimple,
	leftCollision,
	moveObject,
	placeObject,
	rightCollision,
	toucheTileMort,
	touchingGround,
} from '../physics.js';
import { dansUnPortal } from '../portals.js';
import { game } from '../state.js';
import { CRATE_CODE, LAST_OF_KIND, TileKind, isTileKind } from '../tiles.js';

/**
 * A crate. The player can carry and throw it, and it can press switches and stop turret shots.
 */
export class Caisse {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 */
	constructor(x, y) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The width in pixels. */
		this.pX = 16;
		/** @type {number} The height in pixels. */
		this.pY = 16;
		/** @type {number} The x position of the start, where the crate returns when a door closes on it. */
		this.xOrig = x;
		/** @type {number} The y position of the start, where the crate returns when a door closes on it. */
		this.yOrig = y;
		/** @type {number} The rotation in degrees while the crate flies. */
		this.angle = 0;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} 1 while the player carries the crate. */
		this.porter = 0;
		/** @type {number} The index of the platform that the crate stands on, or -1. */
		this.plateforme = -1;
		/** @type {number} The conveyor belt that the crate stands on: 3 to the right, 4 to the left, 0 for none. */
		this.carpet = 0;
		/** @type {string} The entity type, used by the shared object functions. */
		this.type = 'caisse';
		/**
		 * @type {number} Ticks left of the shrink animation after a force field destroyed the crate, 0 for a normal
		 * crate.
		 */
		this.shrink = 0;
		/** @type {boolean} True when the crate must go away in the next tick. */
		this.needKill = false;
		/** @type {number} Ticks after a throw before the crate can push the player again. */
		this.invincibility = 0;
		/** @type {number} Ticks after a throw in which the crate stays when the boss has too many crates. */
		this.noRemove = 0;
	}

	/**
	 * Get the horizontal center of the crate.
	 *
	 * @returns {number} The x coordinate of the center in pixels.
	 */
	midX() {
		return (this.x >> 8) + (this.pX >> 1);
	}

	/**
	 * Get the vertical center of the crate.
	 *
	 * @returns {number} The y coordinate of the center in pixels.
	 */
	midY() {
		return (this.y >> 8) + (this.pY >> 1);
	}

	/**
	 * Move the crate for one tick. The crate advances the boss blocks that it touches. It goes away outside the
	 * playfield and on deadly tiles, and it shrinks in a force field.
	 *
	 * @returns {void}
	 */
	move() {
		let i;
		if (this.invincibility > 0) this.invincibility--;
		if (this.noRemove > 0) this.noRemove--;

		if (this.shrink == 0) {
			if (!this.porter) {
				moveObject(this);

				if (game.bossNum > 0) {
					if (game.bossNum == 1 || game.bossNum == 4) manageInTube(this);

					const t = getTileSimple((this.x >> 8) + this.pX + 1, this.y >> 8);
					if (isTileKind(t, TileKind.BOSS_BLOCK)) {
						for (i in game.map) {
							if (game.map[i] == t) {
								if (t < LAST_OF_KIND[TileKind.BOSS_BLOCK]) {
									game.map[i]++;
									game.displayMap[i]++;
								} else {
									game.map[i] = 0;
									game.displayMap[i] = 0;
								}
							}
						}
						game.needLoad = true;
						if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) this.needKill = true;
						else if (game.bossNum == 2) {
							this.x = 80 << 8;
							this.y = -16 << 8;
							this.vx = 0;
							this.vy = 0;
						}
						return;
					}

					manageToucheBoss(this);
				}

				let plt = onPlateforme(this);
				if (plt) {
					plt -= 200;
					this.x += game.platforms[plt].vx;
					this.plateforme = plt;
					if (game.platforms[plt].vx < 0 && leftCollision(this)) this.x -= game.platforms[plt].vx;
					else if (game.platforms[plt].vx > 0 && rightCollision(this)) this.x -= game.platforms[plt].vx;
				} else this.plateforme = -1;

				if (!touchingGround(this)) this.angle += (this.vx >> 8) << 1;
				else this.angle = 0;
				if (this.angle >= 360) this.angle -= 360;
				if (caisseSurPerso(this)) {
					while (caisseSurPerso(this)) this.y -= 256;
					this.vy = 0;
					this.angle = 0;
				}
				const x = this.x >> 8;
				const y = this.y >> 8;
				if (x < -16 || x > 512 || y < -16 || y > 384 || toucheTileMort(this) || plasmaToucheObjet(this)) {
					if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) {
						this.needKill = true;
						return;
					}
					this.x = this.xOrig;
					this.y = this.yOrig;
					this.vx = 0;
					this.vy = 0;
				}
			} else {
				if (this.carpet > 0) this.carpet = 0;
				placeObject(this);
			}
		} else {
			this.shrink -= 4;
			if (this.shrink == 0) {
				if (game.bossNum == 1 || game.bossNum == 4) {
					this.needKill = true;
					return;
				}
				this.x = this.xOrig;
				this.y = this.yOrig;
				this.vx = 0;
				this.vy = 0;
			}
		}

		if (this.shrink == 0 && inForceField(this)) {
			this.porter = 0;
			this.shrink = 60;
		}
	}
}

/**
 * Find the crate at a point. Carried crates and crates in a portal do not count.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The crate code of the crate, or 0.
 */
export function collideCaisse(x, y) {
	let i;
	for (i in game.caisses) {
		const x2 = game.caisses[i].x >> 8;
		const y2 = game.caisses[i].y >> 8;
		if (!game.caisses[i].porter && !dansUnPortal(game.caisses[i]) && x > x2 && x < x2 + 15 && y > y2 && y < y2 + 15) {
			const ret = parseInt(i);
			return CRATE_CODE + ret;
		}
	}
	return 0;
}

/**
 * Find the crate at a point, including carried crates and crates in a portal.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The crate code of the crate, or 0.
 */
export function collideAnyCaisse(x, y) {
	let i;
	for (i in game.caisses) {
		const x2 = game.caisses[i].x >> 8;
		const y2 = game.caisses[i].y >> 8;
		if (x > x2 && x < x2 + 15 && y > y2 && y < y2 + 15) {
			const ret = parseInt(i);
			return CRATE_CODE + ret;
		}
	}
	return 0;
}

/**
 * Check if a falling crate lands on the head of the player.
 *
 * @param {object} obj The moving object.
 * @returns {number} 1 if the object is a crate that falls onto the player, else 0.
 */
export function caisseSurPerso(obj) {
	if (obj.type == 'caisse' && obj.vy > 0 && !dansUnPortal(obj)) {
		let x = (obj.x >> 8) + 3;
		const y = (obj.y >> 8) + obj.pY;
		const x2 = game.perso.x >> 8;
		const y2 = game.perso.y >> 8;

		if (x >= x2 && x < x2 + 16 && y >= y2 && y < y2 + 4) return 1;
		else {
			x += 9;
			if (x >= x2 && x < x2 + 16 && y >= y2 && y < y2 + 4) return 1;
		}
	}
	return 0;
}

/**
 * Find a moving crate that overlaps an object.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} The crate index plus 1, or 0 if no moving crate overlaps the object.
 */
export function caisseToucheObjet(obj) {
	let i;
	const posx = obj.x >> 8;
	const posy = obj.y >> 8;
	const px = obj.pX;
	const py = obj.pY;

	for (i in game.caisses) {
		if (
			game.caisses[i].porter == 0 &&
			(game.caisses[i].vx != 0 || game.caisses[i].vy != 0) &&
			!dansUnPortal(game.caisses[i])
		) {
			const x = game.caisses[i].x >> 8;
			const y = game.caisses[i].y >> 8;
			if (posx + px > x && x + 16 > posx && posy + py > y && y + 16 > posy) return i + 1;
		}
	}
	return 0;
}
