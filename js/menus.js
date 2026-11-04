/**
 * The logic of the menus: the hovered buttons and the clicks.
 */

import { allImagesLoaded } from './assets.js';
import { allSoundsLoaded, disableSound, isSoundAvailable, toggleSound } from './audio.js';
import { setupBoss } from './boss.js';
import {
	BUTTON_CAMPAIGN,
	CAMPAIGN_FOLDERS,
	CampaignId,
	MainButton,
	Menu,
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
import { exitFunc, hasModeButton, prepareSelectionText } from './navigation.js';
import { mainMenuPlayers } from './render/menus.js';
import { resumeReplay } from './replay.js';
import { game, input, ui } from './state.js';
import { maxLevel } from './storage.js';

/**
 * Take the click on a button of the pause menu and move the robot.
 *
 * @returns {void}
 */
export function updatePauseMenu() {
	const overMenu = ui.pauseClick;
	ui.pauseClick = -1;

	if (overMenu > 0) {
		unclick();
		if (overMenu == PauseButton.RESUME) {
			ui.escapeMenu = !ui.escapeMenu;
			if (game.replayMode) {
				resumeReplay();
			}
		} else if (overMenu == PauseButton.RESTART) {
			ui.escapeMenu = !ui.escapeMenu;
			if (ui.currentMenu == Menu.PLAY) {
				startLevel(ui.campaign, ui.currentLevel, game.replayMode ? game.replay : null, true);
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
 * Take the click on a button of the main menu. After a click on a button, the menu fades out and then opens the
 * level selection, the editor or the tutorial. The page sets the hovered and the clicked button.
 *
 * @returns {void}
 */
export function updateMainMenu() {
	const overMenu = ui.mainClick;
	ui.mainClick = -1;

	if (ui.soundClick) {
		ui.soundClick = false;
		if (isSoundAvailable()) toggleSound();
	}

	if (overMenu >= 0 && ui.goMenu == 0) {
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
				game.offsetX = PLAYFIELD_X;
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
					startLevel(CAMPAIGN_FOLDERS.indexOf('tutorial'), 1);
				}
			}
		}
	}

	updateSparkles();
	if (ui.fadeMenu > 0) ui.fadeMenu--;
}

/**
 * Take the clicks on the levels and the buttons of the level selection. The page sets the clicked level and button.
 *
 * @returns {void}
 */
export function updateMapSelection() {
	const level = ui.selectionLevelClick;
	ui.selectionLevelClick = 0;
	if (level > 0 && level <= maxLevel[ui.campaign] && level != ui.previewMap) {
		unclick();
		ui.previewMap = level;
		ui.currentLevel = level;
		loadPreviewMap(ui.previewMap);
	}

	let overMenu = ui.selectionClick;
	ui.selectionClick = -1;
	if (overMenu == SelectionButton.PLAY && ui.previewMap < 1) overMenu = -1;
	if (overMenu == SelectionButton.MODE && !hasModeButton()) overMenu = -1;

	if (overMenu > 0) {
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
