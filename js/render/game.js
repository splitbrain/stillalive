/**
 * Drawing of a level: tiles, objects, the player and the portals.
 */

import { setSoundVolume, sfx_flatline } from '../audio.js';
import { drawBoss, shakeScreen } from '../boss.js';
import { ctx } from '../canvas.js';
import { CampaignId, Direction, Menu, NUM_TILES, ORDERED, RANDOM } from '../constants.js';
import { isTestingLevel } from '../editor.js';
import { ForceField } from '../entities/ForceField.js';
import { projectileTouchesPlayer } from '../entities/Projectile.js';
import { createCakeOrSmokeSparkles, manageSparkles } from '../entities/Sparkle.js';
import {
	bg,
	bluePortal,
	body,
	cake,
	cameraFollow,
	crateImage,
	crosshair,
	head,
	highscore,
	hud,
	plasma,
	platform,
	portalGun,
	redPortal,
	robotEye,
	robotHead,
	tileset,
	tube,
	tube2,
	tunnel,
	tunnel2,
	turretImages,
} from '../images.js';
import { getTileWithoutCrates, getTileWithoutObjects } from '../physics.js';
import { inPortal, pointInPortal, portalLines } from '../portals.js';
import { drawText } from './hud.js';
import { manageTransitionDraw } from './transitions.js';
import { game, input, settings, ui } from '../state.js';
import { PLATFORM_CODE, Tile } from '../tiles.js';
import { manageTutorial } from '../tutorial.js';
import { degToRad, getAngle, radToDeg, random } from '../utils.js';

/**
 * Draw the background and the tile layer again and keep a copy for the next ticks.
 *
 * @returns {void}
 */
export function reloadTiles() {
	let i;
	ctx.drawImage(bg[game.BG], game.offsetX, game.offsetY, 512, 384);
	for (i in game.displayMap) {
		if (game.map[i] < NUM_TILES && game.map[i] > 0 && i < 768) {
			const y = i >> 5;
			const x = i - (y << 5);
			ctx.drawImage(tileset[game.displayMap[i]], x * 16 + game.offsetX, y * 16 + game.offsetY, 16, 16);
		}
	}
	game.imgBuff = copyCanvas(game.offsetX, game.offsetY, 512, 384);
}

/**
 * A segment of a portal shot.
 */
export class Line {
	/**
	 * @param {number} x1 The x coordinate of the start in pixels.
	 * @param {number} y1 The y coordinate of the start in pixels.
	 * @param {number} x2 The x coordinate of the end in pixels.
	 * @param {number} y2 The y coordinate of the end in pixels.
	 * @param {number} color The portal index, 0 for blue and 1 for red.
	 */
	constructor(x1, y1, x2, y2, color) {
		/** @type {number} The x coordinate of the start in pixels. */
		this.x1 = x1;
		/** @type {number} The y coordinate of the start in pixels. */
		this.y1 = y1;
		/** @type {number} The x coordinate of the end in pixels. */
		this.x2 = x2;
		/** @type {number} The y coordinate of the end in pixels. */
		this.y2 = y2;
		/** @type {number} The portal index, 0 for blue and 1 for red. */
		this.color = color;
	}
}

/**
 * Draw a line with the current stroke style.
 *
 * @param {number} x1 The x coordinate of the start in canvas pixels.
 * @param {number} y1 The y coordinate of the start in canvas pixels.
 * @param {number} x2 The x coordinate of the end in canvas pixels.
 * @param {number} y2 The y coordinate of the end in canvas pixels.
 * @returns {void}
 */
function line(x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.closePath();
}

/**
 * Fill a triangle with the current fill style.
 *
 * @param {number} x1 The x coordinate of the first corner in canvas pixels.
 * @param {number} y1 The y coordinate of the first corner in canvas pixels.
 * @param {number} x2 The x coordinate of the second corner in canvas pixels.
 * @param {number} y2 The y coordinate of the second corner in canvas pixels.
 * @param {number} x3 The x coordinate of the third corner in canvas pixels.
 * @param {number} y3 The y coordinate of the third corner in canvas pixels.
 * @returns {void}
 */
function triangle(x1, y1, x2, y2, x3, y3) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.lineTo(x3, y3);
	ctx.lineTo(x1, y1);
	ctx.fill();
	ctx.closePath();
}

/**
 * Draw the lines of the last portal shot in low quality.
 *
 * @returns {void}
 */
