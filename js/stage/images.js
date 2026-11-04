/**
 * The images of the game and their loading.
 */

import { loadImage } from './assets.js';
import { NUM_TILES } from './constants.js';
import { random } from './utils.js';

/** @type {number[]} The random order of the rows for the line transitions. */
export let linesHoriz;
/** @type {number[]} The random order of the columns for the line transitions. */
export let linesVerti;
/** @type {HTMLImageElement} The picture of the graphics author on the splash screen. */
export let tex_blackos;
/** @type {HTMLImageElement} The picture of the code author on the splash screen. */
export let tex_tails;
/** @type {HTMLImageElement} The button background of the menus. */
export let tex_button;
/** @type {HTMLImageElement} The sound icon of the main menu. */
export let tex_sound;
/** @type {HTMLImageElement} The cross over a disabled icon. */
export let tex_cross;
/** @type {HTMLImageElement} The left arrow of the background selection in the editor. */
export let tex_leftBG;
/** @type {HTMLImageElement} The right arrow of the background selection in the editor. */
export let tex_rightBG;
/** @type {HTMLImageElement} The security camera. */
export let cameraFollow;
/** @type {HTMLImageElement[]} The eye of the robot, one image for each boss. */
export let robotEye;
/** @type {HTMLImageElement} The head of the robot. */
export let robotHead;
/** @type {HTMLImageElement} The frame of the level editor. */
export let levelEditorHud;
/** @type {HTMLImageElement} The background of the main menu. */
export let menuBG;
/** @type {HTMLImageElement} The background of the pause menu. */
export let pauseBG;
/** @type {HTMLImageElement} The frame of the level selection. */
export let mapSelection;
/** @type {HTMLImageElement} The picture of the splash screen and of an empty preview. */
export let noLevel;
/** @type {HTMLImageElement} The background of the intermission screen. */
export let highscore;
/** @type {HTMLImageElement} The platform. */
export let platform;
/** @type {HTMLImageElement[]} The head of the player, facing right and left. */
export let head;
/** @type {HTMLImageElement[]} The body of the player, facing right and left. */
export let body;
/** @type {HTMLImageElement} The gravitational pipes that push to the left and to the right. */
export let gravPipe;
/** @type {HTMLImageElement} The gravitational pipes that push up and down. */
export let gravPipe2;
/** @type {HTMLImageElement} The tube of the first, third and fourth boss. */
export let tube;
/** @type {HTMLImageElement} The tube of the second boss. */
export let tube2;
/** @type {HTMLImageElement} The controls picture of the loading screen. */
export let controls;
/** @type {HTMLImageElement[]} The turret, facing left and right. */
export let turretImages;
/** @type {HTMLImageElement} The plasma ball frames. */
export let plasma;
/** @type {HTMLImageElement} The crate. */
export let crateImage;
/** @type {HTMLImageElement} The sparkle colors. */
export let sparkle;
/** @type {HTMLImageElement} The blue portal frames. */
export let bluePortal;
/** @type {HTMLImageElement} The red portal frames. */
export let redPortal;
/** @type {HTMLImageElement} The mouse cursor. */
export let crosshair;
/** @type {HTMLImageElement[]} The level backgrounds. */
export let bg;
/** @type {HTMLImageElement} The cake. */
export let cake;
/** @type {HTMLImageElement} The portal gun. */
export let portalGun;
/** @type {HTMLImageElement[]} The tile images by tile id. */
export let tileset;

/**
 * Start to load the images of the splash screen.
 */
export function loadSplashImages() {
	tex_tails = loadImage('decor/tails.png');
	tex_blackos = loadImage('decor/blackos.png');
	noLevel = loadImage('bg/noLevel.png');
}

/**
 * Start to load all images of the game and create the random line order of the transitions.
 *
 * @returns {void}
 */
export function loadGfx() {
	let i, t, r;
	body = new Array();
	for (i = 0; i < 2; i++) {
		t = loadImage('sprites/body' + i + '.svg');
		body.push(t);
	}

	head = new Array();
	for (i = 0; i < 2; i++) {
		t = loadImage('sprites/head' + i + '.svg');
		head.push(t);
	}
	controls = loadImage('decor/controls.png');

	crosshair = loadImage('sprites/crosshair.svg');

	bluePortal = loadImage('sprites/bluePortal.svg');

	redPortal = loadImage('sprites/redPortal.svg');

	linesHoriz = new Array();
	linesVerti = new Array();
	for (i = 0; i < 128; i++) {
		do {
			r = random(0, 129);
		} while (linesHoriz.includes(r));
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

	mapSelection = loadImage('bg/mapSelection.png');

	highscore = loadImage('bg/highscore.png');

	tube = loadImage('sprites/tube.svg');

	tube2 = loadImage('sprites/tube2.svg');

	gravPipe = loadImage('sprites/gravpipe.svg');

	gravPipe2 = loadImage('sprites/gravpipe2.svg');

	crateImage = loadImage('sprites/crate.svg');

	pauseBG = loadImage('menu/pauseBG.png');

	tex_sound = loadImage('menu/tex_sound.png');

	tex_cross = loadImage('menu/tex_cross.png');

	tex_leftBG = loadImage('menu/tex_leftBG.png');

	tex_rightBG = loadImage('menu/tex_rightBG.png');

	tex_button = loadImage('menu/tex_button.png');

	turretImages = new Array();
	for (i = 0; i < 2; i++) {
		t = loadImage('sprites/turret' + i + '.svg');
		turretImages.push(t);
	}

	sparkle = loadImage('sprites/sparkle.svg');

	cake = loadImage('sprites/cake.svg');

	portalGun = loadImage('sprites/portalGun.svg');

	cameraFollow = loadImage('sprites/cameraFollow.svg');

	robotEye = new Array();
	for (let rob = 1; rob < 5; rob++) {
		r = loadImage('sprites/robotEye' + rob + '.svg');
		robotEye.push(r);
	}

	robotHead = loadImage('sprites/robotHead.svg');

	plasma = loadImage('sprites/plasma.svg');

	platform = loadImage('sprites/platform.svg');

	tileset = new Array();
	for (i = 0; i < NUM_TILES; i++) {
		tileset[i] = loadImage('tiles/tile_' + i + '.svg');
	}
}
