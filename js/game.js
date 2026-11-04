/**
 * The tick function: the flow of the menus and the levels, and the end of a level.
 */

import { playSound, setSoundVolume, sfx_flatline, sfx_transition } from './audio.js';
import { updateBoss, updateBossRumble } from './boss.js';
import { CampaignId, IntermissionButton, LEVELS_PER_CAMPAIGN, Menu, Transition } from './constants.js';
import { updateLevelEditor } from './editor.js';
import { animateTiles } from './entities/AnimatedTile.js';
import { updateCakes } from './entities/Cake.js';
import { updateCrates } from './entities/Crate.js';
import { rebuildGravPipeFields } from './entities/GravPipeField.js';
import { updatePlasma } from './entities/Plasma.js';
import { updatePlatforms } from './entities/Platform.js';
import { updatePortals } from './entities/Portal.js';
import { updateProjectiles } from './entities/Projectile.js';
import { updateRobot } from './entities/Robot.js';
import { updateSparkles } from './entities/Sparkle.js';
import { updateTurrets } from './entities/Turret.js';
import { isWaiting, updateEvents } from './events.js';
import { manageKeys, unclick } from './inputState.js';
import { updateTransition } from './intermission.js';
import { campaigns, loadLevel, manageDoors } from './level.js';
import {
	updateCredits,
	updateLoadingScreen,
	updateMainMenu,
	updateMapSelection,
	updatePauseMenu,
	updateSplash,
} from './menus.js';
import { exitFunc } from './navigation.js';
import { updatePanel } from './panel.js';
import { atExit } from './physics.js';
import { isInPortal } from './portals.js';
import { encodeReplay } from './replay.js';
import { updateText } from './robotText.js';
import { game, input, ui } from './state.js';
import { getBestTime, maxLevel, saveBestTime, saveProgress } from './storage.js';
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
	else updateCredits();
	updatePanel();
}

/**
 * Store the level time and the replay if the time is a new best time.
 *
 * @returns {string} The message for the intermission screen.
 */
function checkBestTime() {
	const campaign = campaigns[ui.campaign].folder;
	const best = getBestTime(campaign, ui.currentLevel);
	if (best != null && best <= game.time) return 'Best time : ' + toTime(best);

	saveBestTime(campaign, ui.currentLevel, game.time, encodeReplay(game.replay, campaign, ui.currentLevel)).catch(
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
		updateLevelEditor();
	} else if (ui.currentMenu == Menu.PLAY && !ui.escapeMenu) {
		updateLevel();
	} else if (ui.currentMenu == Menu.PLAY && ui.escapeMenu) {
		updatePauseMenu();
	} else if (ui.currentMenu == Menu.LOADING) {
		if (ui.canSplash && !ui.splash.over) updateSplash();
		else if (ui.splash.over) updateLoadingScreen();
	} else if (ui.currentMenu == Menu.MAIN) {
		if (ui.selectMenu == 0) updateMainMenu();
		else updateMapSelection();
	}
}

/**
 * Run one tick of a level: the level time, the player, the doors, the level end with the intermission screen, the
 * objects, the boss and the events. The level time stands still while an event waits and while the boss comes in.
 *
 * @returns {void}
 */
