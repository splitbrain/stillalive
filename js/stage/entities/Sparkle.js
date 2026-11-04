/**
 * The Sparkle object and its helper functions.
 */

import { GRAVITY, SparkleType } from '../constants.js';
import { getTile } from '../physics.js';
import { game } from '../state.js';
import { random } from '../utils.js';

/**
 * Remove the sparkles of one type and color.
 *
 * @param {number} p The color index.
 * @param {number} type The sparkle type, a value of SparkleType.
 * @returns {void}
 */
export function removeSparkles(p, type) {
	let i;
	for (i = 0; i < game.sparkles.length; i++) {
		if (game.sparkles[i].type == type && game.sparkles[i].color == p) {
			game.sparkles.splice(i, 1);
			i--;
		}
	}
}

/**
 * Move and fade all sparkles for one tick and remove the used up ones.
 *
 * @returns {void}
 */
export function updateSparkles() {
	let d, i, sc;
	for (i = 0; i < game.sparkles.length; i++) {
		const s = game.sparkles[i];
		if (s.type == SparkleType.SHOT_HIT) s.vy += GRAVITY;
		else if (s.type == SparkleType.DEATH || s.type == SparkleType.LOW_LIFE) s.vy += GRAVITY >> 1;

		if (s.floorTime < 0) {
			s.x += s.vx;
			s.y += s.vy;
			sc = s.fading / 255;
		} else {
			if (s.type == SparkleType.LOW_LIFE) {
				s.fading -= 0.7;
				sc = s.fading / 255;
			} else if (s.type == SparkleType.SHOT_HIT) {
				if (++s.floorTime >= 120) s.fading -= 0.7;
				sc = s.fading / 255;
			}
		}

		if (s.type == SparkleType.SHOT_HIT || s.type == SparkleType.DEATH || s.type == SparkleType.LOW_LIFE) {
			if (getTile((s.x >> 8) + ((16 * sc) >> 1), (s.y >> 8) + ((16 * sc) >> 1)) != 0) {
				if (s.floorTime < 0) {
					if (s.type == SparkleType.LOW_LIFE || s.type == SparkleType.SHOT_HIT) {
						s.floorTime = 0;
					} else {
						s.fading = 0;
					}
				}
			}
		}

		if (s.type == SparkleType.PORTAL_SHOT || s.type == SparkleType.TELEPORT) {
			s.fading -= 8;
			if (getTile((s.x >> 8) + 4, (s.y >> 8) + 4) != 0) s.fading = 0;
		} else if (s.type == SparkleType.PORTAL_GLOW) {
			if (s.vx != 0) {
				d = Math.abs(s.xOrig - s.x) >> 8;
				s.fading = 200 - 5 * d;
			} else if (s.vy != 0) {
				d = Math.abs(s.yOrig - s.y) >> 8;
				s.fading = 200 - 5 * d;
				const pi = game.portals[s.portalNum].platformIndex;
				if (pi >= 0) {
					s.x += game.platforms[pi].vx;
					s.xOrig = s.x;
				}
			}
		} else if (s.type == SparkleType.CAKE || s.type == SparkleType.SMOKE) {
			s.fading -= 8;
		}

		if (s.fading <= 0) {
			if (s.type == SparkleType.PORTAL_GLOW) {
				s.x = s.xOrig;
				s.y = s.yOrig;
				s.fading = 200;
			} else {
				game.sparkles.splice(i, 1);
				i--;
			}
		}
	}
}

/**
 * Create sparkles around a point, e.g. for a collected cake or for smoke.
 *
 * @param {number} x The x position in 1/256 pixels.
 * @param {number} y The y position in 1/256 pixels.
 * @param {number} type SparkleType.CAKE or SparkleType.SMOKE, which also selects the color.
 * @param {number} number The number of sparkles.
 * @param {number} size The start value of the fade, which also sets the size.
 * @returns {void}
 */
export function createCakeOrSmokeSparkles(x, y, type, number, size) {
	let k;
	for (k = 0; k < number; k++) {
		const s = new Sparkle();
		s.x = x + random(-8 << 8, 8 << 8);
		s.y = y + random(-8 << 8, 8 << 8);
		s.type = type;
		s.vx = random(-192, 192);
		s.vy = random(-192, -96);
		s.fading = size;
		if (type == SparkleType.CAKE) s.color = 2;
		else if (type == SparkleType.SMOKE) s.color = 3;
		s.portalNum = -1;
		game.sparkles.push(s);
	}
}

/**
 * A particle for the visual effects: portal trails, teleports, deaths, cakes and smoke.
 */
export class Sparkle {
	/**
	 * Create a sparkle at the origin.
	 */
	constructor() {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = 0;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = 0;
		/** @type {number} The x position where a portal glow sparkle starts and restarts, in 1/256 pixels. */
		this.xOrig = 0;
		/** @type {number} The y position where a portal glow sparkle starts and restarts, in 1/256 pixels. */
		this.yOrig = 0;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} The sparkle type, a value of SparkleType. */
		this.type = 0;
		/** @type {number} The color index. */
		this.color = 0;
		/** @type {number} Ticks since the sparkle landed on the floor, or -1 while it flies. */
		this.floorTime = -1;
		/** @type {number} The remaining visibility, which also sets the size; the sparkle goes away at 0. */
		this.fading = 0;
		/** @type {number} The index of the portal of a portal glow sparkle, or -1. */
		this.portalNum = -1;
	}
}
