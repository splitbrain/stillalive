/**
 * Drawing of the boss.
 */

import { drawImage } from '../browser/canvas.js';
import { robotEye, robotHead } from '../browser/images.js';

/**
 * Draw the boss with the eye of the current boss.
 *
 * @param {import('../bodies/Boss.js').Boss} boss The boss.
 * @returns {void}
 */
export function drawBoss(boss) {
	drawImage(robotHead, boss.imageX, boss.pixelY, boss.width, boss.height);
	drawImage(robotEye[boss.number - 1], 0, 19 * boss.hits, 19, 19, boss.imageX + 15, boss.pixelY + 22, 19, 19);
}
