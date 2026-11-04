/**
 * Drawing of a frame: the current screen on the canvas, the parts of the page and the frame rate.
 */

import { beginFrame, ctx } from '../canvas.js';
import { Menu } from '../constants.js';
import { getFps } from '../loop.js';
import { ui } from '../state.js';
import { renderPage } from './dom.js';
import { drawLevelEditor } from './editor.js';
import { drawLevel } from './game.js';
import { drawCredits, drawLoadingScreen, drawMainMenu, drawMapSelection, drawPauseMenu, drawSplash } from './menus.js';

/**
 * Draw the screen after the ticks of a frame: the canvas and the parts of the page.
 *
 * @returns {void}
 */
export function render() {
	beginFrame();
	renderPage();
	if (ui.drawCredits) {
		drawCredits();
	} else if (ui.currentMenu == Menu.EDITOR) {
		drawLevelEditor();
	} else if (ui.currentMenu == Menu.PLAY) {
		if (ui.escapeMenu) drawPauseMenu();
		else drawLevel();
	} else if (ui.currentMenu == Menu.LOADING) {
		if (ui.canSplash && !ui.splash.over) drawSplash();
		else if (ui.splash.over) drawLoadingScreen();
	} else if (ui.currentMenu == Menu.MAIN) {
		if (ui.selectMenu == 0) drawMainMenu();
		else drawMapSelection();
	}
	ctx.font = 'bold 10px Arial';
	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.fillText('' + getFps(), 5, 10);
}
