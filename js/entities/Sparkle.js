/**
 * The Sparkle object and its helper functions.
 */

import { ctx } from '../canvas.js';
import { GRAVITY } from '../constants.js';
import { sparkle } from '../images.js';
import { getTile } from '../physics.js';
import { game, settings } from '../state.js';
import { getCos, getDistance, getSin, random } from '../utils.js';

/**
 * Create a trail of sparkles along a line.
 *
 * @param {number} xFrom The x position of the start in 1/256 pixels.
 * @param {number} yFrom The y position of the start in 1/256 pixels.
 * @param {number} xTo The x position of the end in 1/256 pixels.
 * @param {number} yTo The y position of the end in 1/256 pixels.
 * @param {number} color The color index.
 * @param {number} used The sparkle type.
 * @returns {void}
 */
export function createSparkles(xFrom, yFrom, xTo, yTo, color, used) {
	let k;
	let x = xFrom;
	let y = yFrom;
	const x2 = xTo;
	const y2 = yTo;

	const vx = getCos(x2, y2, x, y) * 256;
	const vy = getSin(x2, y2, x, y) * 256;

	let i = 0;
	let now = 0;
	do {
		now++;
		x += vx;
		y += vy;

		if (i % 6 == 0 && now > 15) {
			for (k = 0; k < 3; k++) {
				const s = new Sparkle();
				s.x = x + parseInt(random(-5 << 8, 5 << 8)) - (8 << 8) - (game.ECART_X << 8);
				s.y = y + parseInt(random(-5 << 8, 5 << 8)) - (8 << 8) - (game.ECART_Y << 8);
				s.used = used;
				s.vx = parseInt(random(96, 192));
				s.vy = parseInt(random(96, 192));
				s.fading = 255;
				s.color = color;
				s.portalNum = -1;
				if (parseInt(random(0, 2)) == 0) s.vx = -s.vx;
				if (parseInt(random(0, 2)) == 0) s.vy = -s.vy;
				game.sparkles.push(s);
			}
		}
		i++;
	} while (getDistance(x, y, x2, y2) > 256);
}

/**
 * Remove the sparkles of one type and color.
 *
 * @param {number} p The color index.
 * @param {number} used The sparkle type.
 * @returns {void}
 */
export function removeSparkles(p, used) {
	let i;
	for (i = 0; i < game.sparkles.length; i++) {
		if (game.sparkles[i].used == used && game.sparkles[i].color == p) {
			game.sparkles.splice(i, 1);
			i--;
		}
	}
}

/**
 * Move, fade and draw all sparkles for one tick in high quality.
 *
 * @returns {void}
 */
