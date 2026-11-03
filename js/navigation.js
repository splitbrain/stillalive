/**
 * The way back from a level to the menus.
 */

import { Menu, PLAYFIELD_Y } from './constants.js';
import { alertDialog } from './dialog.js';
import { unclick } from './inputState.js';
import { loadPreviewMap } from './level.js';
import { game, ui } from './state.js';

/**
 * Set the text of the robot panel for the level selection.
 *
 * @returns {void}
 */
export function prepareSelectionText() {
	ui.timeWriting = 0;
	ui.txtLines = new Array();

	ui.txtLines.push('Welcome to the campaign mode of StillAliveJS. Here you can select a map on the right and click');
	ui.txtLines.push("'Play' to play it. Good Luck !");
}

/**
 * Leave the current level or the tutorial and go back to the menu.
 *
 * @returns {void}
 */
export function exitFunc() {
	unclick();
	game.sparkles = new Array();
	if (ui.currentMenu == Menu.PLAY) {
		game.offsetX = 0;
		game.offsetY = PLAYFIELD_Y;
		ui.currentMenu = Menu.MAIN;
		prepareSelectionText();
		ui.previewMap = ui.currentLevel;
		loadPreviewMap(ui.previewMap);
	} else if (ui.currentMenu == Menu.TUTORIAL) {
		ui.currentMenu = Menu.MAIN;
		ui.selectMenu = 0;
		ui.fadeMenu = 30;
		game.sparkles = new Array();
	}

	game.replayMode = false;
}

/**
 * Stop a replay that has fewer inputs than the level needs, show a message and go back to the level selection.
 *
 * @returns {void}
 */
export function reportBrokenReplay() {
	alertDialog(
		"The replay you're watching seems to be broken -_-;\n" + 'Sorry for any inconveniences.',
		'An error occurred',
	);
	game.replayMode = false;
	exitFunc();
}
