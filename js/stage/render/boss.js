/**
 * Drawing of the boss.
 */

import { drawImage } from '../canvas.js';
import { robotEye, robotHead } from '../images.js';
import { game } from '../state.js';

/**
 * Draw the boss with the eye of the current boss.
 *
 * @returns {void}
 */
export function drawBoss() {
	const boss = game.boss;
	drawImage(robotHead, boss.x, boss.y, 74, 58);
	drawImage(robotEye[boss.number - 1], 0, 19 * boss.hits, 19, 19, boss.x + 15, boss.y + 22, 19, 19);
}
