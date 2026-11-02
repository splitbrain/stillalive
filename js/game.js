/**
 * The tick function: the flow of the menus and the levels, and the end of a level.
 */

import { playSound, sfx_transition } from './audio.js';
import { manageBoss, skipComingBoss } from './boss.js';
import { ctx } from './canvas.js';
import { CampaignId, Menu } from './constants.js';
import { alertDialog } from './dialog.js';
import { drawLevelEditor } from './editor.js';
import { crosshair } from './images.js';
import { manageKeys, unclick } from './input.js';
import { campaigns, gestionPorte, loadLevel, loadPreviewMap } from './level.js';
import { getFps } from './loop.js';
import { canSplash } from './main.js';
import { updatePanel } from './panel.js';
import { finNiveau } from './physics.js';
import { dansUnPortal } from './portals.js';
import { drawAllGame } from './render/game.js';
import { drawHudText, drawKeys, drawText } from './render/hud.js';
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
import { encodeReplay } from './replay.js';
import { game, input, ui } from './state.js';
import { getBestTime, maxLevel, saveBestTime, saveProgress } from './storage.js';
import { manageTutorial } from './tutorial.js';
import { random, toTime } from './utils.js';

/**
 * Run one tick of the game: process the input, draw the current screen and update the panel.
 *
 * @returns {void}
 */
export function myLoop() {
	manageKeys();
	if (!ui.drawCredits) draw();
	else doDrawCredits();
	updatePanel();
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
 * Run the game logic of the current screen and draw it.
 *
 * During a level, the function advances the level time, moves the player, handles the doors and the level end, and
 * draws the level. Each menu screen draws itself and handles its clicks.
 *
 * @returns {void}
 */
function draw() {
	if (ui.currentMenu == Menu.EDITOR) {
		drawLevelEditor();
	} else if ((ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) && !ui.escapeMenu) {
		if (!finNiveau() && game.perso.fadeNextLevel == -1) {
			if (game.TIME == 0) unclick();
			game.TIME++;
		}
		game.needRedrawTiles = 0;
		if (!game.perso.mort && game.perso.fadeNextLevel == -1) {
			game.perso.move();
			if (game.needRedrawTiles == 0) game.needRedrawTiles = dansUnPortal(game.perso);
		}

		gestionPorte();
		if (finNiveau()) {
			game.bossNum = 0;
			game.ECART_X = 64;
			game.ECART_Y = 96;

			if (game.perso.fadeNextLevel > 0) {
				game.perso.fadeNextLevel -= 4;
			}
			if (game.perso.fadeNextLevel == -1) {
				ui.drawCredits = false;
				game.perso.fadeNextLevel = 120;
				game.perso.intermissionFade = 20;
				TRANS = parseInt(random(1, 7)); //7 not included
				playSound(sfx_transition);
				ui.highscoreMessage = '';
				unclick();
				if (ui.currentMenu == Menu.PLAY && !game.replayMode) ui.highscoreMessage = checkBestTime();
				ui.intermissionChoice = 0;
				//TRANS = 7;
				if (ui.currentMenu == Menu.PLAY && !game.replayMode) {
					if (maxLevel[ui.campaign] < ui.currentLevel + 1) {
						if (ui.campaign == CampaignId.STORY && maxLevel[ui.campaign] == 28) ui.drawCredits = true;
						saveProgress(ui.campaign, ui.currentLevel + 1);
					}
				}

				game.replayMode = false;
			}
			if (game.perso.fadeNextLevel <= 0) {
				game.perso.fadeNextLevel = 0;

				if (ui.currentMenu == Menu.TUTORIAL) {
					ui.currentLevel++;
					if (ui.currentLevel < 9) {
						unclick();
						loadLevel(ui.currentLevel);
					} else {
						ui.currentLevel = 9;
						if (!ui.tutoEnded) game.perso.fadeNextLevel = 1;
					}
					ui.tutoPause = true;
				} else {
					ui.drawIntermission = true;
					if (ui.intermissionChoice == 3) {
						//continue
						unclick();
						if (ui.currentMenu == Menu.PLAY) {
							loadLevel(++ui.currentLevel);
							game.perso.intermissionFade = -20;
						}
					} else if (ui.intermissionChoice == 2) {
						//restart
						unclick();
						if (ui.currentMenu == Menu.PLAY) {
							loadLevel(ui.currentLevel);
							if (game.bossNum > 0) skipComingBoss();
						}
						game.perso.intermissionFade = -20;
					} else if (ui.intermissionChoice == 1) {
						//exit
						exitFunc();
					} else if (ui.intermissionChoice == 4) {
						//watch replay
						unclick();
						game.replayMode = true;
						if (ui.currentMenu == Menu.PLAY) loadLevel(ui.currentLevel);
						game.perso.intermissionFade = -20;
					}
				}
			}
		} else {
			if (game.perso.intermissionFade == 0) {
				if (game.perso.fadeNextLevel > 0) {
					game.perso.fadeNextLevel -= 4;
				}
				if (game.perso.fadeNextLevel <= 0) {
					game.perso.fadeNextLevel = -1;
					ui.drawIntermission = false;
				}
			}
		}

		if (ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) {
			if (game.bossNum > 0 && game.bossIsComing && game.perso.fadeNextLevel == -1) game.perso.fadeNextLevel = 0;
			drawAllGame();
			drawHudText();

			manageBoss();

			if (game.replayMode) {
				drawKeys();
			}

			if (ui.currentMenu == Menu.TUTORIAL && ui.currentLevel == 9) {
				ui.currentLevel = 9;
				ctx.fillStyle = 'rgb(0, 0, 0)';
				ctx.fillRect(game.ECART_X, game.ECART_Y, 544, 384);

				manageTutorial();
				drawText(146, 28, 11);

				if (input.mousePressed) {
					unclick();
					ui.currentMenu = Menu.MAIN;
					ui.selectMenu = 0;
					ui.fadeMenu = 30;
					game.sparkles = new Array();
				}

				ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
			}
		}
	} else if ((ui.currentMenu == Menu.PLAY || ui.currentMenu == Menu.TUTORIAL) && ui.escapeMenu) {
		drawPauseMenu();
	} else if (ui.currentMenu == Menu.LOADING) {
		//loading is in progress
		if (canSplash && !overSplash) drawSplash();
		else if (overSplash) drawLoadingScreen();
	} else if (ui.currentMenu == Menu.MAIN) {
		if (ui.selectMenu == 0) drawMainMenu();
		else {
			drawMapSelection();
			drawText(30, 25, 14);
		}
	}

	ctx.font = 'bold 10px Arial';
	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.fillText('' + getFps(), 5, 10);
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
		//campaign
		game.ECART_X = 0;
		game.ECART_Y = 96;
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

/** @type {number} The transition effect of the level end, chosen at random from 1 to 6. */
export let TRANS = 4;
