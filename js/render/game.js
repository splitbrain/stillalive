/**
 * Drawing of a level: tiles, objects, the player and the portals.
 */

import { ctx } from '../canvas.js';
import {
	CampaignId,
	Direction,
	MAP_HEIGHT,
	MAP_SIZE,
	MAP_WIDTH,
	Menu,
	NUM_TILES,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	SparkleType,
	TUTORIAL_END_LEVEL,
} from '../constants.js';
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
	sparkle,
	tileset,
	tube,
	tube2,
	tunnel,
	tunnel2,
	turretImages,
} from '../images.js';
import { drawBoss, drawBossSpeech } from './boss.js';
import { drawHudText, drawKeys, drawText } from './hud.js';
import { drawTransition } from './transitions.js';
import { game, input, ui } from '../state.js';
import { degToRad, getAngle, radToDeg, random } from '../utils.js';
import { drawTutorial } from './tutorial.js';

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
 * Draw the sparkles. The size follows the fade.
 *
 * @returns {void}
 */
export function drawSparkles() {
	for (const s of game.sparkles) {
		if (s.fading <= 0) continue;
		const sc = s.fading / 255;
		let dt = 9 - sc * 9;
		if (s.type == SparkleType.LOW_LIFE || s.type == SparkleType.SHOT_HIT) dt -= 8;
		ctx.drawImage(
			sparkle,
			0,
			s.color * 9,
			9,
			9,
			(s.x >> 8) + dt + game.offsetX,
			(s.y >> 8) + dt + game.offsetY,
			16 * sc,
			16 * sc,
		);
	}
}

/**
 * Draw a level: the tiles, the player, the objects, the boss, the transitions, the HUD and the texts.
 *
 * @returns {void}
 */
export function drawLevel() {
	if (game.tilesChanged) createBuff();
	drawTileLayer();
	drawAnimatedTiles();

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
	drawSparkles();
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
	}

	drawPlatforms();
	drawFrontTiles();
	drawPortals();
	drawCamera();
	if (ui.currentMenu == Menu.TUTORIAL) drawTutorial();

	if (game.player.dead) {
		const a = -(game.player.life / 256);
		ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - a) + ')';
		ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}

	if (game.player.fadeNextLevel >= 0) drawTransition();

	ctx.drawImage(hud, 0, 0);

	if (ui.currentMenu == Menu.TUTORIAL) drawText(146, 28, 11);

	drawRobot();

	if (game.player.fadeNextLevel == -1 && ui.currentMenu == Menu.PLAY) drawText(146, 28, 11);

	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	drawHudText();
	drawBossSpeech();
	if (game.replayMode) drawKeys();

	if (ui.currentMenu == Menu.TUTORIAL && ui.currentLevel == TUTORIAL_END_LEVEL) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(game.offsetX, game.offsetY, 544, PLAYFIELD_HEIGHT);
		drawTutorial();
		drawText(146, 28, 11);
		ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
	}
}

/**
 * Draw the robot in the panel, outside the boss levels. The eye image follows the part of the story campaign.
 *
 * @returns {void}
 */
export function drawRobot() {
	if (game.bossNum > 0) return;
	let eye = 0;
	if (ui.campaign == CampaignId.STORY) {
		if (ui.currentLevel <= 7) eye = 0;
		else if (ui.currentLevel <= 14) eye = 1;
		else if (ui.currentLevel <= 21) eye = 2;
		else eye = 3;
	}
	ctx.drawImage(robotHead, game.robot.x >> 8, game.robot.y >> 8);
	ctx.drawImage(robotEye[eye], 0, 19 * game.robot.eye, 19, 19, game.robot.ex >> 8, game.robot.ey >> 8, 19, 19);
}

/**
 * Draw the current frames of the animated tiles.
 *
 * @returns {void}
 */
export function drawAnimatedTiles() {
	for (const tile of game.animatedTiles) {
		if (!tile.used) continue;
		ctx.drawImage(tileset[tile.current], (tile.x << 4) + game.offsetX, (tile.y << 4) + game.offsetY, 16, 16);
	}
}

/** @type {OffscreenCanvas|null} The copy of the background and the tile layer from saveTileLayer(). */
let tileLayer = null;

