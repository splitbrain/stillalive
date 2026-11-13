/**
 * The GravPipeField object and its helper functions.
 */

import { Direction, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../constants.js';
import { getTileWithoutCrates, getTileWithoutObjects } from '../physics.js';
import { otherPortal, pointInPortal } from '../portals.js';
import { game } from '../state.js';
import { Tile } from '../tiles.js';

/**
 * The area in front of a gravitational pipe that moves objects. rebuildGravPipeFields() builds the fields again in
 * each tick.
 */
class GravPipeField {
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
 * Find the pipe fields that an object overlaps.
 *
 * @param {import('./Body.js').Body} obj The object.
 * @returns {GravPipeField[]} The fields.
 */
export function gravPipeFieldsAt(obj) {
	let i;
	const fields = new Array();

	for (i = 0; i < game.gravPipeFields.length; i++) {
		let x = game.gravPipeFields[i].x;
		let y = game.gravPipeFields[i].y;
		let w = game.gravPipeFields[i].w;
		let h = game.gravPipeFields[i].h;

		if (w < 0) {
			w = -w;
			x -= w;
		} else if (h < 0) {
			h = -h;
			y -= h;
		}

		if (obj.overlapsBox(x, y, w, h)) {
			fields.push(game.gravPipeFields[i]);
		}
	}

	return fields;
}

/**
 * Build the pipe fields of all gravitational pipes again. A field reaches from the gravitational pipe to the first
 * wall or platform. At a portal, the field continues from the other portal.
 *
 * @returns {void}
 */
export function rebuildGravPipeFields() {
	if (game.gravPipes.length == 0) return;
	game.gravPipeFields = new Array();
	for (const t of game.gravPipes) {
		let vx = 0;
		let vy = 0;
		if (t.dir == Direction.RIGHT) vx = 1;
		else if (t.dir == Direction.LEFT) vx = -1;
		else if (t.dir == Direction.UP) vy = -1;
		else if (t.dir == Direction.DOWN) vy = 1;
		traceGravPipeField(t.x >> 8, t.y >> 8, vx, vy);
	}
}

/**
 * Find the end of a pipe field and add the field. At a portal, the trace continues from the other portal with a
 * second field. The trace leaves each portal only once, so the field between two facing portals ends.
 *
 * @param {number} sx The x coordinate of the gravitational pipe in pixels.
 * @param {number} sy The y coordinate of the gravitational pipe in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
 * @returns {void}
 */
function traceGravPipeField(sx, sy, vx, vy) {
	let tile, p1, p2;
	const exits = [];
	let y = sy;
	let x = sx;

	x += vx * TILE_SIZE;
	y += vy * TILE_SIZE;

	while (x >= 0 && x < PLAYFIELD_WIDTH && y >= 0 && y < PLAYFIELD_HEIGHT) {
		if (vx != 0) {
			tile = getTileWithoutObjects(x, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + TILE_SIZE / 2);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + TILE_SIZE);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + 2 * TILE_SIZE - 1);
		} else if (vy != 0) {
			tile = getTileWithoutCrates(x, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + TILE_SIZE / 2, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + TILE_SIZE, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + 2 * TILE_SIZE - 1, y);
		}

		if (tile != Tile.EMPTY) {
			x = (x >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
			y = (y >> TILE_SIZE_BITS) << TILE_SIZE_BITS;

			addField(sx, sy, x, y, vx, vy);
			if (vx < 0) x += 13;

			if (game.portals && game.portals[0].used && game.portals[1].used) {
				if (vx != 0) {
					p1 = pointInPortal(x, y + 4);
					p2 = pointInPortal(x, y + 2 * TILE_SIZE - 4);
				} else if (vy != 0) {
					const dy = vy < 0 ? 14 : 0;
					p1 = pointInPortal(x + 4, y + dy);
					p2 = pointInPortal(x + 2 * TILE_SIZE - 4, y + dy);
				}
				const exit = p1 && p1 == p2 ? otherPortal(p1) : null;
				if (exit && !exits.includes(exit)) {
					exits.push(exit);
					if (exit.direction == Direction.RIGHT) {
						sx = exit.x >> 8;
						sy = exit.y >> 8;
						vx = -1;
						vy = 0;
						y = sy;
						x = sx;
					} else if (exit.direction == Direction.LEFT) {
						sx = (exit.x >> 8) + 3;
						sy = exit.y >> 8;
						vx = 1;
						vy = 0;
						y = sy;
						x = sx;
					} else if (exit.direction == Direction.UP) {
						sx = exit.x >> 8;
						sy = exit.y >> 8;
						vx = 0;
						vy = 1;
						y = sy + 3;
						x = sx;
					} else if (exit.direction == Direction.DOWN) {
						sx = exit.x >> 8;
						sy = exit.y >> 8;
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
		x += vx * TILE_SIZE;
		y += vy * TILE_SIZE;
	}
	addField(sx, sy, x, y, vx, vy);
}

/**
 * Add the pipe field from a gravitational pipe to the end of its trace.
 *
 * @param {number} sx The x coordinate of the gravitational pipe in pixels.
 * @param {number} sy The y coordinate of the gravitational pipe in pixels.
 * @param {number} nx The x coordinate where the field ends in pixels.
 * @param {number} ny The y coordinate where the field ends in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
 * @returns {void}
 */
function addField(sx, sy, nx, ny, vx, vy) {
	if (vx < 0) game.gravPipeFields.push(new GravPipeField(sx, sy, -(sx - nx - TILE_SIZE), 2 * TILE_SIZE, -1, 0));
	else if (vx > 0) game.gravPipeFields.push(new GravPipeField(sx, sy, nx - sx, 2 * TILE_SIZE, 1, 0));
	else if (vy < 0) game.gravPipeFields.push(new GravPipeField(sx, sy, 2 * TILE_SIZE, -(sy - ny - TILE_SIZE), 0, -1));
	else if (vy > 0) game.gravPipeFields.push(new GravPipeField(sx, sy, 2 * TILE_SIZE, ny - sy, 0, 1));
}
