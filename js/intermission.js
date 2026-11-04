/**
 * The logic of the transitions between the levels and of the intermission screen.
 */

import { IntermissionButton, LEVELS_PER_CAMPAIGN, Menu } from './constants.js';
import { unclick } from './inputState.js';
import { atExit } from './physics.js';
import { game, ui } from './state.js';
import { maxLevel } from './storage.js';

/**
 * Advance the transitions between the levels: the fade of the intermission screen at the level end and the fade in
 * of the next level.
 *
 * @returns {void}
 */
export function updateTransition() {
	if (atExit()) {
		if (game.player.fadeNextLevel <= 0 && ui.drawIntermission) updateIntermission();
	} else if (game.player.intermissionFade < 0) {
		game.player.intermissionFade++;
	}
}

/**
 * Advance the fade of the intermission screen and handle its buttons.
 *
 * @returns {void}
 */
export function updateIntermission() {
	if (game.player.intermissionFade > 0) game.player.intermissionFade--;
	updateIntermissionButtons();
}

/**
 * Take the click on a button of the intermission screen. The page sets the clicked button.
 *
 * @returns {void}
 */
export function updateIntermissionButtons() {
	let overMenu = ui.intermissionClick;
	ui.intermissionClick = -1;
	if (overMenu == IntermissionButton.RESTART && isLevelLocked()) overMenu = -1;
	if (overMenu == IntermissionButton.CONTINUE && !canContinue()) overMenu = -1;

	if (overMenu > 0) {
		ui.intermissionChoice = overMenu;
		unclick();
	}
}

/**
 * Check if the intermission screen has the button that starts the next level: in a campaign, when the next level
 * is unlocked.
 *
 * @returns {boolean} True when the button is there.
 */
export function canContinue() {
	return (
		ui.currentMenu == Menu.PLAY && ui.currentLevel < LEVELS_PER_CAMPAIGN && maxLevel[ui.campaign] >= ui.currentLevel + 1
	);
}

/**
 * Check if the current level is not unlocked yet. This is the case after the replay of a level that the player has
 * not reached. The player can then not play the level from the intermission screen.
 *
 * @returns {boolean} True for a locked level.
 */
export function isLevelLocked() {
	return ui.currentMenu == Menu.PLAY && ui.currentLevel > maxLevel[ui.campaign];
}
