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
} from '../browser/audio.js';
import {
	BELT_SPEED,
	DEATH_FADE,
	Direction,
	DIRECTIONS,
	GRAVITY,
	Ground,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	MouseButton,
	PIPE_SPEED,
	PLAYFIELD_HEIGHT,
	TILE_SIZE,
} from '../constants.js';
import { MovingBody } from './MovingBody.js';
import { Platform } from './Platform.js';
import { DeathSparkle, LowLifeSparkle, TeleportSparkle } from '../effects/sparkles.js';
import { isTileKind, TileKind } from '../map/tiles.js';
import { getDistance, random, toSubpixels } from '../utils.js';

/** @type {number} The full life in 1/256 life points. */
const MAX_LIFE = 100 * 256;
/** @type {number} The ticks from one portal shot until the next shot is possible. */
const PORTAL_COOLDOWN = 25;
/** @type {number} The speed of the player at a launch start in 1/256 pixels per tick. */
const LAUNCH_SPEED = 2400;

/**
 * The player.
 */
export class Player extends MovingBody {
	/**
	 * Create the player at the origin with full life.
	 *
	 * @param {import('../world/World.js').World} world The World of the body.
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
		/** @type {number} 1 when the player faces right, -1 when the player faces left. */
		this.facing = 1;
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
		this.frame = 0;
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
	 * Set the control flags from the keys of the tick. The player jumps only with the jump ability and outside a
	 * portal.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The keys of the tick and of the previous tick.
	 * @returns {void}
	 */
	readInput(input) {
		if (input.clearPressed) this.askClear = true;

		this.left = (input.keys & KEY_LEFT) !== 0;
		this.right = (input.keys & KEY_RIGHT) !== 0;
		this.down = (input.keys & KEY_DOWN) !== 0;

		if (input.keys & KEY_JUMP && this.world.abilities.jump && !this.world.portals.isInPortal(this)) {
			if (!(input.oldKeys & KEY_JUMP)) this.oldJump = this.jump;
			this.jump = true;
		}
		if (!(input.keys & KEY_JUMP)) {
			if (input.oldKeys & KEY_JUMP) this.oldJump = this.jump;
			this.jump = false;
		}
	}

	/**
	 * Run one tick while the level time runs: the living player moves, the dead player fades out, and the player turns
	 * to the mouse.
	 *
	 * @returns {void}
	 */
	move() {
		if (!this.dead) this.#moveAlive();
		this.idle();
	}

	/**
	 * Run one tick while the level time stands still: the dead player fades out, and the player turns to the mouse.
	 *
	 * @returns {void}
	 */
	idle() {
		if (this.dead) this.#advanceDeathFade();
		this.#faceMouse();
	}

	/**
	 * Take the shot of a turret: the player loses 2.5 life points and gets a push.
	 *
	 * @param {number} direction The direction of the shot, -1 left or 1 right.
	 * @returns {void}
	 */
	shot(direction) {
		this.life -= 640;
		this.recoveryTime = 300;
		this.vx += toSubpixels(direction);
	}

	/**
	 * Move with a crate that pushes the player sideways, but not into a wall.
	 *
	 * @param {number} speed The horizontal speed of the crate in 1/256 pixels per tick.
	 * @returns {boolean} True if a wall stopped the player.
	 */
	pushed(speed) {
		this.x += speed >> 3;
		if (speed < 0 && this.leftCollision()) {
			while (this.leftCollision()) this.x += 128;
			return true;
		}
		if (speed > 0 && this.rightCollision()) {
			while (this.rightCollision()) this.x -= 128;
			return true;
		}
		return false;
	}

	/**
	 * Take the horizontal speed after the carried crate met another crate.
	 *
	 * @param {number} speed The horizontal speed in 1/256 pixels per tick.
	 * @returns {void}
	 */
	followCarriedCrate(speed) {
		this.vx = speed;
	}

	/**
	 * Start the level with a launch: the player moves one tile back against the launch direction and gets the launch
	 * speed in the launch direction. A start on the edge of the map so puts the player outside the playfield.
	 *
	 * @param {number} direction The direction of the launch, a value of Direction.
	 * @returns {void}
	 */
	launch(direction) {
		const step = DIRECTIONS[direction];
		this.x -= toSubpixels(step.dx * TILE_SIZE);
		this.y -= toSubpixels(step.dy * TILE_SIZE);
		this.vx = step.dx * LAUNCH_SPEED;
		this.vy = step.dy * LAUNCH_SPEED;
	}

