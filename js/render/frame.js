/**
 * Drawing of a frame: the current screen and the frame rate.
 */

import { beginFrame, ctx } from '../canvas.js';
import { Menu } from '../constants.js';
import { getFps } from '../loop.js';
import { ui } from '../state.js';
import { drawLevelEditor } from './editor.js';
import { drawLevel } from './game.js';
import { drawText } from './hud.js';
import { drawCredits, drawLoadingScreen, drawMainMenu, drawMapSelection, drawPauseMenu, drawSplash } from './menus.js';

/**
 * Draw the screen after the ticks of a frame.
 *
 * @returns {void}
 */
export function render() {
	beginFrame();
	if (ui.drawCredits) {
		drawCredits();
	} else if (ui.currentMenu == Menu.EDITOR) {
		drawLevelEditor();
	} else if (ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) {
		if (ui.escapeMenu) drawPauseMenu();
		else drawLevel();
	} else if (ui.currentMenu == Menu.LOADING) {
		if (ui.canSplash && !ui.splash.over) drawSplash();
		else if (ui.splash.over) drawLoadingScreen();
	} else if (ui.currentMenu == Menu.MAIN) {
		if (ui.selectMenu == 0) drawMainMenu();
		else {
			drawMapSelection();
			drawText(30, 25, 14);
		}
	}
	ctx.font = 'bold 10px Arial';
	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.fillText('' + getFps(), 5, 10);
}
