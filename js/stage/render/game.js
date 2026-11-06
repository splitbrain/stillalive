/**
 * Drawing of a level and of the preview of a map: tiles, objects, the player and the portals.
 */

import { copyCanvas, ctx, drawCopy, drawImage } from '../canvas.js';
import {
	Direction,
	MAP_HEIGHT,
	MAP_SIZE,
	MAP_WIDTH,
	NUM_TILES,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	SparkleType,
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
	plasma,
	platform,
	portalGun,
	redPortal,
	sparkle,
	tileset,
	tube,
	tube2,
	gravPipe,
	gravPipe2,
	turretImages,
} from '../images.js';
import { drawBoss } from './boss.js';
import { atExit } from '../physics.js';
import { drawTransition } from './transitions.js';
import { game, input, ui } from '../state.js';
import { Tile } from '../tiles.js';
import { degToRad, getAngle, radToDeg, random } from '../utils.js';

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
	if (game.abilities.portals) {
		const a = getAngle(
			(game.player.x >> 8) + (game.player.pX >> 1),
			(game.player.y >> 8) + (game.player.pY >> 1),
			input.mouseX,
			input.mouseY,
		);
		ctx.save();
		ctx.translate((game.player.x >> 8) + (game.player.pX >> 1), (game.player.y >> 8) + (game.player.pY >> 1));
		ctx.rotate(a);
		drawImage(portalGun, -5, -5);
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
		(game.player.x >> 8) + (game.player.pX >> 1),
		(game.player.y >> 8) + (game.player.pY >> 1),
		input.mouseX,
		input.mouseY,
	);
	ctx.save();
	ctx.translate((game.player.x >> 8) + 8, (game.player.y >> 8) + 6);
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
	drawImage(head[flipDx], game.player.animationFrame * 16, 0, 15, 12, -8, -6, 16, 12);
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
		drawImage(sparkle, 0, s.color * 9, 9, 9, (s.x >> 8) + dt, (s.y >> 8) + dt, 16 * sc, 16 * sc);
	}
}

/**
 * Draw a level: the tiles, the player, the objects, the boss, the labels, the death fade, the transitions and the
 * crosshair.
 *
 * @returns {void}
 */
export function drawLevel() {
	if (game.tilesChanged) createBuff();
	drawTileLayer();
	drawAnimatedTiles();

	drawGravPipes();

	const flipDx = game.player.flip < 0 ? 1 : 0;
	if (!flipDx) drawPortalGun();
	drawRotatedHead(flipDx);
	drawImage(body[flipDx], game.player.animationFrame * 16, 0, 16, 27, game.player.x >> 8, game.player.y >> 8, 16, 27);
	if (flipDx) drawPortalGun();

	drawCakes();
	drawTurrets();
	drawPlasma();
	drawSparkles();
	drawCrates();

	if (game.bossNum > 0) {
		drawBoss();
		if (game.bossNum == 1 || game.bossNum == 3) drawImage(tube, game.tubeX >> 8, game.tubeY >> 8);
		else if (game.bossNum == 2) {
			drawProjectiles();
			drawImage(tube2, game.tubeX >> 8, game.tubeY >> 8);
		} else if (game.bossNum == 4) {
			drawProjectiles();
			drawImage(tube, game.tubeX >> 8, game.tubeY >> 8);
		}
	}

	drawPlatforms();
	drawFrontTiles();
	drawPortals();
	drawCamera();
	drawLabels();

	if (game.player.dead) {
		const a = -(game.player.life / 256);
		ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - a) + ')';
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}

	if (game.player.fadeNextLevel >= 0) drawTransition();

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the labels of the level at their positions in the playfield.
 *
 * @returns {void}
 */
function drawLabels() {
	if (atExit() || game.player.fadeNextLevel > 0) return;
	ctx.font = '14px Arial';
	ctx.fillStyle = 'rgb(255, 255, 255)';
	for (const label of game.labels) ctx.fillText(label.text, label.x, label.y);
}

/**
 * Draw the current frames of the animated tiles.
 *
 * @returns {void}
 */
export function drawAnimatedTiles() {
	for (const tile of game.animatedTiles) {
		if (!tile.used) continue;
		drawImage(tileset[tile.current], tile.x << 4, tile.y << 4, 16, 16);
	}
}

