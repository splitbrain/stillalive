/**
 * The images of the game and their loading.
 */

import { loadImage } from './assets.js';
import { NUM_TILES } from './constants.js';
import { random, tabContains } from './utils.js';

export let linesHoriz, linesVerti;
export let tex_blackos, tex_tails;
export let tex_button, tex_sound, tex_cross, tex_leftBG, tex_rightBG;
export let key, mouseIcon;
export let cameraFollow, robotEye, robotHead;
export let levelEditorHud, menuBG, pauseBG, mapSelection;
export let noLevel;
export let highscore;
export let platform;
export let head, body;
export let tunnel, tunnel2, tube, tube2;
export let controls;
export let tourelle;
export let plasma;
export let caisse;
export let sparkle;
export let bluePortal;
export let redPortal;
export let crosshair;
export let bg;
export let hud;
export let cake;
export let portalGun;
export let tileset;

/**
 * Start to load the images of the splash screen.
 */
export function loadSplashImages() {
	tex_tails = loadImage('decor/tails.png');
	tex_blackos = loadImage('decor/blackos.png');
	noLevel = loadImage('bg/noLevel.png');
}

export function loadGfx() {
	let i, t, r;
	body = new Array();
	for (i = 0; i < 2; i++) {
		t = loadImage('sprites/body' + i + '.png');
		body.push(t);
	}

	head = new Array();
	for (i = 0; i < 2; i++) {
		t = loadImage('sprites/head' + i + '.png');
		head.push(t);
	}
	controls = loadImage('decor/controls.png');

	crosshair = loadImage('sprites/crosshair.png');

	bluePortal = loadImage('sprites/bluePortal.png');

	redPortal = loadImage('sprites/redPortal.png');

	//generating transition line order
	linesHoriz = new Array();
	linesVerti = new Array();
	for (i = 0; i < 128; i++) {
		do {
			r = parseInt(random(0, 129));
		} while (tabContains(linesHoriz, r));
		linesHoriz.push(r);
		linesVerti.push(r);
	}

	bg = new Array();
	for (i = 1; i < 12; i++) {
		const img = loadImage('bg/level' + i + '.png');
		bg.push(img);
	}

	menuBG = loadImage('bg/menuBG.png');

	levelEditorHud = loadImage('bg/levelEditorHud.png');

	hud = loadImage('bg/hud.png');

	mapSelection = loadImage('bg/mapSelection.png');

	highscore = loadImage('bg/highscore.png');

	tube = loadImage('sprites/tube.png');

	tube2 = loadImage('sprites/tube2.png');

	tunnel = loadImage('sprites/tunnel.png');

	tunnel2 = loadImage('sprites/tunnel2.png');

	mouseIcon = loadImage('images/mouseIcon.png');

	key = loadImage('images/key.png');

	caisse = loadImage('sprites/caisse.png');

	pauseBG = loadImage('menu/pauseBG.png');

	tex_sound = loadImage('menu/tex_sound.png');

	tex_cross = loadImage('menu/tex_cross.png');

	tex_leftBG = loadImage('menu/tex_leftBG.png');

	tex_rightBG = loadImage('menu/tex_rightBG.png');

	tex_button = loadImage('menu/tex_button.png');

	tourelle = new Array();
	for (i = 0; i < 2; i++) {
		t = loadImage('sprites/tourelle' + i + '.png');
		tourelle.push(t);
	}

	sparkle = loadImage('sprites/sparkle.png');

	cake = loadImage('sprites/cake.png');

	portalGun = loadImage('sprites/portalGun.png');

	cameraFollow = loadImage('sprites/cameraFollow.png');

	robotEye = new Array();
	for (let rob = 1; rob < 5; rob++) {
		r = loadImage('sprites/robotEye' + rob + '.png');
		robotEye.push(r);
	}

	robotHead = loadImage('sprites/robotHead.png');

	plasma = loadImage('sprites/plasma.png');

	platform = loadImage('sprites/plateforme.png');

	tileset = new Array();
	for (i = 0; i < NUM_TILES; i++) {
		tileset[i] = loadImage('tiles/tile_' + (i + 1) + '.gif');
	}
}
