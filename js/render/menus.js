/**
 * Drawing and handling of the splash screen, the loading screen, the menus, the intermission and the credits.
 */

import { allImagesLoaded, areImagesLoaded, imageProgress, missingImages } from '../assets.js';
import { allSoundsLoaded, disableSound, isSoundAvailable, isSoundOn, soundProgress, toggleSound } from '../audio.js';
import { drawBoss, setupBoss, skipComingBoss } from '../boss.js';
import { ctx } from '../canvas.js';
import {
	BUTTON_CAMPAIGN,
	CAMPAIGN_FINISHED,
	CampaignId,
	IntermissionButton,
	LEVELS_PER_CAMPAIGN,
	MainButton,
	MAP_SIZE,
	Menu,
	MouseButton,
	NUM_TILES,
	PauseButton,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	SelectionButton,
	SparkleType,
} from '../constants.js';
import { lvlEditorSetup } from '../editor.js';
import { updateRobot } from '../entities/Robot.js';
import { createSparkles, drawSparkles, updateSparkles } from '../entities/Sparkle.js';
import { exitFunc } from '../game.js';
import {
	bg,
	bluePortal,
	body,
	cake,
	controls,
	crateImage,
	crosshair,
	head,
	highscore,
	hud,
	mapSelection,
	menuBG,
	noLevel,
	pauseBG,
	platform,
	portalGun,
	redPortal,
	tex_blackos,
	tex_button,
	tex_cross,
	tex_sound,
	tex_tails,
	tileset,
	tube,
	tube2,
	turretImages,
} from '../images.js';
import { mouseInZone, unclick } from '../input.js';
import { keyLabels } from '../keys.js';
import { creditsTxt, levelsLoaded, levelsToLoad, loadLevel, loadPreviewMap, missingLevelFiles } from '../level.js';
import { copyCanvas, drawCopy, drawPlayer, drawRobot, drawTunnels } from './game.js';
import { drawHudText, drawText } from './hud.js';
import { resumeReplay } from '../replay.js';
import { game, input, ui } from '../state.js';
import { maxLevel } from '../storage.js';
import { Tile } from '../tiles.js';
import { setupTutorial } from '../tutorial.js';
import { getAngle, toTime } from '../utils.js';

/**
 * Set the text of the robot panel for the level selection.
 *
 * @returns {void}
 */
