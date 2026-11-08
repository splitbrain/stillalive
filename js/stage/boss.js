/**
 * The logic of the boss levels of the story campaign: the entrance, the attacks, the hits and the end of the fight.
 */

import { playLoop, playSound, sfx_bossAlarm, sfx_bossHit, sfx_bossRumble } from './audio.js';
import { SparkleType } from './constants.js';
import { Crate } from './entities/Crate.js';
import { Plasma } from './entities/Plasma.js';
import { Projectile } from './entities/Projectile.js';
import { createCakeOrSmokeSparkles } from './entities/Sparkle.js';
import { endWait, isWaiting, triggerEvents } from './events.js';
import { unclick } from './inputState.js';
import { game, input } from './state.js';
import { FIRST_OF_KIND, TileKind } from './tiles.js';
import { getCos, getDistance, getSin, random } from './utils.js';

/**
 * Put the boss in its start state. In a boss level, the boss comes in after the waits of the start events.
 *
 * @returns {void}
 */
export function setupBoss() {
	game.bossX = 449;
	game.bossY = 150;
	game.bossLife = 0;
	game.projectiles = new Array();
	if (game.bossNum != 0) {
		game.bossIsComing = true;
		game.bossComingTime = 0;
		game.bossX = 449 + 50 - (game.bossComingTime >> 8);
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
		game.bossX = 449;
		game.rumbleTime = 0;
		triggerEvents('bossArrived');
	}
}

/**
 * Run the boss for one tick: the entrance after the waits of the start events, the attacks of each boss, the damage
 * to the player and the end of the fight.
 *
 * After its death, the boss waits for a click that ends the wait of the death event. The click counts only after 60
 * ticks. A replay stores the time of this click and plays it back.
 *
 * @returns {void}
 */