/**
 * Keep a copy of the background and the tile layer, which are drawn in the playfield.
 *
 * @returns {void}
 */
export function saveTileLayer() {
	tileLayer = copyCanvas(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	game.tilesChanged = false;
}

/**
 * Draw the copy of the background and the tile layer into the playfield.
 *
 * @returns {void}
 */
export function drawTileLayer() {
	drawCopy(tileLayer, game.offsetX, game.offsetY);
}

/**
 * Draw the background and the tile layer and keep a copy for the next ticks.
 *
 * @returns {void}
 */
export function createBuff() {
	let i;
	ctx.drawImage(bg[game.background], game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	for (i = 0; i < game.displayMap.length; i++) {
		const y = i >> 5;
		const x = i - (y << 5);
		if (game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < MAP_SIZE) {
			ctx.drawImage(tileset[game.displayMap[i]], x * 16 + game.offsetX, y * 16 + game.offsetY, 16, 16);
		}
	}
	saveTileLayer();
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	if (game.player.intermissionFade < 0) ctx.drawImage(highscore, game.offsetX, game.offsetY);
}

/**
 * Draw the cakes. During the level transitions, the cakes stand at their rest position.
 *
 * @returns {void}
 */
export function drawCakes() {
	for (const c of game.cakes) {
		if (!c.used) continue;
		const float = game.player.fadeNextLevel == -1 ? c.vy : 0;
		ctx.drawImage(cake, (c.x >> 8) + game.offsetX, ((c.y + float) >> 8) + game.offsetY, 16, 12);
	}
}

/**
 * Draw the turrets with their laser sights.
 *
 * @returns {void}
 */
export function drawTurrets() {
	for (const t of game.turrets) {
		const side = t.dir < 0 ? 0 : 1;
		const x = (t.x >> 8) + game.offsetX;
		const y = (t.y >> 8) + game.offsetY;
		ctx.save();
		ctx.translate(x + (t.pX >> 1), y + (t.pY >> 1));
		ctx.rotate(degToRad(t.angle));
		ctx.drawImage(turretImages[side], 0, t.animFrame * 32, 16, 32, -(t.pX >> 1), -(t.pY >> 1), 16, 32);
		ctx.restore();
		const dx = t.dir < 0 ? 0 : t.pX;
		const playerY = (game.player.y >> 8) + game.offsetY + (game.player.pY >> 1);
		if (t.animFrame == 1 && !t.dead) {
			ctx.strokeStyle = 'rgb(255, 255, 0)';
			ctx.lineWidth = 3;
			const dy = random(-16, 16);
			line(x + dx, y + 13, (game.player.x >> 8) + game.offsetX, playerY + dy);
		} else if (t.rotation < 10 && !t.dead) {
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			ctx.lineWidth = 1;
			line(x + dx, y + 13, (t.ex >> 8) + game.offsetX, playerY);
		}
	}
}

/**
 * Draw the plasma balls with their pulse.
 *
 * @returns {void}
 */
export function drawPlasma() {
	for (const ball of game.plasmaBall) {
		if (!ball.used) continue;
		let vx = 0;
		let vy = 0;
		if (ball.vx != 0) vy = ball.scale;
		else if (ball.vy != 0) vx = ball.scale;
		ctx.drawImage(
			plasma,
			0,
			ball.animFrame * 16,
			16,
			16,
			(ball.x >> 8) + game.offsetX + vx,
			(ball.y >> 8) + game.offsetY + vy,
			16,
			16,
		);
	}
}

/**
 * Draw the razor wheels of the boss with their motion trail.
 *
 * @returns {void}
 */
function drawProjectiles() {
	for (const p of game.projectiles) {
		const image = tileset[p.img];
		if (!p.needKill) {
			ctx.globalAlpha = 0.5;
			ctx.drawImage(image, ((p.x - p.vx * 4) >> 8) + game.offsetX, ((p.y - p.vy * 4) >> 8) + game.offsetY, 16, 16);
			ctx.globalAlpha = 0.75;
			ctx.drawImage(image, ((p.x - p.vx * 2) >> 8) + game.offsetX, ((p.y - p.vy * 2) >> 8) + game.offsetY, 16, 16);
			ctx.globalAlpha = 1;
		}
		ctx.drawImage(image, (p.x >> 8) + game.offsetX, (p.y >> 8) + game.offsetY, 16, 16);
	}
}

/**
 * Draw the crates. A destroyed crate shrinks.
 *
 * @returns {void}
 */
export function drawCrates() {
	for (const c of game.crates) {
		const sc = c.shrink > 0 ? c.shrink / 60 : 1;
		ctx.save();
		ctx.translate((c.x >> 8) + (c.pX >> 1) + game.offsetX, (c.y >> 8) + (c.pY >> 1) + game.offsetY);
		ctx.rotate(degToRad(c.angle));
		ctx.drawImage(crateImage, 0, 0, 16, 16, -(c.pX >> 1), -(c.pY >> 1), 16 * sc, 16 * sc);
		ctx.restore();
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
 * Draw the tunnel fields as half transparent areas.
 *
 * @returns {void}
 */
function drawTunnelFields() {
	ctx.fillStyle = 'rgb(151, 206, 233)';
	ctx.globalAlpha = 0.5;
	for (const field of game.tunnelFields) {
		ctx.fillRect(field.x + game.offsetX, field.y + game.offsetY, field.w, field.h);
	}
	ctx.globalAlpha = 1;
}

/**
 * Draw the tunnel fields and the tunnels.
 *
 * @returns {void}
 */
export function drawTunnels() {
	drawTunnelFields();
	for (const t of game.tunnels) {
		const x = (t.x >> 8) + game.offsetX;
		const y = (t.y >> 8) + game.offsetY;
		if (t.dir == Direction.RIGHT) ctx.drawImage(tunnel, 0, 0, 16, 32, x, y, 16, 32);
		else if (t.dir == Direction.LEFT) ctx.drawImage(tunnel, 0, 32, 16, 32, x, y, 16, 32);
		else if (t.dir == Direction.UP) ctx.drawImage(tunnel2, 0, 0, 32, 16, x, y, 32, 16);
		else if (t.dir == Direction.DOWN) ctx.drawImage(tunnel2, 32, 0, 32, 16, x, y, 32, 16);
	}
}

/**
 * Draw the platforms. In the editor, an arrow shows the direction.
 *
 * @returns {void}
 */
export function drawPlatforms() {
	for (const p of game.platforms) {
		const x = (p.x >> 8) + game.offsetX;
		const y = (p.y >> 8) + game.offsetY;
		ctx.drawImage(platform, x, y);
		if (ui.currentMenu == Menu.EDITOR && !ui.isTestingLevel) {
			ctx.fillStyle = 'rgb(255, 0, 0)';
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, p.dir);
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
		for (p = 0; p < game.portals.length; p++) {
			if (game.portals[p].platformIndex == -1) {
				const x = game.portals[p].x >> 8;
				const y = game.portals[p].y >> 8;
				if (game.portals[p].direction == Direction.UP || game.portals[p].direction == Direction.DOWN) {
					tx = x >> 4;
					ty = y >> 4;
					for (i = 0; i < 4; i++) {
						if (tx + i < MAP_WIDTH && tx + i >= 0) {
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
						if (ty + i < MAP_HEIGHT && ty + i >= 0) {
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
 * Draw the security camera turned towards the player.
 *
 * @returns {void}
 */
function drawCamera() {
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
 * Draw the portals with their opening animation.
 *
 * @returns {void}
 */
export function drawPortals() {
	for (let pi = 0; pi < game.portals.length; pi++) {
		const p = game.portals[pi];
		if (!p.used) continue;
		let dx = 0;
		let dy = 0;
		if (p.direction == Direction.LEFT || p.direction == Direction.RIGHT) dy = 16 - p.scaleY * 16;
		else if (p.direction == Direction.UP || p.direction == Direction.DOWN) dx = 16 - p.scaleX * 16;
		ctx.drawImage(
			pi == 0 ? bluePortal : redPortal,
			0,
			32 * p.frame,
			32,
			32,
			(p.x >> 8) + dx + game.offsetX,
			(p.y >> 8) + dy + game.offsetY,
			32 * p.scaleX,
			32 * p.scaleY,
		);
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