export function prepareSelectionText() {
	ui.timeWriting = 0;
	ui.txtLines = new Array();

	ui.txtLines.push('Welcome to the campaign mode of StillAliveJS. Here you can select a map on the right and click');
	ui.txtLines.push("'Play' to play it. Good Luck !");
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
function isLevelLocked() {
	return ui.currentMenu == Menu.PLAY && ui.currentLevel > maxLevel[ui.campaign];
}

/**
 * Draw the buttons of the intermission screen. The hovered button is smaller.
 *
 * @returns {void}
 */
function drawIntermissionButtons() {
	const hover = ui.intermissionHover;
	drawTinyButton(74, 445, hover == IntermissionButton.EXIT ? 0.9 : 1, 'Exit');
	if (!isLevelLocked()) drawTinyButton(74 + 130, 445, hover == IntermissionButton.RESTART ? 0.9 : 1, 'Restart');
	if (
		ui.currentMenu == Menu.PLAY &&
		ui.currentLevel < LEVELS_PER_CAMPAIGN &&
		maxLevel[ui.campaign] >= ui.currentLevel + 1
	) {
		drawTinyButton(74 + 260, 445, hover == IntermissionButton.CONTINUE ? 0.9 : 1, 'Continue');
	}
	drawTinyButton(74 + 390, 445, hover == IntermissionButton.REPLAY ? 0.9 : 1, 'Watch Replay');
}

/**
 * Draw a portal gun in the main menu.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} angle The angle of the gun in radians.
 * @returns {void}
 */
function drawPortalGunMenu(x, y, angle) {
	const a = angle;
	ctx.save();
	ctx.translate(x + 8, y + 13);
	ctx.rotate(a);
	ctx.drawImage(portalGun, -5, -5);
	ctx.restore();
}

/**
 * Draw the pause menu and handle its clicks.
 *
 * @returns {void}
 */
export function drawPauseMenu() {
	ctx.fillStyle = 'rgb(0, 65, 88)';
	ctx.drawImage(pauseBG, game.offsetX, game.offsetY);

	ctx.fillStyle = 'rgb(255, 255, 255)';
	let overMenu = -1;
	if (mouseInZone(50 + game.offsetX, 180 + game.offsetY, 120, 24)) overMenu = PauseButton.RESUME;
	else if (ui.currentMenu != Menu.TUTORIAL && mouseInZone(187 + game.offsetX, 180 + game.offsetY, 120, 24))
		overMenu = PauseButton.RESTART;
	else if (mouseInZone(324 + game.offsetX, 180 + game.offsetY, 120, 24)) overMenu = PauseButton.EXIT;
	else if (ui.currentMenu != Menu.TUTORIAL && mouseInZone(187 + game.offsetX, 340 + game.offsetY, 120, 24))
		overMenu = PauseButton.SOUND;

	const scale1 = overMenu == PauseButton.RESUME ? 0.9 : 1;
	const scale2 = overMenu == PauseButton.RESTART ? 0.9 : 1;
	const scale3 = overMenu == PauseButton.EXIT ? 0.9 : 1;
	const scale4 = overMenu == PauseButton.SOUND ? 0.9 : 1;

	drawTinyButton(game.offsetX + 50, game.offsetY + 180, scale1, 'Resume');
	if (ui.currentMenu != Menu.TUTORIAL) drawTinyButton(game.offsetX + 187, game.offsetY + 180, scale2, 'Restart');
	drawTinyButton(game.offsetX + 324, game.offsetY + 180, scale3, 'Exit');
	if (ui.currentMenu != Menu.TUTORIAL && isSoundAvailable())
		drawTinyButton(187 + game.offsetX, 340 + game.offsetY, scale4, 'Sounds : ' + (isSoundOn() ? 'On' : 'Off'));

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
				loadLevel(ui.currentLevel);
				if (game.bossNum > 0) skipComingBoss();
			}
		} else if (overMenu == PauseButton.EXIT) {
			ui.escapeMenu = !ui.escapeMenu;
			exitFunc();
		} else if (overMenu == PauseButton.SOUND) {
			toggleSound();
		}
	}

	ctx.drawImage(hud, 0, 0);
	if (ui.currentMenu == Menu.PLAY) drawText(146, 28, 11);
	updateRobot();
	drawRobot();

	drawHudText();

	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the splash screen with its animation and go to the menu when it ends and all files are loaded.
 *
 * @returns {void}
 */
