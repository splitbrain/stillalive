/**
 * Start code of the game and the test hook.
 */

import { allImagesLoaded, whenImagesDone } from './assets.js';
import { allSoundsLoaded, loadSfx } from './audio.js';
import { ctx } from './canvas.js';
import { Menu } from './constants.js';
import { openExit } from './entities/Cake.js';
import { Player } from './entities/Player.js';
import { startLevel, tick } from './game.js';
import { loadGfx, loadSplashImages } from './images.js';
import { setupInput } from './input.js';
import { unclick } from './inputState.js';
import { loadKeyLabels } from './keys.js';
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
import { render } from './render/frame.js';
import { decodeReplay, encodeReplay } from './replay.js';
import { game, input, ui } from './state.js';
import { loadProgress } from './storage.js';

/**
 * Start the game.
 *
 * The key labels load at once. The splash screen waits for its images and the font. Then the other images, the
 * sounds, the credits and the campaigns start to load, and the loading screen shows the progress.
 */
function setup() {
	ctx.strokeStyle = 'rgb(255, 0, 0)';
	ctx.font = 'bold 10px Arial';

	setupInput();
	loadKeyLabels();
	loadSplashImages();
	Promise.all([whenImagesDone(), document.fonts.load('48px yikes')]).then(function () {
		ui.canSplash = true;
		loadGfx();
		loadSfx();
		loadCreditsText();
		loadCampaigns();
	});

	ui.currentMenu = Menu.LOADING;

	game.player = new Player(); // the drawing reads the player before the first level loads

	game.time = 0;

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
		tick,
		loadLevel,
		loadPreviewMap,
		startLevel,
		campaigns: () => campaigns,
		levelsLoaded: () => levelsLoaded,
		levelsToLoad: () => levelsToLoad,
		overSplash: () => ui.splash.over,
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