/** @type {OffscreenCanvas|null} The copy of the background and the tile layer from saveTileLayer(). */
let tileLayer = null;

/**
 * Keep a copy of the background and the tile layer, which are drawn in the playfield.
 *
 * @returns {void}
 */
function saveTileLayer() {
	tileLayer = copyCanvas(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	game.tilesChanged = false;
}

/**
 * Draw the copy of the background and the tile layer into the playfield.
 *
 * @returns {void}
 */
export function drawTileLayer() {
	drawCopy(tileLayer, 0, 0);
}

/**
 * Draw the background and the tile layer and keep a copy for the next ticks.
 *
 * @returns {void}
 */
export function createBuff() {
	let i;
	drawImage(bg[game.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	for (i = 0; i < game.displayMap.length; i++) {
		const y = i >> 5;
		const x = i - (y << 5);
		if (game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < MAP_SIZE) {
			drawImage(tileset[game.displayMap[i]], x * 16, y * 16, 16, 16);
		}
	}
	saveTileLayer();
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
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
		drawImage(cake, c.x >> 8, (c.y + float) >> 8, 16, 12);
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
		const x = t.x >> 8;
		const y = t.y >> 8;
		ctx.save();
		ctx.translate(x + (t.pX >> 1), y + (t.pY >> 1));
		ctx.rotate(degToRad(t.angle));
		drawImage(turretImages[side], 0, t.animFrame * 32, 16, 32, -(t.pX >> 1), -(t.pY >> 1), 16, 32);
		ctx.restore();
		const dx = t.dir < 0 ? 0 : t.pX;
		const playerY = (game.player.y >> 8) + (game.player.pY >> 1);
		if (t.animFrame == 1 && !t.dead) {
			ctx.strokeStyle = 'rgb(255, 255, 0)';
			ctx.lineWidth = 3;
			const dy = random(-16, 16);
			line(x + dx, y + 13, game.player.x >> 8, playerY + dy);
		} else if (t.rotation < 10 && !t.dead) {
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			ctx.lineWidth = 1;
			line(x + dx, y + 13, t.ex >> 8, playerY);
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
		drawImage(plasma, 0, ball.animFrame * 16, 16, 16, (ball.x >> 8) + vx, (ball.y >> 8) + vy, 16, 16);
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
			drawImage(image, (p.x - p.vx * 4) >> 8, (p.y - p.vy * 4) >> 8, 16, 16);
			ctx.globalAlpha = 0.75;
			drawImage(image, (p.x - p.vx * 2) >> 8, (p.y - p.vy * 2) >> 8, 16, 16);
			ctx.globalAlpha = 1;
		}
		drawImage(image, p.x >> 8, p.y >> 8, 16, 16);
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
		ctx.translate((c.x >> 8) + (c.pX >> 1), (c.y >> 8) + (c.pY >> 1));
		ctx.rotate(degToRad(c.angle));
		drawImage(crateImage, 0, 0, 16, 16, -(c.pX >> 1), -(c.pY >> 1), 16 * sc, 16 * sc);
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
 * Draw the pipe fields as half transparent areas.
 *
 * @returns {void}
 */
function drawGravPipeFields() {
	ctx.fillStyle = 'rgb(151, 206, 233)';
	ctx.globalAlpha = 0.5;
	for (const field of game.gravPipeFields) {
		ctx.fillRect(field.x, field.y, field.w, field.h);
	}
	ctx.globalAlpha = 1;
}

/**
 * Draw the pipe fields and the gravitational pipes.
 *
 * @returns {void}
 */
export function drawGravPipes() {
	drawGravPipeFields();
	for (const t of game.gravPipes) {
		const x = t.x >> 8;
		const y = t.y >> 8;
		if (t.dir == Direction.RIGHT) drawImage(gravPipe, 0, 0, 16, 32, x, y, 16, 32);
		else if (t.dir == Direction.LEFT) drawImage(gravPipe, 0, 32, 16, 32, x, y, 16, 32);
		else if (t.dir == Direction.UP) drawImage(gravPipe2, 0, 0, 32, 16, x, y, 32, 16);
		else if (t.dir == Direction.DOWN) drawImage(gravPipe2, 32, 0, 32, 16, x, y, 32, 16);
	}
}

/**
 * Draw the platforms. In the editor, an arrow shows the direction.
 *
 * @returns {void}
 */
export function drawPlatforms() {
	for (const p of game.platforms) {
		const x = p.x >> 8;
		const y = p.y >> 8;
		drawImage(platform, x, y);
		if (ui.mode == 'edit') {
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
								drawImage(tileset[game.displayMap[t]], (tx + i) * 16, ty * 16, 16, 16);
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
								drawImage(tileset[game.displayMap[t]], tx * 16, (ty + i) * 16, 16, 16);
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
	ctx.translate((game.camera.x >> 8) + 8, (game.camera.y >> 8) + 8);
	ctx.rotate(a);
	drawImage(cameraFollow, 0, 0);
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
		drawImage(
			pi == 0 ? bluePortal : redPortal,
			0,
			32 * p.frame,
			32,
			32,
			(p.x >> 8) + dx,
			(p.y >> 8) + dy,
			32 * p.scaleX,
			32 * p.scaleY,
		);
	}
}

/**
 * Draw the standing player figure, e.g. in the editor.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} flipX The direction, 1 right or -1 left.
 * @returns {void}
 */
export function drawPlayer(x, y, flipX) {
	const flipDx = flipX < 0 ? 1 : 0;
	drawImage(body[flipDx], 16, 0, 16, 27, x, y, 16, 27);
	drawImage(head[flipDx], 16, 0, 15, 12, x, y, 16, 12);
}

/**
 * Draw the preview of a map with its objects. The first frame after a new map builds the tile layer and keeps a copy
 * of it. Each frame draws the copy and the objects on top. The cakes stand at their rest position, so each preview of
 * a map looks the same.
 *
 * @returns {void}
 */
export function drawPreviewMap() {
	let i, ti, ci, pi;
	if (game.tilesChanged) {
		drawImage(bg[game.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		for (i = 0; i < game.displayMap.length; i++) {
			const y = i >> 5;
			const x = i - (y << 5);
			if (game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < MAP_SIZE) {
				const open = game.cakesLeft == 0 && game.displayMap[i] == Tile.EXIT_CLOSED;
				const tile = open ? Tile.EXIT : game.displayMap[i];
				drawImage(tileset[tile], x * 16, y * 16, 16, 16);
			}
		}
		saveTileLayer();
	}
	drawTileLayer();

	game.player.flip = 1;

	ctx.save();
	ctx.translate((game.player.x >> 8) + (game.player.pX >> 1), (game.player.y >> 8) + (game.player.pY >> 1));
	drawImage(portalGun, -5, -5);
	ctx.restore();

	const flipDx = game.player.flip < 0 ? 1 : 0;
	drawImage(head[flipDx], game.player.animationFrame * 16, 0, 15, 12, game.player.x >> 8, game.player.y >> 8, 16, 12);
	drawImage(body[flipDx], game.player.animationFrame * 16, 0, 16, 27, game.player.x >> 8, game.player.y >> 8, 16, 27);

	for (i = 0; i < game.cakes.length; i++) {
		if (game.cakes[i].used) {
			drawImage(cake, game.cakes[i].x >> 8, game.cakes[i].y >> 8, 16, 12);
		}
	}

	for (ti = 0; ti < game.turrets.length; ti++) {
		const side = game.turrets[ti].dir < 0 ? 0 : 1;
		drawImage(
			turretImages[side],
			0,
			game.turrets[ti].animFrame * 32,
			16,
			32,
			game.turrets[ti].x >> 8,
			game.turrets[ti].y >> 8,
			16,
			32,
		);
	}

	for (ci = 0; ci < game.crates.length; ci++) {
		drawImage(crateImage, game.crates[ci].x >> 8, game.crates[ci].y >> 8);
	}

	for (pi = 0; pi < game.platforms.length; pi++) {
		drawImage(platform, game.platforms[pi].x >> 8, game.platforms[pi].y >> 8);
	}

	drawGravPipes();

	if (game.bossNum > 0) {
		if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) drawImage(tube, game.tubeX >> 8, game.tubeY >> 8);
		else if (game.bossNum == 2) drawImage(tube2, game.tubeX >> 8, game.tubeY >> 8);
		drawBoss();
	}

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	ctx.lineWidth = 1;
}
