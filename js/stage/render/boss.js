/**
 * Drawing of the boss.
 */

import { drawImage } from '../canvas.js';
import { robotEye, robotHead } from '../images.js';

/**
 * Draw the boss with the eye of the current boss.
 *
 * @param {import('../World.js').World} world The World.
 * @returns {void}
 */
export function drawBoss(world) {
	const boss = world.boss;
	drawImage(robotHead, boss.x, boss.y, 74, 58);
	drawImage(robotEye[boss.number - 1], 0, 19 * boss.hits, 19, 19, boss.x + 15, boss.y + 22, 19, 19);
}
