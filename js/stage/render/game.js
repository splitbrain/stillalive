/**
 * Drawing of a level and of the preview of a map.
 */

import { ctx, drawImage } from '../canvas.js';
import {
	DEATH_FADE,
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
	cakeImage,
	cameraFollow,
	crateImage,
	crosshair,
	head,
	plasma,
	platformImage,
	portalGun,
	redPortal,
	sparkleImage,
	tileset,
	tube,
	tube2,
	gravPipe,
	gravPipe2,
	turretImages,
} from '../images.js';
import { drawBoss } from './boss.js';
import { drawTransition } from './transitions.js';
import { degToRad, getAngle, radToDeg, random, toPixels } from '../utils.js';

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
 * The layouts of the labels that were measured with the loaded label font.
 *
 * @typedef {WeakMap<import('../mapFile.js').MapLabel, {lines: string[], metrics: TextMetrics[], tilt: number}>}
 *     LabelLayouts
 */

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
 * @param {import('../World.js').World} world The World.
 * @param {import('../InputState.js').InputState} input The mouse position.
 * @returns {void}
 */
function drawPortalGun(world, input) {
	if (world.abilities.portals) {
		const angle = getAngle(world.player.midX(), world.player.midY(), input.mouseX, input.mouseY);
		ctx.save();
		ctx.translate(world.player.midX(), world.player.midY());
		ctx.rotate(angle);
		drawImage(portalGun, -5, -5);
		ctx.restore();
	}
}

/**
 * Limit the angle of the head of the player, so the head does not turn too far up or down.
 *
 * @param {number} angle The angle from the neck to the mouse in degrees.
 * @param {number} flipDx 1 when the player faces left, else 0.
 * @returns {number} The angle of the head in degrees. Facing left, the angle is turned by 180 degrees.
 */
function limitHeadAngle(angle, flipDx) {
	if (!flipDx) return Math.min(Math.max(angle, -23), 15);
	const turned = angle - 180;
	return turned >= -360 && turned <= -270 ? Math.min(turned, -334) : Math.max(turned, -15);
}

/**
 * Draw the head of the player, turned towards the mouse.
 *
 * @param {import('../World.js').World} world The World.
 * @param {import('../InputState.js').InputState} input The mouse position.
 * @param {number} flipDx 1 when the player faces left, else 0.
 * @returns {void}
 */
