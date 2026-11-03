/**
 * The logic of the menus: the hovered buttons and the clicks.
 */

import { allImagesLoaded } from './assets.js';
import { allSoundsLoaded, disableSound, isSoundAvailable, toggleSound } from './audio.js';
import { setupBoss, skipComingBoss } from './boss.js';
import {
	BUTTON_CAMPAIGN,
	CAMPAIGN_FINISHED,
	CampaignId,
	MainButton,
	Menu,
	MouseButton,
	PauseButton,
	PLAYFIELD_X,
	PLAYFIELD_Y,
	SelectionButton,
	SparkleType,
} from './constants.js';
import { lvlEditorSetup } from './editor.js';
import { updateRobot } from './entities/Robot.js';
import { createSparkles, updateSparkles } from './entities/Sparkle.js';
import { startLevel } from './game.js';
import { mouseInZone, unclick } from './inputState.js';
import { levelsLoaded, levelsToLoad, loadPreviewMap } from './level.js';
import { exitFunc, prepareSelectionText } from './navigation.js';
import { MAIN_MENU_STEP, MAIN_MENU_Y, mainMenuPlayers } from './render/menus.js';
import { resumeReplay } from './replay.js';
import { game, input, ui } from './state.js';
import { maxLevel } from './storage.js';
import { setupTutorial } from './tutorial.js';

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

/**
 * Find the hovered button of the main menu and take the clicks. After a click on a button, the menu fades out and then
 * opens the level selection, the editor or the tutorial.
 *
 * @returns {void}
 */
export function updateMainMenu() {
	let overMenu = -1;
	for (let button = MainButton.CLASSIC; button <= MainButton.TUTORIAL; button++) {
		if (overMenu < 0 && mouseInZone(160, MAIN_MENU_Y + button * MAIN_MENU_STEP, 320, 64)) overMenu = button;
	}
	ui.mainHover = overMenu;

	ui.soundHover = isSoundAvailable() && mouseInZone(20, 385, 29, 48);
	if (ui.soundHover && input.mousePressed && input.mouseButton == MouseButton.LEFT) {
		unclick();
		toggleSound();
	}

	if (input.mousePressed && input.mouseButton == MouseButton.LEFT && overMenu >= 0 && ui.goMenu == 0) {
		const [pX, pY, pX2] = mainMenuPlayers(overMenu);
		ui.menuButton = overMenu;
		ui.goMenu = 60;
		createSparkles(pX << 8, (pY << 8) + (13 << 8), input.mouseX << 8, input.mouseY << 8, 1, SparkleType.CAKE);
		createSparkles(pX << 8, (pY << 8) + (13 << 8), input.mouseX << 8, input.mouseY << 8, 1, SparkleType.SMOKE);
		createSparkles(pX2 << 8, (pY << 8) + (13 << 8), input.mouseX << 8, input.mouseY << 8, 0, SparkleType.CAKE);
		createSparkles(pX2 << 8, (pY << 8) + (13 << 8), input.mouseX << 8, input.mouseY << 8, 0, SparkleType.SMOKE);
		unclick();
	} else if (ui.goMenu) {
		if (--ui.goMenu == 0) {
			if (ui.menuButton in BUTTON_CAMPAIGN) {
				ui.selectMenu = 1;
				ui.previewMap = 0;
				prepareSelectionText();
				document.getElementById('highscores').classList.add('open');
				game.offsetX = 0;
				game.offsetY = PLAYFIELD_Y;
				ui.campaign = BUTTON_CAMPAIGN[ui.menuButton];
				if (ui.campaign == CampaignId.STORY) {
					game.bossNum = 0;
					setupBoss();
				}
			} else {
				if (ui.menuButton == MainButton.EDITOR) {
					ui.currentMenu = Menu.EDITOR;
					lvlEditorSetup();
					game.sparkles = new Array();
				} else if (ui.menuButton == MainButton.TUTORIAL) {
					ui.currentMenu = Menu.TUTORIAL;
					setupTutorial();
				}
			}
		}
	}

	updateSparkles();
	if (ui.fadeMenu > 0) ui.fadeMenu--;
}

/**
 * Find the hovered level and button of the level selection and take the clicks.
 *
 * @returns {void}
 */
export function updateMapSelection() {
	ui.selectionListHover = -1;
	if (input.mouseX >= 529 && input.mouseX <= 529 + 90) {
		if (input.mouseY >= 12 + 105 && input.mouseY <= 104 + 29 * 12) {
			const y = Math.trunc((input.mouseY - 105) / 12);
			if (y <= maxLevel[ui.campaign]) {
				ui.selectionListHover = y;
				if (input.mousePressed && input.mouseButton == MouseButton.LEFT) {
					if (y != ui.previewMap) {
						unclick();
						ui.previewMap = y;
						ui.currentLevel = y;
						loadPreviewMap(ui.previewMap);
					}
				}
			}
		}
	}

	let overMenu = -1;
	if (mouseInZone(20, 495, 120, 24)) overMenu = SelectionButton.EXIT;
	if (ui.previewMap > 0 && mouseInZone(515, 495, 120, 24)) overMenu = SelectionButton.PLAY;
	const hasMode =
		(ui.campaign == CampaignId.NORMAL && maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED) ||
		ui.campaign == CampaignId.ADVANCED;
	if (hasMode && mouseInZone(380, 495, 120, 24)) overMenu = SelectionButton.MODE;
	ui.selectionHover = overMenu;

	if (input.mousePressed && input.mouseButton == MouseButton.LEFT && overMenu > 0) {
		if (overMenu == SelectionButton.PLAY) {
			startLevel(ui.campaign, ui.previewMap);
			return;
		} else if (overMenu == SelectionButton.EXIT) {
			game.offsetX = PLAYFIELD_X;
			game.offsetY = PLAYFIELD_Y;
			ui.currentMenu = Menu.MAIN;
			ui.selectMenu = 0;
			ui.fadeMenu = 30;
			document.getElementById('highscores').classList.remove('open');
			unclick();
			return;
		} else if (overMenu == SelectionButton.MODE) {
			ui.campaign = ui.campaign == CampaignId.NORMAL ? CampaignId.ADVANCED : CampaignId.NORMAL;
			ui.previewMap = 0;
		}

		unclick();
	}
}

/**
 * Scroll and fade the credits. A click makes the scroll faster. At the end, the credits close.
 *
 * @returns {void}
 */
export function updateCredits() {
	const credits = ui.credits;
	if (input.mouseNewPress && credits.time > 150) credits.speed = 5;
	credits.time += credits.speed;

	if (credits.time > 1800) {
		if (credits.alpha > 0) credits.alpha -= 0.01;
		if (credits.alpha < 0) {
			ui.drawCredits = false;
		}
	} else {
		if (credits.alpha < 1) credits.alpha += 0.01;
		if (credits.alpha > 1) credits.alpha = 1;
	}
}
