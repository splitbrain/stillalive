/**
 * The Sparkle object and its helper functions.
 */

import { Direction, GRAVITY, SparkleType } from '../constants.js';
import { Tile } from '../tiles.js';
import { random } from '../utils.js';

/**
 * Remove the sparkles of one type and color.
 *
 * @param {import('../World.js').World} world The World.
 * @param {number} p The color index.
 * @param {number} type The sparkle type, a value of SparkleType.
 * @returns {void}
 */
export function removeSparkles(world, p, type) {
	world.sparkles = world.sparkles.filter((sparkle) => sparkle.type !== type || sparkle.color !== p);
}

/**
 * Create the glow sparkles along a portal. The glow sparkles of the earlier portal with the same index go away.
 *
 * @param {import('../World.js').World} world The World.
 * @param {number} p The portal index, 0 for blue and 1 for red.
 * @returns {void}
 */
export function createPortalGlow(world, p) {
	const portal = world.portals.list[p];
	const onSideWall = portal.direction === Direction.LEFT || portal.direction === Direction.RIGHT;
	removeSparkles(world, p, SparkleType.PORTAL_GLOW);
	for (let i = 0; i < 13; i++) {
		const x = portal.x + (onSideWall ? 0 : (i * 2) << 8);
		const y = portal.y + (onSideWall ? (i * 2) << 8 : 0);
		const s = new Sparkle(world, SparkleType.PORTAL_GLOW, x, y, 0, 0, 200, p);
		s.xOrig = x;
		s.yOrig = y;
		s.portalNum = p;
		switch (portal.direction) {
			case Direction.RIGHT:
				s.vx = -random(128, 384);
				s.xOrig -= 7 << 8;
				break;
			case Direction.LEFT:
				s.vx = random(128, 384);
				break;
			case Direction.DOWN:
				s.vy = -random(128, 384);
				s.yOrig -= 8 << 8;
				break;
			default:
				s.vy = random(128, 384);
				break;
		}
		world.sparkles.push(s);
	}
}

/**
 * Create sparkles around a point, for example for a collected cake or for smoke.
 *
 * @param {import('../World.js').World} world The World.
 * @param {number} x The x position in 1/256 pixels.
 * @param {number} y The y position in 1/256 pixels.
 * @param {number} type SparkleType.CAKE or SparkleType.SMOKE, which also selects the color.
 * @param {number} number The number of sparkles.
 * @param {number} size The start value of the fade, which also sets the size.
 * @returns {void}
 */
export function createCakeOrSmokeSparkles(world, x, y, type, number, size) {
	const color = type === SparkleType.CAKE ? 2 : 3;
	for (let k = 0; k < number; k++) {
		world.sparkles.push(
			new Sparkle(
				world,
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
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} type The sparkle type, a value of SparkleType.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {number} fading The start value of the fade, which also sets the size.
	 * @param {number} color The row of the sparkle image: 0 blue star, 1 red star, 2 cake crumb, 3 smoke, 4 blood.
	 */
	constructor(world, type, x, y, vx, vy, fading, color) {
		/** @type {import('../World.js').World} The World of the object. */
		this.world = world;
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
	 * Fade a portal glow sparkle with its distance from the portal. On a floor portal, the sparkle moves with the
	 * platform of the portal.
	 *
	 * @returns {void}
	 */
	#glow() {
		if (this.vx !== 0) {
			this.fading = 200 - 5 * (Math.abs(this.xOrig - this.x) >> 8);
		} else if (this.vy !== 0) {
			this.fading = 200 - 5 * (Math.abs(this.yOrig - this.y) >> 8);
			const platform = this.world.portals.list[this.portalNum].platform;
			if (platform) {
				this.x += platform.vx;
				this.xOrig = this.x;
			}
		}
	}

	/**
	 * Move and fade the sparkle for one tick. A used up portal glow sparkle starts again at its start position.
	 *
	 * @returns {void}
	 */
	move() {
		if (this.type === SparkleType.SHOT_HIT) this.vy += GRAVITY;
		else if (this.type === SparkleType.DEATH || this.type === SparkleType.LOW_LIFE) this.vy += GRAVITY >> 1;

		if (this.floorTime < 0) {
			this.x += this.vx;
			this.y += this.vy;
		} else if (this.type === SparkleType.LOW_LIFE) {
			this.fading -= 0.7;
		} else if (this.type === SparkleType.SHOT_HIT && ++this.floorTime >= 120) {
			this.fading -= 0.7;
		}

		if (this.type === SparkleType.SHOT_HIT || this.type === SparkleType.DEATH || this.type === SparkleType.LOW_LIFE) {
			const scale = this.fading / 255;
			const onFloor =
				this.world.getTile((this.x >> 8) + ((16 * scale) >> 1), (this.y >> 8) + ((16 * scale) >> 1)) !== Tile.EMPTY;
			// blood stays on the floor for a while, the other sparkles go away
			if (onFloor && this.floorTime < 0) {
				if (this.type === SparkleType.LOW_LIFE || this.type === SparkleType.SHOT_HIT) this.floorTime = 0;
				else this.fading = 0;
			}
		}

		switch (this.type) {
			case SparkleType.PORTAL_SHOT:
			case SparkleType.TELEPORT:
				this.fading -= 8;
				if (this.world.getTile((this.x >> 8) + 4, (this.y >> 8) + 4) !== Tile.EMPTY) this.fading = 0;
				break;
			case SparkleType.PORTAL_GLOW:
				this.#glow();
				break;
			case SparkleType.CAKE:
			case SparkleType.SMOKE:
				this.fading -= 8;
				break;
		}

		if (this.fading <= 0 && this.type === SparkleType.PORTAL_GLOW) {
			this.x = this.xOrig;
			this.y = this.yOrig;
			this.fading = 200;
		}
	}
}
