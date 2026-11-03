/**
 * The tick function: the flow of the menus and the levels, and the end of a level.
 */

import { playSound, setSoundVolume, sfx_flatline, sfx_transition } from './audio.js';
import { skipComingBoss, updateBoss, updateBossRumble } from './boss.js';
import { ctx } from './canvas.js';
import {
	CampaignId,
	IntermissionButton,
	LEVELS_PER_CAMPAIGN,
	Menu,
	Transition,
	TUTORIAL_END_LEVEL,
} from './constants.js';
import { alertDialog } from './dialog.js';
import { drawLevelEditor } from './editor.js';
import { animateTiles } from './entities/AnimatedTile.js';
import { openExit, updateCakes } from './entities/Cake.js';
import { updateCrates } from './entities/Crate.js';
import { rebuildTunnelFields } from './entities/TunnelField.js';
import { updatePlasma } from './entities/Plasma.js';
import { updatePlatforms } from './entities/Platform.js';
import { updatePortals } from './entities/Portal.js';
import { updateProjectiles } from './entities/Projectile.js';
import { updateRobot } from './entities/Robot.js';
import { updateSparkles } from './entities/Sparkle.js';
import { updateTurrets } from './entities/Turret.js';
import { manageKeys, unclick } from './input.js';
import { campaigns, loadLevel, loadPreviewMap, manageDoors } from './level.js';
import { getFps } from './loop.js';
import { canSplash } from './main.js';
import { updatePanel } from './panel.js';
import { atExit } from './physics.js';
import { inPortal } from './portals.js';
import { drawLevel } from './render/game.js';
import { drawText, updateText } from './render/hud.js';
import {
	doDrawCredits,
	drawLoadingScreen,
	drawMainMenu,
	drawMapSelection,
	drawPauseMenu,
	drawSplash,
	overSplash,
	prepareSelectionText,
} from './render/menus.js';
import { updateTransition } from './render/transitions.js';
import { encodeReplay } from './replay.js';
import { game, input, ui } from './state.js';
import { getBestTime, maxLevel, saveBestTime, saveProgress } from './storage.js';
import { updateTutorial } from './tutorial.js';
import { random, toTime } from './utils.js';

/**
 * Run one tick of the game: process the input, run the logic of the current screen and update the panel. The menus
 * and the editor also draw themselves here.
 *
 * @returns {void}
 */
export function tick() {
	manageKeys();
	if (!ui.drawCredits) updateScreen();
	else doDrawCredits();
	updatePanel();
}

/**
 * Draw the screen after the ticks of a frame.
 *
 * @returns {void}
 */
export function render() {
	if (!ui.drawCredits && (ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) && !ui.escapeMenu)
		drawLevel();
	ctx.font = 'bold 10px Arial';
	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.fillText('' + getFps(), 5, 10);
}

/**
 * Stop a replay that has fewer inputs than the level needs, show a message and go back to the level selection.
 *
 * @returns {void}
 */
export function reportBrokenReplay() {
	alertDialog(
		"The replay you're watching seems to be broken -_-;\n" + 'Sorry for any inconveniences.',
		'An error occured',
	);
	game.replayMode = false;
	exitFunc();
}

/**
 * Store the level time and the replay if the time is a new best time.
 *
 * @returns {string} The message for the intermission screen.
 */
function checkBestTime() {
	const campaign = campaigns[ui.campaign].folder;
	const best = getBestTime(campaign, ui.currentLevel);
	if (best != null && best <= game.TIME) return 'Best time : ' + toTime(best);

	saveBestTime(campaign, ui.currentLevel, game.TIME, encodeReplay(game.replay, campaign, ui.currentLevel)).catch(
		function (e) {
			console.error(e);
		},
	);
	return 'New best time !';
}

/**
 * Run the logic of the current screen. The menus, the loading screens and the editor also draw themselves here.
 *
 * @returns {void}
 */
function updateScreen() {
	if (ui.currentMenu == Menu.EDITOR) {
		drawLevelEditor();
	} else if ((ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) && !ui.escapeMenu) {
		updateLevel();
	} else if ((ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) && ui.escapeMenu) {
		drawPauseMenu();
	} else if (ui.currentMenu == Menu.LOADING) {
		if (canSplash && !overSplash) drawSplash();
		else if (overSplash) drawLoadingScreen();
	} else if (ui.currentMenu == Menu.MAIN) {
		if (ui.selectMenu == 0) drawMainMenu();
		else {
			drawMapSelection();
			drawText(30, 25, 14);
		}
	}
}

/**
 * Run one tick of a level: the level time, the player, the doors, the level end with the intermission screen, the
 * objects, the boss and the tutorial.
 *
 * @returns {void}
 */
