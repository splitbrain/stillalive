/**
 * Drawing of the splash screen, the loading screen, the menus, the intermission screen and the credits.
 */

import { allImagesLoaded, areImagesLoaded, imageProgress, missingImages } from '../assets.js';
import { allSoundsLoaded, isSoundAvailable, isSoundOn, soundProgress } from '../audio.js';
import { ctx, drawImage } from '../canvas.js';
import {
	CAMPAIGN_FINISHED,
	CampaignId,
	IntermissionButton,
	LEVELS_PER_CAMPAIGN,
	MainButton,
	MAP_SIZE,
	Menu,
	NUM_TILES,
	PauseButton,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	SelectionButton,
} from '../constants.js';
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
import { isLevelLocked } from '../intermission.js';
import { keyLabels } from '../keys.js';
import { creditsTxt, levelsLoaded, levelsToLoad, missingLevelFiles } from '../level.js';
import { drawBoss } from './boss.js';
import { drawPlayer, drawSparkles, drawTileLayer, drawTunnels, saveTileLayer } from './game.js';
import { game, input, ui } from '../state.js';
import { maxLevel } from '../storage.js';
import { Tile } from '../tiles.js';
import { getAngle, toTime } from '../utils.js';

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
	drawImage(portalGun, -5, -5);
	ctx.restore();
}

/**
 * Draw the pause menu.
 *
 * @returns {void}
 */
export function drawPauseMenu() {
	ctx.fillStyle = 'rgb(0, 65, 88)';
	drawImage(pauseBG, game.offsetX, game.offsetY);

	ctx.fillStyle = 'rgb(255, 255, 255)';
	const hover = ui.pauseHover;
	const scale1 = hover == PauseButton.RESUME ? 0.9 : 1;
	const scale2 = hover == PauseButton.RESTART ? 0.9 : 1;
	const scale3 = hover == PauseButton.EXIT ? 0.9 : 1;
	const scale4 = hover == PauseButton.SOUND ? 0.9 : 1;

	drawTinyButton(game.offsetX + 50, game.offsetY + 180, scale1, 'Resume');
	if (ui.currentMenu != Menu.TUTORIAL) drawTinyButton(game.offsetX + 187, game.offsetY + 180, scale2, 'Restart');
	drawTinyButton(game.offsetX + 324, game.offsetY + 180, scale3, 'Exit');
	if (ui.currentMenu != Menu.TUTORIAL && isSoundAvailable())
		drawTinyButton(187 + game.offsetX, 340 + game.offsetY, scale4, 'Sounds : ' + (isSoundOn() ? 'On' : 'Off'));

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the splash screen with its animation.
 *
 * @returns {void}
 */
export function drawSplash() {
	const sp = ui.splash;
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillRect(0, 0, 640, 544);

	drawImage(noLevel, 0, 32, 640, 480);

	ctx.font = 'bold 48px Yikes';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	ctx.fillText('Welcome To', 160 + 4 + 60, sp.titleY + 4 - 80);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Welcome To', 160 + 60, sp.titleY - 80);

	ctx.font = 'bold 64px Yikes';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	ctx.fillText('StillAliveJS', 160 + 4, sp.titleY + 4);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('StillAliveJS', 160, sp.titleY);

	ctx.font = 'bold 24px Yikes';
	drawImage(tex_tails, 32, 32 + sp.tailsY);
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText('Created by t4ils', 100 + 2, 64 + 2 + sp.tailsY);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Created by t4ils', 100, 64 + sp.tailsY);

	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText('Gfx by ZeBlackos', 360 + 2, 64 + 2 + sp.blackosY);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Gfx by ZeBlackos', 360, 64 + sp.blackosY);
	drawImage(tex_blackos, 550, 32 + sp.blackosY);

	ctx.fillStyle = 'rgba(0, 0, 0, ' + (1 - sp.fade / 60) + ')';
	ctx.fillRect(0, 0, 640, 544);
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
 * Draw the loading screen with the progress bars, the controls and the missing files.
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
	if (game.time % 50 < 25) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
	}

	if (ui.loadingHover) ctx.fillStyle = 'rgb(255, 255, 255)';

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
		drawImage(controls, dx, dy);
		drawKeyLabels(dx, dy);

		drawPlayer(62 + dx, dy, -1);
		drawPlayer(124 + dx, 95 + dy, 1);
		drawPlayer(dx, 95 + dy, -1);
		drawImage(bluePortal, 0, 0, 32, 32, 68 + dx, 177 + dy, 32, 32);
		drawImage(redPortal, 0, 0, 32, 32, 171 + dx, 177 + dy, 32, 32);
	}

	if (allImagesLoaded() && levelsLoaded >= levelsToLoad && allSoundsLoaded()) {
		if (game.time % 50 < 25) {
			ctx.fillText('Click to continue ...', 280, 476);
		}
	}
	if (imagesReady) drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the level selection of a campaign.
 *
 * @returns {void}
 */