function updateLevel() {
	if (!atExit() && game.player.fadeNextLevel == -1) {
		if (game.time == 0) unclick();
		game.time++;
	}
	game.needRedrawTiles = 0;
	if (!game.player.dead && game.player.fadeNextLevel == -1) {
		game.player.move();
		if (game.needRedrawTiles == 0) game.needRedrawTiles = isInPortal(game.player);
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

	if ((isWaiting() || (game.bossNum > 0 && game.bossIsComing)) && game.player.fadeNextLevel == -1) {
		game.player.fadeNextLevel = 0;
	}
	updateObjects();
	updateBoss();
	if (!atExit()) updateEvents();
}

/**
 * Run the end of a level: the closing transition, the best time, the progress and the choice of the intermission
 * screen. In a campaign without intermission screens, the next level starts at once. The last level always shows the
 * intermission screen, with the end text of the campaign if it has one.
 *
 * @returns {void}
 */
function updateLevelEnd() {
	const campaign = campaigns[ui.campaign];
	const isLastLevel = ui.currentLevel == campaign.levels.length;
	game.bossNum = 0;
	game.shakeX = 0;
	game.shakeY = 0;

	if (game.player.fadeNextLevel > 0) {
		game.player.fadeNextLevel -= 4;
	}
	if (game.player.fadeNextLevel == -1) {
		ui.drawCredits = false;
		game.player.fadeNextLevel = 120;
		game.player.intermissionFade = 20;
		ui.transition = random(Transition.TOP_LEFT, Transition.SQUARE + 1);
		playSound(sfx_transition);
		ui.highscoreMessage = '';
		game.message = '';
		unclick();
		const records = campaign.records && !game.replayMode;
		if (records) ui.highscoreMessage = checkBestTime();
		if (isLastLevel && campaign.endText) ui.highscoreMessage = campaign.endText;
		ui.intermissionChoice = IntermissionButton.NONE;
		if (records) {
			if (maxLevel[ui.campaign] < ui.currentLevel + 1) {
				if (ui.campaign == CampaignId.STORY && maxLevel[ui.campaign] == LEVELS_PER_CAMPAIGN) ui.drawCredits = true;
				saveProgress(ui.campaign, ui.currentLevel + 1);
			}
		}

		game.replayMode = false;
	}
	if (game.player.fadeNextLevel <= 0) {
		game.player.fadeNextLevel = 0;

		if (!campaign.intermission && !isLastLevel) {
			startLevel(ui.campaign, ui.currentLevel + 1);
		} else {
			ui.drawIntermission = true;
			if (ui.intermissionChoice == IntermissionButton.CONTINUE) {
				unclick();
				startLevel(ui.campaign, ui.currentLevel + 1);
				game.player.intermissionFade = -20;
			} else if (ui.intermissionChoice == IntermissionButton.RESTART) {
				unclick();
				startLevel(ui.campaign, ui.currentLevel, null, true);
				game.player.intermissionFade = -20;
			} else if (ui.intermissionChoice == IntermissionButton.EXIT) {
				exitFunc();
			} else if (ui.intermissionChoice == IntermissionButton.REPLAY) {
				unclick();
				startLevel(ui.campaign, ui.currentLevel, game.replay);
				game.player.intermissionFade = -20;
			}
		}
	}
}

/**
 * Update the objects of a level in the order of the game logic: the tiles, the player direction, the pipe fields,
 * the cakes, the turrets, the plasma balls, the sparkles, the crates, the boss projectiles, the platforms, the
 * portals, the camera, the death fade, the transitions, the texts and the robot.
 *
 * @returns {void}
 */
function updateObjects() {
	animateTiles();

	game.player.flip = input.mouseX > (game.player.x >> 8) + (game.player.pX >> 1) ? 1 : -1;

	rebuildGravPipeFields();
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
 * Start a level of a campaign, or the playback of a replay of the level.
 *
 * @param {number} campaign The index of the campaign.
 * @param {number} level The level number, starting at 1.
 * @param {Replay|null} [replay] The replay to play, or null to let the player play.
 * @param {boolean} [restart] True for a restart of the same level: the waits of the events and the entrance of the
 *     boss are skipped.
 * @returns {void}
 */
export function startLevel(campaign, level, replay = null, restart = false) {
	ui.campaign = campaign;
	ui.currentLevel = level;
	ui.currentMenu = Menu.PLAY;
	game.shakeX = 0;
	game.shakeY = 0;
	game.replayMode = replay !== null;
	if (replay) game.replay = replay;
	loadLevel(level, restart);
	unclick();
}