function updateLevel() {
	if (!atExit() && game.player.fadeNextLevel == -1) {
		if (game.TIME == 0) unclick();
		game.TIME++;
	}
	game.needRedrawTiles = 0;
	if (!game.player.dead && game.player.fadeNextLevel == -1) {
		game.player.move();
		if (game.needRedrawTiles == 0) game.needRedrawTiles = inPortal(game.player);
	}

	manageDoors();
	if (atExit()) {
		updateLevelEnd();
	} else if (game.player.intermissionFade == 0) {
		if (game.player.fadeNextLevel > 0) {
			game.player.fadeNextLevel -= 4;
		}
		if (game.player.fadeNextLevel <= 0) {
			game.player.fadeNextLevel = -1;
			ui.drawIntermission = false;
		}
	}

	if (game.bossNum > 0 && game.bossIsComing && game.player.fadeNextLevel == -1) game.player.fadeNextLevel = 0;
	updateObjects();
	updateBoss();

	if (ui.currentMenu == Menu.TUTORIAL && ui.currentLevel == TUTORIAL_END_LEVEL && input.mousePressed) {
		unclick();
		ui.currentMenu = Menu.MAIN;
		ui.selectMenu = 0;
		ui.fadeMenu = 30;
		game.sparkles = new Array();
	}
}

/**
 * Run the end of a level: the closing transition, the best time, the progress and the choice of the intermission
 * screen. In the tutorial, the next level starts at once.
 *
 * @returns {void}
 */
function updateLevelEnd() {
	game.bossNum = 0;
	game.offsetX = 64;
	game.offsetY = 96;

	if (game.player.fadeNextLevel > 0) {
		game.player.fadeNextLevel -= 4;
	}
	if (game.player.fadeNextLevel == -1) {
		ui.drawCredits = false;
		game.player.fadeNextLevel = 120;
		game.player.intermissionFade = 20;
		TRANS = random(Transition.TOP_LEFT, Transition.SQUARE + 1);
		playSound(sfx_transition);
		ui.highscoreMessage = '';
		unclick();
		if (ui.currentMenu == Menu.PLAY && !game.replayMode) ui.highscoreMessage = checkBestTime();
		ui.intermissionChoice = IntermissionButton.NONE;
		if (ui.currentMenu == Menu.PLAY && !game.replayMode) {
			if (maxLevel[ui.campaign] < ui.currentLevel + 1) {
				if (ui.campaign == CampaignId.STORY && maxLevel[ui.campaign] == LEVELS_PER_CAMPAIGN) ui.drawCredits = true;
				saveProgress(ui.campaign, ui.currentLevel + 1);
			}
		}

		game.replayMode = false;
	}
	if (game.player.fadeNextLevel <= 0) {
		game.player.fadeNextLevel = 0;

		if (ui.currentMenu == Menu.TUTORIAL) {
			ui.currentLevel++;
			if (ui.currentLevel < TUTORIAL_END_LEVEL) {
				unclick();
				loadLevel(ui.currentLevel);
			} else {
				ui.currentLevel = TUTORIAL_END_LEVEL;
				if (!ui.tutoEnded) game.player.fadeNextLevel = 1;
			}
			ui.tutoPause = true;
		} else {
			ui.drawIntermission = true;
			if (ui.intermissionChoice == IntermissionButton.CONTINUE) {
				unclick();
				if (ui.currentMenu == Menu.PLAY) {
					loadLevel(++ui.currentLevel);
					game.player.intermissionFade = -20;
				}
			} else if (ui.intermissionChoice == IntermissionButton.RESTART) {
				unclick();
				if (ui.currentMenu == Menu.PLAY) {
					loadLevel(ui.currentLevel);
					if (game.bossNum > 0) skipComingBoss();
				}
				game.player.intermissionFade = -20;
			} else if (ui.intermissionChoice == IntermissionButton.EXIT) {
				exitFunc();
			} else if (ui.intermissionChoice == IntermissionButton.REPLAY) {
				unclick();
				game.replayMode = true;
				if (ui.currentMenu == Menu.PLAY) loadLevel(ui.currentLevel);
				game.player.intermissionFade = -20;
			}
		}
	}
}

/**
 * Update the objects of a level in the order of the game logic: the tiles, the player direction, the tunnel fields,
 * the cakes, the turrets, the plasma balls, the sparkles, the crates, the boss projectiles, the platforms, the
 * portals, the camera, the tutorial, the death fade, the transitions, the texts and the robot.
 *
 * @returns {void}
 */
function updateObjects() {
	if (game.needLoad && game.CAKELEFT == 0) openExit();
	animateTiles();

	game.player.flip = input.mouseX > (game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX ? 1 : -1;

	rebuildTunnelFields();
	updateCakes();
	updateTurrets();
	updatePlasma();
	updateSparkles();
	updateCrates();

	if (game.bossNum > 0) {
		if (game.bossNum == 2 || game.bossNum == 4) updateProjectiles();
		updateBossRumble();
	}

	updatePlatforms();
	updatePortals();
	game.camera.move();
	if (ui.currentMenu == Menu.TUTORIAL) updateTutorial();

	if (game.player.dead) {
		const a = -(game.player.life / 256);
		game.player.life += 6;
		game.player.checkDeath();
		setSoundVolume(sfx_flatline, a / 2);
	}

	if (game.player.fadeNextLevel >= 0) updateTransition();
	updateText();
	if (game.bossNum <= 0) updateRobot();
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
		game.offsetY = 96;
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

/** @type {number} The transition effect of the level end, chosen at random. */
export let TRANS = Transition.HORIZONTAL_LINES;
