/**
 * The GravPipeField object and its helper functions.
 */

import { Direction, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../constants.js';
import { Tile } from '../tiles.js';
import { toPixels } from '../utils.js';

/**
 * The area in front of a gravitational pipe that moves objects. The World builds the fields again in each tick.
 */
export class GravPipeField {
	/**
	 * @param {number} x The left edge in pixels.
	 * @param {number} y The top edge in pixels.
	 * @param {number} width The width in pixels.
	 * @param {number} height The height in pixels.
	 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
	 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
	 */
	constructor(x, y, width, height, vx, vy) {
		/** @type {number} The left edge in pixels. */
		this.x = x;
		/** @type {number} The top edge in pixels. */
		this.y = y;
		/** @type {number} The width in pixels. */
		this.width = width;
		/** @type {number} The height in pixels. */
		this.height = height;
		/** @type {number} The horizontal direction of the push, -1, 0 or 1. */
		this.vx = vx;
		/** @type {number} The vertical direction of the push, -1, 0 or 1. */
		this.vy = vy;
	}
}

/** @type {number[]} The offsets of the test points across a pipe field, from its edge in pixels. */
const ACROSS_FIELD = [0, TILE_SIZE / 2, TILE_SIZE, 2 * TILE_SIZE - 1];

/**
 * Check if a pipe field ends at a position: a test point across the field is solid. A horizontal field ends at a tile,
 * a vertical field also ends at a platform.
 *
 * @param {import('../World.js').World} world The World.
 * @param {number} x The x coordinate of the left or top test point in pixels.
 * @param {number} y The y coordinate of the left or top test point in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1. If it is 0, the field is vertical.
 * @returns {boolean} True if the field ends.
 */
function fieldEndsAt(world, x, y, vx) {
	return ACROSS_FIELD.some((offset) =>
		vx === 0
			? world.getTileWithoutCrates(x + offset, y) !== Tile.EMPTY
			: world.getTileWithoutObjects(x, y + offset) !== Tile.EMPTY,
	);
}

/**
 * Find the end of a pipe field and add the field. At a portal, the trace continues from the other portal with a
 * second field. The trace leaves each portal only once, so the field between two facing portals ends.
 *
 * @param {import('../World.js').World} world The World.
 * @param {number} sx The x coordinate of the gravitational pipe in pixels.
 * @param {number} sy The y coordinate of the gravitational pipe in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
 * @returns {void}
 */
export function traceGravPipeField(world, sx, sy, vx, vy) {
	const exits = [];
	let y = sy;
	let x = sx;

	x += vx * TILE_SIZE;
	y += vy * TILE_SIZE;

	while (x >= 0 && x < PLAYFIELD_WIDTH && y >= 0 && y < PLAYFIELD_HEIGHT) {
		if (fieldEndsAt(world, x, y, vx)) {
			x = (x >> TILE_SIZE_BITS) << TILE_SIZE_BITS;
			y = (y >> TILE_SIZE_BITS) << TILE_SIZE_BITS;

			addField(world, sx, sy, x, y, vx, vy);
			if (vx < 0) x += 13;

			if (world.portals.list[0].used && world.portals.list[1].used) {
				const dy = vy < 0 ? 14 : 0;
				const [p1, p2] =
					vx === 0
						? [world.portals.pointInPortal(x + 4, y + dy), world.portals.pointInPortal(x + 2 * TILE_SIZE - 4, y + dy)]
						: [world.portals.pointInPortal(x, y + 4), world.portals.pointInPortal(x, y + 2 * TILE_SIZE - 4)];
				const exit = p1 && p1 === p2 ? world.portals.other(p1) : null;
				if (exit && !exits.includes(exit)) {
					exits.push(exit);
					switch (exit.direction) {
						case Direction.RIGHT:
							sx = toPixels(exit.x);
							sy = toPixels(exit.y);
							vx = -1;
							vy = 0;
							y = sy;
							x = sx;
							break;
						case Direction.LEFT:
							sx = toPixels(exit.x) + 3;
							sy = toPixels(exit.y);
							vx = 1;
							vy = 0;
							y = sy;
							x = sx;
							break;
						case Direction.UP:
							sx = toPixels(exit.x);
							sy = toPixels(exit.y);
							vx = 0;
							vy = 1;
							y = sy + 3;
							x = sx;
							break;
						case Direction.DOWN:
							sx = toPixels(exit.x);
							sy = toPixels(exit.y);
							vx = 0;
							vy = -1;
							y = sy;
							x = sx;
							break;
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
	addField(world, sx, sy, x, y, vx, vy);
}

/**
 * Add the pipe field from a gravitational pipe to the end of its trace.
 *
 * @param {import('../World.js').World} world The World.
 * @param {number} sx The x coordinate of the gravitational pipe in pixels.
 * @param {number} sy The y coordinate of the gravitational pipe in pixels.
 * @param {number} nx The x coordinate where the field ends in pixels.
 * @param {number} ny The y coordinate where the field ends in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
 * @returns {void}
 */
function addField(world, sx, sy, nx, ny, vx, vy) {
	if (vx < 0) world.gravPipeFields.push(new GravPipeField(sx, sy, -(sx - nx - TILE_SIZE), 2 * TILE_SIZE, -1, 0));
	else if (vx > 0) world.gravPipeFields.push(new GravPipeField(sx, sy, nx - sx, 2 * TILE_SIZE, 1, 0));
	else if (vy < 0) world.gravPipeFields.push(new GravPipeField(sx, sy, 2 * TILE_SIZE, -(sy - ny - TILE_SIZE), 0, -1));
	else if (vy > 0) world.gravPipeFields.push(new GravPipeField(sx, sy, 2 * TILE_SIZE, ny - sy, 0, 1));
}