function drawRotatedHead(world, input, flipDx) {
	const angle = getAngle(world.player.midX(), world.player.midY(), input.mouseX, input.mouseY);
	ctx.save();
	// facing left, the head image is mirrored around the pivot, so the pivot sits at the mirrored x of the neck
	const [pivotX, pivotY] = HEAD_PIVOT;
	ctx.translate(
		world.player.pixelX + (flipDx ? 16 - pivotX : pivotX),
		world.player.pixelY + pivotY + HEAD_BOB[world.player.animationFrame],
	);
	ctx.rotate(degToRad(limitHeadAngle(radToDeg(angle), flipDx)));
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
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawSparkles(world) {
	for (const sparkle of world.sparkles) {
		if (sparkle.fading <= 0) continue;
		const scale = sparkle.fading / 255;
		// a fading sparkle shrinks around its middle, and blood drops sit lower
		let offset = 9 - scale * 9;
		if (sparkle.type === SparkleType.LOW_LIFE || sparkle.type === SparkleType.SHOT_HIT) offset -= 8;
		drawImage(
			sparkleImage,
			0,
			sparkle.color * 9,
			9,
			9,
			toPixels(sparkle.x) + offset,
			toPixels(sparkle.y) + offset,
			16 * scale,
			16 * scale,
		);
	}
}

/**
 * Draw a level over its tile layer.
 *
 * @param {import('../World.js').World} world The World.
 * @param {import('../InputState.js').InputState} input The mouse position.
 * @param {LabelLayouts} labelLayouts The layouts of the labels for the next frames.
 * @returns {void}
 */
export function drawLevel(world, input, labelLayouts) {
	drawAnimatedTiles(world);

	drawGravPipes(world);

	const flipDx = world.player.flip < 0 ? 1 : 0;
	if (!flipDx) drawPortalGun(world, input);
	drawRotatedHead(world, input, flipDx);
	drawBody(world.player.pixelX, world.player.pixelY, world.player.animationFrame, world.player.flip);
	if (flipDx) drawPortalGun(world, input);

	drawCakes(world);
	drawTurrets(world);
	drawPlasma(world);
	drawSparkles(world);
	drawCrates(world);

	if (world.boss) {
		drawBoss(world);
		if (world.boss.shootsWheels()) drawProjectiles(world);
		drawTube(world);
	}

	drawPlatforms(world, false);
	drawFrontTiles(world);
	drawPortals(world);
	drawCamera(world);
	drawLabels(world, labelLayouts);

	if (world.player.dead) {
		ctx.fillStyle = `rgba(0, 0, 0, ${1 + world.player.life / DEATH_FADE})`;
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}

	drawTransition(world.phase);

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the labels of the level at their positions in the playfield.
 *
 * @param {import('../World.js').World} world The World.
 * @param {LabelLayouts} labelLayouts The layouts of the labels for the next frames.
 * @returns {void}
 */
function drawLabels(world, labelLayouts) {
	if (!world.phase.isRunning() && !world.phase.isHalted()) return;
	ctx.save();
	ctx.font = LABEL_FONT;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
	ctx.textAlign = 'center';
	for (const label of world.labels) drawLabel(label, labelLayouts);
	ctx.restore();
}

/**
 * Draw a label centered on its tile, with its tilt.
 *
 * Each line is centered on its letters, so a line without descenders does not look too high.
 *
 * @param {import('../mapFile.js').MapLabel} label The label.
 * @param {LabelLayouts} labelLayouts The layouts of the labels for the next frames.
 * @returns {void}
 */
function drawLabel(label, labelLayouts) {
	const { lines, metrics, tilt } = labelLayouts.get(label) ?? layoutLabel(label, labelLayouts);

	ctx.save();
	ctx.translate(label.x * TILE_SIZE + TILE_SIZE / 2, label.y * TILE_SIZE + TILE_SIZE / 2);
	ctx.rotate(tilt);
	for (const [i, metric] of metrics.entries()) {
		const lineY = (i - (lines.length - 1) / 2) * LABEL_LINE_HEIGHT;
		ctx.fillText(lines[i], 0, lineY + (metric.actualBoundingBoxAscent - metric.actualBoundingBoxDescent) / 2);
	}
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
 * @param {LabelLayouts} labelLayouts The layouts of the labels for the next frames.
 * @returns {{lines: string[], metrics: TextMetrics[], tilt: number}} The lines, their metrics and the tilt in
 *     radians.
 */
function layoutLabel(label, labelLayouts) {
	const lines = label.text.split('\n');
	const metrics = lines.map((line) => ctx.measureText(line));
	const width = Math.max(...metrics.map((metric) => metric.width));
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
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawAnimatedTiles(world) {
	for (const tile of world.animatedTiles) {
		if (!tile.used) continue;
		drawImage(tileset[tile.current], tile.x << TILE_SIZE_BITS, tile.y << TILE_SIZE_BITS, TILE_SIZE, TILE_SIZE);
	}
}

/**
 * Draw the background and the display layer of the map of a World.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function drawTileLayer(world) {
	drawImage(bg[world.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	drawTiles(world.map);
}

/**
 * Draw the display layer of a map.
 *
 * @param {import('../TileMap.js').TileMap} map The map.
 * @returns {void}
 */
export function drawTiles(map) {
	for (const [i, tile] of map.display.entries()) {
		if (tile > 0 && tile < NUM_TILES) {
			drawImage(tileset[tile], map.column(i) * TILE_SIZE, map.row(i) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
		}
	}
}

/**
 * Draw the cakes. The cakes float only while the level time runs. Else they stand at their rest position.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function drawCakes(world) {
	for (const cake of world.cakes) {
		if (!cake.used) continue;
		const float = world.phase.isRunning() ? cake.vy : 0;
		drawImage(cakeImage, cake.pixelX, toPixels(cake.y + float), TILE_SIZE, 12);
	}
}

/**
 * Draw the turrets with their laser sights.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function drawTurrets(world) {
	for (const turret of world.turrets) {
		const side = turret.dir < 0 ? 0 : 1;
		const x = turret.pixelX;
		const y = turret.pixelY;
		ctx.save();
		ctx.translate(turret.midX(), turret.midY());
		ctx.rotate(degToRad(turret.angle));
		drawImage(
			turretImages[side],
			0,
			turret.animFrame * 2 * TILE_SIZE,
			TILE_SIZE,
			2 * TILE_SIZE,
			-(turret.width >> 1),
			-(turret.height >> 1),
			TILE_SIZE,
			2 * TILE_SIZE,
		);
		ctx.restore();
		const dx = turret.dir < 0 ? 0 : turret.width;
		const playerY = world.player.midY();
		if (turret.animFrame === 1 && !turret.dead) {
			ctx.strokeStyle = 'rgb(255, 255, 0)';
			ctx.lineWidth = 3;
			const dy = random(-16, 16);
			line(x + dx, y + 13, world.player.pixelX, playerY + dy);
		} else if (turret.rotation < 10 && !turret.dead) {
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			ctx.lineWidth = 1;
			line(x + dx, y + 13, toPixels(turret.sightEndX), playerY);
		}
	}
}

/**
 * Draw the plasma balls with their pulse.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawPlasma(world) {
	for (const ball of world.plasmaBall) {
		if (!ball.used) continue;
		let vx = 0;
		let vy = 0;
		if (ball.vx !== 0) vy = ball.scale;
		else if (ball.vy !== 0) vx = ball.scale;
		drawImage(
			plasma,
			0,
			ball.animFrame * TILE_SIZE,
			TILE_SIZE,
			TILE_SIZE,
			ball.pixelX + vx,
			ball.pixelY + vy,
			TILE_SIZE,
			TILE_SIZE,
		);
	}
}

/**
 * Draw the razor wheels of the boss with their motion trail.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawProjectiles(world) {
	for (const wheel of world.projectiles) {
		const image = tileset[wheel.frame];
		if (!wheel.needKill) {
			ctx.globalAlpha = 0.5;
			drawImage(image, toPixels(wheel.x - wheel.vx * 4), toPixels(wheel.y - wheel.vy * 4), TILE_SIZE, TILE_SIZE);
			ctx.globalAlpha = 0.75;
			drawImage(image, toPixels(wheel.x - wheel.vx * 2), toPixels(wheel.y - wheel.vy * 2), TILE_SIZE, TILE_SIZE);
			ctx.globalAlpha = 1;
		}
		drawImage(image, wheel.pixelX, wheel.pixelY, TILE_SIZE, TILE_SIZE);
	}
}

/**
 * Draw the crates. A destroyed crate shrinks.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function drawCrates(world) {
	for (const crate of world.crates) {
		const scale = crate.shrink > 0 ? crate.shrink / 60 : 1;
		ctx.save();
		ctx.translate(crate.midX(), crate.midY());
		ctx.rotate(degToRad(crate.angle));
		drawImage(
			crateImage,
			0,
			0,
			TILE_SIZE,
			TILE_SIZE,
			-(crate.width >> 1),
			-(crate.height >> 1),
			TILE_SIZE * scale,
			TILE_SIZE * scale,
		);
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
	const tip = dir === -1 ? xa - 6 : xa + 6;
	triangle(tip, y1, xa, y1 - 6, xa, y1 + 6);
}

/**
 * Draw the pipe fields as half transparent areas.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawGravPipeFields(world) {
	ctx.fillStyle = 'rgb(151, 206, 233)';
	ctx.globalAlpha = 0.5;
	for (const field of world.gravPipeFields) {
		ctx.fillRect(field.x, field.y, field.width, field.height);
	}
	ctx.globalAlpha = 1;
}

/**
 * Draw the pipe fields and the gravitational pipes.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function drawGravPipes(world) {
	drawGravPipeFields(world);
	for (const pipe of world.gravPipes) drawGravPipe(pipe.dir, pipe.pixelX, pipe.pixelY);
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
	switch (dir) {
		case Direction.RIGHT:
			drawImage(gravPipe, 0, 0, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
			break;
		case Direction.LEFT:
			drawImage(gravPipe, 0, 2 * TILE_SIZE, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
			break;
		case Direction.UP:
			drawImage(gravPipe2, 0, 0, 2 * TILE_SIZE, TILE_SIZE, x, y, 2 * TILE_SIZE, TILE_SIZE);
			break;
		case Direction.DOWN:
			drawImage(gravPipe2, 2 * TILE_SIZE, 0, 2 * TILE_SIZE, TILE_SIZE, x, y, 2 * TILE_SIZE, TILE_SIZE);
			break;
	}
}

/**
 * Draw the tube of the boss.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawTube(world) {
	drawImage(world.boss.number === 2 ? tube2 : tube, toPixels(world.tubeX), toPixels(world.tubeY));
}

/**
 * Draw the platforms.
 *
 * @param {import('../World.js').World} world The World.
 * @param {boolean} arrow True to show the direction of each platform with an arrow.
 * @returns {void}
 */
export function drawPlatforms(world, arrow) {
	for (const platform of world.platforms) drawPlatform(platform.pixelX, platform.pixelY, platform.dir, arrow);
}

/**
 * Draw a platform.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} dir The direction, -1 left or 1 right.
 * @param {boolean} arrow True to show the direction with an arrow.
 * @returns {void}
 */
export function drawPlatform(x, y, dir, arrow) {
	drawImage(platformImage, x, y);
	if (arrow) {
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.strokeStyle = 'rgb(255, 0, 0)';
		drawArrow(x + 5, y + TILE_SIZE / 2, x + 15, y + TILE_SIZE / 2, 3, dir);
	}
}

/**
 * Draw the tiles around the portals over the objects that are half in a portal.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawFrontTiles(world) {
	if (!world.objectInPortal) return;
	for (const portal of world.portals.list) {
		if (portal.platform) continue;
		const onFloor = portal.direction === Direction.UP || portal.direction === Direction.DOWN;
		const onWall = portal.direction === Direction.LEFT || portal.direction === Direction.RIGHT;
		if (!onFloor && !onWall) continue;
		const tx = toPixels(portal.x) >> TILE_SIZE_BITS;
		const ty = toPixels(portal.y) >> TILE_SIZE_BITS;
		for (let i = 0; i < 4; i++) {
			const column = onFloor ? tx + i : tx;
			const row = onFloor ? ty : ty + i;
			if (column < 0 || column >= MAP_WIDTH || row < 0 || row >= MAP_HEIGHT) continue;
			const image = tileset[world.map.display[world.map.index(column, row)]];
			if (image) drawImage(image, column * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
		}
	}
}

/**
 * Draw the security camera turned towards the player.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawCamera(world) {
	const angle = getAngle(
		world.player.midX(),
		world.player.pixelY + 8,
		toPixels(world.camera.x) + TILE_SIZE / 2,
		toPixels(world.camera.y) + TILE_SIZE / 2,
	);
	ctx.save();
	ctx.translate(toPixels(world.camera.x) + TILE_SIZE / 2, toPixels(world.camera.y) + TILE_SIZE / 2);
	ctx.rotate(angle);
	drawImage(cameraFollow, 0, 0);
	ctx.restore();
}

/**
 * Draw the portals with their opening animation.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
function drawPortals(world) {
	for (const [index, portal] of world.portals.list.entries()) {
		if (!portal.used) continue;
		// an opening portal grows from its middle
		const onSideWall = portal.direction === Direction.LEFT || portal.direction === Direction.RIGHT;
		const onFloor = portal.direction === Direction.UP || portal.direction === Direction.DOWN;
		const dx = onFloor ? TILE_SIZE - portal.scaleX * TILE_SIZE : 0;
		const dy = onSideWall ? TILE_SIZE - portal.scaleY * TILE_SIZE : 0;
		drawImage(
			index === 0 ? bluePortal : redPortal,
			0,
			2 * TILE_SIZE * portal.frame,
			2 * TILE_SIZE,
			2 * TILE_SIZE,
			toPixels(portal.x) + dx,
			toPixels(portal.y) + dy,
			2 * TILE_SIZE * portal.scaleX,
			2 * TILE_SIZE * portal.scaleY,
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
 * Draw the preview of a map with its objects over its tile layer.
 *
 * @param {import('../World.js').World} world The World.
 * @param {import('../InputState.js').InputState} input The mouse position.
 * @returns {void}
 */
export function drawPreviewMap(world, input) {
	ctx.save();
	ctx.translate(world.player.midX(), world.player.midY());
	drawImage(portalGun, -5, -5);
	ctx.restore();

	drawPlayer(world.player.pixelX, world.player.pixelY, world.player.flip, world.player.animationFrame);

	drawCakes(world);
	drawTurrets(world);
	drawCrates(world);
	drawPlatforms(world, false);
	drawGravPipes(world);

	if (world.boss) {
		drawTube(world);
		drawBoss(world);
	}

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}
