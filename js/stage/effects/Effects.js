/**
 * The Effects object.
 */

import { Camera } from './Camera.js';
import { PortalGlow, PuffSparkle } from './sparkles.js';

/** @typedef {import('./Sparkle.js').Sparkle} Sparkle */

/**
 * The visual effects of a World: the sparkles, the security camera and the screen shake. The effects have no
 * influence on the game. They count their time in ticks, so the World updates them in its tick.
 */
export class Effects {
	/** @type {import('../world/World.js').World} The World of the effects. The sparkles and the camera read it. */
	#world;
	/** @type {Sparkle[]} The sparkles. */
	sparkles = [];
	/** @type {Camera|null} The security camera, or null for a preview or an editor map. */
	camera = null;
	/** @type {number} The x shift of the drawing in playfield units: the screen shake of the boss levels, else 0. */
	shakeX = 0;
	/** @type {number} The y shift of the drawing in playfield units: the screen shake of the boss levels, else 0. */
	shakeY = 0;

	/**
	 * Create the effects of a World without sparkles, camera and shake.
	 *
	 * @param {import('../world/World.js').World} world The World of the effects.
	 */
	constructor(world) {
		this.#world = world;
	}

	/**
	 * Add a sparkle.
	 *
	 * @param {Sparkle} sparkle The sparkle.
	 * @returns {void}
	 */
	addSparkle(sparkle) {
		this.sparkles.push(sparkle);
	}

	/**
	 * Remove the sparkles of one kind and color.
	 *
	 * @param {new (...args: any[]) => Sparkle} kind The class of the sparkles, for example PortalGlow.
	 * @param {number} color The color index.
	 * @returns {void}
	 */
	removeSparkles(kind, color) {
		this.sparkles = this.sparkles.filter((sparkle) => !(sparkle instanceof kind) || sparkle.color !== color);
	}

	/**
	 * Create the glow sparkles along a portal. The glow sparkles of the earlier portal with the same index go away.
	 *
	 * @param {number} index The portal index, 0 for blue and 1 for red.
	 * @returns {void}
	 */
	createPortalGlow(index) {
		this.removeSparkles(PortalGlow, index);
		const world = this.#world;
		for (const sparkle of PortalGlow.along(world, world.portals.list[index], index)) this.addSparkle(sparkle);
	}

	/**
	 * Add cake crumbs or smoke puffs around a point.
	 *
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} color The color: PuffSparkle.CAKE or PuffSparkle.SMOKE.
	 * @param {number} number The number of sparkles.
	 * @param {number} size The start value of the fade, which also sets the size.
	 * @returns {void}
	 */
	addPuffSparkles(x, y, color, number, size) {
		for (const sparkle of PuffSparkle.around(this.#world, x, y, color, number, size)) this.addSparkle(sparkle);
	}

	/**
	 * Move all sparkles and remove the faded ones.
	 *
	 * @returns {void}
	 */
	updateSparkles() {
		for (const sparkle of this.sparkles) sparkle.move();
		this.sparkles = this.sparkles.filter((sparkle) => sparkle.fading > 0);
	}

	/**
	 * Create the security camera at a position.
	 *
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @returns {void}
	 */
	startCamera(x, y) {
		this.camera = new Camera(this.#world, x, y);
	}

	/**
	 * Move the security camera for one tick.
	 *
	 * @returns {void}
	 */
	moveCamera() {
		this.camera.move();
	}

	/**
	 * Shift the drawing for the screen shake.
	 *
	 * @param {number} x The x shift in playfield units.
	 * @param {number} y The y shift in playfield units.
	 * @returns {void}
	 */
	shake(x, y) {
		this.shakeX = x;
		this.shakeY = y;
	}

	/**
	 * End the screen shake.
	 *
	 * @returns {void}
	 */
	stopShake() {
		this.shake(0, 0);
	}
}
