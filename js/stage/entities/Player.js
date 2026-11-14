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
import { gravPipeFieldsAt } from './GravPipeField.js';
import { plasmaTouching } from './Plasma.js';
import { onBelt, onPlatform, Platform } from './Platform.js';
import { Sparkle } from './Sparkle.js';
import { reportBrokenReplay } from '../inputState.js';
import { loadLevel } from '../level.js';
import {
	checkCollisions,
	downCollision,
	leftCollision,
	rightCollision,
	touchesDeadlyTile,
	touchingGround,
	upCollision,
} from '../physics.js';
import { clearPortals, clearPortalsAtForceField, isInPortal, launchPortal, passPortal, portalAt } from '../portals.js';
import { game, input, ui } from '../state.js';
import { isTileKind, TileKind } from '../tiles.js';
import { getDistance, random } from '../utils.js';

/**
 * The player.
 */
export class Player extends Body {
	/**
	 * Create the player at the origin with full life.
	 */
	constructor() {
		super(0, 0, 15, 27);
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
	 * Kill the player when the life is used up. Restart the level when the death fade is complete. During a replay, a
	 * death ends the replay as broken.
	 *
	 * @returns {void}
	 */
	checkDeath() {
		if (this.life <= 0 && !this.dead) {
			if (game.replayMode) {
				reportBrokenReplay();
				return;
			}

			this.dead = true;
			this.life = -256;
			playSound(this.inAcid ? sfx_acid : sfx_die);
			if (game.player.y >> 8 < PLAYFIELD_HEIGHT) {
				for (let i = 0; i < 20; i++) {
					game.sparkles.push(
						new Sparkle(
							SparkleType.DEATH,
							game.player.x + (this.pX << 7) + random(-14 << 8, 8 << 8),
							game.player.y + (this.pY << 6),
							0,
							random(-2 << 8, 0),
							150,
							4,
						),
					);
				}
			}
		} else if (this.dead) {
			if (this.life >= 0) {
				if (ui.mode == 'play' || ui.mode == 'test') loadLevel(game.level, true);
			}
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
			game.sparkles.push(s);
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
		this.teleportTime = entry == game.portals[0] ? 42 : -42;
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
				this.carrying = this.#grabbableIn(game.crates) ?? this.#grabbableIn(game.turrets);
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
		if (this.teleportTime < 0) {
			if (++this.teleportTime < 0 && this.teleportTime % 6 == 0) this.#teleportSparkles(3, 200, 0);
		} else if (this.teleportTime > 0) {
			if (--this.teleportTime > 0 && this.teleportTime % 6 == 0) this.#teleportSparkles(5, 255, 1);
		}

		if (this.askClear) {
			clearPortals();
			this.askClear = false;
		}

		const fields = gravPipeFieldsAt(this);
		if (fields.length > 0) {
			game.player.vx = 0;
			game.player.vy = 0;
			playLoop(sfx_float);
		}
		for (i = 0; i < fields.length; i++) {
			const field = fields[i];
			if (fields.length == 1) {
				if (field.vx != 0) {
					if (portalAt(this, Direction.UP) || portalAt(this, Direction.DOWN)) {
						if (game.player.y >> 8 < field.y) game.player.y += 768;
						else if ((game.player.y >> 8) + game.player.pY > field.y + 2 * TILE_SIZE) game.player.y -= 768;
					} else if (game.player.y >> 8 < field.y) game.player.y += 512;
					else if ((game.player.y >> 8) + game.player.pY > field.y + 2 * TILE_SIZE) game.player.y -= 512;
				} else if (field.vy != 0) {
					// the height pY centers the player on the x axis, in the same way as moveObject()
					if (game.player.x >> 8 < field.x + (TILE_SIZE - (game.player.pY >> 1))) game.player.x += 256;
					else if (
						(game.player.x >> 8) + game.player.pX >
						field.x + 2 * TILE_SIZE - (TILE_SIZE - (game.player.pY >> 1))
					)
						game.player.x -= 256;
				}
			}

			game.player.vx += field.vx * 384;
			game.player.vy += field.vy * 384;

			if (field.vx != 0) {
				if (this.isJump) {
					game.player.y -= 3 << 8;
					fi = gravPipeFieldsAt(this);
					if (fi.length == 0) {
						game.player.vy = -800;
						game.player.vx = field.vx << 9;
					}
				}
				if (this.isDown) game.player.y += 3 << 8;
			}

			if (field.vy != 0) {
				if (this.isLeft) {
					game.player.x -= 3 << 8;
					fi = gravPipeFieldsAt(this);
					if (fi.length == 0) {
						game.player.vx = -384;
					}
				}
				if (this.isRight) {
					game.player.x += 3 << 8;
					fi = gravPipeFieldsAt(this);
					if (fi.length == 0) {
						game.player.vx = 384;
					}
				}
			}
		}

		let ground = touchingGround(this);
		if (ground && !this.onGround && fields.length == 0) playSound(sfx_land);
		this.onGround = ground > 0;
		const belt = onBelt(this);
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
			const r = game.time % h;

			for (i = 0; r == 0 && i < 3; i++) {
				game.sparkles.push(
					new Sparkle(
						SparkleType.LOW_LIFE,
						game.player.x + (this.pX << 5) + random(-5 << 8, 5 << 8),
						game.player.y + (this.pY << 6) + random(-5 << 8, 5 << 8),
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
		if (this.isJump && ground && !portalAt(this, Direction.DOWN) && fields.length == 0) {
			this.vy = -1300;
			playSound(sfx_jump);
		} else if (!this.isJump && this.oldIsJump && this.vy < -200) {
			this.vy = -200;
		}

		if (this.vx > 0) {
			if (ground == 1 && !portalAt(this, Direction.LEFT)) {
				game.steps += game.player.vx >> 4;
				this.vx -= 64;
			} else {
				this.vx -= ground == 2 ? 14 : 28;
			}
			if (this.vx < 0) this.vx = 0;
		} else if (this.vx < 0) {
			if (ground == 1 && !portalAt(this, Direction.RIGHT)) {
				game.steps -= game.player.vx >> 4;
				this.vx += 64;
			} else {
				this.vx += ground == 2 ? 14 : 28;
			}
			if (this.vx > 0) this.vx = 0;
		}

		if (dir == 0 && ground) this.animationFrame = 0;

		if (fields.length == 0) {
			if (this.vx > 448 && ground == 1 && !portalAt(this, Direction.LEFT) && !portalAt(this, Direction.RIGHT))
				this.vx = 448;
			else if (this.vx < -448 && ground == 1 && !portalAt(this, Direction.LEFT) && !portalAt(this, Direction.RIGHT))
				this.vx = -448;
			if (this.vx > 672 && ground > 1 && !portalAt(this, Direction.LEFT) && !portalAt(this, Direction.RIGHT))
				this.vx = 672;
			else if (this.vx < -672 && ground > 1 && !portalAt(this, Direction.LEFT) && !portalAt(this, Direction.RIGHT))
				this.vx = -672;
		}

		if (!ground || portalAt(this, Direction.DOWN)) {
			if (fields.length == 0) this.vy += GRAVITY;
			dir = Math.trunc(dir * 0.28);
			if (this.vy > (10 << 8) + 128) this.vy = (10 << 8) + 128;
		}

		if (fields.length == 0) {
			if (ground != 2) this.vx += dir;
			else if (ground == 2) this.vx += dir >> 2;
		}

		for (i = 0; i < 8; i++) {
			if (!passPortal(this, Direction.DOWN) && !passPortal(this, Direction.UP)) this.x += this.vx >> 3;
			if (!passPortal(this, Direction.LEFT) && !passPortal(this, Direction.RIGHT)) this.y += this.vy >> 3;
		}

		const platform = onPlatform(this);
		if (platform) this.x += platform.vx;

		let col = true;
		while (col && !isInPortal(this)) {
			col = checkCollisions(this);
		}

		if (portalAt(this, Direction.UP) && this.vy > 0) {
			if (downCollision(this)) this.vy = -this.vy;
		} else if (portalAt(this, Direction.DOWN) && this.vy < 0) {
			if (upCollision(this)) this.vy = -this.vy;
		}

		collectCakes();
		this.#grabObject();
		clearPortalsAtForceField();

		if (game.abilities.portals) {
			if (input.mousePressed && this.portalCooldown == 25 && !isInPortal(this) && !this.carrying) {
				if (input.mouseButton == MouseButton.LEFT) {
					launchPortal(0);
				} else if (input.mouseButton == MouseButton.RIGHT) {
					launchPortal(1);
				}
			}
		}

		const colLeft = leftCollision(this);
		const colRight = rightCollision(this);
		if (colLeft && colRight && !isInPortal(this)) {
			if (colLeft instanceof Platform || colRight instanceof Platform) {
				this.life = 0;
			}
		}

		const deadly = touchesDeadlyTile(this);
		this.inAcid = isTileKind(deadly, TileKind.ACID, TileKind.ACIDPOOL);
		if (plasmaTouching(this) || deadly) {
			this.life = 0;
		}

		if (this.y > (PLAYFIELD_HEIGHT + 40) << 8) this.life = 0;
		this.oldIsJump = this.isJump;
		this.checkDeath();
	}
}
