/**
 * The Sparkle object.
 */

import { GRAVITY, SparkleType } from '../constants.js';
import { Tile } from '../tiles.js';
import { toPixels } from '../utils.js';

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
		this.startX = 0;
		/** @type {number} The y position where a portal glow sparkle starts and restarts, in 1/256 pixels. */
		this.startY = 0;
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
		this.portalIndex = -1;
	}

	/**
	 * Fade a portal glow sparkle with its distance from the portal. On a floor portal, the sparkle moves with the
	 * platform of the portal.
	 *
	 * @returns {void}
	 */
	#glow() {
		if (this.vx !== 0) {
			this.fading = 200 - 5 * toPixels(Math.abs(this.startX - this.x));
		} else if (this.vy !== 0) {
			this.fading = 200 - 5 * toPixels(Math.abs(this.startY - this.y));
			const platform = this.world.portals.list[this.portalIndex].platform;
			if (platform) {
				this.x += platform.vx;
				this.startX = this.x;
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
				this.world.getTile(toPixels(this.x) + ((16 * scale) >> 1), toPixels(this.y) + ((16 * scale) >> 1)) !==
				Tile.EMPTY;
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
				if (this.world.getTile(toPixels(this.x) + 4, toPixels(this.y) + 4) !== Tile.EMPTY) this.fading = 0;
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
			this.x = this.startX;
			this.y = this.startY;
			this.fading = 200;
		}
	}
}