export function drawSplash() {
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillRect(0, 0, 640, 544);

	ctx.drawImage(noLevel, 0, 32, 640, 480);

	ctx.font = 'bold 48px Yikes';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	ctx.fillText('Welcome To', 160 + 4 + 60, titleY + 4 - 80);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Welcome To', 160 + 60, titleY - 80);

	ctx.font = 'bold 64px Yikes';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	ctx.fillText('StillAliveJS', 160 + 4, titleY + 4);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('StillAliveJS', 160, titleY);

	titleY += titleVY;
	titleVY += 0.2;
	if (titleVY > 10) titleVY = 10;
	else if (titleVY < -10) titleVY = -10;
	if (titleY > 400 && timeExit < 300) {
		titleY = 400;
		titleVY = -(titleVY >> 2);
	}

	ctx.font = 'bold 24px Yikes';
	ctx.fillStyle = 'rgb(0, 65, 88)';

	if (timeExit > 100) tailsVY += 0.1;
	if (tailsVY > 10) tailsVY = 10;
	else if (tailsVY < -10) tailsVY = -10;

	tailsY += tailsVY;
	if (tailsY > 100 && timeExit < 330) {
		tailsY = 100;
		tailsVY = -(tailsVY >> 2);
	}

	if (timeExit > 200) blackosVY += 0.1;
	if (blackosVY > 10) blackosVY = 10;
	else if (blackosVY < -10) blackosVY = -10;

	blackosY += blackosVY;
	if (blackosY > 130 && timeExit < 360) {
		blackosY = 130;
		blackosVY = -(blackosVY >> 2);
	}

	timeExit++;

	ctx.drawImage(tex_tails, 32, 32 + tailsY);
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText('Created by t4ils', 100 + 2, 64 + 2 + tailsY);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Created by t4ils', 100, 64 + tailsY);

	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText('Gfx by ZeBlackos', 360 + 2, 64 + 2 + blackosY);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Gfx by ZeBlackos', 360, 64 + blackosY);
	ctx.drawImage(tex_blackos, 550, 32 + blackosY);

	if (tailsY > 580) {
		timeSplash--;
		if (timeSplash == 0) {
			overSplash = true;
			if (allImagesLoaded() && levelsLoaded >= levelsToLoad && allSoundsLoaded()) {
				ui.goMenu = 0;
				ui.fadeMenu = 30;
				unclick();
				ui.currentMenu = Menu.MAIN;
				game.sparkles = new Array();
			}
		}
	} else {
		if (++timeSplash > 60) timeSplash = 60;
	}
	ctx.fillStyle = 'rgba(0, 0, 0, ' + (1 - timeSplash / 60) + ')';
	ctx.fillRect(0, 0, 640, 544);

	if (input.mouseNewPress && timeExit < 360) {
		timeSplash = 60;
		timeExit = 360;
	}
}

/**
 * Draw the labels of the control keys into the empty key caps of the controls picture.
 *
 * @param {number} dx The x position of the picture.
 * @param {number} dy The y position of the picture.
 * @returns {void}
 */
function drawKeyLabels(dx, dy) {
	ctx.font = 'bold 14px Arial';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText(keyLabels.KeyW, dx + 70, dy + 81);
	ctx.fillText(keyLabels.KeyA, dx + 37, dy + 113);
	ctx.fillText(keyLabels.KeyS, dx + 70, dy + 113);
	ctx.fillText(keyLabels.KeyD, dx + 103, dy + 113);
	ctx.fillText(keyLabels.KeyE, dx + 200, dy + 81);
	ctx.textAlign = 'left';
	ctx.font = 'bold 10px Arial';
	ctx.fillStyle = 'rgb(255, 255, 255)';
}

/**
 * Draw the loading screen with the progress bars, the controls and the missing files, and go to the menu on a click
 * when all files are loaded.
 *
 * @returns {void}
 */
