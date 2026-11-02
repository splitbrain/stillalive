/**
 * The boss levels of the story campaign.
 */

import { ctx } from './canvas.js';
import { Caisse } from './entities/Caisse.js';
import { Plasma } from './entities/Plasma.js';
import { Projectile } from './entities/Projectile.js';
import { robotEye, robotHead } from './images.js';
import { unclick } from './input.js';
import { game, input, ui } from './state.js';
import { FIRST_OF_KIND, TileKind } from './tiles.js';
import { prepareTxt } from './tutorial.js';
import { getCos, getDistance, getSin, random } from './utils.js';

/**
 * Put the boss in its start state. In a boss level, the boss comes in and speaks first.
 *
 * @returns {void}
 */
export function setupBoss() {
	game.bossX = 449;
	game.bossY = 150;
	game.bossLife = 0;
	game.projos = new Array();
	if (game.bossNum != 0) {
		game.bossIsComing = true;
		game.bossComingTime = 0;
		game.bossIsTalking = true;
		game.bossX = 449 + 50 - (game.bossComingTime >> 8);
		game.rumbleTime = 0;
	} else skipComingBoss();

	if (game.replayMode) skipComingBoss();
}

/**
 * Skip the entrance and the speech of the boss.
 *
 * @returns {void}
 */
export function skipComingBoss() {
	if (game.bossNum != 0) {
		game.bossIsComing = false;
		game.bossComingTime = 0;
		game.bossIsTalking = false;
		game.bossX = 449;
		game.rumbleTime = 0;
	}
}

/**
 * Run the boss for one tick: the entrance with its speech, the attacks of each boss, the damage to the player and the
 * end of the fight.
 *
 * @returns {void}
 */