	/**
	 * Get the key state for a replay: the control flags that the tick derives from the keys of the previous ticks.
	 *
	 * @returns {number[]} The jump flag, the jump flag of the previous tick and the clear flag, each as 0 or 1.
	 */
	captureKeys() {
		return [this.jump ? 1 : 0, this.oldJump ? 1 : 0, this.askClear ? 1 : 0];
	}

	/**
	 * Restore a key state from captureKeys().
	 *
	 * @param {number[]} state The key state.
	 * @returns {void}
	 */
	restoreKeys(state) {
		this.jump = state[0] === 1;
		this.oldJump = state[1] === 1;
		this.askClear = state[2] === 1;
	}

	/**
	 * Eat the cakes that the player touches.
	 *
	 * @returns {void}
	 */
	#eatCakes() {
		for (const cake of this.world.cakes) {
			if (this.overlaps(cake)) cake.eaten();
		}
	}

	/**
	 * Turn the player to the side of the mouse.
	 *
	 * @returns {void}
	 */
	#faceMouse() {
		this.facing = this.world.input.mouseX > this.midX() ? 1 : -1;
	}

	/**
	 * Let go of a body without a throw. A body that the player does not carry changes nothing.
	 *
	 * @param {import('./Throwable.js').Throwable} body The crate or turret.
	 * @returns {void}
	 */
	release(body) {
		if (this.carrying === body) this.carrying = null;
	}

	/**
	 * Advance the death fade of the dead player for one tick. The end of the fade sets the outcome "died".
	 *
	 * @returns {void}
	 */
	#advanceDeathFade() {
		this.life += 6;
		this.checkDeath();
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
		if (this.pixelY >= PLAYFIELD_HEIGHT) return;
		for (let i = 0; i < 20; i++) {
			this.world.effects.addSparkle(
				new DeathSparkle(
					this.world,
					this.x + (toSubpixels(this.width) >> 1) + random(toSubpixels(-14), toSubpixels(8)),
					this.y + (toSubpixels(this.height) >> 2),
					0,
					random(toSubpixels(-2), 0),
					150,
				),
			);
		}
	}

	/**
	 * Get the life in whole points.
	 *
	 * @returns {number} The life points, rounded down. A dead player has a negative value.
	 */
	get lifePoints() {
		return this.life >> 8;
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
		for (let i = 0; i < number; i++) {
			const sparkle = new TeleportSparkle(
				this.world,
				this.x + (toSubpixels(this.width) >> 1) + random(toSubpixels(-8), toSubpixels(8)),
				this.y + (toSubpixels(this.height) >> 1) + random(toSubpixels(-16), toSubpixels(16)),
				random(32, 64),
				random(32, 64),
				fading,
				color,
			);
			if (random(0, 2) === 0) sparkle.vx = -sparkle.vx;
			if (random(0, 2) === 0) sparkle.vy = -sparkle.vy;
			this.world.effects.addSparkle(sparkle);
		}
	}

	/**
	 * Turn the speed after a teleport, and start the teleport sparkles in the color of the entry portal.
	 *
	 * @param {import('../portals/Portal.js').Portal} entry The portal that the player entered.
	 * @param {import('../portals/Portal.js').Portal} exit The portal that the player came out of.
	 * @returns {void}
	 */
	teleported(entry, exit) {
		this.teleportTime = entry === this.world.portals.list[0] ? 42 : -42;
		super.teleported(entry, exit);
	}

	/**
	 * Pick up a crate or turret under the mouse while the left button is pressed, and throw the carried body when the
	 * button is released. A grab searches the crates first and then the turrets.
	 *
	 * @returns {void}
	 */
	#grabBody() {
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
	 * Find the body under the mouse that the player can pick up.
	 *
	 * @param {import('./Throwable.js').Throwable[]} bodies The bodies to search.
	 * @returns {import('./Throwable.js').Throwable|null} The first body near the player under the mouse, or null.
	 */
	#grabbableIn(bodies) {
		const input = this.world.input;
		const x = this.midX();
		const y = this.midY();
		return (
			bodies.find(
				(body) =>
					body.canGrab() &&
					getDistance(body.midX(), body.midY(), x, y) < 2 * TILE_SIZE &&
					body.contains(input.mouseX, input.mouseY),
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
	 * @param {import('./GravPipe.js').GravPipeField} field The pipe field.
	 * @returns {void}
	 */
	#centerInField(field) {
		const portals = this.world.portals;
		if (field.vx !== 0) {
			const step =
				portals.portalAt(this, Direction.UP) || portals.portalAt(this, Direction.DOWN)
					? toSubpixels(3)
					: toSubpixels(2);
			if (this.pixelY < field.y) this.y += step;
			else if (this.pixelY + this.height > field.y + 2 * TILE_SIZE) this.y -= step;
		} else if (field.vy !== 0) {
			// the margin uses the height of the player also on the x axis; Throwable.#centerInField() uses the width
			const margin = TILE_SIZE - (this.height >> 1);
			if (this.pixelX < field.x + margin) this.x += toSubpixels(1);
			else if (this.pixelX + this.width > field.x + 2 * TILE_SIZE - margin) this.x -= toSubpixels(1);
		}
	}

	/**
	 * Let the player jump up out of a horizontal pipe field, with a push in the direction of the field.
	 *
	 * @param {import('./GravPipe.js').GravPipeField} field The pipe field.
	 * @returns {void}
	 */
	#jumpOutOfField(field) {
		this.vy = -800;
		this.vx = field.vx << 9;
	}

	/**
	 * Push the player with a pipe field. In a horizontal field, the jump key jumps out and the down key moves down. In
	 * a vertical field, the left and right keys move the player out to the side.
	 *
	 * @param {import('./GravPipe.js').GravPipeField} field The pipe field.
	 * @param {boolean} alone True if this is the only field that holds the player.
	 * @returns {void}
	 */
	#floatInField(field, alone) {
		if (alone) this.#centerInField(field);

		this.vx += field.vx * PIPE_SPEED;
		this.vy += field.vy * PIPE_SPEED;

		if (field.vx !== 0) {
			if (this.jump) {
				this.y -= toSubpixels(3);
				if (this.#outOfFields()) this.#jumpOutOfField(field);
			}
			if (this.down) this.y += toSubpixels(3);
		}

		if (field.vy !== 0) {
			if (this.left) {
				this.x -= toSubpixels(3);
				if (this.#outOfFields()) this.vx = -PIPE_SPEED;
			}
			if (this.right) {
				this.x += toSubpixels(3);
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
		if (++this.frame === 5) this.frame = 1;
		if (ground !== Ground.AIR && this.left !== this.right && this.frame % 2 === 1) {
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
		if (this.life > MAX_LIFE >> 1 || this.world.time % this.lifePoints !== 0) return;
		for (let i = 0; i < 3; i++) {
			this.world.effects.addSparkle(
				new LowLifeSparkle(
					this.world,
					this.x + (toSubpixels(this.width) >> 3) + random(toSubpixels(-5), toSubpixels(5)),
					this.y + (toSubpixels(this.height) >> 2) + random(toSubpixels(-5), toSubpixels(5)),
					0,
					0,
					100,
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
		if (input.mouseButton !== MouseButton.LEFT && input.mouseButton !== MouseButton.RIGHT) return;
		this.portalCooldown = 0;
		portals.launchPortal(input.mouseButton === MouseButton.LEFT ? 0 : 1, input.mouseX, input.mouseY);
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
	 * Move the living player for one tick from the input and the level bodies.
	 *
	 * @returns {void}
	 */
	#moveAlive() {
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
		if (dir === 0 && grounded) this.frame = 0;
		if (!floating) this.#limitSpeed(ground);

		if (!grounded || portals.portalAt(this, Direction.DOWN)) {
			if (!floating) this.vy += GRAVITY;
			// in the air, the keys steer less
			dir = Math.trunc(dir * 0.28);
			this.vy = Math.min(this.vy, toSubpixels(10) + 128);
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

		this.#eatCakes();
		this.#grabBody();
		portals.clearPortalsAtForceField();
		this.#shootPortal();

		if (this.#crushedByPlatform()) this.life = 0;

		const deadly = this.touchesDeadlyTile();
		this.inAcid = isTileKind(deadly, TileKind.ACID, TileKind.ACIDPOOL);
		if (this.world.plasmaTouching(this) || deadly) this.life = 0;

		if (this.y > toSubpixels(PLAYFIELD_HEIGHT + 40)) this.life = 0;
		this.oldJump = this.jump;
		this.checkDeath();
	}
}
