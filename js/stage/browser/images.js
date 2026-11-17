/**
 * The images of the game and their loading.
 */

import { loadImage } from './assets.js';
import { BACKGROUND_COUNT, NUM_TILES } from '../constants.js';
import { random } from '../utils.js';

/** @type {number[]} The random order of the rows and of the columns for the line transitions. */
export let lineOrder;
/** @type {HTMLImageElement} The security camera. */
export let cameraFollow;
/** @type {HTMLImageElement[]} The eye of the robot, one image for each boss. */
export let robotEye;
/** @type {HTMLImageElement} The head of the robot. */
export let robotHead;
/** @type {HTMLImageElement} The platform. */
export let platformImage;
/** @type {HTMLImageElement} The head of the player, facing right. */
export let head;
/** @type {HTMLImageElement} The body of the player facing right, with the standing frame and 4 walk frames. */
export let playerBody;
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
export let sparkleImage;
/** @type {HTMLImageElement} The blue portal frames. */
export let bluePortal;
/** @type {HTMLImageElement} The red portal frames. */
export let redPortal;
/** @type {HTMLImageElement} The mouse cursor. */
export let crosshair;
/** @type {HTMLImageElement[]} The level backgrounds. */
export let bg;
/** @type {HTMLImageElement} The cake. */
export let cakeImage;
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
	const sprite = (name) => loadImage(`gfx/sprites/${name}.svg`);

	playerBody = sprite('body');
	head = sprite('head');
	crosshair = sprite('crosshair');
	bluePortal = sprite('bluePortal');
	redPortal = sprite('redPortal');

	lineOrder = [];
	while (lineOrder.length < 128) {
		const line = random(0, 128);
		if (!lineOrder.includes(line)) lineOrder.push(line);
	}

	bg = Array.from({ length: BACKGROUND_COUNT }, (_, i) => loadImage(`gfx/backgrounds/level${i + 1}.svg`));
	tube = sprite('tube');
	tube2 = sprite('tube2');
	gravPipe = sprite('gravpipe');
	gravPipe2 = sprite('gravpipe2');
	crateImage = sprite('crate');
	turretImages = [sprite('turret0'), sprite('turret1')];
	sparkleImage = sprite('sparkle');
	cakeImage = sprite('cake');
	portalGun = sprite('portalGun');
	cameraFollow = sprite('cameraFollow');
	robotEye = [1, 2, 3, 4].map((boss) => sprite(`robotEye${boss}`));
	robotHead = sprite('robotHead');
	plasma = sprite('plasma');
	platformImage = sprite('platform');
	tileset = Array.from({ length: NUM_TILES }, (_, id) => loadImage(`gfx/tiles/tile_${id}.svg`));
}
