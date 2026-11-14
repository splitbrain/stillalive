/**
 * The Throwable object.
 */

import { Body } from './Body.js';
import { Direction, GRAVITY, TILE_SIZE } from '../constants.js';
import { getCos, getSin } from '../utils.js';

/**
 * An object that the player can pick up and throw. The base of Crate and Turret.
 */
export class Throwable extends Body {
	/**
	 * @param {import('../World.js').World} world The World of the object.
	 * @param {number} x The x position in 1/256 pixels.
	 * @param {number} y The y position in 1/256 pixels.
	 * @param {number} pX The width in pixels.
	 * @param {number} pY The height in pixels.
	 */
	constructor(world, x, y, pX, pY) {
		super(world, x, y, pX, pY);
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} The rotation in degrees while the object flies. */
		this.angle = 0;
	}

	/**
	 * True while the player carries the object.
	 *
	 * @type {boolean}
	 */
	get carried() {
		return this.world.player.carrying === this;
	}

	/**
	 * Check if the player can pick up the object.
	 *
	 * @returns {boolean} True if the object can go into the hands of the player.
	 */
	canGrab() {
		return true;
	}

	/**
	 * Set the state of the object after the player throws it. The base object has no such state.
	 *
	 * @returns {void}
	 */
	thrown() {}

	/**
	 * Set the state of the object when a pipe field moves it. The base object has no such state.
	 *
	 * @returns {void}
	 */
	enterPipeField() {}

	/**
	 * Give the object the speed of the conveyor belt that it left. The base object keeps its speed.
	 *
	 * @param {number} belt The conveyor belt under the object: 3 to the right, 4 to the left, 0 for none.
	 * @returns {void}
	 */
	// eslint-disable-next-line no-unused-vars
	keepBeltSpeed(belt) {}

	/**
	 * Check if the object falls onto the head of the player.
	 *
	 * @returns {boolean} True if the object must stop above the player.
	 */
	landsOnPlayer() {
		return false;
	}

	/**
	 * Push the player and other objects in one step of the movement.
	 *
	 * @returns {boolean} True if the push ends the movement of this tick.
	 */
	push() {
		return false;
	}

	/**
	 * Hold the object in front of the player, in the direction of the mouse. The object also gets the speed for the
	 * throw.
	 *
	 * @returns {void}
	 */
	place() {
		const portals = this.world.portals;
		const x = this.world.player.x + (this.world.player.pX << 7);
		const y = this.world.player.y + (this.world.player.pY << 7);

		this.x = x - (this.pX << 7);
		this.y = y - (this.pY << 7);

		const { mouseX, mouseY } = this.world.input;
		const cos = getCos(mouseX, mouseY, x >> 8, y >> 8);
		const sin = getSin(mouseX, mouseY, x >> 8, y >> 8);

		this.vx = cos * (TILE_SIZE << 8);
		this.vy = sin * (TILE_SIZE << 8);

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

		this.vx = (cos * (30 << 8)) >> 2;
		this.vy = (sin * (30 << 8)) >> 2;
	}

	/**
	 * Move the object for one tick with the pipe fields, the conveyor belts, the gravity, the friction and the portals.
	 *
	 * @returns {void}
	 */
	move() {
		const portals = this.world.portals;
		const fields = this.world.gravPipeFieldsAt(this);
		for (const field of fields) {
			if (field.vx !== 0) {
				if (portals.portalAt(this, Direction.UP) || portals.portalAt(this, Direction.DOWN)) {
					if (this.y >> 8 < field.y) this.y += 768;
					else if ((this.y >> 8) + this.pY > field.y + 2 * TILE_SIZE) this.y -= 768;
				} else if (this.y >> 8 < field.y + (TILE_SIZE - (this.pY >> 1))) this.y += 512;
				else if ((this.y >> 8) + this.pY > field.y + 2 * TILE_SIZE - (TILE_SIZE - (this.pY >> 1))) this.y -= 512;
			} else if (field.vy !== 0) {
				if (this.x >> 8 < field.x + (TILE_SIZE - (this.pX >> 1))) this.x += 256;
				else if ((this.x >> 8) + this.pX > field.x + 2 * TILE_SIZE - (TILE_SIZE - (this.pX >> 1))) this.x -= 256;
			}

			this.vx = field.vx * 384;
			this.vy = field.vy * 384;

			this.enterPipeField();
		}

		const belt = this.world.onBelt(this);
		if (belt) {
			this.x += belt === 3 ? 384 : belt === 4 ? -384 : 0;
			this.vx = belt === 3 ? 8 : belt === 4 ? -8 : 0;
		}
		this.keepBeltSpeed(belt);

		const inLeftPortal = portals.portalAt(this, Direction.LEFT);
		const inRightPortal = portals.portalAt(this, Direction.RIGHT);

		const ground = this.touchingGround();

		if (!ground || portals.portalAt(this, Direction.DOWN)) {
			if (fields.length === 0) this.vy += GRAVITY;
			if (this.vy > 10 << 8) this.vy = 10 << 8;
		}

		if (this.vy === 0 && this.vx === 0) return;

		if (this.vx > 0) {
			if (ground && !inLeftPortal) this.vx -= 64;
			else this.vx -= 10;
			if (this.vx < 0) this.vx = 0;
		} else if (this.vx < 0) {
			if (ground && !inRightPortal) this.vx += 64;
			else this.vx += 10;
			if (this.vx > 0) this.vx = 0;
		}

		if (this.vx > 512 && ground === 1 && !inLeftPortal) this.vx = 512;
		else if (this.vx < -512 && ground === 1 && !inRightPortal) this.vx = -512;

		for (let j = 0; j < 8; j++) {
			if (!portals.passPortal(this, Direction.DOWN) && !portals.passPortal(this, Direction.UP)) this.x += this.vx >> 3;
			if (
				!portals.passPortal(this, Direction.LEFT) &&
				!portals.passPortal(this, Direction.RIGHT) &&
				!this.landsOnPlayer()
			)
				this.y += this.vy >> 3;

			if (this.push()) break;
		}

		while (!portals.isInPortal(this)) {
			if (!this.checkCollisions()) break;
		}
	}
}
