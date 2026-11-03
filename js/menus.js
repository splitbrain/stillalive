/**
 * The logic of the menus: the hovered buttons and the clicks.
 */

import { toggleSound } from './audio.js';
import { skipComingBoss } from './boss.js';
import { Menu, MouseButton, PauseButton } from './constants.js';
import { updateRobot } from './entities/Robot.js';
import { startLevel } from './game.js';
import { mouseInZone, unclick } from './inputState.js';
import { exitFunc } from './navigation.js';
import { resumeReplay } from './replay.js';
import { game, input, ui } from './state.js';

/**
 * Find the hovered button of the pause menu, take the click on it and move the robot.
 *
 * @returns {void}
 */
export function updatePauseMenu() {
	let overMenu = -1;
	if (mouseInZone(50 + game.offsetX, 180 + game.offsetY, 120, 24)) overMenu = PauseButton.RESUME;
	else if (ui.currentMenu != Menu.TUTORIAL && mouseInZone(187 + game.offsetX, 180 + game.offsetY, 120, 24))
		overMenu = PauseButton.RESTART;
	else if (mouseInZone(324 + game.offsetX, 180 + game.offsetY, 120, 24)) overMenu = PauseButton.EXIT;
	else if (ui.currentMenu != Menu.TUTORIAL && mouseInZone(187 + game.offsetX, 340 + game.offsetY, 120, 24))
		overMenu = PauseButton.SOUND;
	ui.pauseHover = overMenu;

	if (input.mousePressed && input.mouseButton == MouseButton.LEFT && overMenu > 0) {
		unclick();
		if (overMenu == PauseButton.RESUME) {
			ui.escapeMenu = !ui.escapeMenu;
			if (game.replayMode) {
				resumeReplay();
			}
		} else if (overMenu == PauseButton.RESTART) {
			ui.escapeMenu = !ui.escapeMenu;
			if (ui.currentMenu == Menu.PLAY) {
				startLevel(ui.campaign, ui.currentLevel, game.replayMode ? game.replay : null);
				if (game.bossNum > 0) skipComingBoss();
			}
		} else if (overMenu == PauseButton.EXIT) {
			ui.escapeMenu = !ui.escapeMenu;
			exitFunc();
		} else if (overMenu == PauseButton.SOUND) {
			toggleSound();
		}
	}

	updateRobot();
}
