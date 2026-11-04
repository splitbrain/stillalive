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
	drawImage(robotHead, game.bossX, game.bossY, 74, 58);
	drawImage(robotEye[game.bossNum - 1], 0, 19 * game.bossLife, 19, 19, game.bossX + 15, game.bossY + 22, 19, 19);
}
