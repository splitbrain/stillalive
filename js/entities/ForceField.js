/**
 * The ForceField object and its helper functions.
 */

import { Direction, NUM_TILES } from '../constants.js';
import { removeSparkles } from './Sparkle.js';
import { getTileSimple, getTileWithoutCrates, getTileWithoutObjects } from '../physics.js';
import { pointInPortal } from '../portals.js';
import { game } from '../state.js';
import { PLATFORM_CODE, Tile, inForceFieldRange } from '../tiles.js';

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

	for (i = 0; i < game.forceFields.length; i++) {
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

/**
 * Build the force fields of all tunnels again. A field reaches from the tunnel to the first wall or platform. At a
 * portal, the field continues from the other portal.
 *
 * @returns {void}
 */
export function rebuildForceFields() {
	if (game.tunnels.length == 0) return;
	game.forceFields = new Array();
	for (const t of game.tunnels) {
		let vx = 0;
		let vy = 0;
		if (t.dir == Direction.RIGHT) vx = 1;
		else if (t.dir == Direction.LEFT) vx = -1;
		else if (t.dir == Direction.UP) vy = -1;
		else if (t.dir == Direction.DOWN) vy = 1;
		traceTunnelField(t.x >> 8, t.y >> 8, vx, vy);
	}
}

/**
 * Find the end of a tunnel field and add the field. At a portal, the trace continues from the other portal with a
 * second field. The trace leaves each portal only once, so the field between two facing portals ends.
 *
 * @param {number} sx The x coordinate of the tunnel in pixels.
 * @param {number} sy The y coordinate of the tunnel in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
 * @returns {void}
 */
function traceTunnelField(sx, sy, vx, vy) {
	let tile, p1, p2;
	const exits = [];
	let y = sy;
	let x = sx;

	x += vx * 16;
	y += vy * 16;

	while (x >= 0 && x < 512 && y >= 0 && y < 384) {
		if (vx != 0) {
			tile = getTileWithoutObjects(x, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + 8);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + 16);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + 31);
		} else if (vy != 0) {
			tile = getTileWithoutCrates(x, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + 8, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + 16, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + 31, y);
		}

		if (tile != Tile.EMPTY && (tile < NUM_TILES || tile == Tile.TUNNEL_BLOCK || tile >= PLATFORM_CODE)) {
			x = (x >> 4) << 4;
			y = (y >> 4) << 4;

			addField(sx, sy, x, y, vx, vy);
			if (vx < 0) x += 13;

			if (game.portals && game.portals[0].used && game.portals[1].used) {
				if (vx != 0) {
					p1 = pointInPortal(x, y + 4);
					p2 = pointInPortal(x, y + 28);
				} else if (vy != 0) {
					const dy = vy < 0 ? 14 : 0;
					p1 = pointInPortal(x + 4, y + dy);
					p2 = pointInPortal(x + 28, y + dy);
				}
				if (p1 == p2 && p1 > -1 && !exits.includes(p1)) {
					const p = p1;
					exits.push(p);
					if (game.portals[p].direction == Direction.RIGHT) {
						sx = game.portals[p].x >> 8;
						sy = game.portals[p].y >> 8;
						vx = -1;
						vy = 0;
						y = sy;
						x = sx;
					} else if (game.portals[p].direction == Direction.LEFT) {
						sx = (game.portals[p].x >> 8) + 3;
						sy = game.portals[p].y >> 8;
						vx = 1;
						vy = 0;
						y = sy;
						x = sx;
					} else if (game.portals[p].direction == Direction.UP) {
						sx = game.portals[p].x >> 8;
						sy = game.portals[p].y >> 8;
						vx = 0;
						vy = 1;
						y = sy + 3;
						x = sx;
					} else if (game.portals[p].direction == Direction.DOWN) {
						sx = game.portals[p].x >> 8;
						sy = game.portals[p].y >> 8;
						vx = 0;
						vy = -1;
						y = sy;
						x = sx;
					}
				} else {
					return;
				}
			} else {
				return;
			}
		}
		x += vx * 16;
		y += vy * 16;
	}
	addField(sx, sy, x, y, vx, vy);
}

/**
 * Add the force field from a tunnel to the end of its trace.
 *
 * @param {number} sx The x coordinate of the tunnel in pixels.
 * @param {number} sy The y coordinate of the tunnel in pixels.
 * @param {number} nx The x coordinate where the field ends in pixels.
 * @param {number} ny The y coordinate where the field ends in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
 * @returns {void}
 */
function addField(sx, sy, nx, ny, vx, vy) {
	if (vx < 0) game.forceFields.push(new ForceField(sx, sy, -(sx - nx - 16), 32, -1, 0));
	else if (vx > 0) game.forceFields.push(new ForceField(sx, sy, nx - sx, 32, 1, 0));
	else if (vy < 0) game.forceFields.push(new ForceField(sx, sy, 32, -(sy - ny - 16), 0, -1));
	else if (vy > 0) game.forceFields.push(new ForceField(sx, sy, 32, ny - sy, 0, 1));
}
