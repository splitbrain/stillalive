/**
 * The Sparkle object and its helper functions.
 */

import { Direction, GRAVITY, SparkleType } from '../constants.js';
import { getTile } from '../physics.js';
import { game } from '../state.js';
import { Tile } from '../tiles.js';
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
 * Create the glow sparkles along a portal. The glow sparkles of the earlier portal with the same index go away.
 *
 * @param {number} p The portal index, 0 for blue and 1 for red.
 * @returns {void}
 */
export function createPortalGlow(p) {
	const portal = game.portals[p];
	const onSideWall = portal.direction == Direction.LEFT || portal.direction == Direction.RIGHT;
	removeSparkles(p, SparkleType.PORTAL_GLOW);
	for (let i = 0; i < 13; i++) {
		const x = portal.x + (onSideWall ? 0 : (i * 2) << 8);
		const y = portal.y + (onSideWall ? (i * 2) << 8 : 0);
		const s = new Sparkle(SparkleType.PORTAL_GLOW, x, y, 0, 0, 200, p);
		s.xOrig = x;
		s.yOrig = y;
		s.portalNum = p;
		if (portal.direction == Direction.RIGHT) {
			s.vx = -random(128, 384);
			s.xOrig -= 7 << 8;
		} else if (portal.direction == Direction.LEFT) {
			s.vx = random(128, 384);
		} else if (portal.direction == Direction.DOWN) {
			s.vy = -random(128, 384);
			s.yOrig -= 8 << 8;
		} else {
			s.vy = random(128, 384);
		}
		game.sparkles.push(s);
	}
}

/**
 * Move and fade all sparkles for one tick and remove the used up ones.
 *
 * @returns {void}
 */
export function updateSparkles() {
	for (let i = 0; i < game.sparkles.length; i++) {
		game.sparkles[i].move();
		if (game.sparkles[i].fading <= 0) {
			game.sparkles.splice(i, 1);
			i--;
		}
	}
}

/**
 * Create sparkles around a point, for example for a collected cake or for smoke.
 *
 * @param {number} x The x position in 1/256 pixels.
 * @param {number} y The y position in 1/256 pixels.
 * @param {number} type SparkleType.CAKE or SparkleType.SMOKE, which also selects the color.
 * @param {number} number The number of sparkles.
 * @param {number} size The start value of the fade, which also sets the size.
 * @returns {void}
 */
export function createCakeOrSmokeSparkles(x, y, type, number, size) {
	const color = type == SparkleType.CAKE ? 2 : 3;
	for (let k = 0; k < number; k++) {
		game.sparkles.push(
			new Sparkle(
				type,
				x + random(-8 << 8, 8 << 8),
				y + random(-8 << 8, 8 << 8),
				random(-192, 192),
				random(-192, -96),
				size,
				color,
			),
		);
	}
}

/**
 * A particle for a visual effect.
 */
export class Sparkle {
	/**
	 * @param {number} type The sparkle type, a value of SparkleType.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {number} fading The start value of the fade, which also sets the size.
	 * @param {number} color The row of the sparkle image: 0 blue star, 1 red star, 2 cake crumb, 3 smoke, 4 blood.
	 */
	constructor(type, x, y, vx, vy, fading, color) {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = x;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = y;
		/** @type {number} The x position where a portal glow sparkle starts and restarts, in 1/256 pixels. */
		this.xOrig = 0;
		/** @type {number} The y position where a portal glow sparkle starts and restarts, in 1/256 pixels. */
		this.yOrig = 0;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = vx;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = vy;
		/** @type {number} The sparkle type, a value of SparkleType. */
		this.type = type;
		/** @type {number} The row of the sparkle image: 0 blue star, 1 red star, 2 cake crumb, 3 smoke, 4 blood. */
		this.color = color;
		/** @type {number} Ticks since the sparkle landed on the floor, or -1 while it flies. */
		this.floorTime = -1;
		/** @type {number} The remaining visibility, which also sets the size. */
		this.fading = fading;
		/** @type {number} The index of the portal of a portal glow sparkle, or -1. */
		this.portalNum = -1;
	}

	/**
	 * Move and fade the sparkle for one tick. A used up portal glow sparkle starts again at its start position.
	 *
	 * @returns {void}
	 */
	move() {
		let d, sc;
		if (this.type == SparkleType.SHOT_HIT) this.vy += GRAVITY;
		else if (this.type == SparkleType.DEATH || this.type == SparkleType.LOW_LIFE) this.vy += GRAVITY >> 1;

		if (this.floorTime < 0) {
			this.x += this.vx;
			this.y += this.vy;
			sc = this.fading / 255;
		} else {
			if (this.type == SparkleType.LOW_LIFE) {
				this.fading -= 0.7;
				sc = this.fading / 255;
			} else if (this.type == SparkleType.SHOT_HIT) {
				if (++this.floorTime >= 120) this.fading -= 0.7;
				sc = this.fading / 255;
			}
		}

		if (this.type == SparkleType.SHOT_HIT || this.type == SparkleType.DEATH || this.type == SparkleType.LOW_LIFE) {
			if (getTile((this.x >> 8) + ((16 * sc) >> 1), (this.y >> 8) + ((16 * sc) >> 1)) != Tile.EMPTY) {
				if (this.floorTime < 0) {
					if (this.type == SparkleType.LOW_LIFE || this.type == SparkleType.SHOT_HIT) {
						this.floorTime = 0;
					} else {
						this.fading = 0;
					}
				}
			}
		}

		if (this.type == SparkleType.PORTAL_SHOT || this.type == SparkleType.TELEPORT) {
			this.fading -= 8;
			if (getTile((this.x >> 8) + 4, (this.y >> 8) + 4) != Tile.EMPTY) this.fading = 0;
		} else if (this.type == SparkleType.PORTAL_GLOW) {
			if (this.vx != 0) {
				d = Math.abs(this.xOrig - this.x) >> 8;
				this.fading = 200 - 5 * d;
			} else if (this.vy != 0) {
				d = Math.abs(this.yOrig - this.y) >> 8;
				this.fading = 200 - 5 * d;
				const platform = game.portals[this.portalNum].platform;
				if (platform) {
					this.x += platform.vx;
					this.xOrig = this.x;
				}
			}
		} else if (this.type == SparkleType.CAKE || this.type == SparkleType.SMOKE) {
			this.fading -= 8;
		}

		if (this.fading <= 0 && this.type == SparkleType.PORTAL_GLOW) {
			this.x = this.xOrig;
			this.y = this.yOrig;
			this.fading = 200;
		}
	}
}
