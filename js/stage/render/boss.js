/**
 * Drawing of the boss.
 */

import { drawImage } from '../browser/canvas.js';
import { robotEye, robotHead } from '../browser/images.js';

/**
 * Draw the boss with the eye of the current boss.
 *
 * @param {import('../world/World.js').World} world The World.
 * @returns {void}
 */
export function drawBoss(world) {
	const boss = world.boss;
	drawImage(robotHead, boss.imageX, boss.pixelY, boss.width, boss.height);
	drawImage(robotEye[boss.number - 1], 0, 19 * boss.hits, 19, 19, boss.imageX + 15, boss.pixelY + 22, 19, 19);
}
