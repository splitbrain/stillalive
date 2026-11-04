/**
 * Math and helper functions.
 */

import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from './constants.js';

/**
 * Convert degrees to radians.
 *
 * @param {number} d The angle in degrees.
 * @returns {number} The angle in radians.
 */
export function degToRad(d) {
	return (d * Math.PI) / 180;
}

/**
 * Convert radians to degrees.
 *
 * @param {number} r The angle in radians.
 * @returns {number} The angle in degrees.
 */
export function radToDeg(r) {
	return (r * 180) / Math.PI;
}

/**
 * Get the angle of the line from one point to another.
 *
 * @param {number} x1 The x coordinate of the start point.
 * @param {number} y1 The y coordinate of the start point.
 * @param {number} x2 The x coordinate of the end point.
 * @param {number} y2 The y coordinate of the end point.
 * @returns {number} The angle in radians.
 */
export function getAngle(x1, y1, x2, y2) {
	return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Get the cosine of the direction from the second point to the first point.
 *
 * @param {number} x1 The x coordinate of the first point.
 * @param {number} y1 The y coordinate of the first point.
 * @param {number} x2 The x coordinate of the second point.
 * @param {number} y2 The y coordinate of the second point.
 * @returns {number} The x part of the unit vector from the second point to the first point.
 */
export function getCos(x1, y1, x2, y2) {
	const adj = x1 - x2;
	const opp = y1 - y2;
	const hyp = Math.sqrt(opp * opp + adj * adj);
	const movx = adj / hyp;

	return movx;
}

/**
 * Get the sine of the direction from the second point to the first point.
 *
 * @param {number} x1 The x coordinate of the first point.
 * @param {number} y1 The y coordinate of the first point.
 * @param {number} x2 The x coordinate of the second point.
 * @param {number} y2 The y coordinate of the second point.
 * @returns {number} The y part of the unit vector from the second point to the first point.
 */
export function getSin(x1, y1, x2, y2) {
	const adj = x1 - x2;
	const opp = y1 - y2;
	const hyp = Math.sqrt(opp * opp + adj * adj);
	const movy = opp / hyp;

	return movy;
}

/**
 * Check if a point is inside the playfield.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} 1 if the point is inside the 512 x 384 pixels of the playfield, else 0.
 */
export function inScreen(x, y) {
	if (x < 0 || x >= PLAYFIELD_WIDTH) return 0;
	if (y < 0 || y >= PLAYFIELD_HEIGHT) return 0;
	return 1;
}

/**
 * Get the distance between two points.
 *
 * @param {number} x1 The x coordinate of the first point.
 * @param {number} y1 The y coordinate of the first point.
 * @param {number} x2 The x coordinate of the second point.
 * @param {number} y2 The y coordinate of the second point.
 * @returns {number} The distance.
 */
export function getDistance(x1, y1, x2, y2) {
	const adj = x1 - x2;
	const opp = y1 - y2;
	return Math.sqrt(opp * opp + adj * adj);
}

/**
 * Get a random integer.
 *
 * @param {number} min The smallest possible value.
 * @param {number} max The upper limit, excluded.
 * @returns {number} A random integer from min to max - 1.
 */
export function random(min, max) {
	const randomnumber = Math.floor(Math.random() * (max - min)) + min;
	return randomnumber;
}
