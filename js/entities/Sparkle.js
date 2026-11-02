/**
 * The Sparkle object and its helper functions.
 */

import { ctx } from '../canvas.js';
import { GRAVITY } from '../constants.js';
import { sparkle } from '../images.js';
import { getTile } from '../physics.js';
import { game, settings } from '../state.js';
import { getCos, getDistance, getSin, random } from '../utils.js';

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

export function removeSparkles(p, used) {
	let i;
	for (i = 0; i < game.sparkles.length; i++) {
		if (game.sparkles[i].used == used && game.sparkles[i].color == p) {
			game.sparkles.splice(i, 1);
			i--;
		}
	}
}

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

export class Sparkle {
	constructor() {
		this.x = 0;
		this.y = 0;
		this.xOrig = 0;
		this.yOrig = 0;
		this.vx = 0;
		this.vy = 0;
		this.used = 0;
		this.color = 0;
		this.floorTime = -1;
	}
}