export function drawLowQualityPortals() {
	let i;
	if (settings.quality == 0 && game.player.portalCooldown < 5) {
		ctx.lineWidth = 3;
		for (i in portalLines) {
			if (portalLines[i].color == 0) {
				ctx.strokeStyle = 'rgb(0, 255, 255)';
			} else if (portalLines[i].color == 1) {
				ctx.strokeStyle = 'rgb(255, 0, 0)';
			}
			line(
				portalLines[i].x1 + game.offsetX,
				portalLines[i].y1 + game.offsetY,
				portalLines[i].x2 + game.offsetX,
				portalLines[i].y2 + game.offsetY,
			);
		}
	}
}

/**
 * Draw the portal gun of the player, turned towards the mouse.
 *
 * @returns {void}
 */
function drawPortalGun() {
	if (ui.currentMenu != Menu.TUTORIAL || ui.tutoPortal) {
		const a = getAngle(
			(game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX,
			(game.player.y >> 8) + (game.player.pY >> 1) + game.offsetY,
			input.mouseX,
			input.mouseY,
		);
		ctx.save();
		ctx.translate(
			(game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX,
			(game.player.y >> 8) + (game.player.pY >> 1) + game.offsetY,
		);
		ctx.rotate(a);
		ctx.drawImage(portalGun, -5, -5);
		ctx.restore();
	}
}

/**
 * Draw the head of the player, turned towards the mouse.
 *
 * @param {number} flipDx 1 when the player faces left, else 0.
 * @returns {void}
 */
function drawRotatedHead(flipDx) {
	let a = getAngle(
		(game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX,
		(game.player.y >> 8) + (game.player.pY >> 1) + game.offsetY,
		input.mouseX,
		input.mouseY,
	);
	ctx.save();
	ctx.translate((game.player.x >> 8) + game.offsetX + 8, (game.player.y >> 8) + game.offsetY + 6);
	let ad = radToDeg(a);

	if (!flipDx) {
		if (ad > 15) ad = 15;
		else if (ad < -23) ad = -23;
	} else {
		ad -= 180;
		if (ad >= -360 && ad <= -270) {
			if (ad > -334) ad = -334;
		} else if (ad < -15) ad = -15;
	}

	a = degToRad(ad);
	ctx.rotate(a);
	ctx.drawImage(head[flipDx], game.player.animationFrame * 16, 0, 15, 12, -8, -6, 16, 12);
	ctx.restore();
}

/**
 * Copy a part of the canvas into a new offscreen canvas.
 *
 * @param {number} x The left edge of the part.
 * @param {number} y The top edge of the part.
 * @param {number} w The width of the part.
 * @param {number} h The height of the part.
 * @returns {OffscreenCanvas} The copy.
 */
export function copyCanvas(x, y, w, h) {
	const copy = new OffscreenCanvas(w, h);
	copy.getContext('2d').drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
	return copy;
}

/**
 * Draw a copy from copyCanvas() onto the canvas. The copy replaces the pixels, as the current transformation,
 * transparency and composition of the canvas do not apply.
 *
 * @param {OffscreenCanvas} copy The copy.
 * @param {number} x The left edge on the canvas.
 * @param {number} y The top edge on the canvas.
 */
export function drawCopy(copy, x, y) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.beginPath();
	ctx.rect(x, y, copy.width, copy.height);
	ctx.clip();
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'copy';
	ctx.drawImage(copy, x, y);
	ctx.restore();
}

/**
 * Draw one tick of a level and run the logic that is part of the drawing: the tiles, the player, the objects, the boss,
 * the force fields, the death fade, the transition and the HUD.
 *
 * @returns {void}
 */
export function drawAllGame() {
	if (game.needLoad) createBuff();
	drawCopy(game.imgBuff, game.offsetX, game.offsetY);
	if (settings.quality > 0) animateTiles();

	drawLowQualityPortals();

	game.player.flip =
		input.mouseX > (game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX
			? (game.player.flip = 1)
			: (game.player.flip = -1);

	drawTunnels();

	const flipDx = game.player.flip < 0 ? 1 : 0;
	if (!flipDx) drawPortalGun();
	drawRotatedHead(flipDx);
	ctx.drawImage(
		body[flipDx],
		game.player.animationFrame * 16,
		0,
		16,
		27,
		(game.player.x >> 8) + game.offsetX,
		(game.player.y >> 8) + game.offsetY,
		16,
		27,
	);
	if (flipDx) drawPortalGun();

	drawCakes();
	drawTurrets();
	drawPlasma();

	manageSparkles();

	drawCrates();

	if (game.bossNum > 0) {
		drawBoss();
		if (game.bossNum == 1 || game.bossNum == 3)
			ctx.drawImage(tube, (game.tubeX >> 8) + game.offsetX, (game.tubeY >> 8) + game.offsetY);
		else if (game.bossNum == 2) {
			drawProjectiles();
			ctx.drawImage(tube2, (game.tubeX >> 8) + game.offsetX, (game.tubeY >> 8) + game.offsetY);
		} else if (game.bossNum == 4) {
			drawProjectiles();
			ctx.drawImage(tube, (game.tubeX >> 8) + game.offsetX, (game.tubeY >> 8) + game.offsetY);
		}

		if (game.bossLife == 3) {
			game.rumbleTime++;
			if (!game.bossIsComing) shakeScreen();
			else if (game.rumbleTime % 3 == 0) {
				game.offsetX = 64 + random(-3, 3);
				game.offsetY = 96 + random(-3, 3);
			}
			if (!game.bossIsComing && game.TIME % 10 == 0) {
				if (game.bossX < 530) {
					createCakeOrSmokeSparkles((game.bossX + 14) << 8, (game.bossY + 18) << 8, 9, 3, 300);
					game.bossX += 1;
				}
			}
		}
	}

	drawPlatforms();

	drawFrontTiles();

	drawPortals();

	drawCamera();
	if (ui.currentMenu == Menu.TUTORIAL) manageTutorial();

	if (game.player.dead) {
		const a = -(game.player.life / 256);
		ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - a) + ')';
		ctx.fillRect(game.offsetX, game.offsetY, 512, 384);
		game.player.life += 6;
		game.player.checkMort();
		setSoundVolume(sfx_flatline, a / 2);
	}

	if (game.player.fadeNextLevel >= 0) manageTransitionDraw();

	ctx.drawImage(hud, 0, 0);

	if (ui.currentMenu == Menu.TUTORIAL) drawText(146, 28, 11);

	if (settings.quality == 0) {
		if (game.hudLight == null) {
			drawText(146, 28, 11);
			game.hudLight = copyCanvas(132, 12, 473, 78);
		}
		drawCopy(game.hudLight, 132, 12);
	}

	drawRobot();

	if (game.player.fadeNextLevel == -1 && ui.currentMenu == Menu.PLAY && settings.quality > 0) drawText(146, 28, 11);

	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the robot in the panel and let it look around at random, outside the boss levels.
 *
 * @returns {void}
 */
export function drawRobot() {
	if (game.bossNum <= 0) {
		let eye = 0;
		if (ui.campaign == CampaignId.STORY) {
			if (ui.currentLevel <= 7) eye = 0;
			else if (ui.currentLevel <= 14) eye = 1;
			else if (ui.currentLevel <= 21) eye = 2;
			else eye = 3;
		}

		ctx.drawImage(robotHead, game.robot.x >> 8, game.robot.y >> 8);
		ctx.drawImage(robotEye[eye], 0, 19 * game.robot.eye, 19, 19, game.robot.ex >> 8, game.robot.ey >> 8, 19, 19);
		game.robot.move();

		if (!game.robot.doingAction) {
			const r = parseInt(random(1, 800));
			if (r == 1) game.robot.lookLeftRight(-1);
			else if (r == 2) game.robot.lookLeftRight(1);
			else if (r == 3) game.robot.lookUpDown(-1);
			else if (r == 4) game.robot.lookUpDown(1);
			else if (r == 5) game.robot.moveRobot(-1);
			else if (r == 6) game.robot.moveRobot(1);
			if (r % 100 == 0) game.robot.blink();
		}
	}
}

/**
 * Advance the frames of the animated tiles and draw them.
 *
 * @returns {void}
 */
export function animateTiles() {
	let r, i;
	for (i in game.animatedTiles) {
		if (game.animatedTiles[i].used) {
			if (game.TIME % game.animatedTiles[i].speed == 0) {
				if (game.animatedTiles[i].type == RANDOM) {
					do {
						r = parseInt(random(game.animatedTiles[i].min, game.animatedTiles[i].max) + 1);
					} while (r == game.animatedTiles[i].current);
					game.animatedTiles[i].current = r;
				} else if (game.animatedTiles[i].type == ORDERED) {
					if (game.animatedTiles[i].current == game.animatedTiles[i].max) {
						game.animatedTiles[i].current = game.animatedTiles[i].min;
					} else game.animatedTiles[i].current++;
				}
			}
			ctx.drawImage(
				tileset[game.animatedTiles[i].current],
				(game.animatedTiles[i].x << 4) + game.offsetX,
				(game.animatedTiles[i].y << 4) + game.offsetY,
				16,
				16,
			);
		}
	}
}

/**
 * Draw the background and the tile layer and keep a copy for the next ticks.
 *
 * @returns {void}
 */
export function createBuff() {
	let i;
	ctx.drawImage(bg[game.BG], game.offsetX, game.offsetY, 512, 384);
	for (i in game.displayMap) {
		const y = i >> 5;
		const x = i - (y << 5);
		if (game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < 768) {
			if (game.CAKELEFT == 0 && game.displayMap[i] == Tile.EXIT_CLOSED) {
				game.displayMap[i] = Tile.EXIT;
				game.map[i] = Tile.EXIT;
			}
			ctx.drawImage(tileset[game.displayMap[i]], x * 16 + game.offsetX, y * 16 + game.offsetY, 16, 16);
		}
	}
	game.imgBuff = copyCanvas(game.offsetX, game.offsetY, 512, 384);
	game.needLoad = false;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillRect(game.offsetX, game.offsetY, 512, 384);
	if (game.player.intermissionFade < 0) ctx.drawImage(highscore, game.offsetX, game.offsetY);
}

/**
 * Draw the cakes and let them float.
 *
 * @returns {void}
 */
export function drawCakes() {
	let i;
	for (i in game.cakes) {
		if (game.cakes[i].used) {
			if (game.player.fadeNextLevel == -1) {
				game.cakes[i].vy += 32 * game.cakes[i].mDir;
				if (game.cakes[i].vy < -3 << 8) {
					game.cakes[i].mDir = -game.cakes[i].mDir;
				} else if (game.cakes[i].vy > 3 << 8) {
					game.cakes[i].mDir = -game.cakes[i].mDir;
				}
				ctx.drawImage(
					cake,
					(game.cakes[i].x >> 8) + game.offsetX,
					((game.cakes[i].y + game.cakes[i].vy) >> 8) + game.offsetY,
					16,
					12,
				);
			} else {
				ctx.drawImage(cake, (game.cakes[i].x >> 8) + game.offsetX, (game.cakes[i].y >> 8) + game.offsetY, 16, 12);
			}
		}
	}
}

/**
 * Draw the turrets with their laser sights and move them.
 *
 * @returns {void}
 */
export function drawTurrets() {
	let dx, ti;
	for (ti in game.turrets) {
		const side = game.turrets[ti].dir < 0 ? 0 : 1;

		if (settings.quality > 0) {
			ctx.save();
			ctx.translate(
				(game.turrets[ti].x >> 8) + (game.turrets[ti].pX >> 1) + game.offsetX,
				(game.turrets[ti].y >> 8) + (game.turrets[ti].pY >> 1) + game.offsetY,
			);
			ctx.rotate(degToRad(game.turrets[ti].angle));
			ctx.drawImage(
				turretImages[side],
				0,
				game.turrets[ti].animFrame * 32,
				16,
				32,
				-(game.turrets[ti].pX >> 1),
				-(game.turrets[ti].pY >> 1),
				16,
				32,
			);
			ctx.restore();
		} else {
			ctx.drawImage(
				turretImages[side],
				0,
				game.turrets[ti].animFrame * 32,
				16,
				32,
				(game.turrets[ti].x >> 8) + game.offsetX,
				(game.turrets[ti].y >> 8) + game.offsetY,
				16,
				32,
			);
		}

		if (game.turrets[ti].animFrame == 1 && game.turrets[ti].dead == 0) {
			ctx.strokeStyle = 'rgb(255, 255, 0)';
			ctx.lineWidth = 3;
			dx = game.turrets[ti].dir < 0 ? 0 : game.turrets[ti].pX;
			const dy = parseInt(random(-16, 16));
			line(
				(game.turrets[ti].x >> 8) + game.offsetX + dx,
				(game.turrets[ti].y >> 8) + game.offsetY + 13,
				(game.player.x >> 8) + game.offsetX,
				(game.player.y >> 8) + game.offsetY + (game.player.pY >> 1) + dy,
			);
		} else if (game.turrets[ti].rotation < 10 && game.turrets[ti].dead == 0) {
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			ctx.lineWidth = 1;
			dx = game.turrets[ti].dir < 0 ? 0 : game.turrets[ti].pX;
			line(
				(game.turrets[ti].x >> 8) + game.offsetX + dx,
				(game.turrets[ti].y >> 8) + game.offsetY + 13,
				(game.turrets[ti].ex >> 8) + game.offsetX,
				(game.player.y >> 8) + game.offsetY + (game.player.pY >> 1),
			);
		}
		if (game.player.fadeNextLevel == -1) {
			game.turrets[ti].move();
			if (game.needRedrawTiles == 0) game.needRedrawTiles = inPortal(game.turrets[ti]);
		}
	}
}

/**
 * Draw the plasma balls and move them.
 *
 * @returns {void}
 */
export function drawPlasma() {
	let r, vy;
	for (let pi = 0; pi < game.plasmaBall.length; pi++) {
		if (game.plasmaBall[pi].used) {
			let vx = (vy = 0);
			if (game.plasmaBall[pi].vx != 0) vy = game.plasmaBall[pi].scale;
			else if (game.plasmaBall[pi].vy != 0) vx = game.plasmaBall[pi].scale;
			if (game.TIME % 10 == 0) {
				do {
					r = parseInt(random(0, 3));
				} while (game.plasmaBall[pi].animFrame == r);
				game.plasmaBall[pi].animFrame = r;
			}
			ctx.drawImage(
				plasma,
				0,
				game.plasmaBall[pi].animFrame * 16,
				16,
				16,
				(game.plasmaBall[pi].x >> 8) + game.offsetX + vx,
				(game.plasmaBall[pi].y >> 8) + game.offsetY + vy,
				16,
				16,
			);
			if (game.player.fadeNextLevel == -1) {
				game.plasmaBall[pi].move();
				if (game.needRedrawTiles == 0) game.needRedrawTiles = inPortal(game.plasmaBall[pi]);
				if (game.plasmaBall[pi].needKill) {
					game.plasmaBall.splice(pi, 1);
					pi--;
				}
			}
		}
	}
}

/**
 * Draw the razor wheels of the boss, move them and apply their damage to the player.
 *
 * @returns {void}
 */
function drawProjectiles() {
	let pi;
	for (pi = 0; pi < game.projectiles.length; pi++) {
		game.projectiles[pi].move();

		if (settings.quality > 0 && !game.projectiles[pi].needKill) {
			ctx.globalAlpha = 0.5;
			ctx.drawImage(
				tileset[game.projectiles[pi].img],
				((game.projectiles[pi].x - game.projectiles[pi].vx * 4) >> 8) + game.offsetX,
				((game.projectiles[pi].y - game.projectiles[pi].vy * 4) >> 8) + game.offsetY,
				16,
				16,
			);
			ctx.globalAlpha = 0.75;
			ctx.drawImage(
				tileset[game.projectiles[pi].img],
				((game.projectiles[pi].x - game.projectiles[pi].vx * 2) >> 8) + game.offsetX,
				((game.projectiles[pi].y - game.projectiles[pi].vy * 2) >> 8) + game.offsetY,
				16,
				16,
			);
			ctx.globalAlpha = 1;
		}
		ctx.drawImage(
			tileset[game.projectiles[pi].img],
			(game.projectiles[pi].x >> 8) + game.offsetX,
			(game.projectiles[pi].y >> 8) + game.offsetY,
			16,
			16,
		);

		if (!game.projectiles[pi].needKill && projectileTouchesPlayer(game.projectiles[pi])) {
			game.projectiles.splice(pi, 1);
			pi--;
			game.player.life = -200;
			game.player.recoveryTime = 180;
			return;
		}

		if (game.projectiles[pi].needKill) {
			if (game.projectiles[pi].timer == 0 || settings.quality == 0) {
				game.projectiles.splice(pi, 1);
				pi--;
			}
		}
	}
}

/**
 * Draw the crates and move them.
 *
 * @returns {void}
 */
export function drawCrates() {
	let ci;
	for (ci = 0; ci < game.crates.length; ci++) {
		let sc = 1;
		let dxy = 0;
		if (game.crates[ci].shrink > 0) {
			game.crates[ci].x += game.crates[ci].vx >> 1;
			game.crates[ci].y += game.crates[ci].vy >> 1;
			sc = game.crates[ci].shrink / 60;
			dxy = (16 - parseInt(16 * sc)) / 2;
		}

		if (settings.quality > 0) {
			ctx.save();
			ctx.translate(
				(game.crates[ci].x >> 8) + (game.crates[ci].pX >> 1) + game.offsetX,
				(game.crates[ci].y >> 8) + (game.crates[ci].pY >> 1) + game.offsetY,
			);
			ctx.rotate(degToRad(game.crates[ci].angle));
			ctx.drawImage(crateImage, 0, 0, 16, 16, -(game.crates[ci].pX >> 1), -(game.crates[ci].pY >> 1), 16 * sc, 16 * sc);
			ctx.restore();
		} else {
			ctx.drawImage(
				crateImage,
				0,
				0,
				16,
				16,
				(game.crates[ci].x >> 8) + game.offsetX + dxy,
				(game.crates[ci].y >> 8) + game.offsetY + dxy,
				16 * sc,
				16 * sc,
			);
		}

		if (game.player.fadeNextLevel == -1) {
			game.crates[ci].move();
			if (game.crates[ci].needKill) {
				game.crates.splice(ci, 1);
				ci--;
				continue;
			}
			if (game.needRedrawTiles == 0) game.needRedrawTiles = inPortal(game.crates[ci]);
		}
	}
}

/**
 * Draw a horizontal arrow.
 *
 * @param {number} x1 The x coordinate of the start in canvas pixels.
 * @param {number} y1 The y coordinate of the line in canvas pixels.
 * @param {number} x2 The x coordinate of the end in canvas pixels.
 * @param {number} y2 The y coordinate of the end in canvas pixels.
 * @param {number} lineWidth The width of the line.
 * @param {number} dir The direction of the arrow head, -1 left or 1 right.
 * @returns {void}
 */
export function drawArrow(x1, y1, x2, y2, lineWidth, dir) {
	ctx.lineWidth = lineWidth;
	line(x1, y1, x2, y2);
	const xa = x1 + (Math.abs(x1 - x2) >> 1) + dir * 2;
	if (dir == -1) triangle(xa - 6, y1, xa, y1 - 6, xa, y1 + 6);
	else triangle(xa + 6, y1, xa, y1 - 6, xa, y1 + 6);
}

/**
 * Draw the area of a tunnel field and add it to the force fields.
 *
 * @param {number} sx The x coordinate of the tunnel in pixels.
 * @param {number} sy The y coordinate of the tunnel in pixels.
 * @param {number} nx The x coordinate where the field ends in pixels.
 * @param {number} ny The y coordinate where the field ends in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
 * @returns {void}
 */
function drawOneField(sx, sy, nx, ny, vx, vy) {
	const x = nx;
	const y = ny;
	if (vx < 0) {
		ctx.fillRect(sx + game.offsetX, sy + game.offsetY, -(sx - x - 16), 32);
		game.forceFields.push(new ForceField(sx, sy, -(sx - x - 16), 32, -1, 0));
	} else if (vx > 0) {
		ctx.fillRect(sx + game.offsetX, sy + game.offsetY, x - sx, 32);
		game.forceFields.push(new ForceField(sx, sy, x - sx, 32, 1, 0));
	} else if (vy < 0) {
		ctx.fillRect(sx + game.offsetX, sy + game.offsetY, 32, -(sy - y - 16));
		game.forceFields.push(new ForceField(sx, sy, 32, -(sy - y - 16), 0, -1));
	} else if (vy > 0) {
		ctx.fillRect(sx + game.offsetX, sy + game.offsetY, 32, y - sy);
		game.forceFields.push(new ForceField(sx, sy, 32, y - sy, 0, 1));
	}
}

/**
 * Find the end of a tunnel field and draw it. The field ends at the first wall or platform, or at a portal, where it
 * continues from the other portal.
 *
 * @param {number} sx The x coordinate of the tunnel in pixels.
 * @param {number} sy The y coordinate of the tunnel in pixels.
 * @param {number} vx The horizontal direction of the push, -1, 0 or 1.
 * @param {number} vy The vertical direction of the push, -1, 0 or 1.
 * @returns {void}
 */
function drawTunnelField(sx, sy, vx, vy) {
	let tile, p1, p2;
	ctx.globalAlpha = 0.5;

	let y = sy;
	let x = sx;

	x += vx * 16;
	y += vy * 16;

	while (x >= 0 && x < 512 && y >= 0 && y < 384) {
		if (vx != 0) {
			tile = getTileWithoutObjects(x, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + 8);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + 16);
			if (tile == Tile.EMPTY) tile = getTileWithoutObjects(x, y + 31);
		} else if (vy != 0) {
			tile = getTileWithoutCrates(x, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + 8, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + 16, y);
			if (tile == Tile.EMPTY) tile = getTileWithoutCrates(x + 31, y);
		}

		if (tile != Tile.EMPTY && (tile < NUM_TILES || tile == Tile.TUNNEL_BLOCK || tile >= PLATFORM_CODE)) {
			x = (x >> 4) << 4;
			y = (y >> 4) << 4;

			drawOneField(sx, sy, x, y, vx, vy);
			if (vx < 0) x += 13;

			if (game.portals && game.portals[0].used && game.portals[1].used) {
				if (vx != 0) {
					p1 = pointInPortal(x, y + 4);
					p2 = pointInPortal(x, y + 28);
				} else if (vy != 0) {
					const dy = vy < 0 ? 14 : 0;

					p1 = pointInPortal(x + 4, y + dy);
					p2 = pointInPortal(x + 28, y + dy);
				}
				if (p1 == p2 && p1 > -1) {
					const p = p1;
					if (game.portals[p].direction == Direction.RIGHT) {
						sx = game.portals[p].x >> 8;
						sy = game.portals[p].y >> 8;
						vx = -1;
						vy = 0;
						y = sy;
						x = sx;
					} else if (game.portals[p].direction == Direction.LEFT) {
						sx = (game.portals[p].x >> 8) + 3;
						sy = game.portals[p].y >> 8;
						vx = 1;
						vy = 0;
						y = sy;
						x = sx;
					} else if (game.portals[p].direction == Direction.UP) {
						sx = game.portals[p].x >> 8;
						sy = game.portals[p].y >> 8;
						vx = 0;
						vy = 1;
						y = sy + 3;
						x = sx;
					} else if (game.portals[p].direction == Direction.DOWN) {
						sx = game.portals[p].x >> 8;
						sy = game.portals[p].y >> 8;
						vx = 0;
						vy = -1;
						y = sy;
						x = sx;
					}
				} else {
					ctx.globalAlpha = 1;
					return;
				}
			} else {
				ctx.globalAlpha = 1;
				return;
			}
		}
		x += vx * 16;
		y += vy * 16;
	}
	drawOneField(sx, sy, x, y, vx, vy);
	ctx.globalAlpha = 1;
}

/**
 * Draw the tunnels and rebuild their force fields.
 *
 * @returns {void}
 */
export function drawTunnels() {
	let tn;
	if (game.tunnels.length > 0) {
		game.forceFields = new Array();
		ctx.fillStyle = 'rgb(151, 206, 233)';
	}
	for (tn in game.tunnels) {
		const x = game.tunnels[tn].x >> 8;
		const y = game.tunnels[tn].y >> 8;

		let vx = 0;
		let vy = 0;
		if (game.tunnels[tn].dir == Direction.RIGHT) {
			vx = 1;
		} else if (game.tunnels[tn].dir == Direction.LEFT) {
			vx = -1;
		} else if (game.tunnels[tn].dir == Direction.UP) {
			vy = -1;
		} else if (game.tunnels[tn].dir == Direction.DOWN) {
			vy = 1;
		}

		drawTunnelField(x, y, vx, vy);

		if (game.tunnels[tn].dir == Direction.RIGHT) {
			ctx.drawImage(
				tunnel,
				0,
				0,
				16,
				32,
				(game.tunnels[tn].x >> 8) + game.offsetX,
				(game.tunnels[tn].y >> 8) + game.offsetY,
				16,
				32,
			);
		} else if (game.tunnels[tn].dir == Direction.LEFT) {
			ctx.drawImage(
				tunnel,
				0,
				32,
				16,
				32,
				(game.tunnels[tn].x >> 8) + game.offsetX,
				(game.tunnels[tn].y >> 8) + game.offsetY,
				16,
				32,
			);
		} else if (game.tunnels[tn].dir == Direction.UP) {
			ctx.drawImage(
				tunnel2,
				0,
				0,
				32,
				16,
				(game.tunnels[tn].x >> 8) + game.offsetX,
				(game.tunnels[tn].y >> 8) + game.offsetY,
				32,
				16,
			);
		} else if (game.tunnels[tn].dir == Direction.DOWN) {
			ctx.drawImage(
				tunnel2,
				32,
				0,
				32,
				16,
				(game.tunnels[tn].x >> 8) + game.offsetX,
				(game.tunnels[tn].y >> 8) + game.offsetY,
				32,
				16,
			);
		}
	}
}

/**
 * Draw the platforms and move them.
 *
 * @returns {void}
 */
export function drawPlatforms() {
	let pi;
	for (pi in game.platforms) {
		const x = (game.platforms[pi].x >> 8) + game.offsetX;
		const y = (game.platforms[pi].y >> 8) + game.offsetY;

		ctx.drawImage(platform, x, y);
		if (ui.currentMenu == Menu.EDITOR && !isTestingLevel) {
			ctx.fillStyle = 'rgb(255, 0, 0)';
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, game.platforms[pi].dir);
		}
		if (game.player.fadeNextLevel == -1) {
			game.platforms[pi].move();
		}
	}
}

/**
 * Draw the tiles around the portals over the objects that are half in a portal.
 *
 * @returns {void}
 */
export function drawFrontTiles() {
	let tx, ty, t, p, i;
	if (game.needRedrawTiles > 0) {
		for (p in game.portals) {
			if (game.portals[p].platformIndex == -1) {
				const x = game.portals[p].x >> 8;
				const y = game.portals[p].y >> 8;
				if (game.portals[p].direction == Direction.UP || game.portals[p].direction == Direction.DOWN) {
					tx = x >> 4;
					ty = y >> 4;
					for (i = 0; i < 4; i++) {
						if (tx + i < 32 && tx + i >= 0) {
							t = tx + i + (ty << 5);
							if (tileset[game.displayMap[t]]) {
								ctx.drawImage(
									tileset[game.displayMap[t]],
									(tx + i) * 16 + game.offsetX,
									ty * 16 + game.offsetY,
									16,
									16,
								);
							}
						}
					}
				} else if (game.portals[p].direction == Direction.LEFT || game.portals[p].direction == Direction.RIGHT) {
					tx = x >> 4;
					ty = y >> 4;
					for (i = 0; i < 4; i++) {
						if (ty + i < 24 && ty + i >= 0) {
							t = tx + ((ty + i) << 5);
							if (game.displayMap[t] < tileset.length) {
								ctx.drawImage(
									tileset[game.displayMap[t]],
									tx * 16 + game.offsetX,
									(ty + i) * 16 + game.offsetY,
									16,
									16,
								);
							}
						}
					}
				}
			}
		}
	}
}

/**
 * Move the security camera and draw it turned towards the player.
 *
 * @returns {void}
 */
function drawCamera() {
	game.camera.move();

	const a = getAngle(
		(game.player.x >> 8) + (game.player.pX >> 1),
		(game.player.y >> 8) + 8,
		(game.camera.x >> 8) + 8,
		(game.camera.y >> 8) + 8,
	);
	ctx.save();
	ctx.translate((game.camera.x >> 8) + 8 + game.offsetX, (game.camera.y >> 8) + 8 + game.offsetY);
	ctx.rotate(a);
	ctx.drawImage(cameraFollow, 0, 0);
	ctx.restore();
}

/**
 * Draw the portals with their opening animation and move them with their platforms.
 *
 * @returns {void}
 */
export function drawPortals() {
	let pi, dy;
	for (pi in game.portals) {
		if (game.portals[pi].used) {
			if (game.portals[pi].scaleX < 1) game.portals[pi].scaleX += 0.1;
			else if (game.portals[pi].scaleY < 1) game.portals[pi].scaleY += 0.1;

			let dx = (dy = 0);
			if (game.portals[pi].direction == Direction.LEFT || game.portals[pi].direction == Direction.RIGHT)
				dy = 16 - game.portals[pi].scaleY * 16;
			else if (game.portals[pi].direction == Direction.UP || game.portals[pi].direction == Direction.UP)
				dx = 16 - game.portals[pi].scaleX * 16;

			game.portals[pi].move();

			ctx.drawImage(
				pi == 0 ? bluePortal : redPortal,
				0,
				32 * game.portals[pi].frame,
				32,
				32,
				(game.portals[pi].x >> 8) + dx + game.offsetX,
				(game.portals[pi].y >> 8) + dy + game.offsetY,
				32 * game.portals[pi].scaleX,
				32 * game.portals[pi].scaleY,
			);
		}
	}
}

/**
 * Draw the standing player figure, e.g. in the menus.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} flipX The direction, 1 right or -1 left.
 * @returns {void}
 */
export function drawPlayer(x, y, flipX) {
	const flipDx = flipX < 0 ? 1 : 0;
	ctx.drawImage(body[flipDx], 16, 0, 16, 27, x, y, 16, 27);
	ctx.drawImage(head[flipDx], 16, 0, 15, 12, x, y, 16, 12);
}
