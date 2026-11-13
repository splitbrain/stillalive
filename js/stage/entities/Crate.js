/**
 * The Crate object and its helper functions.
 */

import { playSound, sfx_crateLand, sfx_dissolve, sfx_wallBreak, sfx_wallCrack } from '../audio.js';
import { hitBoss, manageInTube } from '../boss.js';
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from '../constants.js';
import { plasmaTouching } from './Plasma.js';
import { onPlatform } from './Platform.js';
import {
	getTileSimple,
	leftCollision,
	moveObject,
	placeObject,
	rightCollision,
	touchesDeadlyTile,
	touchingGround,
} from '../physics.js';
import { inForceField, isInPortal } from '../portals.js';
import { game } from '../state.js';
import { CRATE_CODE, isTileKind, LAST_OF_KIND, PLATFORM_CODE, TileKind } from '../tiles.js';

/**
 * A crate. The player can carry and throw it, and it can press switches and stop turret shots.
 */
export class Crate {
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
		/** @type {number} The x position of the start, where the crate returns after a reset. */
		this.xOrig = x;
		/** @type {number} The y position of the start, where the crate returns after a reset. */
		this.yOrig = y;
		/** @type {number} The rotation in degrees while the crate flies. */
		this.angle = 0;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {boolean} True while the player carries the crate. */
		this.carried = false;
		/** @type {number} The index of the platform that the crate stands on, or -1. */
		this.platformIndex = -1;
		/** @type {number} The conveyor belt that the crate stands on: 3 to the right, 4 to the left, 0 for none. */
		this.carpet = 0;
		/** @type {string} The entity type, used by the shared object functions. */
		this.type = 'crate';
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
	 * Move the crate for one tick. The crate advances the boss blocks that it touches. Outside the playfield, on a
	 * deadly tile or at a plasma ball, the crate returns to its start or goes away in a boss level. In a force field,
	 * the crate shrinks.
	 *
	 * @returns {void}
	 */
	move() {
		let i;
		if (this.invincibility > 0) this.invincibility--;
		if (this.noRemove > 0) this.noRemove--;

		if (this.shrink == 0) {
			if (!this.carried) {
				const falling = this.vy > 0;
				moveObject(this);
				if (falling && this.vy == 0 && touchingGround(this)) playSound(sfx_crateLand);

				if (game.bossNum > 0) {
					if (game.bossNum == 1 || game.bossNum == 4) manageInTube(this);

					const t = getTileSimple((this.x >> 8) + this.pX + 1, this.y >> 8);
					if (isTileKind(t, TileKind.BOSS_BLOCK)) {
						playSound(t < LAST_OF_KIND[TileKind.BOSS_BLOCK] ? sfx_wallCrack : sfx_wallBreak);
						for (i = 0; i < game.map.length; i++) {
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
						game.tilesChanged = true;
						if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) this.needKill = true;
						else if (game.bossNum == 2) {
							this.x = 80 << 8;
							this.y = -16 << 8;
							this.vx = 0;
							this.vy = 0;
						}
						return;
					}

					hitBoss(this);
				}

				let pi = onPlatform(this);
				if (pi) {
					pi -= PLATFORM_CODE;
					this.x += game.platforms[pi].vx;
					this.platformIndex = pi;
					if (game.platforms[pi].vx < 0 && leftCollision(this)) this.x -= game.platforms[pi].vx;
					else if (game.platforms[pi].vx > 0 && rightCollision(this)) this.x -= game.platforms[pi].vx;
				} else this.platformIndex = -1;

				if (!touchingGround(this)) this.angle += (this.vx >> 8) << 1;
				else this.angle = 0;
				if (this.angle >= 360) this.angle -= 360;
				if (crateLandsOnPlayer(this)) {
					while (crateLandsOnPlayer(this)) this.y -= 256;
					this.vy = 0;
					this.angle = 0;
				}
				const x = this.x >> 8;
				const y = this.y >> 8;
				if (
					x < -16 ||
					x > PLAYFIELD_WIDTH ||
					y < -16 ||
					y > PLAYFIELD_HEIGHT ||
					touchesDeadlyTile(this) ||
					plasmaTouching(this)
				) {
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
				if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) {
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
			this.carried = false;
			this.shrink = 60;
			playSound(sfx_dissolve);
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
export function crateAt(x, y) {
	return findCrate(x, y, freeCrate);
}

/**
 * Find the crate at a point, including carried crates and crates in a portal.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The crate code of the crate, or 0.
 */
export function anyCrateAt(x, y) {
	return findCrate(x, y, anyCrate);
}

/** @type {function(Crate): boolean} True for a crate that is not carried and not in a portal. */
const freeCrate = (crate) => !crate.carried && !isInPortal(crate);

/** @type {function(Crate): boolean} True for every crate. */
const anyCrate = () => true;

/**
 * Find a crate at a point.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @param {function(Crate): boolean} counts The filter that selects the crates to find.
 * @returns {number} The crate code of the first crate that counts at the point, or 0.
 */
function findCrate(x, y, counts) {
	for (let i = 0; i < game.crates.length; i++) {
		const crate = game.crates[i];
		const x2 = crate.x >> 8;
		const y2 = crate.y >> 8;
		if (counts(crate) && x > x2 && x < x2 + 15 && y > y2 && y < y2 + 15) return CRATE_CODE + i;
	}
	return 0;
}

/**
 * Check if a falling crate lands on the head of the player.
 *
 * @param {object} obj The moving object.
 * @returns {number} 1 if the object is a crate that falls onto the player, else 0.
 */
export function crateLandsOnPlayer(obj) {
	if (obj.type == 'crate' && obj.vy > 0 && !isInPortal(obj)) {
		let x = (obj.x >> 8) + 3;
		const y = (obj.y >> 8) + obj.pY;
		const x2 = game.player.x >> 8;
		const y2 = game.player.y >> 8;

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
export function movingCrateTouching(obj) {
	let i;
	const posx = obj.x >> 8;
	const posy = obj.y >> 8;
	const px = obj.pX;
	const py = obj.pY;

	for (i = 0; i < game.crates.length; i++) {
		if (!game.crates[i].carried && (game.crates[i].vx != 0 || game.crates[i].vy != 0) && !isInPortal(game.crates[i])) {
			const x = game.crates[i].x >> 8;
			const y = game.crates[i].y >> 8;
			if (posx + px > x && x + 16 > posx && posy + py > y && y + 16 > posy) return i + 1;
		}
	}
	return 0;
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
		if (game.player.fadeNextLevel == -1) {
			c.move();
			if (c.needKill) {
				game.crates.splice(ci, 1);
				ci--;
				continue;
			}
			if (game.objectInPortal == 0) game.objectInPortal = isInPortal(c);
		}
	}
}