export function manageBoss() {
	let d, vx1, vy1, i;
	if (game.bossNum == 0) return;
	if (game.bossIsComing) {
		if (game.bossIsTalking) {
			if (game.bossLife == 0 && game.perso.fadeNextLevel == 0) {
				if (game.bossX > 449) {
					if (game.bossNum == 1) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText(
							"Enough is enough little man. I've decided that you can no longer",
							game.ECART_X + 22,
							game.ECART_Y + 30,
						);
						ctx.fillText(
							'continue to progress through or laboratories anymore. Launching',
							game.ECART_X + 22,
							game.ECART_Y + 30 + 16,
						);
						ctx.fillText(
							'termination program in 3 ... 2 ... 1 .............',
							game.ECART_X + 22,
							game.ECART_Y + 30 + 32,
						);
					} else if (game.bossNum == 2) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText(
							"All your cake are belong to us ! You little rat, I think I don't have the",
							game.ECART_X + 22,
							game.ECART_Y + 30,
						);
						ctx.fillText(
							'choice ... You destroyed my brother and it will be your last mistake',
							game.ECART_X + 22,
							game.ECART_Y + 30 + 16,
						);
						ctx.fillText('in life. Prepare to suffer, here I come !', game.ECART_X + 22, game.ECART_Y + 30 + 32);
					} else if (game.bossNum == 3) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText(
							'You first started with my cousin, then you decided to take apart its',
							game.ECART_X + 22,
							game.ECART_Y + 30,
						);
						ctx.fillText(
							"brother ... I can't let you continue to destroy our family just like that.",
							game.ECART_X + 22,
							game.ECART_Y + 30 + 16,
						);
						ctx.fillText(
							"I'm coming to get you, and I'm sure you won't like the taste of it ...",
							game.ECART_X + 22,
							game.ECART_Y + 30 + 32,
						);
					} else if (game.bossNum == 4) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText(
							"Well, Well Well ... It's getting serious. I guess I'm the only one left",
							game.ECART_X + 22,
							game.ECART_Y + 30,
						);
						ctx.fillText(
							'to stop you from getting out of these laboratories. I hope you enjoyed',
							game.ECART_X + 22,
							game.ECART_Y + 30 + 16,
						);
						ctx.fillText(
							"your life as long as it lasted. You won't suffer, I promise.",
							game.ECART_X + 22,
							game.ECART_Y + 30 + 32,
						);
					}
				} else {
					if (game.bossNum == 1) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText(
							'I saw in previous rooms that you loved crates. But how many of them',
							game.ECART_X + 22,
							game.ECART_Y + 30,
						);
						ctx.fillText(
							"can you take at the same time ? I'll give you a little hint to survive ...",
							game.ECART_X + 22,
							game.ECART_Y + 30 + 16,
						);
						ctx.fillText(
							"... Don't try to jump in the acid ! Ha - Ha - Ha -",
							game.ECART_X + 22,
							game.ECART_Y + 30 + 32,
						);
					} else if (game.bossNum == 2) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText(
							"Razor wheels are pretty easy to avoid when they just don't move ...",
							game.ECART_X + 22,
							game.ECART_Y + 30,
						);
						ctx.fillText(
							'What do you say if I launch them into your direction ? Think you can',
							game.ECART_X + 22,
							game.ECART_Y + 30 + 16,
						);
						ctx.fillText(
							"avoid them all ? Say hello to my brother when you're gone.",
							game.ECART_X + 22,
							game.ECART_Y + 30 + 32,
						);
					} else if (game.bossNum == 3) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText(
							'Easy to spot, useful to open green walls and deadly weapons !',
							game.ECART_X + 22,
							game.ECART_Y + 30,
						);
						ctx.fillText(
							'You used them to get to me, what if I use them to get to you now ?',
							game.ECART_X + 22,
							game.ECART_Y + 30 + 16,
						);
						ctx.fillText(
							'You wanna play rough ? OK ! Say hello to my little friends !',
							game.ECART_X + 22,
							game.ECART_Y + 30 + 32,
						);
					} else if (game.bossNum == 4) {
						prepareTxt(15, 10, 477, 60);
						ctx.fillText(
							"Previous robots were too kind with you. You won't have the same",
							game.ECART_X + 22,
							game.ECART_Y + 30,
						);
						ctx.fillText(
							"chance here. I won't throw you crates, razor wheels or plasma balls ...",
							game.ECART_X + 22,
							game.ECART_Y + 30 + 16,
						);
						ctx.fillText(
							'No, I will throw you ... the three of them at the same time !',
							game.ECART_X + 22,
							game.ECART_Y + 30 + 32,
						);
					}
				}

				if (input.mouseNewPress) {
					game.bossIsTalking = false;
					if (game.bossX == 449) {
						game.bossIsComing = false;
					}
					unclick();
				}
			} else if (game.perso.fadeNextLevel == 0) {
				if (game.bossNum == 1) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText(
						"I ... I can't believe it. I never thought you would be able to take",
						game.ECART_X + 22,
						game.ECART_Y + 30,
					);
					ctx.fillText(
						'me down that easily ... You deserve the right to continue your journey',
						game.ECART_X + 22,
						game.ECART_Y + 30 + 16,
					);
					ctx.fillText(
						'through next levels ... Come meet my brother in the next ro.............',
						game.ECART_X + 22,
						game.ECART_Y + 30 + 32,
					);
				} else if (game.bossNum == 2) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText(
						"I guess .... I'll have to say hello by my...self ... Fortunately I can't feel",
						game.ECART_X + 22,
						game.ECART_Y + 30,
					);
					ctx.fillText(
						'pain, cause I think it would hurt really bad ........ Continue your trip',
						game.ECART_X + 22,
						game.ECART_Y + 30 + 16,
					);
					ctx.fillText(
						'....... and tell my cousin I forgot to buy some milk ...........',
						game.ECART_X + 22,
						game.ECART_Y + 30 + 32,
					);
				} else if (game.bossNum == 3) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText(
						"I don't understand ... all my calculations where perfect ! You were",
						game.ECART_X + 22,
						game.ECART_Y + 30,
					);
					ctx.fillText(
						'supposed to die and ... oh wait ! I remember that movie now, that',
						game.ECART_X + 22,
						game.ECART_Y + 30 + 16,
					);
					ctx.fillText(
						'guy with a scar on his face .. guess I was wrong after all ..........',
						game.ECART_X + 22,
						game.ECART_Y + 30 + 32,
					);
				} else if (game.bossNum == 4) {
					prepareTxt(15, 10, 477, 60);
					ctx.fillText(
						"........ Was I too kind with you ? I don't think so ... It seems that you",
						game.ECART_X + 22,
						game.ECART_Y + 30,
					);
					ctx.fillText(
						'were bound to get out of here from the beginning. Well, it was nice',
						game.ECART_X + 22,
						game.ECART_Y + 30 + 16,
					);
					ctx.fillText(
						'to know you after all ... So long, and thanks for all the cakes ...',
						game.ECART_X + 22,
						game.ECART_Y + 30 + 32,
					);
				}

				if (game.replayMode ? game.rumbleTime >= game.replay.bossSpeech : input.mouseNewPress && game.rumbleTime > 60) {
					if (!game.replayMode) game.replay.bossSpeech = game.rumbleTime;
					game.bossIsTalking = false;
					game.bossIsComing = false;
					shakeScreen();
					unclick();
				}
			}
		} else {
			game.bossComingTime += 32;
			game.rumbleTime++;
			game.bossX = 449 + 50 - (game.bossComingTime >> 8);
			if (game.bossX == 449) {
				game.bossIsTalking = true;
				game.ECART_X = 64;
				game.ECART_Y = 96;
			}
			if (game.rumbleTime % 3 == 0) {
				game.ECART_X = 64 + random(-3, 3);
				game.ECART_Y = 96 + random(-3, 3);
			}
		}
	} else {
		if (game.bossLife < 3 && game.bossNum > 0) {
			if (!game.perso.mort && persoTouchBoss()) {
				game.perso.vie = -200;
				game.perso.timeVie = 180;
				return;
			}
		}

		if (game.perso.mort) {
			game.projos = new Array();
			game.plasmaBall = new Array();
			return;
		}

		if (game.bossLife < 3 && game.bossNum == 1) {
			if (game.perso.fadeNextLevel == -1 && game.TIME % (90 - 30 * game.bossLife) == 0) {
				game.caisses.push(new Caisse((31 * 16) << 8, (6 * 16) << 8));
				if (game.caisses.length > 10) {
					for (i = 0; i < 10; i++) {
						if (!game.caisses[i].porter && game.caisses[i].noRemove == 0) {
							game.caisses.splice(i, 1);
							break;
						}
					}
				}

				d = getDistance(
					game.perso.x >> 8,
					game.perso.y >> 8,
					game.caisses[game.caisses.length - 1].x >> 8,
					game.caisses[game.caisses.length - 1].y >> 8,
				);
				d = parseInt(d / 18);
				if (d > 16) d = 16;
				if (d < 3) d = 3;
				game.caisses[game.caisses.length - 1].vx = -(d << 8);
			}
		} else if (game.bossLife < 3 && game.bossNum == 2) {
			if (game.perso.fadeNextLevel == -1 && game.TIME % (90 - 15 * game.bossLife) == 0) {
				vx1 =
					getCos(
						(game.perso.x >> 8) + (game.perso.pX >> 1),
						(game.perso.y >> 8) + (game.perso.pY >> 1),
						435 + 8,
						50 + 8,
					) *
					(1200 - game.perso.vx);
				vy1 =
					getSin(
						(game.perso.x >> 8) + (game.perso.pX >> 1),
						(game.perso.y >> 8) + (game.perso.pY >> 1),
						435 + 8,
						50 + 8,
					) * 1200;
				game.projos.push(new Projectile(435 << 8, 50 << 8, parseInt(vx1), parseInt(vy1)));

				if (game.bossLife == 2) {
					const vx2 =
						getCos(
							(game.perso.x >> 8) + (game.perso.pX >> 1),
							(game.perso.y >> 8) + (game.perso.pY >> 1),
							16 + 8,
							48 + 8,
						) * 1200;
					const vy2 =
						getSin(
							(game.perso.x >> 8) + (game.perso.pX >> 1),
							(game.perso.y >> 8) + (game.perso.pY >> 1),
							16 + 8,
							48 + 8,
						) * 1200;
					game.projos.push(new Projectile(16 << 8, 48 << 8, parseInt(vx2), parseInt(vy2)));
				}
			}
		} else if (game.bossLife < 3 && game.bossNum == 3) {
			const limit = game.bossLife + 1;
			if (
				game.perso.fadeNextLevel == -1 &&
				game.TIME % (90 - 30 * game.bossLife) == 0 &&
				game.plasmaBall.length < limit
			) {
				vx1 =
					getCos(
						(game.perso.x >> 8) + (game.perso.pX >> 1),
						(game.perso.y >> 8) + (game.perso.pY >> 1),
						(game.plasmaX >> 8) + 8,
						(game.plasmaY >> 8) + 8,
					) * 800;
				vy1 =
					getSin(
						(game.perso.x >> 8) + (game.perso.pX >> 1),
						(game.perso.y >> 8) + (game.perso.pY >> 1),
						(game.plasmaX >> 8) + 8,
						(game.plasmaY >> 8) + 8,
					) * 800;
				game.plasmaBall.push(new Plasma(game.plasmaX, game.plasmaY, vx1, vy1));
			}

			if (game.perso.fadeNextLevel == -1 && game.TIME % (90 - 30 * game.bossLife) == 0 && game.caisses.length == 0) {
				game.caisses.push(new Caisse((31 * 16) << 8, (18 * 16) << 8));
				game.caisses[game.caisses.length - 1].vx = -(12 << 8);
				game.caisses[game.caisses.length - 1].vy = -(2 << 8);
			}
		} else if (game.bossLife < 3 && game.bossNum == 4) {
			if (game.perso.fadeNextLevel == -1 && game.TIME % (90 - 20 * game.bossLife) == 0) {
				game.caisses.push(new Caisse((31 * 16) << 8, (5 * 16) << 8));
				if (game.caisses.length > 10) {
					for (i = 0; i < 10; i++) {
						if (!game.caisses[i].porter && game.caisses[i].noRemove == 0) {
							game.caisses.splice(i, 1);
							break;
						}
					}
				}

				d = getDistance(
					game.perso.x >> 8,
					game.perso.y >> 8,
					game.caisses[game.caisses.length - 1].x >> 8,
					game.caisses[game.caisses.length - 1].y >> 8,
				);
				d = parseInt(d / 20);
				if (d > 16) d = 16;
				if (d < 3) d = 3;
				game.caisses[game.caisses.length - 1].vx = -(d << 8);
			}

			if (game.bossLife > 0 && game.perso.fadeNextLevel == -1 && game.TIME % (180 - 20 * game.bossLife) == 0) {
				vx1 =
					getCos(
						(game.perso.x >> 8) + (game.perso.pX >> 1),
						(game.perso.y >> 8) + (game.perso.pY >> 1),
						432 + 8,
						32 + 8,
					) * 600;
				vy1 =
					getSin(
						(game.perso.x >> 8) + (game.perso.pX >> 1),
						(game.perso.y >> 8) + (game.perso.pY >> 1),
						432 + 8,
						32 + 8,
					) * 600;
				game.projos.push(new Projectile(432 << 8, 32 << 8, parseInt(vx1), parseInt(vy1)));
			}

			if (game.bossLife > 1 && game.perso.fadeNextLevel == -1 && game.plasmaBall.length == 0) {
				vx1 =
					getCos(
						(game.perso.x >> 8) + (game.perso.pX >> 1),
						(game.perso.y >> 8) + (game.perso.pY >> 1),
						(game.plasmaX >> 8) + 8,
						(game.plasmaY >> 8) + 8,
					) * 400;
				vy1 =
					getSin(
						(game.perso.x >> 8) + (game.perso.pX >> 1),
						(game.perso.y >> 8) + (game.perso.pY >> 1),
						(game.plasmaX >> 8) + 8,
						(game.plasmaY >> 8) + 8,
					) * 400;
				game.plasmaBall.push(new Plasma(game.plasmaX, game.plasmaY, vx1, vy1));
			}
		}
	}
}

