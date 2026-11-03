/**
 * The logic of the menus: the hovered buttons and the clicks.
 */

import { allImagesLoaded } from './assets.js';
import { allSoundsLoaded, disableSound, toggleSound } from './audio.js';
import { skipComingBoss } from './boss.js';
import { Menu, MouseButton, PauseButton } from './constants.js';
import { updateRobot } from './entities/Robot.js';
import { startLevel } from './game.js';
import { mouseInZone, unclick } from './inputState.js';
import { levelsLoaded, levelsToLoad } from './level.js';
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

/**
 * Move the title and the names of the splash screen and fade it out. A click ends it early. At the end, the game goes
 * to the main menu when everything is loaded, else to the loading screen.
 *
 * @returns {void}
 */
export function updateSplash() {
	const sp = ui.splash;
	sp.titleY += sp.titleVY;
	sp.titleVY += 0.2;
	if (sp.titleVY > 10) sp.titleVY = 10;
	else if (sp.titleVY < -10) sp.titleVY = -10;
	if (sp.titleY > 400 && sp.time < 300) {
		sp.titleY = 400;
		sp.titleVY = -(sp.titleVY >> 2);
	}

	if (sp.time > 100) sp.tailsVY += 0.1;
	if (sp.tailsVY > 10) sp.tailsVY = 10;
	else if (sp.tailsVY < -10) sp.tailsVY = -10;

	sp.tailsY += sp.tailsVY;
	if (sp.tailsY > 100 && sp.time < 330) {
		sp.tailsY = 100;
		sp.tailsVY = -(sp.tailsVY >> 2);
	}

	if (sp.time > 200) sp.blackosVY += 0.1;
	if (sp.blackosVY > 10) sp.blackosVY = 10;
	else if (sp.blackosVY < -10) sp.blackosVY = -10;

	sp.blackosY += sp.blackosVY;
	if (sp.blackosY > 130 && sp.time < 360) {
		sp.blackosY = 130;
		sp.blackosVY = -(sp.blackosVY >> 2);
	}

	sp.time++;

	if (sp.tailsY > 580) {
		sp.fade--;
		if (sp.fade == 0) {
			sp.over = true;
			if (allImagesLoaded() && levelsLoaded >= levelsToLoad && allSoundsLoaded()) {
				ui.goMenu = 0;
				ui.fadeMenu = 30;
				unclick();
				ui.currentMenu = Menu.MAIN;
				game.sparkles = new Array();
			}
		}
	} else {
		if (++sp.fade > 60) sp.fade = 60;
	}

	if (input.mouseNewPress && sp.time < 360) {
		sp.fade = 60;
		sp.time = 360;
	}
}

/**
 * Advance the time of the loading screen, take the click on the link that turns the sound off, and go to the main
 * menu on a click when everything is loaded.
 *
 * @returns {void}
 */
export function updateLoadingScreen() {
	ui.loadingHover = mouseInZone(80, 80, 133, 16);
	if (ui.loadingHover && input.mouseNewPress) disableSound();

	game.time++;
	if (allImagesLoaded() && levelsLoaded >= levelsToLoad && allSoundsLoaded() && input.mousePressed) {
		ui.goMenu = 0;
		ui.fadeMenu = 30;
		unclick();
		ui.currentMenu = Menu.MAIN;
		game.sparkles = new Array();
	}
}
