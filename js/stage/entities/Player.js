/**
 * The Player object and its helper functions.
 */

import {
	playLoop,
	playSound,
	randomRate,
	sfx_acid,
	sfx_die,
	sfx_float,
	sfx_iceStep,
	sfx_jump,
	sfx_land,
	sfx_pickUp,
	sfx_step,
	sfx_throwObject,
} from '../audio.js';
import {
	BELT_SPEED,
	DEATH_FADE,
	Direction,
	GRAVITY,
	Ground,
	MouseButton,
	PIPE_SPEED,
	PLAYFIELD_HEIGHT,
	SparkleType,
	TILE_SIZE,
} from '../constants.js';
import { Body } from './Body.js';
import { Platform } from './Platform.js';
import { Sparkle } from './Sparkle.js';
import { isTileKind, TileKind } from '../tiles.js';
import { getDistance, random } from '../utils.js';

/** @type {number} The full life in 1/256 life points. */
const MAX_LIFE = 100 << 8;
/** @type {number} The ticks from one portal shot until the next shot is possible. */
const PORTAL_COOLDOWN = 25;

/**
 * The player.
 */
export class Player extends Body {
	/**
	 * Create the player at the origin with full life.
	 *
	 * @param {import('../World.js').World} world The World of the object.
	 */
	constructor(world) {
		super(world, 0, 0, 15, 27);
		/** @type {boolean} True while the player holds the left key. */
		this.left = false;
		/** @type {boolean} True while the player holds the right key. */
		this.right = false;
		/** @type {boolean} The value of jump in the last tick. */
		this.oldJump = false;
		/** @type {boolean} True while the player holds the jump key. */
		this.jump = false;
		/** @type {boolean} True while the player holds the down key. */
		this.down = false;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} 1 when the player faces right, -1 when the player faces left. */
		this.flip = 1;
		/** @type {number} Ticks since the last portal shot, up to PORTAL_COOLDOWN. A new shot is possible then. */
		this.portalCooldown = PORTAL_COOLDOWN;
		/**
		 * @type {number} Counts to 0 after a teleport, from 42 after an entry into the blue portal and from -42 after an
		 * entry into the red portal. The sign selects the color of the sparkles.
		 */
		this.teleportTime = 0;
		/** @type {number} The countdown to the next frame of the walk animation. */
		this.animationTime = 10;
		/** @type {number} The frame of the walk animation: 0 is the standing frame, 1 to 4 are the walk cycle. */
		this.animationFrame = 0;
		/** @type {boolean} True if the player stood on the ground at the start of the last tick. */
		this.onGround = false;
		/** @type {boolean} True while the player touches acid. */
		this.inAcid = false;
		/** @type {number} The life in 1/256 points. Full life is 100 points. */
		this.life = MAX_LIFE;
		/** @type {boolean} True while the player is dead and the screen fades to the restart. */
		this.dead = false;
		/** @type {number} Ticks until the life starts to recover after damage. */
		this.recoveryTime = 0;
		/** @type {import('./Throwable.js').Throwable|null} The crate or turret that the player carries, or null. */
		this.carrying = null;
		/** @type {boolean} True when the player pressed the clear key and the portals must go away in the next tick. */
		this.askClear = false;
	}

	/**
	 * Kill the player when the life is used up. The outcome "died" asks for a restart when the death fade is complete.
	 * During a replay, a death sets the outcome "brokenReplay".
	 *
	 * @returns {void}
	 */
	checkDeath() {
		if (this.dead) {
			if (this.life >= 0) this.world.outcome = 'died';
			return;
		}
		if (this.life > 0) return;
		if (this.world.replaying) {
			this.world.outcome = 'brokenReplay';
			return;
		}

		this.dead = true;
		this.life = -DEATH_FADE;
		playSound(this.inAcid ? sfx_acid : sfx_die);
		// below the playfield, the death shows no blood
		if (this.y >> 8 >= PLAYFIELD_HEIGHT) return;
		for (let i = 0; i < 20; i++) {
			this.world.sparkles.push(
				new Sparkle(
					this.world,
					SparkleType.DEATH,
					this.x + (this.pX << 7) + random(-14 << 8, 8 << 8),
					this.y + (this.pY << 6),
					0,
					random(-2 << 8, 0),
					150,
					4,
				),
			);
		}
	}

	/**
	 * Take all life after a hit by the boss or a razor wheel. The death follows in checkDeath().
	 *
	 * @returns {void}
	 */
	takeFatalHit() {
		this.life = -200;
		this.recoveryTime = 180;
	}

	/**
	 * Create the teleport sparkles around the player.
	 *
	 * @param {number} number The number of sparkles.
	 * @param {number} fading The start value of the fade, which also sets the size.
	 * @param {number} color The color index.
	 * @returns {void}
	 */
	#teleportSparkles(number, fading, color) {
		for (let n = 0; n < number; n++) {
			const s = new Sparkle(
				this.world,
				SparkleType.TELEPORT,
				this.x + (this.pX << 7) + random(-8 << 8, 8 << 8),
				this.y + (this.pY << 7) + random(-16 << 8, 16 << 8),
				random(32, 64),
				random(32, 64),
				fading,
				color,
			);
			if (random(0, 2) === 0) s.vx = -s.vx;
			if (random(0, 2) === 0) s.vy = -s.vy;
			this.world.sparkles.push(s);
		}
	}

	/**
	 * Turn the speed after a teleport, and start the teleport sparkles in the color of the entry portal.
	 *
	 * @param {import('./Portal.js').Portal} entry The portal that the player entered.
	 * @param {import('./Portal.js').Portal} exit The portal that the player came out of.
	 * @returns {void}
	 */
	teleported(entry, exit) {
		this.teleportTime = entry === this.world.portals.list[0] ? 42 : -42;
		super.teleported(entry, exit);
	}

	/**
	 * Pick up a crate or turret under the mouse while the left button is pressed, and throw the carried object when the
	 * button is released. A grab searches the crates first and then the turrets.
	 *
	 * @returns {void}
	 */
	#grabObject() {
		const input = this.world.input;
		if (this.carrying) {
			if (input.mousePressed) return;
			this.carrying.thrown();
			this.carrying = null;
			playSound(sfx_throwObject);
			return;
		}
		if (!input.mousePressed || input.mouseButton !== MouseButton.LEFT) return;
		this.carrying = this.#grabbableIn(this.world.crates) ?? this.#grabbableIn(this.world.turrets);
		if (this.carrying) playSound(sfx_pickUp);
	}

	/**
	 * Find the object under the mouse that the player can pick up.
	 *
	 * @param {import('./Throwable.js').Throwable[]} objects The objects to search.
	 * @returns {import('./Throwable.js').Throwable|null} The first object near the player under the mouse, or null.
	 */
	#grabbableIn(objects) {
		const input = this.world.input;
		const x = this.midX();
		const y = this.midY();
		return (
			objects.find(
				(obj) =>
					obj.canGrab() &&
					getDistance(obj.midX(), obj.midY(), x, y) < 2 * TILE_SIZE &&
					obj.contains(input.mouseX, input.mouseY),
			) ?? null
		);
	}

	/**
	 * Count the teleport time towards 0 and create the teleport sparkles at every sixth tick. The sign of the time
	 * selects the color of the sparkles.
	 *
	 * @returns {void}
	 */
	#updateTeleportSparkles() {
		if (this.teleportTime < 0) {
			this.teleportTime++;
			if (this.teleportTime < 0 && this.teleportTime % 6 === 0) this.#teleportSparkles(3, 200, 0);
		} else if (this.teleportTime > 0) {
			this.teleportTime--;
			if (this.teleportTime > 0 && this.teleportTime % 6 === 0) this.#teleportSparkles(5, 255, 1);
		}
	}

	/**
	 * Check if the player is outside of all pipe fields.
	 *
	 * @returns {boolean} True if no pipe field holds the player.
	 */
	#outOfFields() {
		return this.world.gravPipeFieldsAt(this).length === 0;
	}

	/**
	 * Move the player towards the middle of a pipe field. In a floor or ceiling portal, the player moves faster.
	 *
	 * @param {import('./GravPipeField.js').GravPipeField} field The pipe field.
	 * @returns {void}
	 */
	#centerInField(field) {
		const portals = this.world.portals;
		if (field.vx !== 0) {
			const step = portals.portalAt(this, Direction.UP) || portals.portalAt(this, Direction.DOWN) ? 768 : 512;
			if (this.y >> 8 < field.y) this.y += step;
			else if ((this.y >> 8) + this.pY > field.y + 2 * TILE_SIZE) this.y -= step;
		} else if (field.vy !== 0) {
			// the height pY centers the player on the x axis, in the same way as moveObject()
			const margin = TILE_SIZE - (this.pY >> 1);
			if (this.x >> 8 < field.x + margin) this.x += 256;
			else if ((this.x >> 8) + this.pX > field.x + 2 * TILE_SIZE - margin) this.x -= 256;
		}
	}

	/**
	 * Push the player with a pipe field. In a horizontal field, the jump key jumps out and the down key moves down. In
	 * a vertical field, the left and right keys move the player out to the side.
	 *
	 * @param {import('./GravPipeField.js').GravPipeField} field The pipe field.
	 * @param {boolean} alone True if this is the only field that holds the player.
	 * @returns {void}
	 */
	#floatInField(field, alone) {
		if (alone) this.#centerInField(field);

		this.vx += field.vx * PIPE_SPEED;
		this.vy += field.vy * PIPE_SPEED;

		if (field.vx !== 0) {
			if (this.jump) {
				this.y -= 3 << 8;
				if (this.#outOfFields()) {
					this.vy = -800;
					this.vx = field.vx << 9;
				}
			}
			if (this.down) this.y += 3 << 8;
		}

		if (field.vy !== 0) {
			if (this.left) {
				this.x -= 3 << 8;
				if (this.#outOfFields()) this.vx = -PIPE_SPEED;
			}
			if (this.right) {
				this.x += 3 << 8;
				if (this.#outOfFields()) this.vx = PIPE_SPEED;
			}
		}
	}

	/**
	 * Advance the walk animation and play the step sounds.
	 *
	 * @param {number} ground The ground from touchingGround(), a value of Ground.
	 * @returns {void}
	 */
	#animateWalk(ground) {
		// on ice, the walk animation is slower
		this.animationTime -= ground === Ground.ICE ? 1 : 3;
		if (this.animationTime > 0) return;
		this.animationTime = 10;
		if (++this.animationFrame === 5) this.animationFrame = 1;
		if (ground !== Ground.AIR && this.left !== this.right && this.animationFrame % 2 === 1) {
			const steps = ground === Ground.ICE ? sfx_iceStep : sfx_step;
			playSound(steps[random(0, steps.length)], randomRate(0.08));
		}
	}

	/**
	 * Let the life recover after the recovery time, and let the player bleed while the life is low.
	 *
	 * @returns {void}
	 */
	#updateLife() {
		if (this.recoveryTime > 0) this.recoveryTime--;
		if (this.recoveryTime === 0 && this.life < MAX_LIFE) this.life = Math.min(this.life + 256, MAX_LIFE);

		// below half of the life, the player bleeds
		if (this.life > MAX_LIFE >> 1 || this.world.time % (this.life >> 8) !== 0) return;
		for (let i = 0; i < 3; i++) {
			this.world.sparkles.push(
				new Sparkle(
					this.world,
					SparkleType.LOW_LIFE,
					this.x + (this.pX << 5) + random(-5 << 8, 5 << 8),
					this.y + (this.pY << 6) + random(-5 << 8, 5 << 8),
					0,
					0,
					100,
					4,
				),
			);
		}
	}

	/**
	 * Slow the player down with the friction of the ground or the air. Steps on normal ground count for the
	 * statistics.
	 *
	 * @param {number} ground The ground from touchingGround(), a value of Ground.
	 * @returns {void}
	 */
	#applyFriction(ground) {
		const portals = this.world.portals;
		if (this.vx > 0) {
			if (ground === Ground.FLOOR && !portals.portalAt(this, Direction.LEFT)) {
				this.world.steps += this.vx >> 4;
				this.vx -= 64;
			} else {
				this.vx -= ground === Ground.ICE ? 14 : 28;
			}
			if (this.vx < 0) this.vx = 0;
		} else if (this.vx < 0) {
			if (ground === Ground.FLOOR && !portals.portalAt(this, Direction.RIGHT)) {
				this.world.steps -= this.vx >> 4;
				this.vx += 64;
			} else {
				this.vx += ground === Ground.ICE ? 14 : 28;
			}
			if (this.vx > 0) this.vx = 0;
		}
	}

	/**
	 * Limit the walk speed on the ground. Ice and conveyor belts allow a higher speed. In a side portal, the speed has
	 * no limit.
	 *
	 * @param {number} ground The ground from touchingGround(), a value of Ground.
	 * @returns {void}
	 */
	#limitSpeed(ground) {
		const portals = this.world.portals;
		if (ground === Ground.AIR || portals.portalAt(this, Direction.LEFT) || portals.portalAt(this, Direction.RIGHT)) {
			return;
		}
		const max = ground === Ground.FLOOR ? 448 : 672;
		this.vx = Math.max(-max, Math.min(this.vx, max));
	}

	/**
	 * Shoot a portal with the mouse: the left button shoots the blue portal, the right button the red portal.
	 *
	 * @returns {void}
	 */
	#shootPortal() {
		const input = this.world.input;
		const portals = this.world.portals;
		if (!this.world.abilities.portals || !input.mousePressed || this.portalCooldown !== PORTAL_COOLDOWN) return;
		if (portals.isInPortal(this) || this.carrying) return;
		if (input.mouseButton === MouseButton.LEFT) portals.launchPortal(0, input.mouseX, input.mouseY);
		else if (input.mouseButton === MouseButton.RIGHT) portals.launchPortal(1, input.mouseX, input.mouseY);
	}

	/**
	 * Check if a platform crushes the player against a wall.
	 *
	 * @returns {boolean} True if the player is squeezed between two solid sides and one of them is a platform.
	 */
	#crushedByPlatform() {
		const left = this.leftCollision();
		const right = this.rightCollision();
		return (
			Boolean(left && right) &&
			!this.world.portals.isInPortal(this) &&
			(left instanceof Platform || right instanceof Platform)
		);
	}

	/**
	 * Update the player for one tick from the input and the level objects.
	 *
	 * @returns {void}
	 */
	move() {
		const portals = this.world.portals;
		this.#updateTeleportSparkles();

		if (this.askClear) {
			portals.clearPortals();
			this.askClear = false;
		}

		const fields = this.world.gravPipeFieldsAt(this);
		const floating = fields.length > 0;
		if (floating) {
			this.vx = 0;
			this.vy = 0;
			playLoop(sfx_float);
		}
		for (const field of fields) this.#floatInField(field, fields.length === 1);

		const ground = this.touchingGround();
		const grounded = ground !== Ground.AIR;
		if (grounded && !this.onGround && !floating) playSound(sfx_land);
		this.onGround = grounded;
		this.x += BELT_SPEED * this.world.beltUnder(this);

		this.#animateWalk(ground);
		this.portalCooldown = Math.min(this.portalCooldown + 1, PORTAL_COOLDOWN);
		this.#updateLife();

		let dir = (this.right ? 128 : 0) - (this.left ? 128 : 0);

		if (this.jump && grounded && !portals.portalAt(this, Direction.DOWN) && !floating) {
			this.vy = -1300;
			playSound(sfx_jump);
		} else if (!this.jump && this.oldJump && this.vy < -200) {
			// a short press of the jump key gives a low jump
			this.vy = -200;
		}

		this.#applyFriction(ground);
		if (dir === 0 && grounded) this.animationFrame = 0;
		if (!floating) this.#limitSpeed(ground);

		if (!grounded || portals.portalAt(this, Direction.DOWN)) {
			if (!floating) this.vy += GRAVITY;
			// in the air, the keys steer less
			dir = Math.trunc(dir * 0.28);
			this.vy = Math.min(this.vy, (10 << 8) + 128);
		}

		// on ice, the keys steer less
		if (!floating) this.vx += ground === Ground.ICE ? dir >> 2 : dir;

		for (let i = 0; i < 8; i++) {
			if (!portals.passPortal(this, Direction.DOWN) && !portals.passPortal(this, Direction.UP)) this.x += this.vx >> 3;
			if (!portals.passPortal(this, Direction.LEFT) && !portals.passPortal(this, Direction.RIGHT)) {
				this.y += this.vy >> 3;
			}
		}

		const platform = this.world.onPlatform(this);
		if (platform) this.x += platform.vx;

		while (!portals.isInPortal(this)) {
			if (!this.checkCollisions()) break;
		}

		if (
			(portals.portalAt(this, Direction.UP) && this.vy > 0 && this.downCollision()) ||
			(portals.portalAt(this, Direction.DOWN) && this.vy < 0 && this.upCollision())
		) {
			this.vy = -this.vy;
		}

		this.world.collectCakes();
		this.#grabObject();
		portals.clearPortalsAtForceField();
		this.#shootPortal();

		if (this.#crushedByPlatform()) this.life = 0;

		const deadly = this.touchesDeadlyTile();
		this.inAcid = isTileKind(deadly, TileKind.ACID, TileKind.ACIDPOOL);
		if (this.world.plasmaTouching(this) || deadly) this.life = 0;

		if (this.y > (PLAYFIELD_HEIGHT + 40) << 8) this.life = 0;
		this.oldJump = this.jump;
		this.checkDeath();
	}
}