/**
 * Check if the player touches the boss.
 *
 * @returns {boolean} True if the player touches the boss.
 */
function persoTouchBoss() {
	const x = (game.perso.x >> 8) + game.perso.pX;
	const y = (game.perso.y >> 8) + (game.perso.pY >> 1);
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
export function manageToucheBoss(obj) {
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
		if (game.bossLife < 3) {
			for (i in game.oldMap) {
				if (game.oldMap[i] == FIRST_OF_KIND[TileKind.BOSS_BLOCK]) {
					game.map[i] = FIRST_OF_KIND[TileKind.BOSS_BLOCK];
					game.displayMap[i] = FIRST_OF_KIND[TileKind.BOSS_BLOCK];
				}
			}
			game.needLoad = true;
		} else {
			game.projos = new Array();
			game.plasmaBall = new Array();
			game.bossIsComing = true;
			game.bossIsTalking = true;
			game.rumbleTime = 0;
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
 * The offset only depends on the level time, so a replay gets the same offsets as the play. The mouse aim uses the
 * offset, so random offsets would change the result of a replay. The offset changes every third tick.
 */
export function shakeScreen() {
	const step = Math.floor(game.TIME / 3);
	game.ECART_X = 64 + shakeOffset(step * 2);
	game.ECART_Y = 96 + shakeOffset(step * 2 + 1);
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

/**
 * Draw the boss with the eye of the current boss.
 *
 * @returns {void}
 */
export function drawBoss() {
	ctx.drawImage(robotHead, game.bossX + game.ECART_X, game.bossY + game.ECART_Y, 74, 58);

	let eye = 0;
	if (ui.currentLevel <= 7) eye = 0;
	else if (ui.currentLevel <= 14) eye = 1;
	else if (ui.currentLevel <= 21) eye = 2;
	else eye = 3;

	ctx.drawImage(
		robotEye[eye],
		0,
		19 * game.bossLife,
		19,
		19,
		game.bossX + game.ECART_X + 15,
		game.bossY + game.ECART_Y + 22,
		19,
		19,
	);
}
