/**
 * The Platform object and its helper functions.
 */

import { collideCaisse } from './Caisse.js';
import { leftCollision, rightCollision, touchingGround } from '../physics.js';
import { game } from '../state.js';
import { CRATE_CODE, PLATFORM_CODE } from '../tiles.js';

/**
 * A moving platform. It turns around at walls and at the edges of the playfield.
 */
export class Platform {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 */
	constructor(x, y, vx, vy) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The width in pixels. */
		this.pX = 48;
		/** @type {number} The height in pixels. */
		this.pY = 16;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {string} The entity type, used by the shared object functions. */
		this.type = 'plateforme';
		/** @type {number} The direction of the arrow on the platform, 1 right or -1 left. */
		this.dir = vx > 0 ? 1 : -1;
	}

	/**
	 * Move the platform for one tick and turn it around at walls and at the edges of the playfield.
	 *
	 * @returns {void}
	 */
	move() {
		this.x += this.vx;
		const x = this.x >> 8;
		if (x < 0 || x > 512 - 48 || (this.vx > 0 && rightCollision(this)) || (this.vx < 0 && leftCollision(this))) {
			this.vx = -this.vx;
		}
	}
}

/**
 * Get the conveyor belt that moves an object, directly or through the crate that the object stands on.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} 3 for a belt to the right, 4 for a belt to the left, else 0.
 */
export function onCarpet(obj) {
	const toucheSol = touchingGround(obj);
	if (toucheSol == 3 || toucheSol == 4) {
		return toucheSol;
	} else {
		let cai = collideCaisse(obj.x >> 8, (obj.y >> 8) + obj.pY);
		if (!cai) cai = collideCaisse((obj.x >> 8) + obj.pX - 1, (obj.y >> 8) + obj.pY);
		if (cai) {
			cai -= CRATE_CODE;
			if (game.caisses[cai].carpet > 0) return game.caisses[cai].carpet;
		}
	}

	return 0;
}

/**
 * Get the platform that carries an object, directly or through the crate that the object stands on.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} The platform code, or 0.
 */
export function onPlateforme(obj) {
	let plate = collidePlateforme(obj.x >> 8, (obj.y >> 8) + obj.pY);
	if (!plate) plate = collidePlateforme((obj.x >> 8) + obj.pX - 1, (obj.y >> 8) + obj.pY);
	if (!plate) {
		let cai = collideCaisse(obj.x >> 8, (obj.y >> 8) + obj.pY);
		if (!cai) cai = collideCaisse((obj.x >> 8) + obj.pX - 1, (obj.y >> 8) + obj.pY);
		if (cai) {
			cai -= CRATE_CODE;
			if (game.caisses[cai].plateforme > -1) plate = PLATFORM_CODE + game.caisses[cai].plateforme;
		}
	}

	return plate;
}

/**
 * Find the platform at a point.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The platform code of the platform, or 0.
 */
export function collidePlateforme(x, y) {
	let plt;
	for (plt in game.platforms) {
		const x2 = game.platforms[plt].x >> 8;
		const y2 = game.platforms[plt].y >> 8;
		if (x > x2 && x < x2 + 48 && y >= y2 && y < y2 + 15) {
			const ret = parseInt(plt);
			return PLATFORM_CODE + ret;
		}
	}
	return 0;
}
