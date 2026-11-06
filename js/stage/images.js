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
/** @type {HTMLImageElement} The security camera. */
export let cameraFollow;
/** @type {HTMLImageElement[]} The eye of the robot, one image for each boss. */
export let robotEye;
/** @type {HTMLImageElement} The head of the robot. */
export let robotHead;
/** @type {HTMLImageElement} The platform. */
export let platform;
/** @type {HTMLImageElement} The head of the player, facing right. */
export let head;
/** @type {HTMLImageElement} The body of the player, facing right: the standing frame and the 4 frames of the walk cycle. */
export let body;
/** @type {HTMLImageElement} The gravitational pipes that push to the left and to the right. */
export let gravPipe;
/** @type {HTMLImageElement} The gravitational pipes that push up and down. */
export let gravPipe2;
/** @type {HTMLImageElement} The tube of the first, third and fourth boss. */
export let tube;
/** @type {HTMLImageElement} The tube of the second boss. */
export let tube2;
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
 * Start to load all images of the game and create the random line order of the transitions.
 *
 * @returns {void}
 */
export function loadGfx() {
	let i, t, r;
	body = loadImage('sprites/body.svg');

	head = loadImage('sprites/head.svg');

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

	tube = loadImage('sprites/tube.svg');

	tube2 = loadImage('sprites/tube2.svg');

	gravPipe = loadImage('sprites/gravpipe.svg');

	gravPipe2 = loadImage('sprites/gravpipe2.svg');

	crateImage = loadImage('sprites/crate.svg');

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