export function drawMapSelection() {
	let i;
	if (ui.previewMap < 1) drawImage(noLevel, game.offsetX, game.offsetY);
	if (ui.previewMap > 0) drawPreviewMap();
	drawImage(mapSelection, 0, 0);

	if (ui.selectionListHover >= 0) {
		ctx.fillStyle = 'rgb(15, 112, 144)';
		ctx.fillRect(529, 105 + ui.selectionListHover * 12 + 2, 90, 14);
	}

	const hover = ui.selectionHover;
	drawTinyButton(20, 495, hover == SelectionButton.EXIT ? 0.9 : 1, 'Exit');

	if (ui.previewMap > 0) {
		ctx.fillStyle = 'rgb(15, 112, 144)';
		ctx.fillRect(529, 105 + ui.previewMap * 12 + 2, 90, 14);

		drawTinyButton(515, 495, hover == SelectionButton.PLAY ? 0.9 : 1, 'Play');
	}

	if (ui.campaign == CampaignId.NORMAL && maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED) {
		drawTinyButton(380, 495, hover == SelectionButton.MODE ? 0.9 : 1, 'Hard Mode');
	} else if (ui.campaign == CampaignId.ADVANCED) {
		drawTinyButton(380, 495, hover == SelectionButton.MODE ? 0.9 : 1, 'Normal Mode');
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

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
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
	drawImage(tex_button, x + ((1 - scale) * 320) / 2, y + ((1 - scale) * 64) / 2, 320 * scale, 64 * scale);

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
	drawImage(tex_button, x + ((1 - scale) * 120) / 2, y + ((1 - scale) * 24) / 2, 120 * scale, 24 * scale);

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

/** @type {number} The y position of the first button of the main menu. */
export const MAIN_MENU_Y = 32;
/** @type {number} The distance between the buttons of the main menu. */
export const MAIN_MENU_STEP = 64 + 18;

/**
 * Get the positions of the two players next to a button of the main menu.
 *
 * @param {number} button The button, a value of MainButton.
 * @returns {number[]} The x position of the left player, the y position of both players and the x position of the
 *     right player.
 */
export function mainMenuPlayers(button) {
	return [130, MAIN_MENU_Y + 25 + button * MAIN_MENU_STEP, 150 + 320 + 40 - 16];
}

/**
 * Draw the main menu with the sound button and the fades.
 *
 * @returns {void}
 */
export function drawMainMenu() {
	ctx.strokeStyle = 'rgb(0, 0, 0)';
	ctx.fillStyle = 'rgb(0, 65, 88)';
	drawImage(menuBG, 0, 0);

	const hover = ui.mainHover;
	const scale1 = hover == MainButton.CLASSIC ? 0.9 : 1;
	const scale2 = hover == MainButton.ENHANCED ? 0.9 : 1;
	const scale3 = hover == MainButton.ULTIMATE ? 0.9 : 1;
	const scale4 = hover == MainButton.EDITOR ? 0.9 : 1;
	const scale5 = hover == MainButton.TUTORIAL ? 0.9 : 1;

	if (ui.goMenu) {
		if (ui.menuButton == MainButton.CLASSIC)
			drawBigButton(
				160,
				MAIN_MENU_Y,
				scale1,
				'Classic Mode' + (maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED ? ' +' : ''),
			);
		else if (ui.menuButton == MainButton.ENHANCED)
			drawBigButton(160, MAIN_MENU_Y + 1 * MAIN_MENU_STEP, scale2, 'Enhanced Mode');
		else if (ui.menuButton == MainButton.ULTIMATE)
			drawBigButton(160, MAIN_MENU_Y + 2 * MAIN_MENU_STEP, scale3, 'Ultimate Mode');
		else if (ui.menuButton == MainButton.EDITOR)
			drawBigButton(160, MAIN_MENU_Y + 3 * MAIN_MENU_STEP, scale4, 'Level Editor');
		else if (ui.menuButton == MainButton.TUTORIAL)
			drawBigButton(160, MAIN_MENU_Y + 4 * MAIN_MENU_STEP, scale5, 'Tutorial');
	} else {
		drawBigButton(
			160,
			MAIN_MENU_Y,
			scale1,
			'Classic Mode' + (maxLevel[CampaignId.NORMAL] == CAMPAIGN_FINISHED ? ' +' : ''),
		);
		drawBigButton(160, MAIN_MENU_Y + 1 * MAIN_MENU_STEP, scale2, 'Enhanced Mode');
		drawBigButton(160, MAIN_MENU_Y + 2 * MAIN_MENU_STEP, scale3, 'Ultimate Mode');
		drawBigButton(160, MAIN_MENU_Y + 3 * MAIN_MENU_STEP, scale4, 'Level Editor');
		drawBigButton(160, MAIN_MENU_Y + 4 * MAIN_MENU_STEP, scale5, 'Tutorial');

		// the players stand next to the hovered button
		if (hover >= 0) {
			const [pX, pY, pX2] = mainMenuPlayers(hover);
			drawPortalGunMenu(pX, pY, getAngle(pX, pY, input.mouseX, input.mouseY));
			drawPlayer(pX, pY, 1);

			drawPortalGunMenu(pX2, pY, getAngle(pX2, pY, input.mouseX, input.mouseY));
			drawPlayer(pX2, pY, -1);
		}
	}

	const zoomSound = ui.soundHover ? 0.9 : 1;
	if (ui.soundHover) {
		ctx.globalAlpha = 0.8;
		ctx.fillStyle = 'rgb(7, 49, 63)';
		ctx.fillRect(20, 385, 300, 48);

		ctx.fillStyle = 'rgb(255, 255, 255)';
		ctx.font = 'bold 12px Arial';
		ctx.fillText('Click here or press M to turn the sound', 55, 404);
		ctx.fillText('on and off.', 55, 420);

		ctx.globalAlpha = 1;
	}

	if (isSoundAvailable()) {
		ctx.font = '18px yikes';
		ctx.fillStyle = 'rgb(253, 233, 0)';
		drawImage(
			tex_sound,
			20 + ((1 - zoomSound) * 29) / 2,
			385 + ((1 - zoomSound) * 48) / 2,
			29 * zoomSound,
			48 * zoomSound,
		);
		if (!isSoundOn())
			drawImage(
				tex_cross,
				15 + ((1 - zoomSound) * 40) / 2,
				390 + ((1 - zoomSound) * 40) / 2,
				40 * zoomSound,
				34 * zoomSound,
			);
		ctx.fillText('SFX', 20, 450);
	}

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	// the fade to the selected screen
	if (ui.goMenu) {
		const a = ui.goMenu / 60;
		ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - a) + ')';
		ctx.fillRect(0, 0, 640, 544);
	}

	drawSparkles();

	if (ui.fadeMenu > 0) {
		const fa = ui.fadeMenu / 30;
		ctx.fillStyle = 'rgba(0, 0, 0, ' + fa + ')';
		ctx.fillRect(0, 0, 640, 544);
	}
}

/**
 * Draw the credits that scroll up.
 *
 * @returns {void}
 */
export function drawCredits() {
	const credits = ui.credits;
	drawImage(noLevel, 0, 32, 640, 480);
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(0, 0, 640, 544);

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - credits.alpha) + ')';
	ctx.fillRect(0, 0, 640, 544);

	ctx.font = '24px yikes';
	for (let t = 0; t < creditsTxt.length; t++) {
		const txt = creditsTxt[t];
		const metrics = ctx.measureText(txt);
		const x = 320 - (metrics.width >> 1);

		const yLow = creditsTxt.length * 15;

		const y = t * 32 + (yLow - credits.time);

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
	drawImage(highscore, game.offsetX, game.offsetY);
	if (game.player.intermissionFade > 0) ctx.globalAlpha = 1;

	drawIntermissionButtons();

	if (game.player.intermissionFade == 0) {
		ctx.fillStyle = 'rgb(255, 255, 255)';
		ctx.font = 'bold 12px Arial';
		ctx.fillText('Your time : ' + toTime(game.time), game.offsetX + 35, game.offsetY + 260);
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
	if (game.tilesChanged) {
		drawImage(bg[game.background], game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		for (i = 0; i < game.displayMap.length; i++) {
			const y = i >> 5;
			const x = i - (y << 5);
			if (game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < MAP_SIZE) {
				const open = game.cakesLeft == 0 && game.displayMap[i] == Tile.EXIT_CLOSED;
				const tile = open ? Tile.EXIT : game.displayMap[i];
				drawImage(tileset[tile], x * 16 + game.offsetX, y * 16 + game.offsetY, 16, 16);
			}
		}
		saveTileLayer();
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(game.offsetX, game.offsetY, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	} else {
		drawTileLayer();

		game.player.flip = 1;

		ctx.save();
		ctx.translate(
			(game.player.x >> 8) + (game.player.pX >> 1) + game.offsetX,
			(game.player.y >> 8) + (game.player.pY >> 1) + game.offsetY,
		);
		drawImage(portalGun, -5, -5);
		ctx.restore();

		const flipDx = game.player.flip < 0 ? 1 : 0;
		drawImage(
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
		drawImage(
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
				drawImage(
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
			drawImage(
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
			drawImage(crateImage, (game.crates[ci].x >> 8) + game.offsetX, (game.crates[ci].y >> 8) + game.offsetY);
		}

		for (pi = 0; pi < game.platforms.length; pi++) {
			drawImage(platform, (game.platforms[pi].x >> 8) + game.offsetX, (game.platforms[pi].y >> 8) + game.offsetY);
		}

		drawTunnels();

		if (game.bossNum > 0) {
			if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4)
				drawImage(tube, (game.tubeX >> 8) + game.offsetX, (game.tubeY >> 8) + game.offsetY);
			else if (game.bossNum == 2) drawImage(tube2, (game.tubeX >> 8) + game.offsetX, (game.tubeY >> 8) + game.offsetY);
			drawBoss();
		}

		drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
	}
}
