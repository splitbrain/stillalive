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
import { Direction, GRAVITY, MouseButton, PLAYFIELD_HEIGHT, SparkleType, TILE_SIZE } from '../constants.js';
import { Body } from './Body.js';
import { collectCakes } from './Cake.js';
import { Platform } from './Platform.js';
import { Sparkle } from './Sparkle.js';
import { reportBrokenReplay } from '../inputState.js';
import { input } from '../state.js';
import { isTileKind, TileKind } from '../tiles.js';
import { getDistance, random } from '../utils.js';

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
		/** @type {number} 1 while the player holds the left key. */
		this.isLeft = 0;
		/** @type {number} 1 while the player holds the right key. */
		this.isRight = 0;
		/** @type {number} The value of isJump in the last tick. */
		this.oldIsJump = 0;
		/** @type {number} 1 while the player holds the jump key. */
		this.isJump = 0;
		/** @type {number} 1 while the player holds the down key. */
		this.isDown = 0;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} 1 when the player faces right, -1 when the player faces left. */
		this.flip = 1;
		/** @type {number} Ticks since the last portal shot, up to 25. A new shot is possible at 25. */
		this.portalCooldown = 25;
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
		this.life = 100 << 8;
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
	 * During a replay, a death ends the replay as broken.
	 *
	 * @returns {void}
	 */
	checkDeath() {
		if (this.life <= 0 && !this.dead) {
			if (this.world.replayMode) {
				reportBrokenReplay();
				return;
			}

			this.dead = true;
			this.life = -256;
			playSound(this.inAcid ? sfx_acid : sfx_die);
			if (this.y >> 8 < PLAYFIELD_HEIGHT) {
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
		} else if (this.dead) {
			if (this.life >= 0) this.world.outcome = 'died';
		}
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
			if (random(0, 2) == 0) s.vx = -s.vx;
			if (random(0, 2) == 0) s.vy = -s.vy;
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
		this.teleportTime = entry == this.world.portals.list[0] ? 42 : -42;
		super.teleported(entry, exit);
	}

	/**
	 * Pick up a crate or turret under the mouse while the left button is pressed, and throw the carried object when the
	 * button is released. A grab searches the crates first and then the turrets.
	 *
	 * @returns {void}
	 */
	#grabObject() {
		if (!this.carrying) {
			if (input.mousePressed && input.mouseButton == MouseButton.LEFT) {
				this.carrying = this.#grabbableIn(this.world.crates) ?? this.#grabbableIn(this.world.turrets);
				if (this.carrying) playSound(sfx_pickUp);
			}
		} else if (!input.mousePressed) {
			this.carrying.thrown();
			this.carrying = null;
			playSound(sfx_throwObject);
		}
	}

	/**
	 * Find the object under the mouse that the player can pick up.
	 *
	 * @param {import('./Throwable.js').Throwable[]} objects The objects to search.
	 * @returns {import('./Throwable.js').Throwable|null} The first object near the player under the mouse, or null.
	 */
	#grabbableIn(objects) {
		const x = this.midX();
		const y = this.midY();
		for (const obj of objects) {
			if (
				obj.canGrab() &&
				getDistance(obj.midX(), obj.midY(), x, y) < 2 * TILE_SIZE &&
				obj.contains(input.mouseX, input.mouseY)
			)
				return obj;
		}
		return null;
	}

	/**
	 * Update the player for one tick from the input and the level objects.
	 *
	 * @returns {void}
	 */
	move() {
		let fi, i;
		const portals = this.world.portals;
		if (this.teleportTime < 0) {
			if (++this.teleportTime < 0 && this.teleportTime % 6 == 0) this.#teleportSparkles(3, 200, 0);
		} else if (this.teleportTime > 0) {
			if (--this.teleportTime > 0 && this.teleportTime % 6 == 0) this.#teleportSparkles(5, 255, 1);
		}

		if (this.askClear) {
			portals.clearPortals();
			this.askClear = false;
		}

		const fields = this.world.gravPipeFieldsAt(this);
		if (fields.length > 0) {
			this.vx = 0;
			this.vy = 0;
			playLoop(sfx_float);
		}
		for (i = 0; i < fields.length; i++) {
			const field = fields[i];
			if (fields.length == 1) {
				if (field.vx != 0) {
					if (portals.portalAt(this, Direction.UP) || portals.portalAt(this, Direction.DOWN)) {
						if (this.y >> 8 < field.y) this.y += 768;
						else if ((this.y >> 8) + this.pY > field.y + 2 * TILE_SIZE) this.y -= 768;
					} else if (this.y >> 8 < field.y) this.y += 512;
					else if ((this.y >> 8) + this.pY > field.y + 2 * TILE_SIZE) this.y -= 512;
				} else if (field.vy != 0) {
					// the height pY centers the player on the x axis, in the same way as moveObject()
					if (this.x >> 8 < field.x + (TILE_SIZE - (this.pY >> 1))) this.x += 256;
					else if ((this.x >> 8) + this.pX > field.x + 2 * TILE_SIZE - (TILE_SIZE - (this.pY >> 1))) this.x -= 256;
				}
			}

			this.vx += field.vx * 384;
			this.vy += field.vy * 384;

			if (field.vx != 0) {
				if (this.isJump) {
					this.y -= 3 << 8;
					fi = this.world.gravPipeFieldsAt(this);
					if (fi.length == 0) {
						this.vy = -800;
						this.vx = field.vx << 9;
					}
				}
				if (this.isDown) this.y += 3 << 8;
			}

			if (field.vy != 0) {
				if (this.isLeft) {
					this.x -= 3 << 8;
					fi = this.world.gravPipeFieldsAt(this);
					if (fi.length == 0) {
						this.vx = -384;
					}
				}
				if (this.isRight) {
					this.x += 3 << 8;
					fi = this.world.gravPipeFieldsAt(this);
					if (fi.length == 0) {
						this.vx = 384;
					}
				}
			}
		}

		let ground = this.touchingGround();
		if (ground && !this.onGround && fields.length == 0) playSound(sfx_land);
		this.onGround = ground > 0;
		const belt = this.world.onBelt(this);
		this.x += belt == 3 ? 384 : belt == 4 ? -384 : 0;

		this.animationTime -= 1 + 2 * (1 - (ground == 2 ? 1 : 0));
		if (this.animationTime <= 0) {
			this.animationTime = 10;
			if (++this.animationFrame == 5) this.animationFrame = 1;
			if (ground && this.isLeft != this.isRight && this.animationFrame % 2 == 1) {
				const steps = ground == 2 ? sfx_iceStep : sfx_step;
				playSound(steps[random(0, steps.length)], randomRate(0.08));
			}
		}

		if (++this.portalCooldown > 25) this.portalCooldown = 25;

		if (this.recoveryTime > 0) {
			this.recoveryTime--;
		}

		if (this.recoveryTime == 0 && this.life < 100 << 8) {
			if ((this.life += 256) > 100 << 8) this.life = 100 << 8;
		}

		if (this.life <= 50 << 8) {
			const h = this.life >> 8;
			const r = this.world.time % h;

			for (i = 0; r == 0 && i < 3; i++) {
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

		let dir = (this.isRight - this.isLeft) * 128;

		//jump handling
		if (this.isJump && ground && !portals.portalAt(this, Direction.DOWN) && fields.length == 0) {
			this.vy = -1300;
			playSound(sfx_jump);
		} else if (!this.isJump && this.oldIsJump && this.vy < -200) {
			this.vy = -200;
		}

		if (this.vx > 0) {
			if (ground == 1 && !portals.portalAt(this, Direction.LEFT)) {
				this.world.steps += this.vx >> 4;
				this.vx -= 64;
			} else {
				this.vx -= ground == 2 ? 14 : 28;
			}
			if (this.vx < 0) this.vx = 0;
		} else if (this.vx < 0) {
			if (ground == 1 && !portals.portalAt(this, Direction.RIGHT)) {
				this.world.steps -= this.vx >> 4;
				this.vx += 64;
			} else {
				this.vx += ground == 2 ? 14 : 28;
			}
			if (this.vx > 0) this.vx = 0;
		}

		if (dir == 0 && ground) this.animationFrame = 0;

		if (fields.length == 0) {
			if (
				this.vx > 448 &&
				ground == 1 &&
				!portals.portalAt(this, Direction.LEFT) &&
				!portals.portalAt(this, Direction.RIGHT)
			)
				this.vx = 448;
			else if (
				this.vx < -448 &&
				ground == 1 &&
				!portals.portalAt(this, Direction.LEFT) &&
				!portals.portalAt(this, Direction.RIGHT)
			)
				this.vx = -448;
			if (
				this.vx > 672 &&
				ground > 1 &&
				!portals.portalAt(this, Direction.LEFT) &&
				!portals.portalAt(this, Direction.RIGHT)
			)
				this.vx = 672;
			else if (
				this.vx < -672 &&
				ground > 1 &&
				!portals.portalAt(this, Direction.LEFT) &&
				!portals.portalAt(this, Direction.RIGHT)
			)
				this.vx = -672;
		}

		if (!ground || portals.portalAt(this, Direction.DOWN)) {
			if (fields.length == 0) this.vy += GRAVITY;
			dir = Math.trunc(dir * 0.28);
			if (this.vy > (10 << 8) + 128) this.vy = (10 << 8) + 128;
		}

		if (fields.length == 0) {
			if (ground != 2) this.vx += dir;
			else if (ground == 2) this.vx += dir >> 2;
		}

		for (i = 0; i < 8; i++) {
			if (!portals.passPortal(this, Direction.DOWN) && !portals.passPortal(this, Direction.UP)) this.x += this.vx >> 3;
			if (!portals.passPortal(this, Direction.LEFT) && !portals.passPortal(this, Direction.RIGHT))
				this.y += this.vy >> 3;
		}

		const platform = this.world.onPlatform(this);
		if (platform) this.x += platform.vx;

		let col = true;
		while (col && !portals.isInPortal(this)) {
			col = this.checkCollisions();
		}

		if (portals.portalAt(this, Direction.UP) && this.vy > 0) {
			if (this.downCollision()) this.vy = -this.vy;
		} else if (portals.portalAt(this, Direction.DOWN) && this.vy < 0) {
			if (this.upCollision()) this.vy = -this.vy;
		}

		collectCakes(this.world);
		this.#grabObject();
		portals.clearPortalsAtForceField();

		if (this.world.abilities.portals) {
			if (input.mousePressed && this.portalCooldown == 25 && !portals.isInPortal(this) && !this.carrying) {
				if (input.mouseButton == MouseButton.LEFT) {
					portals.launchPortal(0, input.mouseX, input.mouseY);
				} else if (input.mouseButton == MouseButton.RIGHT) {
					portals.launchPortal(1, input.mouseX, input.mouseY);
				}
			}
		}

		const colLeft = this.leftCollision();
		const colRight = this.rightCollision();
		if (colLeft && colRight && !portals.isInPortal(this)) {
			if (colLeft instanceof Platform || colRight instanceof Platform) {
				this.life = 0;
			}
		}

		const deadly = this.touchesDeadlyTile();
		this.inAcid = isTileKind(deadly, TileKind.ACID, TileKind.ACIDPOOL);
		if (this.world.plasmaTouching(this) || deadly) {
			this.life = 0;
		}

		if (this.y > (PLAYFIELD_HEIGHT + 40) << 8) this.life = 0;
		this.oldIsJump = this.isJump;
		this.checkDeath();
	}
}
