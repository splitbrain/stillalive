/**
 * The kinds of sparkles.
 */

import { GRAVITY } from '../constants.js';
import { Tile } from '../tiles.js';
import { toPixels } from '../utils.js';
import { Sparkle } from './Sparkle.js';

/** @type {number} The row of the blood drop in the sparkle image. */
const BLOOD_COLOR = 4;
/** @type {number} The fade of a fading star or a puff in each tick. */
const FADE_STEP = 8;
/** @type {number} The fade of a blood drop on the floor in each tick. */
const BLOOD_FADE_STEP = 0.7;
/** @type {number} The fade of a portal glow sparkle at its start position. */
const GLOW_FADING = 200;

/**
 * Check if a falling sparkle touches a solid tile or object with its middle. The size of the sparkle follows its fade.
 *
 * @param {Sparkle} sparkle The sparkle.
 * @returns {boolean} True if the middle of the sparkle is on a solid tile or object.
 */
function touchesFloor(sparkle) {
	const scale = sparkle.fading / 255;
	const half = (16 * scale) >> 1;
	return sparkle.world.getTile(toPixels(sparkle.x) + half, toPixels(sparkle.y) + half) !== Tile.EMPTY;
}

/**
 * A star that fades by 8 in each tick and goes away on a solid tile or object.
 */
export class FadingSparkle extends Sparkle {
	/**
	 * Move the star, fade it, and remove it on a solid tile or object.
	 *
	 * @returns {void}
	 */
	move() {
		super.move();
		this.fading -= FADE_STEP;
		if (this.world.getTile(toPixels(this.x) + 4, toPixels(this.y) + 4) !== Tile.EMPTY) this.fading = 0;
	}
}

/**
 * A star along the path of a portal shot, in the color of the portal.
 */
export class PortalShotSparkle extends FadingSparkle {}

/**
 * A star around the player after a teleport, in the color of the entry portal.
 */
export class TeleportSparkle extends FadingSparkle {}

/**
 * A cake crumb of a collected cake or a smoke puff. It fades by 8 in each tick.
 */
export class PuffSparkle extends Sparkle {
	/** @type {number} The color of a cake crumb. */
	static CAKE = 2;
	/** @type {number} The color of a smoke puff. */
	static SMOKE = 3;

	/**
	 * Move and fade the puff.
	 *
	 * @returns {void}
	 */
	move() {
		super.move();
		this.fading -= FADE_STEP;
	}
}

/**
 * A blood drop that falls, waits on the floor and then fades. The drawing shows it 8 pixels higher and to the
 * left. The subclasses set the gravity and the wait on the floor.
 */
export class BloodSparkle extends Sparkle {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {number} fading The start value of the fade, which also sets the size.
	 * @param {number} gravity The increase of the vertical speed in each tick, in 1/256 pixels per tick.
	 * @param {number} floorWait The number of ticks from the landing to the start of the fade, at least 1.
	 */
	constructor(world, x, y, vx, vy, fading, gravity, floorWait) {
		super(world, x, y, vx, vy, fading, BLOOD_COLOR);
		/** @type {number} The increase of the vertical speed in each tick, in 1/256 pixels per tick. */
		this.gravity = gravity;
		/** @type {number} The number of ticks from the landing to the start of the fade, at least 1. */
		this.floorWait = floorWait;
		/** @type {number} Ticks since the drop landed on the floor, or -1 while it falls. */
		this.floorTime = -1;
		this.drawOffset = -8;
	}

	/**
	 * Let the drop fall until it touches the floor. On the floor, the drop stays and fades after its wait.
	 *
	 * @returns {void}
	 */
	move() {
		this.vy += this.gravity;
		if (this.floorTime < 0) {
			super.move();
			if (touchesFloor(this)) this.floorTime = 0;
		} else if (++this.floorTime >= this.floorWait) {
			this.fading -= BLOOD_FADE_STEP;
		}
	}
}

/**
 * A blood drop of a turret shot that hits the player. It falls fast and stays 120 ticks on the floor.
 */
export class ShotHitSparkle extends BloodSparkle {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {number} fading The start value of the fade, which also sets the size.
	 */
	constructor(world, x, y, vx, vy, fading) {
		super(world, x, y, vx, vy, fading, GRAVITY, 120);
	}
}

/**
 * A blood drop of a player with low life. It falls slowly and fades from the tick after its landing on.
 */
export class LowLifeSparkle extends BloodSparkle {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {number} fading The start value of the fade, which also sets the size.
	 */
	constructor(world, x, y, vx, vy, fading) {
		super(world, x, y, vx, vy, fading, GRAVITY >> 1, 1);
	}
}

/**
 * A blood drop of the death of the player. It falls and goes away on the floor.
 */
export class DeathSparkle extends Sparkle {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {number} fading The start value of the fade, which also sets the size.
	 */
	constructor(world, x, y, vx, vy, fading) {
		super(world, x, y, vx, vy, fading, BLOOD_COLOR);
	}

	/**
	 * Let the drop fall, and remove it on the floor.
	 *
	 * @returns {void}
	 */
	move() {
		this.vy += GRAVITY >> 1;
		super.move();
		if (touchesFloor(this)) this.fading = 0;
	}
}

/**
 * A sparkle that moves away from a portal and fades with its distance from the portal. A used up sparkle starts again
 * at its start position.
 */
export class PortalGlow extends Sparkle {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} vx The horizontal speed in 1/256 pixels per tick.
	 * @param {number} vy The vertical speed in 1/256 pixels per tick.
	 * @param {number} startX The x position where the sparkle starts again, in 1/256 pixels.
	 * @param {number} startY The y position where the sparkle starts again, in 1/256 pixels.
	 * @param {number} portalIndex The index of the portal, 0 for blue and 1 for red, which also sets the color.
	 */
	constructor(world, x, y, vx, vy, startX, startY, portalIndex) {
		super(world, x, y, vx, vy, GLOW_FADING, portalIndex);
		/** @type {number} The x position where the sparkle starts again, in 1/256 pixels. */
		this.startX = startX;
		/** @type {number} The y position where the sparkle starts again, in 1/256 pixels. */
		this.startY = startY;
		/** @type {number} The index of the portal, 0 for blue and 1 for red. */
		this.portalIndex = portalIndex;
	}

	/**
	 * Move the sparkle and fade it with its distance from the portal. A used up sparkle starts again.
	 *
	 * @returns {void}
	 */
	move() {
		super.move();
		this.#glow();
		if (this.fading <= 0) {
			this.x = this.startX;
			this.y = this.startY;
			this.fading = GLOW_FADING;
		}
	}

	/**
	 * Fade the sparkle with its distance from the portal. On a floor portal, the sparkle moves with the platform of the
	 * portal.
	 *
	 * @returns {void}
	 */
	#glow() {
		if (this.vx !== 0) {
			this.fading = GLOW_FADING - 5 * toPixels(Math.abs(this.startX - this.x));
		} else if (this.vy !== 0) {
			this.fading = GLOW_FADING - 5 * toPixels(Math.abs(this.startY - this.y));
			const platform = this.world.portals.list[this.portalIndex].platform;
			if (platform) {
				this.x += platform.vx;
				this.startX = this.x;
			}
		}
	}
}
