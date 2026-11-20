/**
 * The painters of the boss.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { TILE_SIZE } from '../../constants.js';
import { robotEye, robotHead, tileset, tube, tube2 } from '../../browser/images.js';
import { toPixels } from '../../utils.js';

/**
 * The painter of the head of the boss.
 */
export class BossPainter {
	/**
	 * Draw the boss with the eye of the current boss.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		const boss = world.boss;
		if (!boss) return;
		drawImage(robotHead, boss.imageX, boss.pixelY, boss.width, boss.height);
		drawImage(robotEye[boss.number - 1], 0, 19 * boss.hits, 19, 19, boss.imageX + 15, boss.pixelY + 22, 19, 19);
	}
}

/**
 * The painter of the razor wheels of the boss.
 */
export class RazorWheelPainter {
	/**
	 * Draw the razor wheels with their motion trail while the boss shoots razor wheels.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		if (!world.boss?.shootsRazorWheels) return;
		for (const razorWheel of world.razorWheels) {
			const image = tileset[razorWheel.frame];
			if (!razorWheel.needKill) {
				ctx.globalAlpha = 0.5;
				drawImage(
					image,
					toPixels(razorWheel.x - razorWheel.vx * 4),
					toPixels(razorWheel.y - razorWheel.vy * 4),
					TILE_SIZE,
					TILE_SIZE,
				);
				ctx.globalAlpha = 0.75;
				drawImage(
					image,
					toPixels(razorWheel.x - razorWheel.vx * 2),
					toPixels(razorWheel.y - razorWheel.vy * 2),
					TILE_SIZE,
					TILE_SIZE,
				);
				ctx.globalAlpha = 1;
			}
			drawImage(image, razorWheel.pixelX, razorWheel.pixelY, TILE_SIZE, TILE_SIZE);
		}
	}
}

/**
 * The painter of the tube of the boss.
 */
export class TubePainter {
	/**
	 * Draw the tube of the boss. The number of the boss selects the image.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		if (!world.boss) return;
		drawImage(world.boss.number === 2 ? tube2 : tube, toPixels(world.tubeX), toPixels(world.tubeY));
	}
}
