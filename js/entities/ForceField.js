/**
 * The ForceField object and its helper functions.
 */

import { removeSparkles } from './Sparkle.js';
import { getTileSimple } from '../physics.js';
import { game } from '../state.js';
import { inForceFieldRange } from '../tiles.js';

/**
 * Remove the portals when the player enters a force field.
 *
 * @returns {void}
 */
export function fieldForceTest() {
	if (game.portals[0].used || game.portals[1].used) {
		if (inForceField(game.player)) {
			let i;
			for (i = 0; i < 2; i++) {
				game.portals[i].used = 0;
				removeSparkles(i, 3);
			}
		}
	}
}

/**
 * Check if a force field tile is on the diagonal line through an object.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {boolean} True if the object touches a force field tile.
 */
export function inForceField(obj) {
	let i, j;
	for (i = 0; i <= obj.pY - 1; i += 2) {
		for (j = 0; j <= obj.pX - 1; j += 2) {
			const t = getTileSimple((obj.x >> 8) + j, (obj.y >> 8) + j);
			if (inForceFieldRange(t)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * The area in front of a tunnel that moves objects. drawTunnels() rebuilds the fields in each tick.
 */
export class ForceField {
	/**
	 * @param {number} x The left edge in pixels.
	 * @param {number} y The top edge in pixels.
	 * @param {number} w The width in pixels.
	 * @param {number} h The height in pixels.
	 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
	 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
	 */
	constructor(x, y, w, h, vx, vy) {
		/** @type {number} The left edge in pixels. */
		this.x = x;
		/** @type {number} The top edge in pixels. */
		this.y = y;
		/** @type {number} The height in pixels. */
		this.h = h;
		/** @type {number} The width in pixels. */
		this.w = w;
		/** @type {number} The horizontal direction of the push, -1, 0 or 1. */
		this.vx = vx;
		/** @type {number} The vertical direction of the push, -1, 0 or 1. */
		this.vy = vy;
	}
}

/**
 * Find the tunnel fields that an object overlaps.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number[]} The indexes of the fields in game.forceFields.
 */
export function inForceFieldTp(obj) {
	let i;
	const posx = obj.x >> 8;
	const posy = obj.y >> 8;
	const pX = obj.pX;
	const pY = obj.pY;

	const fields = new Array();

	for (i in game.forceFields) {
		let x = game.forceFields[i].x;
		let y = game.forceFields[i].y;
		let w = game.forceFields[i].w;
		let h = game.forceFields[i].h;

		if (w < 0) {
			w = -w;
			x -= w;
		} else if (h < 0) {
			h = -h;
			y -= h;
		}

		if (posx + pX > x && x + w > posx && posy + pY > y && y + h > posy) {
			fields.push(i);
		}
	}

	return fields;
}
