/**
 * Drawing of the splash screen, the loading screen, the backgrounds of the menus, the intermission screen and the
 * credits.
 */

import { allImagesLoaded, areImagesLoaded, imageProgress, missingImages } from '../assets.js';
import { allSoundsLoaded, soundProgress } from '../audio.js';
import { ctx, drawImage } from '../canvas.js';
import { MAP_SIZE, NUM_TILES, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from '../constants.js';
import {
	bg,
	bluePortal,
	tex_button,
	body,
	cake,
	controls,
	crateImage,
	crosshair,
	head,
	highscore,
	menuBG,
	noLevel,
	pauseBG,
	platform,
	portalGun,
	redPortal,
	tex_blackos,
	tex_tails,
	tileset,
	tube,
	tube2,
	turretImages,
} from '../images.js';
import { keyLabels } from '../keys.js';
import { creditsTxt, levelsLoaded, levelsToLoad, missingLevelFiles } from '../level.js';
import { drawBoss } from './boss.js';
import { drawPlayer, drawSparkles, drawTileLayer, drawGravPipes, saveTileLayer } from './game.js';
import { game, input, ui } from '../state.js';
import { Tile } from '../tiles.js';
import { getAngle } from '../utils.js';

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
 * Draw the background of the pause menu. The page draws the buttons.
 *
 * @returns {void}
 */
export function drawPauseMenu() {
	drawImage(pauseBG, 0, 0);

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
	ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

	drawImage(noLevel, 0, 0);

	ctx.font = 'bold 48px Yikes';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	ctx.fillText('Welcome To', 96 + 4 + 60, sp.titleY + 4 - 176);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Welcome To', 96 + 60, sp.titleY - 176);

	ctx.font = 'bold 64px Yikes';
	ctx.fillStyle = 'rgb(0, 0, 0)';

	ctx.fillText('StillAliveJS', 96 + 4, sp.titleY + 4 - 96);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('StillAliveJS', 96, sp.titleY - 96);

	ctx.font = 'bold 24px Yikes';
	drawImage(tex_tails, 0, sp.tailsY - 64);
	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText('Created by t4ils', 64 + 2, sp.tailsY + 2 - 32);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Created by t4ils', 64, sp.tailsY - 32);

	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillText('Gfx by ZeBlackos', 264 + 2, sp.blackosY + 2 - 32);
	ctx.fillStyle = 'rgb(253, 233, 0)';
	ctx.fillText('Gfx by ZeBlackos', 264, sp.blackosY - 32);
	drawImage(tex_blackos, 454, sp.blackosY - 64);

	ctx.fillStyle = 'rgba(0, 0, 0, ' + (1 - sp.fade / 60) + ')';
	ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
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
	ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

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
		const dx = 270;
		const dy = 100;
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
			ctx.fillText('Click to continue ...', 10, 370);
		}
	}
	if (imagesReady) drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Draw the preview of the selected level. The page draws the list of the levels and the buttons.
 *
 * @returns {void}
 */
