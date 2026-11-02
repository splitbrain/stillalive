/**
 * Start code of the game and the test hook.
 */

import { allImagesLoaded, whenImagesDone } from './assets.js';
import { allSoundsLoaded, loadSfx } from './audio.js';
import { ctx } from './canvas.js';
import { Menu } from './constants.js';
import { openExit } from './entities/Cake.js';
import { Player } from './entities/Player.js';
import { render, tick } from './game.js';
import { loadGfx, loadSplashImages } from './images.js';
import { unclick } from './input.js';
import {
	campaigns,
	levelsLoaded,
	levelsToLoad,
	loadCampaigns,
	loadCreditsText,
	loadLevel,
	loadPreviewMap,
} from './level.js';
import { startLoop } from './loop.js';
import { overSplash } from './render/menus.js';
import { decodeReplay, encodeReplay } from './replay.js';
import { game, input, settings, ui } from './state.js';
import { loadProgress } from './storage.js';

/** @type {boolean} True when the images and the font of the splash screen are loaded. */
export let canSplash = false;

/**
 * Start the game.
 *
 * The splash screen waits for its images and the font. Then the other images, the sounds, the credits and the
 * campaigns start to load, and the loading screen shows the progress.
 */
function setup() {
	ctx.strokeStyle = 'rgb(255, 0, 0)';
	ctx.font = 'bold 10px Arial';

	loadSplashImages();
	Promise.all([whenImagesDone(), document.fonts.load('48px yikes')]).then(function () {
		canSplash = true;
		loadGfx();
		loadSfx();
		loadCreditsText();
		loadCampaigns();
	});

	ui.currentMenu = Menu.LOADING;

	game.player = new Player(); // the drawing reads the player before the first level loads

	game.TIME = 0;

	startLoop(tick, render);
}

/**
 * Give the tests access to the game when the URL contains "?test".
 *
 * @returns {void}
 */
function addTestHook() {
	if (!new URLSearchParams(location.search).has('test')) return;
	window.__test = {
		game,
		ui,
		input,
		settings,
		tick,
		loadLevel,
		loadPreviewMap,
		campaigns: () => campaigns,
		levelsLoaded: () => levelsLoaded,
		levelsToLoad: () => levelsToLoad,
		overSplash: () => overSplash,
		allImagesLoaded,
		allSoundsLoaded,
		encodeReplay,
		decodeReplay,
		openExit,
		unclick,
	};
}

loadProgress();
setup();
addTestHook();
