/**
 * Drawing of a level and of the preview of a map.
 */

import { canvasGeneration, copyCanvas, ctx, drawCopy, drawImage } from '../canvas.js';
import {
	Direction,
	MAP_HEIGHT,
	MAP_WIDTH,
	NUM_TILES,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	SparkleType,
	TILE_SIZE,
	TILE_SIZE_BITS,
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
import { drawTransition } from './transitions.js';
import { game, input, ui } from '../state.js';
import { degToRad, getAngle, radToDeg, random } from '../utils.js';

/**
 * @type {number[]} The vertical offset of the head for each frame of the body, in canvas pixels. The head follows the
 *     collar, which is higher in the frames where one leg passes the other.
 */
const HEAD_BOB = [0, 0, -0.21, 0, -0.21];

/** @type {number[]} The point of the head image that the head turns around, the neck, in canvas pixels. */
const HEAD_PIVOT = [7, 11];

/** @type {string} The font of the labels. */
const LABEL_FONT = '13px mynerve';

/** @type {number} The distance between the lines of a label in canvas pixels. */
const LABEL_LINE_HEIGHT = 14;

/** @type {number} The largest tilt of a label in degrees. */
const LABEL_MAX_TILT = 3;

/** @type {number} The largest distance in canvas pixels that the tilt moves the ends of a label up or down. */
const LABEL_MAX_RISE = 1;

/**
 * @type {WeakMap<import('../mapFile.js').MapLabel, {lines: string[], metrics: TextMetrics[], tilt: number}>} The
 *     layout of each label that was measured with the loaded label font.
 */
const labelLayouts = new WeakMap();

// the canvas does not load a font by itself before the first label needs it
document.fonts.load(LABEL_FONT);

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
		const a = getAngle(game.player.midX(), game.player.midY(), input.mouseX, input.mouseY);
		ctx.save();
		ctx.translate(game.player.midX(), game.player.midY());
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
	let a = getAngle(game.player.midX(), game.player.midY(), input.mouseX, input.mouseY);
	ctx.save();
	// facing left, the head image is mirrored around the pivot, so the pivot sits at the mirrored x of the neck
	const [pivotX, pivotY] = HEAD_PIVOT;
	ctx.translate(
		(game.player.x >> 8) + (flipDx ? 16 - pivotX : pivotX),
		(game.player.y >> 8) + pivotY + HEAD_BOB[game.player.animationFrame],
	);
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
	if (flipDx) ctx.scale(-1, 1);
	drawImage(head, -pivotX, -pivotY, 16, 14);
	ctx.restore();
}

/**
 * Mirror the next drawings of the canvas around a vertical line.
 *
 * @param {number} x The x coordinate of the line in canvas pixels.
 * @returns {void}
 */
function mirrorAround(x) {
	ctx.translate(2 * x, 0);
	ctx.scale(-1, 1);
}

/**
 * Draw a frame of the body of the player. The image faces right. For the left direction, the image is mirrored.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} frame The frame: 0 for the standing figure, 1 to 4 for the walk cycle.
 * @param {number} flipX The direction, 1 right or -1 left.
 * @returns {void}
 */
function drawBody(x, y, frame, flipX) {
	ctx.save();
	if (flipX < 0) mirrorAround(x + TILE_SIZE / 2);
	drawImage(body, frame * TILE_SIZE, 0, TILE_SIZE, 27, x, y, TILE_SIZE, 27);
	ctx.restore();
}

/**
 * Draw the sparkles. The size follows the fade.
 *
 * @returns {void}
 */
function drawSparkles() {
	for (const s of game.sparkles) {
		if (s.fading <= 0) continue;
		const sc = s.fading / 255;
		let dt = 9 - sc * 9;
		if (s.type == SparkleType.LOW_LIFE || s.type == SparkleType.SHOT_HIT) dt -= 8;
		drawImage(sparkle, 0, s.color * 9, 9, 9, (s.x >> 8) + dt, (s.y >> 8) + dt, 16 * sc, 16 * sc);
	}
}

/**
 * Draw a level.
 *
 * @returns {void}
 */