export function drawLoadingScreen() {
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	ctx.fillStyle = 'rgb(0, 65, 88)';
	ctx.fillRect(0, 0, 640, 544);

	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.fillText('Loading gfx ...', 10, 10);
	ctx.fillText('Loading maps ...', 10, 50);
	ctx.fillText('Loading sfx ...', 10, 90);

	ctx.fillStyle = 'rgb(255, 0, 0)';
	if (game.TIME % 50 < 25) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
	}

	if (mouseInZone(80, 80, 133, 16)) {
		ctx.fillStyle = 'rgb(255, 255, 255)';
		if (input.mouseNewPress) {
			disableSound();
		}
	}

	ctx.fillText('(click here if not loading)', 85, 90);
	ctx.fillStyle = 'rgb(255, 255, 255)';

	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.strokeRect(10, 20, 202, 14);
	ctx.strokeRect(10, 60, 202, 14);
	ctx.strokeRect(10, 100, 202, 14);

	ctx.fillText('- Grab cakes and reach the exit of each level.', 10, 130);
	ctx.fillText('- Use your portal gun to teleport through levels.', 10, 140);

	ctx.fillStyle = 'rgb(255, 0, 0)';
	ctx.fillRect(11, 21, Math.trunc(imageProgress() * 200), 12);
	ctx.fillRect(11, 61, Math.trunc((levelsLoaded / levelsToLoad) * 200), 12);
	ctx.fillRect(11, 101, Math.trunc(soundProgress() * 200), 12);
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.fillText(Math.trunc(imageProgress() * 100) + '%', 100, 30);
	ctx.fillText(Math.trunc((levelsLoaded / levelsToLoad) * 100) + '%', 100, 70);
	ctx.fillText(Math.trunc(soundProgress() * 100) + '%', 100, 110);

	const missing = missingImages();
	if (missing.length > 0) {
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.fillText('Some images could not be loaded: ' + missing.join(', '), 10, 160);
		ctx.fillStyle = 'rgb(255, 255, 255)';
	}

	const missingLevels = missingLevelFiles();
	if (missingLevels.length > 0) {
		const more = missingLevels.length > 3 ? ' and ' + (missingLevels.length - 3) + ' more' : '';
		ctx.fillStyle = 'rgb(255, 0, 0)';
		ctx.fillText('Some levels could not be loaded: ' + missingLevels.slice(0, 3).join(', ') + more, 10, 172);
		ctx.fillStyle = 'rgb(255, 255, 255)';
	}

	const imagesReady = areImagesLoaded([body[0], body[1], head[0], head[1], controls, crosshair, bluePortal, redPortal]);
	if (imagesReady) {
		const dx = 225;
		const dy = 190;
		ctx.drawImage(controls, dx, dy);
		drawKeyLabels(dx, dy);

		drawPlayer(62 + dx, dy, -1);
		drawPlayer(124 + dx, 95 + dy, 1);
		drawPlayer(dx, 95 + dy, -1);
		ctx.drawImage(bluePortal, 0, 0, 32, 32, 68 + dx, 177 + dy, 32, 32);
		ctx.drawImage(redPortal, 0, 0, 32, 32, 171 + dx, 177 + dy, 32, 32);
	}

	game.TIME++;
	if (allImagesLoaded() && levelsLoaded >= levelsToLoad && allSoundsLoaded()) {
		if (game.TIME % 50 < 25) {
			ctx.fillText('Click to continue ...', 280, 476);
		}
		if (input.mousePressed) {
			ui.goMenu = 0;
			ui.fadeMenu = 30;
			unclick();
			ui.currentMenu = Menu.MAIN;
			game.sparkles = new Array();
		}
	}
	if (imagesReady) ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the level selection of a campaign and handle its clicks.
 *
 * @returns {void}
 */
