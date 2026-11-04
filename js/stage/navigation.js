/**
 * The way back from a level to the menus.
 */

import { CAMPAIGN_FINISHED, CampaignId, Menu } from './constants.js';
import { alertDialog } from '../dialog.js';
import { unclick } from './inputState.js';
import { loadPreviewMap } from './level.js';
import { game, ui } from './state.js';
import { maxLevel } from '../storage.js';

/**
 * Check if the level selection has the button that switches between the normal and the hard campaign.
 *
 * @returns {boolean} True when the button is there.
 */
export function hasModeButton() {
	return (
		(ui.campaign == CampaignId.NORMAL && maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED) ||
		ui.campaign == CampaignId.ADVANCED
	);
}

/**
 * Leave the current level and go back to the menu: to the level selection, or to the main menu if the level started
 * from there.
 *
 * @returns {void}
 */
export function exitFunc() {
	unclick();
	game.sparkles = new Array();
	game.message = '';
	if (ui.currentMenu == Menu.PLAY) {
		game.shakeX = 0;
		game.shakeY = 0;
		ui.currentMenu = Menu.MAIN;
		ui.fadeMenu = 30;
		if (ui.selectMenu != 0) {
			ui.previewMap = ui.currentLevel;
			loadPreviewMap(ui.previewMap);
		}
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