export function manageSparkles() {
	let d, i, sc;
	for (i = 0; i < game.sparkles.length && settings.quality > 0; i++) {
		if (game.sparkles[i].used == 5) game.sparkles[i].vy += GRAVITY;
		else if (game.sparkles[i].used == 6 || game.sparkles[i].used == 7) game.sparkles[i].vy += GRAVITY >> 1;

		if (game.sparkles[i].floorTime < 0) {
			game.sparkles[i].x += game.sparkles[i].vx;
			game.sparkles[i].y += game.sparkles[i].vy;
			sc = game.sparkles[i].fading / 255;
		} else {
			if (game.sparkles[i].used == 7) {
				game.sparkles[i].fading -= 0.7;
				sc = game.sparkles[i].fading / 255;
			} else if (game.sparkles[i].used == 5) {
				if (++game.sparkles[i].floorTime >= 120) game.sparkles[i].fading -= 0.7;
				sc = game.sparkles[i].fading / 255;
			}
		}

		if (game.sparkles[i].used >= 5 && game.sparkles[i].used < 8) {
			if (getTile((game.sparkles[i].x >> 8) + ((16 * sc) >> 1), (game.sparkles[i].y >> 8) + ((16 * sc) >> 1)) != 0) {
				if (game.sparkles[i].floorTime < 0) {
					if (game.sparkles[i].used == 7 || game.sparkles[i].used == 5) {
						game.sparkles[i].floorTime = 0;
					} else {
						game.sparkles[i].fading = 0;
					}
				}
			}
		}

		if (game.sparkles[i].used == 1 || game.sparkles[i].used == 4) {
			game.sparkles[i].fading -= 8;
			if (getTile((game.sparkles[i].x >> 8) + 4, (game.sparkles[i].y >> 8) + 4) != 0) game.sparkles[i].fading = 0;
		} else if (game.sparkles[i].used == 3) {
			if (game.sparkles[i].vx != 0) {
				d = Math.abs(game.sparkles[i].xOrig - game.sparkles[i].x) >> 8;
				game.sparkles[i].fading = 200 - 5 * d;
			} else if (game.sparkles[i].vy != 0) {
				d = Math.abs(game.sparkles[i].yOrig - game.sparkles[i].y) >> 8;
				game.sparkles[i].fading = 200 - 5 * d;
				const n = game.sparkles[i].portalNum;
				const plt = game.portals[n].plateforme;
				if (plt >= 0) {
					game.sparkles[i].x += game.platforms[plt].vx;
					game.sparkles[i].xOrig = game.sparkles[i].x;
				}
			}
		} else if (game.sparkles[i].used == 8 || game.sparkles[i].used == 9) {
			game.sparkles[i].fading -= 8;
			//if( sparkles[i].used == 9) sparkles[i].vy += GRAVITY;
		}

		if (settings.quality > 0 && game.sparkles[i].fading > 0) {
			let dt = 9 - sc * 9;
			if (game.sparkles[i].used == 7 || game.sparkles[i].used == 5) {
				dt -= 8;
			}
			ctx.drawImage(
				sparkle,
				0,
				game.sparkles[i].color * 9,
				9,
				9,
				(game.sparkles[i].x >> 8) + dt + game.ECART_X,
				(game.sparkles[i].y >> 8) + dt + game.ECART_Y,
				16 * sc,
				16 * sc,
			);
		}

		if (game.sparkles[i].fading <= 0) {
			if (game.sparkles[i].used == 1 || game.sparkles[i].used == 4) {
				game.sparkles.splice(i, 1);
				i--;
			} else if (game.sparkles[i].used == 3) {
				game.sparkles[i].x = game.sparkles[i].xOrig;
				game.sparkles[i].y = game.sparkles[i].yOrig;
				game.sparkles[i].fading = 200;
			}
		}
	}
}

/**
 * Create sparkles around a point, e.g. for a collected cake or for smoke.
 *
 * @param {number} x The x position in 1/256 pixels.
 * @param {number} y The y position in 1/256 pixels.
 * @param {number} type The sparkle type; 8 and 9 select the colors of the cake and the smoke.
 * @param {number} number The number of sparkles.
 * @param {number} size The start value of the fade, which also sets the size.
 * @returns {void}
 */
export function createCakeOrSmokeSparkles(x, y, type, number, size) {
	let k;
	for (k = 0; k < number; k++) {
		const s = new Sparkle();
		s.x = x + parseInt(random(-8 << 8, 8 << 8));
		s.y = y + parseInt(random(-8 << 8, 8 << 8));
		s.used = type;
		s.vx = parseInt(random(-192, 192));
		s.vy = parseInt(random(-192, -96));
		s.fading = size;
		if (type == 8) s.color = 2;
		else if (type == 9) s.color = 3;
		s.portalNum = -1;
		game.sparkles.push(s);
	}
}

/**
 * A particle for the visual effects: portal trails, teleports, deaths, cakes and smoke.
 */
export class Sparkle {
	/**
	 * Create a sparkle at the origin.
	 */
	constructor() {
		/** @type {number} The x position in 1/256 pixels. */
		this.x = 0;
		/** @type {number} The y position in 1/256 pixels. */
		this.y = 0;
		/** @type {number} The x position where a portal glow sparkle starts and restarts, in 1/256 pixels. */
		this.xOrig = 0;
		/** @type {number} The y position where a portal glow sparkle starts and restarts, in 1/256 pixels. */
		this.yOrig = 0;
		/** @type {number} The horizontal speed in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {number} The sparkle type, which selects the movement, the fade and the image. */
		this.used = 0;
		/** @type {number} The color index. */
		this.color = 0;
		/** @type {number} Ticks since the sparkle landed on the floor, or -1 while it flies. */
		this.floorTime = -1;
		/** @type {number} The remaining visibility, which also sets the size; the sparkle goes away at 0. */
		this.fading = 0;
		/** @type {number} The index of the portal of a portal glow sparkle, or -1. */
		this.portalNum = -1;
	}
}