export function drawMapSelection() {
	let scale3, i;
	if (ui.previewMap < 1) ctx.drawImage(noLevel, game.offsetX, game.offsetY);
	if (ui.previewMap > 0) drawPreviewMap();
	ctx.drawImage(mapSelection, 0, 0);

	if (input.mouseX >= 529 && input.mouseX <= 529 + 90) {
		if (input.mouseY >= 12 + 105 && input.mouseY <= 104 + 29 * 12) {
			const y = Math.trunc((input.mouseY - 105) / 12);
			if (y <= maxLevel[ui.campaign]) {
				ctx.fillStyle = 'rgb(15, 112, 144)';
				ctx.fillRect(529, 105 + y * 12 + 2, 90, 14);

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
	const scale2 = overMenu == SelectionButton.EXIT ? 0.9 : 1;
	drawTinyButton(20, 495, scale2, 'Exit');

	if (ui.previewMap > 0) {
		ctx.fillStyle = 'rgb(15, 112, 144)';
		ctx.fillRect(529, 105 + ui.previewMap * 12 + 2, 90, 14);

		if (mouseInZone(515, 495, 120, 24)) overMenu = SelectionButton.PLAY;
		const scale1 = overMenu == SelectionButton.PLAY ? 0.9 : 1;

		drawTinyButton(515, 495, scale1, 'Play');
	}

	if (ui.campaign == CampaignId.NORMAL && maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED) {
		if (mouseInZone(380, 495, 120, 24)) overMenu = SelectionButton.MODE;
		scale3 = overMenu == SelectionButton.MODE ? 0.9 : 1;
		drawTinyButton(380, 495, scale3, 'Hard Mode');
	} else if (ui.campaign == CampaignId.ADVANCED) {
		if (mouseInZone(380, 495, 120, 24)) overMenu = SelectionButton.MODE;
		scale3 = overMenu == SelectionButton.MODE ? 0.9 : 1;
		drawTinyButton(380, 495, scale3, 'Normal Mode');
	}

	if (input.mousePressed && input.mouseButton == MouseButton.LEFT && overMenu > 0) {
		if (overMenu == SelectionButton.PLAY) {
			game.offsetX = 64;
			game.offsetY = 96;
			ui.currentMenu = Menu.PLAY;
			ui.currentLevel = ui.previewMap;
			loadLevel(ui.currentLevel);
			unclick();
			return;
		} else if (overMenu == SelectionButton.EXIT) {
			game.offsetX = 64;
			game.offsetY = 96;
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

	ctx.font = 'bold 12px Arial';
	for (i = 0; i < LEVELS_PER_CAMPAIGN; i++) {
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		if (i + 1 <= maxLevel[ui.campaign]) {
			ctx.fillStyle = 'rgb(255, 255, 255)';
		} else {
			ctx.fillStyle = 'rgb(200, 200, 200)';
		}
		ctx.fillText('Level ' + (i + 1), 549, 105 + 24 + i * 12);
	}

	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw a large button with a text.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} scale The size, 1 for normal and smaller when the mouse is over the button.
 * @param {string} text The text on the button.
 * @returns {void}
 */
function drawBigButton(x, y, scale, text) {
	ctx.drawImage(tex_button, x + ((1 - scale) * 320) / 2, y + ((1 - scale) * 64) / 2, 320 * scale, 64 * scale);

	x += 320 / 2;

	ctx.font = '36px yikes';
	if (scale != 1) ctx.font = '34px yikes';

	const metrics = ctx.measureText(text);
	x -= metrics.width / 2;
	y += 45;

	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText(text, x + 4, y + 4);
	ctx.fillStyle = 'rgb(253, 233, 0)';

	ctx.fillText(text, x, y);
}

/**
 * Draw a small button with a text.
 *
 * @param {number} x The x coordinate in canvas pixels.
 * @param {number} y The y coordinate in canvas pixels.
 * @param {number} scale The size, 1 for normal and smaller when the mouse is over the button.
 * @param {string} text The text on the button.
 * @returns {void}
 */
export function drawTinyButton(x, y, scale, text) {
	ctx.drawImage(tex_button, x + ((1 - scale) * 120) / 2, y + ((1 - scale) * 24) / 2, 120 * scale, 24 * scale);

	x += 120 / 2;

	ctx.font = '16px yikes';
	if (scale != 1) ctx.font = '14px yikes';
	const metrics = ctx.measureText(text);
	x -= metrics.width / 2;
	y += 18;

	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText(text, x + 2, y + 2);
	ctx.fillStyle = 'rgb(253, 233, 0)';

	ctx.fillText(text, x, y);
}

/**
 * Draw the main menu with the sound button, and open the selected screen after the fade.
 *
 * @returns {void}
 */
export function drawMainMenu() {
	let pX, pY, pX2;
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	ctx.fillStyle = 'rgb(0, 65, 88)';
	ctx.drawImage(menuBG, 0, 0);

	const yStart = 32;
	const spacing = 18;

	let overMenu = -1;
	if (mouseInZone(160, yStart, 320, 64)) overMenu = MainButton.CLASSIC;
	else if (mouseInZone(160, yStart + 1 * (64 + spacing), 320, 64)) overMenu = MainButton.ENHANCED;
	else if (mouseInZone(160, yStart + 2 * (64 + spacing), 320, 64)) overMenu = MainButton.ULTIMATE;
	else if (mouseInZone(160, yStart + 3 * (64 + spacing), 320, 64)) overMenu = MainButton.EDITOR;
	else if (mouseInZone(160, yStart + 4 * (64 + spacing), 320, 64)) overMenu = MainButton.TUTORIAL;

	const scale1 = overMenu == MainButton.CLASSIC ? 0.9 : 1;
	const scale2 = overMenu == MainButton.ENHANCED ? 0.9 : 1;
	const scale3 = overMenu == MainButton.ULTIMATE ? 0.9 : 1;
	const scale4 = overMenu == MainButton.EDITOR ? 0.9 : 1;
	const scale5 = overMenu == MainButton.TUTORIAL ? 0.9 : 1;

	if (ui.goMenu) {
		if (ui.menuButton == MainButton.CLASSIC)
			drawBigButton(
				160,
				yStart,
				scale1,
				'Classic Mode' + (maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED ? ' +' : ''),
			);
		else if (ui.menuButton == MainButton.ENHANCED)
			drawBigButton(160, yStart + 1 * (64 + spacing), scale2, 'Enhanced Mode');
		else if (ui.menuButton == MainButton.ULTIMATE)
			drawBigButton(160, yStart + 2 * (64 + spacing), scale3, 'Ultimate Mode');
		else if (ui.menuButton == MainButton.EDITOR)
			drawBigButton(160, yStart + 3 * (64 + spacing), scale4, 'Level Editor');
		else if (ui.menuButton == MainButton.TUTORIAL) drawBigButton(160, yStart + 4 * (64 + spacing), scale5, 'Tutorial');
	} else {
		drawBigButton(160, yStart, scale1, 'Classic Mode' + (maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED ? ' +' : ''));
		drawBigButton(160, yStart + 1 * (64 + spacing), scale2, 'Enhanced Mode');
		drawBigButton(160, yStart + 2 * (64 + spacing), scale3, 'Ultimate Mode');
		drawBigButton(160, yStart + 3 * (64 + spacing), scale4, 'Level Editor');
		drawBigButton(160, yStart + 4 * (64 + spacing), scale5, 'Tutorial');

		pX = 130;
		pY = yStart + 25 + overMenu * (64 + spacing);

		pX2 = 150 + 320 + 40 - 16;

		// the players stand next to the hovered button
		if (overMenu >= 0) {
			drawPortalGunMenu(pX, pY, getAngle(pX, pY, input.mouseX, input.mouseY));
			drawPlayer(pX, pY, 1);

			drawPortalGunMenu(pX2, pY, getAngle(pX2, pY, input.mouseX, input.mouseY));
			drawPlayer(pX2, pY, -1);
		}
	}

	let zoomSound = 1;
	if (isSoundAvailable() && mouseInZone(20, 385, 29, 48)) {
		zoomSound = 0.9;
		if (input.mousePressed && input.mouseButton == MouseButton.LEFT) {
			unclick();
			toggleSound();
		}

		ctx.globalAlpha = 0.8;
		ctx.fillStyle = 'rgb(7, 49, 63)';
		ctx.fillRect(20, 385, 300, 48);

		ctx.fillStyle = 'rgb(255, 255, 255)';
		ctx.font = 'bold 12px Arial';
		ctx.fillText('Sound is an experimental feature that might', 55, 397);
		ctx.fillText('not work very well. Turn it off to increase', 55, 413);
		ctx.fillText('performances.', 55, 428);

		ctx.globalAlpha = 1;
	}

	if (isSoundAvailable()) {
		ctx.font = '18px yikes';
		ctx.fillStyle = 'rgb(253, 233, 0)';
		ctx.drawImage(
			tex_sound,
			20 + ((1 - zoomSound) * 29) / 2,
			385 + ((1 - zoomSound) * 48) / 2,
			29 * zoomSound,
			48 * zoomSound,
		);
		if (!isSoundOn())
			ctx.drawImage(
				tex_cross,
				15 + ((1 - zoomSound) * 40) / 2,
				390 + ((1 - zoomSound) * 40) / 2,
				40 * zoomSound,
				34 * zoomSound,
			);
		ctx.fillText('SFX', 20, 450);
	}

	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	if (input.mousePressed && input.mouseButton == MouseButton.LEFT && overMenu >= 0 && ui.goMenu == 0) {
		ui.menuButton = overMenu;
		ui.goMenu = 60;
		createSparkles(pX << 8, (pY << 8) + (13 << 8), input.mouseX << 8, input.mouseY << 8, 1, SparkleType.CAKE);
		createSparkles(pX << 8, (pY << 8) + (13 << 8), input.mouseX << 8, input.mouseY << 8, 1, SparkleType.SMOKE);
		createSparkles(pX2 << 8, (pY << 8) + (13 << 8), input.mouseX << 8, input.mouseY << 8, 0, SparkleType.CAKE);
		createSparkles(pX2 << 8, (pY << 8) + (13 << 8), input.mouseX << 8, input.mouseY << 8, 0, SparkleType.SMOKE);
		unclick();
	} else if (ui.goMenu) {
		if (--ui.goMenu == 0) {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillRect(0, 0, 640, 544);
			if (ui.menuButton in BUTTON_CAMPAIGN) {
				ui.selectMenu = 1;
				ui.previewMap = 0;
				prepareSelectionText();
				document.getElementById('highscores').classList.add('open');
				game.offsetX = 0;
				game.offsetY = 96;
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
		} else {
			const a = ui.goMenu / 60;
			ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - a) + ')';
			ctx.fillRect(0, 0, 640, 544);
		}
	}

	updateSparkles();
	drawSparkles();

	if (ui.fadeMenu > 0) {
		ui.fadeMenu--;
		const fa = ui.fadeMenu / 30;
		ctx.fillStyle = 'rgba(0, 0, 0, ' + fa + ')';
		ctx.fillRect(0, 0, 640, 544);
	}
}

/**
 * Draw the credits that scroll up, and go back to the menu at the end or on a click.
 *
 * @returns {void}
 */
export function doDrawCredits() {
	if (input.mouseNewPress && creditsTime > 150) speedScr = 5;
	creditsTime += speedScr;

	if (creditsTime > 1800) {
		if (creditsAlpha > 0) creditsAlpha -= 0.01;
		if (creditsAlpha < 0) {
			ui.drawCredits = false;
		}
	} else {
		if (creditsAlpha < 1) creditsAlpha += 0.01;
		if (creditsAlpha > 1) creditsAlpha = 1;
	}

	ctx.drawImage(noLevel, 0, 32, 640, 480);
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(0, 0, 640, 544);

	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - creditsAlpha) + ')';
	ctx.fillRect(0, 0, 640, 544);

	ctx.font = '24px yikes';
	for (let t = 0; t < creditsTxt.length; t++) {
		const txt = creditsTxt[t];
		const metrics = ctx.measureText(txt);
		const x = 320 - (metrics.width >> 1);

		const yLow = creditsTxt.length * 15;

		const y = t * 32 + (yLow - creditsTime);

		if (y <= 544) {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillText(txt, x + 2, y + 2);
			ctx.fillStyle = 'rgb(253, 233, 0)';
			ctx.fillText(txt, x, y);
		}
	}

	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillRect(0, 0, 640, 32);
	ctx.fillRect(0, 544 - 32, 640, 32);
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
 * Draw the intermission screen after a level with the time and the message.
 *
 * @returns {void}
 */
export function drawIntermission() {
	if (game.player.intermissionFade > 0) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(game.offsetX - 1, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		ctx.globalAlpha = 1 - game.player.intermissionFade / 20;
	}
	ctx.drawImage(highscore, game.offsetX, game.offsetY);
	if (game.player.intermissionFade > 0) ctx.globalAlpha = 1;

	drawIntermissionButtons();

	if (game.player.intermissionFade == 0) {
		ctx.fillStyle = 'rgb(255, 255, 255)';
		ctx.font = 'bold 12px Arial';
		ctx.fillText('Your time : ' + toTime(game.TIME), game.offsetX + 35, game.offsetY + 260);
		ctx.fillText(ui.highscoreMessage, game.offsetX + 35, game.offsetY + 278);
	}
}

/**
 * Draw the preview of a map with its objects.
 *
 * @returns {void}
 */
export function drawPreviewMap() {
	let i, ti, ci, pi;
	if (game.needLoad) {
		ctx.drawImage(bg[game.BG], game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		for (i = 0; i < game.displayMap.length; i++) {
			const y = i >> 5;
			const x = i - (y << 5);
			if (game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < MAP_SIZE) {
				const open = game.CAKELEFT == 0 && game.displayMap[i] == Tile.EXIT_CLOSED;
				const tile = open ? Tile.EXIT : game.displayMap[i];
				ctx.drawImage(tileset[tile], x * 16 + game.offsetX, y * 16 + game.offsetY, 16, 16);
			}
		}
		game.imgBuff = copyCanvas(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		game.needLoad = false;
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	} else {
		drawCopy(game.imgBuff, game.offsetX, game.offsetY);

		game.player.flip = 1;

		ctx.save();
		ctx.translate(
			(game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX,
			(game.player.y >> 8) + (game.player.pY >> 1) + game.offsetY,
		);
		ctx.drawImage(portalGun, -5, -5);
		ctx.restore();

		const flipDx = game.player.flip < 0 ? 1 : 0;
		ctx.drawImage(
			head[flipDx],
			game.player.animationFrame * 16,
			0,
			15,
			12,
			(game.player.x >> 8) + game.offsetX,
			(game.player.y >> 8) + game.offsetY,
			16,
			12,
		);
		ctx.drawImage(
			body[flipDx],
			game.player.animationFrame * 16,
			0,
			16,
			27,
			(game.player.x >> 8) + game.offsetX,
			(game.player.y >> 8) + game.offsetY,
			16,
			27,
		);

		for (i = 0; i < game.cakes.length; i++) {
			if (game.cakes[i].used) {
				ctx.drawImage(
					cake,
					(game.cakes[i].x >> 8) + game.offsetX,
					((game.cakes[i].y + game.cakes[i].vy) >> 8) + game.offsetY,
					16,
					12,
				);
			}
		}

		for (ti = 0; ti < game.turrets.length; ti++) {
			const side = game.turrets[ti].dir < 0 ? 0 : 1;
			ctx.drawImage(
				turretImages[side],
				0,
				game.turrets[ti].animFrame * 32,
				16,
				32,
				(game.turrets[ti].x >> 8) + game.offsetX,
				(game.turrets[ti].y >> 8) + game.offsetY,
				16,
				32,
			);
		}

		for (ci = 0; ci < game.crates.length; ci++) {
			ctx.drawImage(crateImage, (game.crates[ci].x >> 8) + game.offsetX, (game.crates[ci].y >> 8) + game.offsetY);
		}

		for (pi = 0; pi < game.platforms.length; pi++) {
			ctx.drawImage(platform, (game.platforms[pi].x >> 8) + game.offsetX, (game.platforms[pi].y >> 8) + game.offsetY);
		}

		drawTunnels();

		if (game.bossNum > 0) {
			if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4)
				ctx.drawImage(tube, (game.tubeX >> 8) + game.offsetX, (game.tubeY >> 8) + game.offsetY);
			else if (game.bossNum == 2)
				ctx.drawImage(tube2, (game.tubeX >> 8) + game.offsetX, (game.tubeY >> 8) + game.offsetY);
			drawBoss();
		}

		ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
	}
}

/** @type {boolean} True after the splash screen ended. */
export let overSplash = false;
/** @type {number} The fade of the splash screen, up to 60. */
let timeSplash = 0;
/** @type {number} Ticks of the splash screen; a click sets it to the end. */
let timeExit = 0;
/** @type {number} The vertical speed of the first author name on the splash screen. */
let tailsVY = 0;
/** @type {number} The vertical speed of the second author name on the splash screen. */
let blackosVY = 0;
/** @type {number} The y position of the first author name on the splash screen. */
let tailsY = -100;
/** @type {number} The y position of the second author name on the splash screen. */
let blackosY = -100;
/** @type {number} The y position of the title on the splash screen. */
let titleY = -50;
/** @type {number} The vertical speed of the title on the splash screen. */
let titleVY = 0;
/** @type {number} The scroll position of the credits. */
let creditsTime = 0;
/** @type {number} The fade of the credits. */
let creditsAlpha = 0;
/** @type {number} The scroll speed of the credits in pixels per tick. */
let speedScr = 0.4;
