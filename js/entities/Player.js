/**
 * The Player object and its helper functions.
 */

import { playSound, setSoundVolume, sfx_flatline, sfx_jump, sfx_pain } from '../audio.js';
import { skipComingBoss } from '../boss.js';
import { Direction, GRAVITY, Menu, MouseButton, PLAYFIELD_HEIGHT, SparkleType } from '../constants.js';
import { reportBrokenReplay } from '../navigation.js';
import { collectCakes } from './Cake.js';
import { tunnelFieldsAt } from './TunnelField.js';
import { plasmaTouching } from './Plasma.js';
import { onBelt, onPlatform } from './Platform.js';
import { Sparkle } from './Sparkle.js';
import { loadLevel } from '../level.js';
import {
	carriesObject,
	checkCollisions,
	downCollision,
	grabObject,
	leftCollision,
	rightCollision,
	touchesDeadlyTile,
	touchingGround,
	upCollision,
} from '../physics.js';
import { clearPortals, clearPortalsAtForceField, isInPortal, launchPortal, passPortal, portalAt } from '../portals.js';
import { game, input, ui } from '../state.js';
import { isPlatformCode, PLATFORM_CODE } from '../tiles.js';
import { random } from '../utils.js';

/**
 * The player.
 */
export class Player {
	/**
	 * Create the player at the origin with full life.
	 */
	constructor() {
		/** @type {number} 1 while the player holds the left key. */
		this.isLeft = 0;
		/** @type {number} 1 while the player holds the right key. */
		this.isRight = 0;
		/** @type {number} The value of isJump before the last change of the jump key. */
		this.oldIsJump = 0;
		/** @type {number} 1 while the player holds the jump key. */
		this.isJump = 0;
		/** @type {number} 1 while the player holds the down key. */
		this.isDown = 0;
		/** @type {number} The x position in 1/256 pixels. */
		this.x = 0;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = 0;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} The width in pixels. */
		this.pX = 15;
		/** @type {number} The height in pixels. */
		this.pY = 27;
		/** @type {number} 1 when the player faces right, -1 when the player faces left. */
		this.flip = 1;
		/** @type {number} Ticks since the last portal shot, up to 25. A new shot is possible at 25. */
		this.portalCooldown = 25;
		/**
		 * @type {number} Counts to 0 after a teleport, from 42 for the blue portal and from -42 for the red portal. The
		 * sign selects the color of the sparkles.
		 */
		this.teleportTime = 0;
		/** @type {number} 1 while the player or a crate holds a switch and the switch doors are open. */
		this.switchPressed = 0;
		/** @type {number} Ticks until the next frame of the walk animation. */
		this.animationTime = 10;
		/** @type {number} The frame of the walk animation. */
		this.animationFrame = 0;
		/** @type {number} The life in 1/256 points; 100 points is full life. */
		this.life = 100 << 8;
		/** @type {boolean} True while the player is dead and the screen fades to the restart. */
		this.dead = false;
		/** @type {number} Ticks until the life starts to recover after damage. */
		this.recoveryTime = 0;
		/** @type {string} The entity type, used by the shared object functions. */
		this.type = 'player';
		/**
		 * @type {number} -1 while the level runs. At the level end it counts down from 120 during the transition, and 0
		 * shows the intermission screen.
		 */
		this.fadeNextLevel = 120;
		/**
		 * @type {number} The fade of the intermission screen: positive while it appears, negative while it disappears,
		 * 0 when it is fully visible or hidden.
		 */
		this.intermissionFade = 0;
		/** @type {boolean} True when the player pressed the clear key and the portals must go away in the next tick. */
		this.askClear = false;
	}

	/**
	 * Get the horizontal center of the player.
	 *
	 * @returns {number} The x coordinate of the center in pixels.
	 */
	midX() {
		return (this.x >> 8) + (this.pX >> 1);
	}

	/**
	 * Get the vertical center of the player.
	 *
	 * @returns {number} The y coordinate of the center in pixels.
	 */
	midY() {
		return (this.y >> 8) + (this.pY >> 1);
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
			playSound(sfx_pain);
			playSound(sfx_flatline);
			if (game.player.y >> 8 < PLAYFIELD_HEIGHT) {
				for (let i = 0; i < 20; i++) {
					const s = new Sparkle();
					s.x = game.player.x + (this.pX << 7) + random(-14 << 8, 8 << 8);
					s.y = game.player.y + (this.pY << 6);
					s.type = SparkleType.DEATH;
					s.vx = 0;
					s.vy = random(-2 << 8, 0);
					s.fading = 150;
					s.color = 1;
					s.portalNum = -1;
					game.sparkles.push(s);
				}
			}
		} else if (this.dead) {
			if (this.life >= 0) {
				setSoundVolume(sfx_flatline, 1);
				if (ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) {
					loadLevel(ui.currentLevel);
					if (game.bossNum > 0) skipComingBoss();
				}
			}
		}
	}

	/**
	 * Move the player for one tick: sparkles after a teleport, life recovery, walking, jumping, gravity, platforms,
	 * collisions, portals, cakes, carried objects and deadly tiles.
	 *
	 * @returns {void}
	 */
	move() {
		//particles around the character
		let n, s, fi, i;
		if (this.teleportTime < 0) {
			if (++this.teleportTime < 0 && this.teleportTime % 6 == 0) {
				for (n = 0; n < 3; n++) {
					s = new Sparkle();
					s.x = this.x + (this.pX << 7) + random(-8 << 8, 8 << 8);
					s.y = this.y + (this.pY << 7) + random(-16 << 8, 16 << 8);
					s.type = SparkleType.TELEPORT;
					s.vx = random(32, 64);
					s.vy = random(32, 64);
					s.fading = 200;
					s.color = 0;
					s.portalNum = -1;
					if (random(0, 2) == 0) s.vx = -s.vx;
					if (random(0, 2) == 0) s.vy = -s.vy;
					game.sparkles.push(s);
				}
			}
		} else if (this.teleportTime > 0) {
			if (--this.teleportTime > 0 && this.teleportTime % 6 == 0) {
				for (n = 0; n < 5; n++) {
					s = new Sparkle();
					s.x = this.x + (this.pX << 7) + random(-8 << 8, 8 << 8);
					s.y = this.y + (this.pY << 7) + random(-16 << 8, 16 << 8);
					s.type = SparkleType.TELEPORT;
					s.vx = random(32, 64);
					s.vy = random(32, 64);
					s.fading = 255;
					s.color = 1;
					s.portalNum = -1;
					if (random(0, 2) == 0) s.vx = -s.vx;
					if (random(0, 2) == 0) s.vy = -s.vy;
					game.sparkles.push(s);
				}
			}
		}

		if (this.askClear) {
			clearPortals();
			this.askClear = false;
		}

		const fields = tunnelFieldsAt(this);
		if (fields.length > 0) {
			game.player.vx = 0;
			game.player.vy = 0;
		}
		for (i = 0; i < fields.length; i++) {
			const f = fields[i];
			if (fields.length == 1) {
				if (game.tunnelFields[f].vx != 0) {
					if (portalAt(this, Direction.UP) || portalAt(this, Direction.DOWN)) {
						if (game.player.y >> 8 < game.tunnelFields[f].y) game.player.y += 768;
						else if ((game.player.y >> 8) + game.player.pY > game.tunnelFields[f].y + 32) game.player.y -= 768;
					} else if (game.player.y >> 8 < game.tunnelFields[f].y) game.player.y += 512;
					else if ((game.player.y >> 8) + game.player.pY > game.tunnelFields[f].y + 32) game.player.y -= 512;
				} else if (game.tunnelFields[f].vy != 0) {
					// the height pY centers the player on the x axis, in the same way as moveObject()
					if (game.player.x >> 8 < game.tunnelFields[f].x + (16 - (game.player.pY >> 1))) game.player.x += 256;
					else if ((game.player.x >> 8) + game.player.pX > game.tunnelFields[f].x + 32 - (16 - (game.player.pY >> 1)))
						game.player.x -= 256;
				}
			}

			game.player.vx += game.tunnelFields[f].vx * 384;
			game.player.vy += game.tunnelFields[f].vy * 384;

			if (game.tunnelFields[f].vx != 0) {
				if (this.isJump) {
					game.player.y -= 3 << 8;
					fi = tunnelFieldsAt(this);
					if (fi.length == 0) {
						game.player.vy = -800;
						game.player.vx = game.tunnelFields[f].vx << 9;
					}
				}
				if (this.isDown) game.player.y += 3 << 8;
			}

			if (game.tunnelFields[f].vy != 0) {
				if (this.isLeft) {
					game.player.x -= 3 << 8;
					fi = tunnelFieldsAt(this);
					if (fi.length == 0) {
						game.player.vx = -384;
					}
				}
				if (this.isRight) {
					game.player.x += 3 << 8;
					fi = tunnelFieldsAt(this);
					if (fi.length == 0) {
						game.player.vx = 384;
					}
				}
			}
		}

		let ground = touchingGround(this);
		const belt = onBelt(this);
		this.x += belt == 3 ? 384 : belt == 4 ? -384 : 0;

		this.animationTime -= 1 + 2 * (1 - (ground == 2 ? 1 : 0));
		if (this.animationTime <= 0) {
			this.animationTime = 10;
			if (++this.animationFrame == 4) this.animationFrame = 1;
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
				s = new Sparkle();
				s.x = game.player.x + (this.pX << 5) + random(-5 << 8, 5 << 8);
				s.y = game.player.y + (this.pY << 6) + random(-5 << 8, 5 << 8);
				s.type = SparkleType.LOW_LIFE;
				s.vx = 0;
				s.vy = 0;
				s.fading = 100;
				s.color = 1;
				s.portalNum = -1;
				game.sparkles.push(s);
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

		let platformCode = onPlatform(this);
		if (platformCode) {
			platformCode -= PLATFORM_CODE;
			this.x += game.platforms[platformCode].vx;
		}

		let col = 1;
		while (col && !isInPortal(this)) {
			col = checkCollisions(this);
		}

		if (portalAt(this, Direction.UP) && this.vy > 0) {
			if (downCollision(this)) this.vy = -this.vy;
		} else if (portalAt(this, Direction.DOWN) && this.vy < 0) {
			if (upCollision(this)) this.vy = -this.vy;
		}

		collectCakes();
		grabObject();
		clearPortalsAtForceField();

		if (ui.currentMenu != Menu.TUTORIAL || ui.tutoPortal) {
			if (input.mousePressed && this.portalCooldown == 25 && !isInPortal(this) && !carriesObject()) {
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
			if (isPlatformCode(colLeft) || isPlatformCode(colRight)) {
				this.life = 0;
			}
		}

		if (plasmaTouching(this) || touchesDeadlyTile(this)) {
			this.life = 0;
		}

		if (this.y > (PLAYFIELD_HEIGHT + 40) << 8) this.life = 0;
		this.oldIsJump = this.isJump;
		this.checkDeath();
	}
}