export function drawMapSelection() {
	if (ui.previewMap < 1) drawImage(noLevel, 0, 0);
	if (ui.previewMap > 0) drawPreviewMap();

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
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
const MAIN_MENU_Y = 23;
/** @type {number} The distance between the buttons of the main menu. */
const MAIN_MENU_STEP = 58;

/**
 * Get the positions of the two players next to a button of the main menu.
 *
 * @param {number} button The button, a value of MainButton.
 * @returns {number[]} The x position of the left player, the y position of both players and the x position of the
 *     right player.
 */
export function mainMenuPlayers(button) {
	return [104, MAIN_MENU_Y + 3 + button * MAIN_MENU_STEP, 392];
}

/**
 * Draw the background of the main menu, the players next to the hovered button and the fades. The page draws the
 * buttons.
 *
 * @returns {void}
 */
export function drawMainMenu() {
	drawImage(menuBG, 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

	// the players stand next to the hovered button
	const hover = ui.mainHover;
	if (!ui.goMenu && hover >= 0) {
		const [pX, pY, pX2] = mainMenuPlayers(hover);
		drawPortalGunMenu(pX, pY, getAngle(pX, pY, input.mouseX, input.mouseY));
		drawPlayer(pX, pY, 1);

		drawPortalGunMenu(pX2, pY, getAngle(pX2, pY, input.mouseX, input.mouseY));
		drawPlayer(pX2, pY, -1);
	}

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	// the fade to the selected screen
	if (ui.goMenu) {
		const a = ui.goMenu / 60;
		ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - a) + ')';
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}

	drawSparkles();

	if (ui.fadeMenu > 0) {
		const fa = ui.fadeMenu / 30;
		ctx.fillStyle = 'rgba(0, 0, 0, ' + fa + ')';
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	}
}

/**
 * Draw the credits that scroll up.
 *
 * @returns {void}
 */
export function drawCredits() {
	const credits = ui.credits;
	drawImage(noLevel, 0, 0);
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

	drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	ctx.fillStyle = 'rgba(0, 0, 0,' + (1 - credits.alpha) + ')';
	ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

	ctx.font = '24px yikes';
	for (let t = 0; t < creditsTxt.length; t++) {
		const txt = creditsTxt[t];
		const metrics = ctx.measureText(txt);
		const x = (PLAYFIELD_WIDTH >> 1) - (metrics.width >> 1);

		const yLow = creditsTxt.length * 15;

		const y = t * 32 + (yLow - credits.time);

		if (y <= PLAYFIELD_HEIGHT) {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillText(txt, x + 2, y + 2);
			ctx.fillStyle = 'rgb(253, 233, 0)';
			ctx.fillText(txt, x, y);
		}
	}

	ctx.fillStyle = 'rgb(0, 0, 0)';
	ctx.fillRect(0, 0, PLAYFIELD_WIDTH, 32);
	ctx.fillRect(0, PLAYFIELD_HEIGHT - 32, PLAYFIELD_WIDTH, 32);
}

/**
 * Draw the background of the intermission screen after a level. The page draws the time, the message and the
 * buttons.
 *
 * @returns {void}
 */
export function drawIntermission() {
	if (game.player.intermissionFade > 0) {
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(-1, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		ctx.globalAlpha = 1 - game.player.intermissionFade / 20;
	}
	drawImage(highscore, 0, 0);
	if (game.player.intermissionFade > 0) ctx.globalAlpha = 1;
}

/**
 * Draw the preview of a map with its objects.
 *
 * @returns {void}
 */
export function drawPreviewMap() {
	let i, ti, ci, pi;
	if (game.tilesChanged) {
		drawImage(bg[game.background], 0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
		for (i = 0; i < game.displayMap.length; i++) {
			const y = i >> 5;
			const x = i - (y << 5);
			if (game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < MAP_SIZE) {
				const open = game.cakesLeft == 0 && game.displayMap[i] == Tile.EXIT_CLOSED;
				const tile = open ? Tile.EXIT : game.displayMap[i];
				drawImage(tileset[tile], x * 16, y * 16, 16, 16);
			}
		}
		saveTileLayer();
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
	} else {
		drawTileLayer();

		game.player.flip = 1;

		ctx.save();
		ctx.translate((game.player.x >> 8) + (game.player.pX >> 1), (game.player.y >> 8) + (game.player.pY >> 1));
		drawImage(portalGun, -5, -5);
		ctx.restore();

		const flipDx = game.player.flip < 0 ? 1 : 0;
		drawImage(head[flipDx], game.player.animationFrame * 16, 0, 15, 12, game.player.x >> 8, game.player.y >> 8, 16, 12);
		drawImage(body[flipDx], game.player.animationFrame * 16, 0, 16, 27, game.player.x >> 8, game.player.y >> 8, 16, 27);

		for (i = 0; i < game.cakes.length; i++) {
			if (game.cakes[i].used) {
				drawImage(cake, game.cakes[i].x >> 8, (game.cakes[i].y + game.cakes[i].vy) >> 8, 16, 12);
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
				game.turrets[ti].x >> 8,
				game.turrets[ti].y >> 8,
				16,
				32,
			);
		}

		for (ci = 0; ci < game.crates.length; ci++) {
			drawImage(crateImage, game.crates[ci].x >> 8, game.crates[ci].y >> 8);
		}

		for (pi = 0; pi < game.platforms.length; pi++) {
			drawImage(platform, game.platforms[pi].x >> 8, game.platforms[pi].y >> 8);
		}

		drawGravPipes();

		if (game.bossNum > 0) {
			if (game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4)
				drawImage(tube, game.tubeX >> 8, game.tubeY >> 8);
			else if (game.bossNum == 2) drawImage(tube2, game.tubeX >> 8, game.tubeY >> 8);
			drawBoss();
		}

		drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.lineWidth = 1;
	}
}
