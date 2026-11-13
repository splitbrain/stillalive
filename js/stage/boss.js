/**
 * The boss of the boss levels.
 */

import { playLoop, playSound, sfx_bossAlarm, sfx_bossHit, sfx_bossRumble } from './audio.js';
import { MAP_WIDTH, SparkleType, TILE_SIZE } from './constants.js';
import { Crate } from './entities/Crate.js';
import { Plasma } from './entities/Plasma.js';
import { Projectile } from './entities/Projectile.js';
import { createCakeOrSmokeSparkles } from './entities/Sparkle.js';
import { isWaiting, triggerEvents } from './events.js';
import { game } from './state.js';
import { FIRST_OF_KIND, TileKind } from './tiles.js';
import { getCos, getDistance, getSin, random } from './utils.js';

/** @type {number} The x position of the boss in pixels while it fights. */
const BOSS_X = 449;
/** @type {number} The y position of the boss in pixels. */
const BOSS_Y = 150;
/** @type {number} The distance in pixels that the boss moves to the left while it comes in. */
const BOSS_ENTRY_DISTANCE = 50;

/**
 * Put the boss in its start state. In a boss level, the boss comes in after the waits of the start events.
 *
 * @returns {void}
 */
export function setupBoss() {
	game.bossX = BOSS_X;
	game.bossY = BOSS_Y;
	game.bossLife = 0;
	game.projectiles = new Array();
	if (game.bossNum != 0) {
		game.bossIsComing = true;
		game.bossComingTime = 0;
		game.bossX = BOSS_X + BOSS_ENTRY_DISTANCE;
		game.rumbleTime = 0;
	} else skipComingBoss();

	if (game.replayMode) skipComingBoss();
}

/**
 * Skip the entrance of the boss. The boss is at its place at once.
 *
 * @returns {void}
 */
export function skipComingBoss() {
	if (game.bossNum != 0) {
		game.bossIsComing = false;
		game.bossComingTime = 0;
		game.bossX = BOSS_X;
		game.rumbleTime = 0;
		triggerEvents('bossArrived');
	}
}

/**
 * Update the boss for one tick. The boss comes in after the waits of the start events, attacks the player, and kills
 * the player on contact.
 *
 * @returns {void}
 */
export function updateBoss() {
	if (game.bossNum == 0) return;
	if (game.bossIsComing) {
		if (!isWaiting()) {
			playLoop(sfx_bossRumble);
			playLoop(sfx_bossAlarm);
			game.bossComingTime += 32;
			game.rumbleTime++;
			game.bossX = BOSS_X + BOSS_ENTRY_DISTANCE - (game.bossComingTime >> 8);
			if (game.bossX == BOSS_X) {
				game.bossIsComing = false;
				game.shakeX = 0;
				game.shakeY = 0;
				triggerEvents('bossArrived');
			}
			if (game.rumbleTime % 3 == 0) {
				game.shakeX = random(-3, 3);
				game.shakeY = random(-3, 3);
			}
		}
	} else {
		if (game.bossLife < 3 && game.bossNum > 0) {
			if (!game.player.dead && playerTouchesBoss()) {
				game.player.life = -200;
				game.player.recoveryTime = 180;
				return;
			}
		}

		if (game.player.dead) {
			game.projectiles = new Array();
			game.plasmaBall = new Array();
			return;
		}

		if (game.bossLife < 3 && game.bossNum == 1) {
			if (game.player.fadeNextLevel == -1 && game.time % (90 - 30 * game.bossLife) == 0) {
				throwCrate(6, 18);
			}
		} else if (game.bossLife < 3 && game.bossNum == 2) {
			if (game.player.fadeNextLevel == -1 && game.time % (90 - 15 * game.bossLife) == 0) {
				shootWheel(435, 50, 1200, 1200 - game.player.vx);

				if (game.bossLife == 2) {
					shootWheel(TILE_SIZE, 3 * TILE_SIZE, 1200);
				}
			}
		} else if (game.bossLife < 3 && game.bossNum == 3) {
			const limit = game.bossLife + 1;
			if (
				game.player.fadeNextLevel == -1 &&
				game.time % (90 - 30 * game.bossLife) == 0 &&
				game.plasmaBall.length < limit
			) {
				shootPlasma(800);
			}

			if (game.player.fadeNextLevel == -1 && game.time % (90 - 30 * game.bossLife) == 0 && game.crates.length == 0) {
				game.crates.push(new Crate(((MAP_WIDTH - 1) * TILE_SIZE) << 8, (18 * TILE_SIZE) << 8));
				game.crates[game.crates.length - 1].vx = -(12 << 8);
				game.crates[game.crates.length - 1].vy = -(2 << 8);
			}
		} else if (game.bossLife < 3 && game.bossNum == 4) {
			if (game.player.fadeNextLevel == -1 && game.time % (90 - 20 * game.bossLife) == 0) {
				throwCrate(5, 20);
			}

			if (game.bossLife > 0 && game.player.fadeNextLevel == -1 && game.time % (180 - 20 * game.bossLife) == 0) {
				shootWheel(27 * TILE_SIZE, 2 * TILE_SIZE, 600);
			}

			if (game.bossLife > 1 && game.player.fadeNextLevel == -1 && game.plasmaBall.length == 0) {
				shootPlasma(400);
			}
		}
	}
}

