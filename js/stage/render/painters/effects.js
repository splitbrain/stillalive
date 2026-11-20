/**
 * The painters of the visual effects.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { DEATH_FADE, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH, TILE_SIZE } from '../../constants.js';
import { cameraFollow, sparkleImage } from '../../browser/images.js';
import { getAngle, toPixels } from '../../utils.js';

/**
 * The painter of the sparkles.
 */
export class SparklePainter {
	/**
	 * Draw the sparkles. The size follows the fade.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		for (const sparkle of world.effects.sparkles) {
			if (sparkle.fading <= 0) continue;
			const scale = sparkle.fading / 255;
			// a fading sparkle shrinks around its middle
			const offset = 9 - scale * 9 + sparkle.drawOffset;
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
}

/**
 * The painter of the security camera.
 */
export class CameraPainter {
	/**
	 * Draw the security camera turned towards the player.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		const camera = world.effects.camera;
		const angle = getAngle(
			world.player.midX(),
			world.player.pixelY + 8,
			toPixels(camera.x) + TILE_SIZE / 2,
			toPixels(camera.y) + TILE_SIZE / 2,
		);
		ctx.save();
		ctx.translate(toPixels(camera.x) + TILE_SIZE / 2, toPixels(camera.y) + TILE_SIZE / 2);
		ctx.rotate(angle);
		drawImage(cameraFollow, 0, 0);
		ctx.restore();
	}
}

/**
 * The painter of the fade to black after the death of the player.
 */
export class DeathFadePainter {
	/**
	 * Darken the playfield while the player is dead.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		if (!world.player.dead) return;
		ctx.fillStyle = `rgba(0, 0, 0, ${1 + world.player.life / DEATH_FADE})`;
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}
}