export function updateBoss() {
	let d, vx1, vy1, i;
	if (game.bossNum == 0) return;
	if (game.bossIsComing) {
		if (game.bossLife == 3) {
			if (
				game.player.fadeNextLevel == 0 &&
				(game.replayMode ? game.rumbleTime >= game.replay.bossSpeech : input.mouseNewPress && game.rumbleTime > 60)
			) {
				if (!game.replayMode) game.replay.bossSpeech = game.rumbleTime;
				game.bossIsComing = false;
				shakeScreen();
				endWait();
				unclick();
			}
		} else if (!isWaiting()) {
			playLoop(sfx_bossRumble);
			playLoop(sfx_bossAlarm);
			game.bossComingTime += 32;
			game.rumbleTime++;
			game.bossX = 449 + 50 - (game.bossComingTime >> 8);
			if (game.bossX == 449) {
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
				game.crates.push(new Crate((31 * 16) << 8, (6 * 16) << 8));
				if (game.crates.length > 10) {
					for (i = 0; i < 10; i++) {
						if (!game.crates[i].carried && game.crates[i].noRemove == 0) {
							game.crates.splice(i, 1);
							break;
						}
					}
				}

				d = getDistance(
					game.player.x >> 8,
					game.player.y >> 8,
					game.crates[game.crates.length - 1].x >> 8,
					game.crates[game.crates.length - 1].y >> 8,
				);
				d = Math.trunc(d / 18);
				if (d > 16) d = 16;
				if (d < 3) d = 3;
				game.crates[game.crates.length - 1].vx = -(d << 8);
			}
		} else if (game.bossLife < 3 && game.bossNum == 2) {
			if (game.player.fadeNextLevel == -1 && game.time % (90 - 15 * game.bossLife) == 0) {
				vx1 =
					getCos(
						(game.player.x >> 8) + (game.player.pX >> 1),
						(game.player.y >> 8) + (game.player.pY >> 1),
						435 + 8,
						50 + 8,
					) *
					(1200 - game.player.vx);
				vy1 =
					getSin(
						(game.player.x >> 8) + (game.player.pX >> 1),
						(game.player.y >> 8) + (game.player.pY >> 1),
						435 + 8,
						50 + 8,
					) * 1200;
				game.projectiles.push(new Projectile(435 << 8, 50 << 8, Math.trunc(vx1), Math.trunc(vy1)));

				if (game.bossLife == 2) {
					const vx2 =
						getCos(
							(game.player.x >> 8) + (game.player.pX >> 1),
							(game.player.y >> 8) + (game.player.pY >> 1),
							16 + 8,
							48 + 8,
						) * 1200;
					const vy2 =
						getSin(
							(game.player.x >> 8) + (game.player.pX >> 1),
							(game.player.y >> 8) + (game.player.pY >> 1),
							16 + 8,
							48 + 8,
						) * 1200;
					game.projectiles.push(new Projectile(16 << 8, 48 << 8, Math.trunc(vx2), Math.trunc(vy2)));
				}
			}
		} else if (game.bossLife < 3 && game.bossNum == 3) {
			const limit = game.bossLife + 1;
			if (
				game.player.fadeNextLevel == -1 &&
				game.time % (90 - 30 * game.bossLife) == 0 &&
				game.plasmaBall.length < limit
			) {
				vx1 =
					getCos(
						(game.player.x >> 8) + (game.player.pX >> 1),
						(game.player.y >> 8) + (game.player.pY >> 1),
						(game.plasmaX >> 8) + 8,
						(game.plasmaY >> 8) + 8,
					) * 800;
				vy1 =
					getSin(
						(game.player.x >> 8) + (game.player.pX >> 1),
						(game.player.y >> 8) + (game.player.pY >> 1),
						(game.plasmaX >> 8) + 8,
						(game.plasmaY >> 8) + 8,
					) * 800;
				game.plasmaBall.push(new Plasma(game.plasmaX, game.plasmaY, vx1, vy1));
			}

			if (game.player.fadeNextLevel == -1 && game.time % (90 - 30 * game.bossLife) == 0 && game.crates.length == 0) {
				game.crates.push(new Crate((31 * 16) << 8, (18 * 16) << 8));
				game.crates[game.crates.length - 1].vx = -(12 << 8);
				game.crates[game.crates.length - 1].vy = -(2 << 8);
			}
		} else if (game.bossLife < 3 && game.bossNum == 4) {
			if (game.player.fadeNextLevel == -1 && game.time % (90 - 20 * game.bossLife) == 0) {
				game.crates.push(new Crate((31 * 16) << 8, (5 * 16) << 8));
				if (game.crates.length > 10) {
					for (i = 0; i < 10; i++) {
						if (!game.crates[i].carried && game.crates[i].noRemove == 0) {
							game.crates.splice(i, 1);
							break;
						}
					}
				}

				d = getDistance(
					game.player.x >> 8,
					game.player.y >> 8,
					game.crates[game.crates.length - 1].x >> 8,
					game.crates[game.crates.length - 1].y >> 8,
				);
				d = Math.trunc(d / 20);
				if (d > 16) d = 16;
				if (d < 3) d = 3;
				game.crates[game.crates.length - 1].vx = -(d << 8);
			}

			if (game.bossLife > 0 && game.player.fadeNextLevel == -1 && game.time % (180 - 20 * game.bossLife) == 0) {
				vx1 =
					getCos(
						(game.player.x >> 8) + (game.player.pX >> 1),
						(game.player.y >> 8) + (game.player.pY >> 1),
						432 + 8,
						32 + 8,
					) * 600;
				vy1 =
					getSin(
						(game.player.x >> 8) + (game.player.pX >> 1),
						(game.player.y >> 8) + (game.player.pY >> 1),
						432 + 8,
						32 + 8,
					) * 600;
				game.projectiles.push(new Projectile(432 << 8, 32 << 8, Math.trunc(vx1), Math.trunc(vy1)));
			}

			if (game.bossLife > 1 && game.player.fadeNextLevel == -1 && game.plasmaBall.length == 0) {
				vx1 =
					getCos(
						(game.player.x >> 8) + (game.player.pX >> 1),
						(game.player.y >> 8) + (game.player.pY >> 1),
						(game.plasmaX >> 8) + 8,
						(game.plasmaY >> 8) + 8,
					) * 400;
				vy1 =
					getSin(
						(game.player.x >> 8) + (game.player.pX >> 1),
						(game.player.y >> 8) + (game.player.pY >> 1),
						(game.plasmaX >> 8) + 8,
						(game.plasmaY >> 8) + 8,
					) * 400;
				game.plasmaBall.push(new Plasma(game.plasmaX, game.plasmaY, vx1, vy1));
			}
		}
	}
}

/**
 * Shake the screen and let the boss smoke after its death.
 *
 * @returns {void}
 */
export function updateBossRumble() {
	if (game.bossLife != 3) return;
	playLoop(sfx_bossRumble);
	game.rumbleTime++;
	if (!game.bossIsComing) shakeScreen();
	else if (game.rumbleTime % 3 == 0) {
		game.shakeX = random(-3, 3);
		game.shakeY = random(-3, 3);
	}
	if (!game.bossIsComing && game.time % 10 == 0 && game.bossX < 530) {
		createCakeOrSmokeSparkles((game.bossX + 14) << 8, (game.bossY + 18) << 8, SparkleType.SMOKE, 3, 300);
		game.bossX += 1;
	}
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
 * Let an object hit the boss. The boss dies after three hits.
 *
 * @param {object} obj The crate or turret.
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
			obj.x = 80 << 8;
			obj.y = -16 << 8;
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
			game.bossIsComing = true;
			game.rumbleTime = 0;
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

	if (posx + pX > x && x + 64 > posx && posy + pY > y && y + 48 > posy) {
		obj.shrink = 60;
	}
}

/**
 * Shake the playfield after the boss died.
 *
 * The shake only depends on the level time, so a replay gets the same shake as the play. The shake changes every
 * third tick.
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
