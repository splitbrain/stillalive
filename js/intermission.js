/**
 * The logic of the transitions between the levels and of the intermission screen.
 */

import { IntermissionButton, LEVELS_PER_CAMPAIGN, Menu, MouseButton } from './constants.js';
import { mouseInZone, unclick } from './inputState.js';
import { atExit } from './physics.js';
import { game, input, ui } from './state.js';
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
 * Find the hovered button of the intermission screen and take the click on it.
 *
 * @returns {void}
 */
export function updateIntermissionButtons() {
	let overMenu = -1;
	if (mouseInZone(74, 445, 120, 24)) overMenu = IntermissionButton.EXIT;
	else if (mouseInZone(74 + 130, 445, 120, 24) && !isLevelLocked()) overMenu = IntermissionButton.RESTART;
	else if (
		mouseInZone(74 + 260, 445, 120, 24) &&
		ui.currentMenu == Menu.PLAY &&
		ui.currentLevel < LEVELS_PER_CAMPAIGN
	) {
		if (maxLevel[ui.campaign] >= ui.currentLevel + 1) {
			overMenu = IntermissionButton.CONTINUE;
		}
	} else if (mouseInZone(74 + 390, 445, 120, 24)) overMenu = IntermissionButton.REPLAY;

	ui.intermissionHover = overMenu;

	if (input.mousePressed && input.mouseButton == MouseButton.LEFT && overMenu > 0) {
		ui.intermissionChoice = overMenu;
		unclick();
	}
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
