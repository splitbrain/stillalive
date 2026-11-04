/**
 * Drawing of a frame: the current screen on the canvas, the parts of the page and the frame rate.
 */

import { beginFrame, ctx, setView } from '../canvas.js';
import {
	Menu,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	PLAYFIELD_X,
	PLAYFIELD_Y,
	SCREEN_HEIGHT,
	SCREEN_WIDTH,
} from '../constants.js';
import { getFps } from '../loop.js';
import { ui } from '../state.js';
import { renderPage } from './dom.js';
import { drawLevelEditor } from './editor.js';
import { drawLevel } from './game.js';
import { drawText } from './hud.js';
import { drawCredits, drawLoadingScreen, drawMainMenu, drawMapSelection, drawPauseMenu, drawSplash } from './menus.js';

/**
 * Check if the canvas shows only the playfield: in a level, in the tutorial and in the test run of the editor. The
 * page shows the parts around the playfield.
 *
 * @returns {boolean} True when the canvas shows the playfield.
 */
export function onStage() {
	if (ui.drawCredits) return false;
	return (
		ui.currentMenu == Menu.PLAY ||
		ui.currentMenu == Menu.TUTORIAL ||
		(ui.currentMenu == Menu.EDITOR && ui.isTestingLevel)
	);
}

/**
 * Draw the screen after the ticks of a frame: the view of the canvas and the parts of the page.
 *
 * @returns {void}
 */
export function render() {
	if (onStage()) setView(PLAYFIELD_X, PLAYFIELD_Y, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	else setView(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	beginFrame();
	renderPage();
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
	if (onStage()) ctx.fillText('' + getFps(), PLAYFIELD_X + 5, PLAYFIELD_Y + 10);
	else ctx.fillText('' + getFps(), 5, 10);
}
