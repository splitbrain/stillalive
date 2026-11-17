/**
 * The Throwable object.
 */

import { Body } from './Body.js';
import { BELT_SPEED, Direction, GRAVITY, Ground, PIPE_SPEED, TILE_SIZE } from '../constants.js';
import { getCos, getSin, toPixels, toSubpixels } from '../utils.js';

/**
 * A body that the player can pick up and throw. The base of Crate and Turret.
 */
export class Throwable extends Body {
	/**
	 * @param {import('../world/World.js').World} world The World of the body.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} width The width in pixels.
	 * @param {number} height The height in pixels.
	 */
	constructor(world, x, y, width, height) {
		super(world, x, y, width, height);
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} The rotation in degrees while the body flies. */
		this.angle = 0;
	}

	/**
	 * True while the player carries the body.
	 *
	 * @type {boolean}
	 */
	get carried() {
		return this.world.player.carrying === this;
	}

	/**
	 * Check if the player can pick up the body.
	 *
	 * @returns {boolean} True if the body can go into the hands of the player.
	 */
	canGrab() {
		return true;
	}

	/**
	 * Set the state of the body after the player throws it. The base class has no such state.
	 *
	 * @returns {void}
	 */
	thrown() {}

	/**
	 * Set the state of the body when a pipe field moves it. The base class has no such state.
	 *
	 * @returns {void}
	 */
	enterPipeField() {}

	/**
	 * Give the body the speed of the conveyor belt that it left. The base class keeps the speed.
	 *
	 * @param {number} belt The direction of the conveyor belt under the body: 1 to the right, -1 to the left, 0 for
	 *     none.
	 * @returns {void}
	 */
	// eslint-disable-next-line no-unused-vars
	keepBeltSpeed(belt) {}

	/**
	 * Check if the body falls onto the head of the player.
	 *
	 * @returns {boolean} True if the body must stop above the player.
	 */
	landsOnPlayer() {
		return false;
	}

	/**
	 * Push the player and other bodies in one step of the movement.
	 *
	 * @returns {boolean} True if the push ends the movement of this tick.
	 */
	push() {
		return false;
	}

	/**
	 * Hold the body in front of the player, in the direction of the mouse. The body also gets the speed for the
	 * throw.
	 *
	 * @returns {void}
	 */
	place() {
		const portals = this.world.portals;
		const x = this.world.player.x + (toSubpixels(this.world.player.width) >> 1);
		const y = this.world.player.y + (toSubpixels(this.world.player.height) >> 1);

		this.x = x - (toSubpixels(this.width) >> 1);
		this.y = y - (toSubpixels(this.height) >> 1);

		const { mouseX, mouseY } = this.world.input;
		const cos = getCos(mouseX, mouseY, toPixels(x), toPixels(y));
		const sin = getSin(mouseX, mouseY, toPixels(x), toPixels(y));

		this.vx = cos * toSubpixels(TILE_SIZE);
		this.vy = sin * toSubpixels(TILE_SIZE);

		for (let step = 0; step < 2; step++) {
			this.x += this.vx >> 1;
			this.y += this.vy >> 1;

			if (
				!portals.passPortal(this, Direction.LEFT) &&
				!portals.passPortal(this, Direction.DOWN) &&
				!portals.passPortal(this, Direction.UP) &&
				!portals.passPortal(this, Direction.RIGHT)
			) {
				this.checkCollisions();
			}
		}

		this.vx = (cos * toSubpixels(30)) >> 2;
		this.vy = (sin * toSubpixels(30)) >> 2;
	}

	/**
	 * Move the body towards the middle of a pipe field. In a floor or ceiling portal, the body moves faster.
	 *
	 * @param {import('./GravPipeField.js').GravPipeField} field The pipe field.
	 * @returns {void}
	 */
	#centerInField(field) {
		const portals = this.world.portals;
		if (field.vx !== 0) {
			if (portals.portalAt(this, Direction.UP) || portals.portalAt(this, Direction.DOWN)) {
				if (this.pixelY < field.y) this.y += toSubpixels(3);
				else if (this.pixelY + this.height > field.y + 2 * TILE_SIZE) this.y -= toSubpixels(3);
			} else {
				const margin = TILE_SIZE - (this.height >> 1);
				if (this.pixelY < field.y + margin) this.y += toSubpixels(2);
				else if (this.pixelY + this.height > field.y + 2 * TILE_SIZE - margin) this.y -= toSubpixels(2);
			}
		} else if (field.vy !== 0) {
			const margin = TILE_SIZE - (this.width >> 1);
			if (this.pixelX < field.x + margin) this.x += toSubpixels(1);
			else if (this.pixelX + this.width > field.x + 2 * TILE_SIZE - margin) this.x -= toSubpixels(1);
		}
	}

	/**
	 * Move the body for one tick with the pipe fields, the conveyor belts, the gravity, the friction and the portals.
	 *
	 * @returns {void}
	 */
	move() {
		const portals = this.world.portals;
		const fields = this.world.gravPipeFieldsAt(this);
		for (const field of fields) {
			this.#centerInField(field);
			this.vx = field.vx * PIPE_SPEED;
			this.vy = field.vy * PIPE_SPEED;

			this.enterPipeField();
		}

		const belt = this.world.beltUnder(this);
		if (belt !== 0) {
			this.x += BELT_SPEED * belt;
			this.vx = 8 * belt;
		}
		this.keepBeltSpeed(belt);

		const inLeftPortal = portals.portalAt(this, Direction.LEFT);
		const inRightPortal = portals.portalAt(this, Direction.RIGHT);

		const ground = this.touchingGround();

		if (ground === Ground.AIR || portals.portalAt(this, Direction.DOWN)) {
			if (fields.length === 0) this.vy += GRAVITY;
			this.vy = Math.min(this.vy, toSubpixels(10));
		}

		if (this.vy === 0 && this.vx === 0) return;

		// the friction on the ground is higher than in the air
		const grounded = ground !== Ground.AIR;
		if (this.vx > 0) this.vx = Math.max(this.vx - (grounded && !inLeftPortal ? 64 : 10), 0);
		else if (this.vx < 0) this.vx = Math.min(this.vx + (grounded && !inRightPortal ? 64 : 10), 0);

		if (this.vx > 512 && ground === Ground.FLOOR && !inLeftPortal) this.vx = 512;
		else if (this.vx < -512 && ground === Ground.FLOOR && !inRightPortal) this.vx = -512;

		for (let j = 0; j < 8; j++) {
			if (!portals.passPortal(this, Direction.DOWN) && !portals.passPortal(this, Direction.UP)) this.x += this.vx >> 3;
			if (
				!portals.passPortal(this, Direction.LEFT) &&
				!portals.passPortal(this, Direction.RIGHT) &&
				!this.landsOnPlayer()
			) {
				this.y += this.vy >> 3;
			}

			if (this.push()) break;
		}

		while (!portals.isInPortal(this)) {
			if (!this.checkCollisions()) break;
		}
	}
}