export function drawLevel() {
	if (!isSameSource(tileLayerSource, layerSource())) createBuff();
	drawTileLayer();
	drawAnimatedTiles();

	drawGravPipes();

	const flipDx = game.player.flip < 0 ? 1 : 0;
	if (!flipDx) drawPortalGun();
	drawRotatedHead(flipDx);
	drawBody(game.player.x >> 8, game.player.y >> 8, game.player.animationFrame, game.player.flip);
	if (flipDx) drawPortalGun();

	drawCakes();
	drawTurrets();
	drawPlasma();
	drawSparkles();
	drawCrates();

	if (game.boss) {
		drawBoss();
		if (game.boss.shootsWheels()) drawProjectiles();
		drawTube();
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

	drawTransition();

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the labels of the level at their positions in the playfield.
 *
 * @returns {void}
 */
function drawLabels() {
	if (!game.isRunning() && !game.isHalted()) return;
	ctx.save();
	ctx.font = LABEL_FONT;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
	ctx.textAlign = 'center';
	for (const label of game.labels) drawLabel(label);
	ctx.restore();
}

/**
 * Draw a label centered on its tile, with its tilt.
 *
 * Each line is centered on its letters, so a line without descenders does not look too high.
 *
 * @param {import('../mapFile.js').MapLabel} label The label.
 * @returns {void}
 */
function drawLabel(label) {
	const { lines, metrics, tilt } = labelLayouts.get(label) ?? layoutLabel(label);

	ctx.save();
	ctx.translate(label.x * TILE_SIZE + TILE_SIZE / 2, label.y * TILE_SIZE + TILE_SIZE / 2);
	ctx.rotate(tilt);
	metrics.forEach((m, i) => {
		const lineY = (i - (lines.length - 1) / 2) * LABEL_LINE_HEIGHT;
		ctx.fillText(lines[i], 0, lineY + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
	});
	ctx.restore();
}

/**
 * Measure the lines of a label and calculate its tilt. The layout is kept for the next frames once the label font is
 * loaded.
 *
 * The hash of the text sets the tilt, so a label always has the same tilt. The tilt of a wide label is smaller, so its
 * ends stay in the tile row.
 *
 * @param {import('../mapFile.js').MapLabel} label The label.
 * @returns {{lines: string[], metrics: TextMetrics[], tilt: number}} The lines, their metrics and the tilt in
 *     radians.
 */
function layoutLabel(label) {
	const lines = label.text.split('\n');
	const metrics = lines.map((line) => ctx.measureText(line));
	const width = Math.max(...metrics.map((m) => m.width));
	const maxTilt = Math.min(degToRad(LABEL_MAX_TILT), Math.atan(LABEL_MAX_RISE / (width / 2)));
	const tilt = ((hashText(label.text) / 0xffffffff) * 2 - 1) * maxTilt;
	const layout = { lines, metrics, tilt };
	if (document.fonts.check(LABEL_FONT)) labelLayouts.set(label, layout);
	return layout;
}

/**
 * Calculate a hash of a text with the FNV-1a algorithm.
 *
 * @param {string} text The text.
 * @returns {number} The hash, an unsigned 32 bit integer.
 */
function hashText(text) {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

/**
 * Draw the current frames of the animated tiles.
 *
 * @returns {void}
 */
function drawAnimatedTiles() {
	for (const tile of game.animatedTiles) {
		if (!tile.used) continue;
		drawImage(tileset[tile.current], tile.x << TILE_SIZE_BITS, tile.y << TILE_SIZE_BITS, TILE_SIZE, TILE_SIZE);
	}
}

/**
 * The map, the version of the map, the background and the canvas generation that a cached layer shows.
 *
 * @typedef {object} LayerSource
 * @property {import('../TileMap.js').TileMap} map The map.
 * @property {number} version The version of the map.
 * @property {number} background The index of the background image.
 * @property {number} generation The generation of the canvas buffer.
 */

/**
 * Get the source of a cached layer for the current map, background and canvas buffer.
 *
 * @returns {LayerSource} The source.
 */
export function layerSource() {
	return { map: game.map, version: game.map.version, background: game.background, generation: canvasGeneration() };
}

/**
 * Check if two layer sources are the same, so a cached layer of one source can show the other.
 *
 * @param {LayerSource|null} a The first source, or null for no cached layer.
 * @param {LayerSource} b The second source.
 * @returns {boolean} True if the sources are the same.
 */
export function isSameSource(a, b) {
	return (
		a != null &&
		a.map === b.map &&
		a.version == b.version &&
		a.background == b.background &&
		a.generation == b.generation
	);
}

/** @type {OffscreenCanvas|null} The copy of the background and the tile layer from saveTileLayer(). */
let tileLayer = null;

/** @type {LayerSource|null} The source of tileLayer, or null before the first copy. */
let tileLayerSource = null;

/**
 * Keep a copy of the background and the tile layer, which are drawn in the playfield.
 *
 * @returns {void}
 */
function saveTileLayer() {
	tileLayer = copyCanvas(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	tileLayerSource = layerSource();
}

/**
 * Draw the copy of the background and the tile layer into the playfield.
 *
 * @returns {void}
 */
function drawTileLayer() {
	drawCopy(tileLayer, 0, 0);
}

/**
 * Draw the background and the tile layer and keep a copy for the next frames.
 *
 * @returns {void}
 */
function createBuff() {
	drawImage(bg[game.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	drawTiles(game.map);
	saveTileLayer();
}

/**
 * Draw the display layer of a map.
 *
 * @param {import('../TileMap.js').TileMap} map The map.
 * @returns {void}
 */
export function drawTiles(map) {
	const tiles = map.display;
	for (let i = 0; i < tiles.length; i++) {
		if (tiles[i] > 0 && tiles[i] < NUM_TILES)
			drawImage(tileset[tiles[i]], map.column(i) * TILE_SIZE, map.row(i) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
	}
}

/**
 * Draw the cakes. The cakes float only while the level time runs. Else they stand at their rest position.
 *
 * @returns {void}
 */
export function drawCakes() {
	for (const c of game.cakes) {
		if (!c.used) continue;
		const float = game.isRunning() ? c.vy : 0;
		drawImage(cake, c.x >> 8, (c.y + float) >> 8, TILE_SIZE, 12);
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
		ctx.translate(t.midX(), t.midY());
		ctx.rotate(degToRad(t.angle));
		drawImage(
			turretImages[side],
			0,
			t.animFrame * 2 * TILE_SIZE,
			TILE_SIZE,
			2 * TILE_SIZE,
			-(t.pX >> 1),
			-(t.pY >> 1),
			TILE_SIZE,
			2 * TILE_SIZE,
		);
		ctx.restore();
		const dx = t.dir < 0 ? 0 : t.pX;
		const playerY = game.player.midY();
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
function drawPlasma() {
	for (const ball of game.plasmaBall) {
		if (!ball.used) continue;
		let vx = 0;
		let vy = 0;
		if (ball.vx != 0) vy = ball.scale;
		else if (ball.vy != 0) vx = ball.scale;
		drawImage(
			plasma,
			0,
			ball.animFrame * TILE_SIZE,
			TILE_SIZE,
			TILE_SIZE,
			(ball.x >> 8) + vx,
			(ball.y >> 8) + vy,
			TILE_SIZE,
			TILE_SIZE,
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
			drawImage(image, (p.x - p.vx * 4) >> 8, (p.y - p.vy * 4) >> 8, TILE_SIZE, TILE_SIZE);
			ctx.globalAlpha = 0.75;
			drawImage(image, (p.x - p.vx * 2) >> 8, (p.y - p.vy * 2) >> 8, TILE_SIZE, TILE_SIZE);
			ctx.globalAlpha = 1;
		}
		drawImage(image, p.x >> 8, p.y >> 8, TILE_SIZE, TILE_SIZE);
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
		ctx.translate(c.midX(), c.midY());
		ctx.rotate(degToRad(c.angle));
		drawImage(crateImage, 0, 0, TILE_SIZE, TILE_SIZE, -(c.pX >> 1), -(c.pY >> 1), TILE_SIZE * sc, TILE_SIZE * sc);
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
	for (const t of game.gravPipes) drawGravPipe(t.dir, t.x >> 8, t.y >> 8);
}

/**
 * Draw a gravitational pipe.
 *
 * @param {number} dir The direction of the push, a value of Direction.
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @returns {void}
 */
export function drawGravPipe(dir, x, y) {
	if (dir == Direction.RIGHT) drawImage(gravPipe, 0, 0, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
	else if (dir == Direction.LEFT)
		drawImage(gravPipe, 0, 2 * TILE_SIZE, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
	else if (dir == Direction.UP) drawImage(gravPipe2, 0, 0, 2 * TILE_SIZE, TILE_SIZE, x, y, 2 * TILE_SIZE, TILE_SIZE);
	else if (dir == Direction.DOWN)
		drawImage(gravPipe2, 2 * TILE_SIZE, 0, 2 * TILE_SIZE, TILE_SIZE, x, y, 2 * TILE_SIZE, TILE_SIZE);
}

/**
 * Draw the tube of the boss.
 *
 * @returns {void}
 */
function drawTube() {
	drawImage(game.boss.number == 2 ? tube2 : tube, game.tubeX >> 8, game.tubeY >> 8);
}

/**
 * Draw the platforms.
 *
 * @returns {void}
 */
export function drawPlatforms() {
	for (const p of game.platforms) drawPlatform(p.x >> 8, p.y >> 8, p.dir);
}

/**
 * Draw a platform. In the editor, an arrow shows the direction.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} dir The direction, -1 left or 1 right.
 * @returns {void}
 */
export function drawPlatform(x, y, dir) {
	drawImage(platform, x, y);
	if (ui.mode == 'edit') {
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		drawArrow(x + 5, y + TILE_SIZE / 2, x + 15, y + TILE_SIZE / 2, 3, dir);
	}
}

/**
 * Draw the tiles around the portals over the objects that are half in a portal.
 *
 * @returns {void}
 */
function drawFrontTiles() {
	let tx, ty, t, p, i;
	if (game.objectInPortal) {
		for (p = 0; p < game.portals.length; p++) {
			if (!game.portals[p].platform) {
				const x = game.portals[p].x >> 8;
				const y = game.portals[p].y >> 8;
				if (game.portals[p].direction == Direction.UP || game.portals[p].direction == Direction.DOWN) {
					tx = x >> TILE_SIZE_BITS;
					ty = y >> TILE_SIZE_BITS;
					for (i = 0; i < 4; i++) {
						if (tx + i < MAP_WIDTH && tx + i >= 0) {
							t = game.map.index(tx + i, ty);
							if (tileset[game.map.display[t]]) {
								drawImage(tileset[game.map.display[t]], (tx + i) * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
							}
						}
					}
				} else if (game.portals[p].direction == Direction.LEFT || game.portals[p].direction == Direction.RIGHT) {
					tx = x >> TILE_SIZE_BITS;
					ty = y >> TILE_SIZE_BITS;
					for (i = 0; i < 4; i++) {
						if (ty + i < MAP_HEIGHT && ty + i >= 0) {
							t = game.map.index(tx, ty + i);
							if (game.map.display[t] < tileset.length) {
								drawImage(tileset[game.map.display[t]], tx * TILE_SIZE, (ty + i) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
		game.player.midX(),
		(game.player.y >> 8) + 8,
		(game.camera.x >> 8) + TILE_SIZE / 2,
		(game.camera.y >> 8) + TILE_SIZE / 2,
	);
	ctx.save();
	ctx.translate((game.camera.x >> 8) + TILE_SIZE / 2, (game.camera.y >> 8) + TILE_SIZE / 2);
	ctx.rotate(a);
	drawImage(cameraFollow, 0, 0);
	ctx.restore();
}

/**
 * Draw the portals with their opening animation.
 *
 * @returns {void}
 */
function drawPortals() {
	for (let pi = 0; pi < game.portals.length; pi++) {
		const p = game.portals[pi];
		if (!p.used) continue;
		let dx = 0;
		let dy = 0;
		if (p.direction == Direction.LEFT || p.direction == Direction.RIGHT) dy = TILE_SIZE - p.scaleY * TILE_SIZE;
		else if (p.direction == Direction.UP || p.direction == Direction.DOWN) dx = TILE_SIZE - p.scaleX * TILE_SIZE;
		drawImage(
			pi == 0 ? bluePortal : redPortal,
			0,
			2 * TILE_SIZE * p.frame,
			2 * TILE_SIZE,
			2 * TILE_SIZE,
			(p.x >> 8) + dx,
			(p.y >> 8) + dy,
			2 * TILE_SIZE * p.scaleX,
			2 * TILE_SIZE * p.scaleY,
		);
	}
}

/**
 * Draw the player figure with the head straight, e.g. in the editor. The figure faces right. For the left direction,
 * the figure is mirrored.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} flipX The direction, -1 for left, else right.
 * @param {number} [frame] The frame of the body: 0 for the standing figure, 1 to 4 for the walk cycle.
 * @returns {void}
 */
export function drawPlayer(x, y, flipX, frame = 0) {
	ctx.save();
	if (flipX < 0) mirrorAround(x + TILE_SIZE / 2);
	drawImage(head, x, y + HEAD_BOB[frame], 16, 14);
	ctx.restore();
	drawBody(x, y, frame, flipX);
}

/**
 * Draw the preview of a map with its objects.
 *
 * @returns {void}
 */
export function drawPreviewMap() {
	if (!isSameSource(tileLayerSource, layerSource())) createBuff();
	drawTileLayer();

	ctx.save();
	ctx.translate(game.player.midX(), game.player.midY());
	drawImage(portalGun, -5, -5);
	ctx.restore();

	drawPlayer(game.player.x >> 8, game.player.y >> 8, game.player.flip, game.player.animationFrame);

	drawCakes();
	drawTurrets();
	drawCrates();
	drawPlatforms();
	drawGravPipes();

	if (game.boss) {
		drawTube();
		drawBoss();
	}

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}
