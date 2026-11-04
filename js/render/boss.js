/**
 * Drawing of the boss.
 */

import { drawImage } from '../canvas.js';
import { robotEye, robotHead } from '../images.js';
import { game, ui } from '../state.js';

/**
 * Draw the boss with the eye of the current boss.
 *
 * @returns {void}
 */
export function drawBoss() {
	drawImage(robotHead, game.bossX + game.offsetX, game.bossY + game.offsetY, 74, 58);

	let eye;
	if (ui.currentLevel <= 7) eye = 0;
	else if (ui.currentLevel <= 14) eye = 1;
	else if (ui.currentLevel <= 21) eye = 2;
	else eye = 3;

	drawImage(
		robotEye[eye],
		0,
		19 * game.bossLife,
		19,
		19,
		game.bossX + game.offsetX + 15,
		game.bossY + game.offsetY + 22,
		19,
		19,
	);
}
