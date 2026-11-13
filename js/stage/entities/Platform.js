/**
 * The Platform object and its helper functions.
 */

import { Body } from './Body.js';
import { PLAYFIELD_WIDTH, TILE_SIZE } from '../constants.js';
import { crateAt } from './Crate.js';
import { leftCollision, rightCollision, touchingGround } from '../physics.js';
import { game } from '../state.js';
import { CRATE_CODE, PLATFORM_CODE } from '../tiles.js';

/**
 * A moving platform. It turns around at walls and at the edges of the playfield.
 */
export class Platform extends Body {
	/**
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 */
	constructor(x, y, vx, vy) {
		super(x, y, 3 * TILE_SIZE, TILE_SIZE);
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {string} The entity type, used by the shared object functions. */
		this.type = 'platform';
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
		if (
			x < 0 ||
			x > PLAYFIELD_WIDTH - 3 * TILE_SIZE ||
			(this.vx > 0 && rightCollision(this)) ||
			(this.vx < 0 && leftCollision(this))
		) {
			this.vx = -this.vx;
		}
	}
}

/**
 * Find a thing below the feet of an object, first below the left edge, then below the right edge.
 *
 * @param {Body} obj The object.
 * @param {function(number, number): number} find The search at a point in pixels, for example crateAt() or platformAt().
 * @returns {number} The first result that is not 0, or 0.
 */
function findBelow(obj, find) {
	const y = (obj.y >> 8) + obj.pY;
	return find(obj.x >> 8, y) || find((obj.x >> 8) + obj.pX - 1, y);
}

/**
 * Get the conveyor belt that moves an object, directly or through the crate that the object stands on.
 *
 * @param {Body} obj The object.
 * @returns {number} 3 for a belt to the right, 4 for a belt to the left, else 0.
 */
export function onBelt(obj) {
	const ground = touchingGround(obj);
	if (ground == 3 || ground == 4) {
		return ground;
	} else {
		let ci = findBelow(obj, crateAt);
		if (ci) {
			ci -= CRATE_CODE;
			if (game.crates[ci].carpet > 0) return game.crates[ci].carpet;
		}
	}

	return 0;
}

/**
 * Get the platform that carries an object, directly or through the crate that the object stands on.
 *
 * @param {Body} obj The object.
 * @returns {number} The platform code, or 0.
 */
export function onPlatform(obj) {
	let platformCode = findBelow(obj, platformAt);
	if (!platformCode) {
		let ci = findBelow(obj, crateAt);
		if (ci) {
			ci -= CRATE_CODE;
			if (game.crates[ci].platformIndex > -1) platformCode = PLATFORM_CODE + game.crates[ci].platformIndex;
		}
	}

	return platformCode;
}

/**
 * Find the platform at a point.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The platform code of the platform, or 0.
 */
export function platformAt(x, y) {
	let pi;
	for (pi = 0; pi < game.platforms.length; pi++) {
		const x2 = game.platforms[pi].x >> 8;
		const y2 = game.platforms[pi].y >> 8;
		if (x > x2 && x < x2 + 3 * TILE_SIZE && y >= y2 && y < y2 + TILE_SIZE - 1) return PLATFORM_CODE + pi;
	}
	return 0;
}

/**
 * Move the platforms. The platforms stand still during the level transitions.
 *
 * @returns {void}
 */
export function updatePlatforms() {
	if (game.player.fadeNextLevel != -1) return;
	for (const p of game.platforms) p.move();
}
