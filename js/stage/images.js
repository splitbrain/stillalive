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
/** @type {HTMLImageElement} The body of the player facing right, with the standing frame and 4 walk frames. */
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
/** @type {HTMLImageElement} The sparkle shapes in rows: blue star, red star, cake crumb, smoke and blood. */
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
	body = loadImage('gfx/sprites/body.svg');

	head = loadImage('gfx/sprites/head.svg');

	crosshair = loadImage('gfx/sprites/crosshair.svg');

	bluePortal = loadImage('gfx/sprites/bluePortal.svg');

	redPortal = loadImage('gfx/sprites/redPortal.svg');

	linesHoriz = new Array();
	linesVerti = new Array();
	for (i = 0; i < 128; i++) {
		do {
			r = random(0, 128);
		} while (linesHoriz.includes(r));
		linesHoriz.push(r);
		linesVerti.push(r);
	}

	bg = new Array();
	for (i = 1; i < 12; i++) {
		const img = loadImage('gfx/backgrounds/level' + i + '.svg');
		bg.push(img);
	}

	tube = loadImage('gfx/sprites/tube.svg');

	tube2 = loadImage('gfx/sprites/tube2.svg');

	gravPipe = loadImage('gfx/sprites/gravpipe.svg');

	gravPipe2 = loadImage('gfx/sprites/gravpipe2.svg');

	crateImage = loadImage('gfx/sprites/crate.svg');

	turretImages = new Array();
	for (i = 0; i < 2; i++) {
		t = loadImage('gfx/sprites/turret' + i + '.svg');
		turretImages.push(t);
	}

	sparkle = loadImage('gfx/sprites/sparkle.svg');

	cake = loadImage('gfx/sprites/cake.svg');

	portalGun = loadImage('gfx/sprites/portalGun.svg');

	cameraFollow = loadImage('gfx/sprites/cameraFollow.svg');

	robotEye = new Array();
	for (let rob = 1; rob < 5; rob++) {
		r = loadImage('gfx/sprites/robotEye' + rob + '.svg');
		robotEye.push(r);
	}

	robotHead = loadImage('gfx/sprites/robotHead.svg');

	plasma = loadImage('gfx/sprites/plasma.svg');

	platform = loadImage('gfx/sprites/platform.svg');

	tileset = new Array();
	for (i = 0; i < NUM_TILES; i++) {
		tileset[i] = loadImage('gfx/tiles/tile_' + i + '.svg');
	}
}