/**
 * Get the direction from a point to the center of the player.
 *
 * @param {number} x The x coordinate of the point in pixels.
 * @param {number} y The y coordinate of the point in pixels.
 * @returns {number[]} The cosine and the sine of the direction.
 */
function aimAtPlayer(x, y) {
	const px = game.player.midX();
	const py = game.player.midY();
	return [getCos(px, py, x, y), getSin(px, py, x, y)];
}

/**
 * Shoot a razor wheel from a point towards the player.
 *
 * @param {number} x The x coordinate of the start in pixels.
 * @param {number} y The y coordinate of the start in pixels.
 * @param {number} speed The speed in 1/256 pixels per tick.
 * @param {number} [speedX] The speed along x, if it differs from the speed.
 * @returns {void}
 */
function shootWheel(x, y, speed, speedX = speed) {
	const [dx, dy] = aimAtPlayer(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
	game.projectiles.push(new Projectile(x << 8, y << 8, Math.trunc(dx * speedX), Math.trunc(dy * speed)));
}

/**
 * Shoot a plasma ball from the plasma start of the level towards the player.
 *
 * @param {number} speed The speed in 1/256 pixels per tick.
 * @returns {void}
 */
function shootPlasma(speed) {
	const [dx, dy] = aimAtPlayer((game.plasmaX >> 8) + TILE_SIZE / 2, (game.plasmaY >> 8) + TILE_SIZE / 2);
	game.plasmaBall.push(new Plasma(game.plasmaX, game.plasmaY, dx * speed, dy * speed));
}

/**
 * Throw a crate from the right edge towards the player. The speed grows with the distance to the player. When more
 * than ten crates are in the level, the oldest crate that is not carried is removed.
 *
 * @param {number} row The row of the start position.
 * @param {number} divisor The pixels of distance per unit of speed.
 * @returns {void}
 */
function throwCrate(row, divisor) {
	const crate = new Crate(((MAP_WIDTH - 1) * TILE_SIZE) << 8, (row * TILE_SIZE) << 8);
	game.crates.push(crate);
	if (game.crates.length > 10) {
		for (let i = 0; i < 10; i++) {
			if (!game.crates[i].carried && game.crates[i].noRemove == 0) {
				game.crates.splice(i, 1);
				break;
			}
		}
	}
	let d = getDistance(game.player.x >> 8, game.player.y >> 8, crate.x >> 8, crate.y >> 8);
	d = Math.trunc(d / divisor);
	if (d > 16) d = 16;
	if (d < 3) d = 3;
	crate.vx = -(d << 8);
}

/** @type {number} The x position in pixels where the boss is out of the playfield after its death. */
const BOSS_GONE_X = 530;

/**
 * Let the boss smoke and leave after its death. The screen shakes until the boss is gone.
 *
 * @returns {void}
 */
export function updateBossRumble() {
	if (game.bossLife != 3 || game.bossX >= BOSS_GONE_X) return;
	playLoop(sfx_bossRumble);
	shakeScreen();
	if (game.time % 10 == 0) {
		createCakeOrSmokeSparkles((game.bossX + 14) << 8, (game.bossY + 18) << 8, SparkleType.SMOKE, 3, 300);
		game.bossX += 1;
	}
	if (game.bossX >= BOSS_GONE_X) {
		game.shakeX = 0;
		game.shakeY = 0;
	}
}

/**
 * Get the phase of the boss fight.
 *
 * @returns {string|null} "coming" while the boss comes in, "fight" while it lives, "leaving" while it leaves after its
 *     death, or null in a level without a boss, before the entrance and after the boss is gone.
 */
export function bossPhase() {
	if (game.bossNum == 0) return null;
	if (game.bossIsComing) return isWaiting() ? null : 'coming';
	if (game.bossLife < 3) return 'fight';
	return game.bossX < BOSS_GONE_X ? 'leaving' : null;
}

/**
 * Check if the player touches the boss.
 *
 * @returns {boolean} True if the player touches the boss.
 */
function playerTouchesBoss() {
	const x = (game.player.x >> 8) + game.player.pX;
	const y = (game.player.y >> 8) + (game.player.pY >> 1);
	const x2 = game.bossX + 15;
	const y2 = game.bossY;

	if (x > x2 && y > y2 && y < y2 + 58) return true;

	return false;
}

/**
 * Count a hit when a crate touches the boss. The boss dies after three hits.
 *
 * @param {object} obj The crate.
 * @returns {void}
 */
export function hitBoss(obj) {
	let i;
	const posx = obj.x >> 8;
	const posy = obj.y >> 8;
	const pX = obj.pX;
	const pY = obj.pY;
	const x = game.bossX + 16;
	const y = game.bossY;

	if (game.bossLife < 3 && posx + pX > x && x + 74 > posx && posy + pY > y && y + 58 > posy) {
		if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) obj.needKill = true;
		else if (game.bossNum == 2) {
			obj.x = (5 * TILE_SIZE) << 8;
			obj.y = -TILE_SIZE << 8;
			obj.vx = 0;
			obj.vy = 0;
		}
		game.bossLife++;
		playSound(sfx_bossHit);
		if (game.bossLife < 3) {
			for (i = 0; i < game.oldMap.length; i++) {
				if (game.oldMap[i] == FIRST_OF_KIND[TileKind.BOSS_BLOCK]) {
					game.map[i] = FIRST_OF_KIND[TileKind.BOSS_BLOCK];
					game.displayMap[i] = FIRST_OF_KIND[TileKind.BOSS_BLOCK];
				}
			}
			game.tilesChanged = true;
		} else {
			game.projectiles = new Array();
			game.plasmaBall = new Array();
			triggerEvents('bossDied');
		}
	}
}

/**
 * Shrink a crate that enters the tube of the boss.
 *
 * @param {object} obj The crate.
 * @returns {void}
 */
export function manageInTube(obj) {
	if (obj.vx < 0) return;

	const posx = obj.x >> 8;
	const posy = obj.y >> 8;
	const pX = obj.pX;
	const pY = obj.pY;
	const x = game.tubeX >> 8;
	const y = game.tubeY >> 8;

	if (posx + pX > x && x + 4 * TILE_SIZE > posx && posy + pY > y && y + 3 * TILE_SIZE > posy) {
		obj.shrink = 60;
	}
}

/**
 * Shake the playfield after the boss died.
 *
 * The shake depends on the level time alone, so a replay shows the same shake as the play. The shake changes every
 * third tick.
 *
 * @returns {void}
 */
function shakeScreen() {
	const step = Math.floor(game.time / 3);
	game.shakeX = shakeOffset(step * 2);
	game.shakeY = shakeOffset(step * 2 + 1);
}

/**
 * Get a pseudo-random shake offset.
 *
 * @param {number} n The index of the offset.
 * @returns {number} An offset from -3 to 2 pixels, the same range as random(-3, 3).
 */
function shakeOffset(n) {
	let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return ((h >>> 0) % 6) - 3;
}
