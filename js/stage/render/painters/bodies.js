/**
 * The painters of the bodies.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { Direction, DIRECTIONS, TILE_SIZE } from '../../constants.js';
import {
	cakeImage,
	crateImage,
	gravPipe,
	gravPipe2,
	plasma,
	platformImage,
	turretImages,
} from '../../browser/images.js';
import { arrow, line } from '../shapes.js';
import { degToRad, random, toPixels } from '../../utils.js';

/**
 * @type {Object<number, number[]>} The position [x, y] of the frame of a gravitational pipe in its image, by the
 *     direction of the push. The pipes that push left or right are in one image, the pipes that push up or down in a
 *     second image.
 */
const GRAVPIPE_FRAMES = {
	[Direction.UP]: [0, 0],
	[Direction.DOWN]: [2 * TILE_SIZE, 0],
	[Direction.LEFT]: [0, 2 * TILE_SIZE],
	[Direction.RIGHT]: [0, 0],
};

/**
 * The painter of the cakes.
 */
export class CakePainter {
	/**
	 * Draw the cakes. The cakes float only while the level time runs. Else they stand at their rest position.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		for (const cake of world.cakes) {
			const float = world.phase.isRunning() ? cake.floatOffset : 0;
			drawImage(cakeImage, cake.pixelX, toPixels(cake.y + float), TILE_SIZE, 12);
		}
	}

	/**
	 * Draw a cake on a tile of the editor.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @returns {void}
	 */
	drawBrush(x, y) {
		drawImage(cakeImage, x, y);
	}
}

/**
 * The painter of the crates.
 */
export class CratePainter {
	/**
	 * Draw the crates. A destroyed crate shrinks.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
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
	 * Draw a crate on a tile of the editor.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @returns {void}
	 */
	drawBrush(x, y) {
		drawImage(crateImage, 0, 0, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE);
	}
}

/**
 * The painter of the turrets.
 */
export class TurretPainter {
	/**
	 * Draw the turrets with their laser sights.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		for (const turret of world.turrets) {
			const side = turret.facing < 0 ? 0 : 1;
			const x = turret.pixelX;
			const y = turret.pixelY;
			ctx.save();
			ctx.translate(turret.midX(), turret.midY());
			ctx.rotate(degToRad(turret.angle));
			drawImage(
				turretImages[side],
				0,
				turret.frame * 2 * TILE_SIZE,
				TILE_SIZE,
				2 * TILE_SIZE,
				-(turret.width >> 1),
				-(turret.height >> 1),
				TILE_SIZE,
				2 * TILE_SIZE,
			);
			ctx.restore();
			const dx = turret.facing < 0 ? 0 : turret.width;
			const playerY = world.player.midY();
			if (turret.frame === 1 && !turret.dead) {
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
	 * Draw a turret on a tile of the editor.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @param {number} facing The direction, -1 left, else right.
	 * @returns {void}
	 */
	drawBrush(x, y, facing) {
		const side = facing < 0 ? 0 : 1;
		drawImage(turretImages[side], 0, 0, TILE_SIZE, 2 * TILE_SIZE, x, y, TILE_SIZE, 2 * TILE_SIZE);
	}
}

/**
 * The painter of the plasma balls.
 */
export class PlasmaPainter {
	/**
	 * Draw the plasma balls with their pulse.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		for (const plasmaBall of world.plasmaBalls) {
			if (!plasmaBall.used) continue;
			let vx = 0;
			let vy = 0;
			if (plasmaBall.vx !== 0) vy = plasmaBall.scale;
			else if (plasmaBall.vy !== 0) vx = plasmaBall.scale;
			drawImage(
				plasma,
				0,
				plasmaBall.frame * TILE_SIZE,
				TILE_SIZE,
				TILE_SIZE,
				plasmaBall.pixelX + vx,
				plasmaBall.pixelY + vy,
				TILE_SIZE,
				TILE_SIZE,
			);
		}
	}
}

/**
 * The painter of the moving platforms.
 */
export class PlatformPainter {
	/** @type {boolean} True to show the direction of each platform with an arrow. */
	#arrows;

	/**
	 * Create the painter of the platforms.
	 *
	 * @param {{arrows: boolean}} options The variant of the painter.
	 */
	constructor({ arrows }) {
		this.#arrows = arrows;
	}

	/**
	 * Draw the platforms.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		for (const platform of world.platforms) this.#drawPlatform(platform.pixelX, platform.pixelY, platform.facing);
	}

	/**
	 * Draw a platform on a tile of the editor.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @param {number} facing The direction, -1 left or 1 right.
	 * @returns {void}
	 */
	drawBrush(x, y, facing) {
		this.#drawPlatform(x, y, facing);
	}

	/**
	 * Draw a platform.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @param {number} facing The direction, -1 left or 1 right.
	 * @returns {void}
	 */
	#drawPlatform(x, y, facing) {
		drawImage(platformImage, x, y);
		if (this.#arrows) {
			ctx.fillStyle = 'rgb(255, 0, 0)';
			ctx.strokeStyle = 'rgb(255, 0, 0)';
			arrow(x + 5, y + TILE_SIZE / 2, x + 15, y + TILE_SIZE / 2, 3, facing);
		}
	}
}

/**
 * The painter of the gravitational pipes and their fields.
 */
export class GravPipePainter {
	/**
	 * Draw the pipe fields as half transparent areas and the gravitational pipes over them.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		ctx.fillStyle = 'rgb(151, 206, 233)';
		ctx.globalAlpha = 0.5;
		for (const field of world.gravPipeFields) {
			ctx.fillRect(field.x, field.y, field.width, field.height);
		}
		ctx.globalAlpha = 1;
		for (const pipe of world.gravPipes) this.#drawGravPipe(pipe.pixelX, pipe.pixelY, pipe.direction);
	}

	/**
	 * Draw a gravitational pipe on a tile of the editor.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @param {number} direction The direction of the push, a value of Direction.
	 * @returns {void}
	 */
	drawBrush(x, y, direction) {
		this.#drawGravPipe(x, y, direction);
	}

	/**
	 * Draw a gravitational pipe.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @param {number} direction The direction of the push, a value of Direction.
	 * @returns {void}
	 */
	#drawGravPipe(x, y, direction) {
		const horizontal = DIRECTIONS[direction].horizontal;
		const [width, height] = horizontal ? [TILE_SIZE, 2 * TILE_SIZE] : [2 * TILE_SIZE, TILE_SIZE];
		const [sx, sy] = GRAVPIPE_FRAMES[direction];
		drawImage(horizontal ? gravPipe : gravPipe2, sx, sy, width, height, x, y, width, height);
	}
}
