/**
 * Portal shots and the teleport of objects through portals.
 */

import { playSound, sfx_enterPortal, sfx_noPortal, sfx_portal } from './audio.js';
import { BAS, DROITE, GAUCHE, HAUT } from './constants.js';
import { Sparkle, removeSparkles } from './entities/Sparkle.js';
import { getTile, getTilePortal } from './physics.js';
import { Line } from './render/game.js';
import { game, input } from './state.js';
import { PLATFORM_CODE, Tile, TileKind, isCrateCode, isPlatformCode, isTileKind } from './tiles.js';
import { getCos, getSin, inScreen, random } from './utils.js';

/**
 * Shoot a portal from the player towards the mouse.
 *
 * The shot follows a straight line, bounces off mirror tiles, and places the portal on the first wall or platform. The
 * portal lines of the shot stay for the drawing.
 *
 * @param {number} p The portal index, 0 for blue and 1 for red.
 * @returns {void}
 */
export function launchPortal(p) {
	let i, k;
	game.perso.timePosePortal = 0;
	game.perso.lastLaunched = p;

	let x = game.perso.x + ((game.perso.pX >> 1) << 8);
	let y = game.perso.y + ((game.perso.pY >> 1) << 8);

	game.portals[p].vx = getCos(input.mouseX, input.mouseY, (x >> 8) + game.ECART_X, (y >> 8) + game.ECART_Y) * 256;
	game.portals[p].vy = getSin(input.mouseX, input.mouseY, (x >> 8) + game.ECART_X, (y >> 8) + game.ECART_Y) * 256;

	for (i = 0; i < game.sparkles.length; i++) {
		if (game.sparkles[i].color == p && game.sparkles[i].used == 1) {
			game.sparkles.splice(i, 1);
			i--;
		}
	}

	i = 0;
	let rebond = 0;
	let tile;
	let now = 0;

	portalLines = new Array();
	portalLines.push(new Line(x >> 8, y >> 8, 0, 0, p));
	let inScreenOK = false;

	do {
		inScreenOK = false;
		now++;
		x += game.portals[p].vx;
		y += game.portals[p].vy;
		tile = getTilePortal(x >> 8, y >> 8);

		if (tile == Tile.MIRROR) {
			const haut = getTilePortal(x >> 8, (y >> 8) - 1);
			const bas = getTilePortal(x >> 8, (y >> 8) + 1);
			const gauche = getTilePortal((x >> 8) - 1, y >> 8);
			const droite = getTilePortal((x >> 8) + 1, y >> 8);
			if ((!bas || !haut) && gauche && droite) {
				game.portals[p].vy = -game.portals[p].vy;
			} else if ((!gauche || !droite) && haut && bas) {
				game.portals[p].vx = -game.portals[p].vx;
			}
			tile = 0;
			rebond++;

			portalLines[portalLines.length - 1].x2 = x >> 8;
			portalLines[portalLines.length - 1].y2 = y >> 8;

			portalLines.push(new Line(x >> 8, y >> 8, 0, 0, p));
		}

		if (i % 6 == 0 && now > 15) {
			for (k = 0; k < 1; k++) {
				const s = new Sparkle();
				s.x = x + parseInt(random(-5 << 8, 5 << 8)) - (8 << 8);
				s.y = y + parseInt(random(-5 << 8, 5 << 8)) - (8 << 8);
				s.used = 1;
				s.vx = parseInt(random(96, 192));
				s.vy = parseInt(random(96, 192));
				s.fading = 255;
				s.color = p;
				s.portalNum = -1;
				if (parseInt(random(0, 2)) == 0) s.vx = -s.vx;
				if (parseInt(random(0, 2)) == 0) s.vy = -s.vy;
				game.sparkles.push(s);
			}
		}
		i++;
		if (inScreen(x >> 8, y >> 8)) {
			inScreenOK = true;
		} else {
			const yy = y >> 8;
			if (yy < 0 && game.portals[p].vy > 0) inScreenOK = true;
		}
	} while (tile == Tile.EMPTY && inScreenOK && rebond < 5);

	portalLines[portalLines.length - 1].x2 = x >> 8;
	portalLines[portalLines.length - 1].y2 = y >> 8;

	if (isTileKind(tile, TileKind.WALL) || isPlatformCode(tile)) {
		const ok = setPortalDir(p, x >> 8, y >> 8);
		if (ok) {
			if (game.portals[p].direction == DROITE || game.portals[p].direction == GAUCHE) {
				game.portals[p].scaleX = 1;
				game.portals[p].scaleY = 0;
				game.portals[p].plateforme = -1;
			} else {
				game.portals[p].scaleX = 0;
				game.portals[p].scaleY = 1;
				const plate = getTilePortal(x >> 8, y >> 8);
				if (isPlatformCode(plate)) game.portals[p].plateforme = plate - PLATFORM_CODE;
				else game.portals[p].plateforme = -1;
			}
			const r = parseInt(random(0, 2));
			playSound(sfx_portal[r]);
			game.PORTALS++;
		} else playSound(sfx_noPortal);
	} else playSound(sfx_noPortal);
}

/**
 * Place a portal on the wall at a point and set its direction.
 *
 * The wall must be straight along the portal, and the area in front of the portal must be free.
 *
 * @param {number} p The portal index.
 * @param {number} x The x coordinate of the hit in pixels.
 * @param {number} y The y coordinate of the hit in pixels.
 * @returns {number} 1 if the portal was placed, else 0.
 */
function setPortalDir(p, x, y) {
	let tile, x2, y2, s;
	const vx = game.portals[p].vx;
	const vy = game.portals[p].vy;
	let i;
	const oldDir = game.portals[p].direction;

	let mur = 0;
	//first check if the portal is on a left or right wall
	for (i = y - 14; i < y + 14; i++) {
		tile = getTilePortal(x, i);
		if (tile != Tile.EMPTY) {
			if (isTileKind(tile, TileKind.WALL) || isPlatformCode(tile)) mur++;
		}
	}
	if (mur == 28) {
		mur = 0;
		for (i = x - 16; i < x + 16; i++) {
			//make sure that nothing touches horizontally
			if (getTile(i, y - 14) != Tile.EMPTY && !isCrateCode(getTile(i, y - 14))) mur++;
			if (getTile(i, y + 13) != Tile.EMPTY && !isCrateCode(getTile(i, y + 13))) mur++;
		}
		if (mur > 36) return 0;

		if (vx < 0) {
			//if the portal is on the left
			x -= 3;
			game.portals[p].direction = GAUCHE;
		} else game.portals[p].direction = DROITE;
		y -= 16;

		x2 = game.portals[1 - p].x >> 8;
		y2 = game.portals[1 - p].y >> 8;
		if (x == x2) {
			// the other portal is on the same wall and overlaps
			if (y2 - y > -32 && y2 - y < 32 && game.portals[1 - p].used) {
				game.portals[p].direction = oldDir;
				return 0;
			}
		}

		game.portals[p].frame = 1;
		game.portals[p].y = y << 8;
		game.portals[p].x = x << 8;
		game.portals[p].used = 1;

		removeSparkles(p, 3);

		for (i = 0; i < 13; i++) {
			s = new Sparkle();
			s.x = game.portals[p].x;
			s.y = game.portals[p].y + ((i * 2) << 8);
			s.xOrig = s.x;
			s.yOrig = s.y;
			s.portalNum = p;
			s.used = 3;
			if (game.portals[p].direction == DROITE) {
				s.vx = -parseInt(random(128, 384));
				s.xOrig -= 7 << 8;
			} else s.vx = parseInt(random(128, 384));
			s.vy = 0;
			s.fading = 200;
			s.color = p;

			game.sparkles.push(s);
		}

		return 1;
	} else {
		//then check if the portal is on a top or bottom wall
		mur = 0;
		for (i = x - 14; i < x + 14; i++) {
			tile = getTilePortal(i, y);
			if (tile != Tile.EMPTY) {
				if (isTileKind(tile, TileKind.WALL) || isPlatformCode(tile)) mur++;
			}
		}
		if (mur == 28) {
			mur = 0;
			for (i = y - 16; i < y + 16; i++) {
				//make sure that nothing touches vertically
				if (getTile(x - 14, i) != Tile.EMPTY && !isCrateCode(getTile(x - 14, i))) mur++;
				if (getTile(x + 13, i) != Tile.EMPTY && !isCrateCode(getTile(x + 13, i))) mur++;
			}
			if (mur > 36) return 0;

			if (vy < 0) {
				//if the portal is at the top
				y -= 3;
				game.portals[p].direction = HAUT;
			} else game.portals[p].direction = BAS;
			x -= 16;

			x2 = game.portals[1 - p].x >> 8;
			y2 = game.portals[1 - p].y >> 8;
			if (y == y2) {
				// the other portal is on the same wall and overlaps
				if (x2 - x > -32 && x2 - x < 32 && game.portals[1 - p].used) {
					game.portals[p].direction = oldDir;
					return 0;
				}
			}

			game.portals[p].y = y << 8;
			game.portals[p].x = x << 8;
			game.portals[p].used = 1;
			game.portals[p].frame = 0;

			removeSparkles(p, 3);

			for (i = 0; i < 13; i++) {
				s = new Sparkle();

				s.x = game.portals[p].x + ((i * 2) << 8);
				s.y = game.portals[p].y;
				s.xOrig = s.x;
				s.yOrig = s.y;
				s.used = 3;
				s.portalNum = p;
				if (game.portals[p].direction == BAS) {
					s.vy = -parseInt(random(128, 384));
					s.yOrig -= 8 << 8;
				} else s.vy = parseInt(random(128, 384));
				s.vx = 0;
				s.fading = 200;
				s.color = p;

				game.sparkles.push(s);
			}

			return 1;
		}
	}
	return 0;
}

/**
 * Check if an object is in a portal on a left wall, and teleport it when it moves into the portal far enough.
 *
 * @param {object} obj The object with x, y, vx, vy, pX and pY.
 * @returns {number} The portal index plus 1, or 0 if the object is not in such a portal.
 */
export function checkTeleportGauche(obj) {
	let j;
	let x = obj.x >> 8;
	const y = obj.y >> 8;
	x -= 1;
	for (j = 0; j < 2; j++) {
		const tx = (game.portals[j].x >> 8) + 3;
		const ty = game.portals[j].y >> 8;
		if (game.portals[j].used && game.portals[j].direction == GAUCHE && game.portals[1 - j].used) {
			if (y >= ty - 6 && y + obj.pY <= ty + 38 && x < tx && tx - x <= 20) {
				const ecrt = (32 - obj.pY) >> 1;
				obj.y = (ty + ecrt) << 8;
				if (game.bossNum == 0 || obj.type != 'plasma') obj.vy = 0;
				if (tx - x >= obj.pX >> 1 && obj.vx < 0) {
					transfertPortal(j, obj);
				}
				return j + 1;
			}
		}
	}
	return 0;
}

/**
 * Check if an object is in a portal on a right wall, and teleport it when it moves into the portal far enough.
 *
 * @param {object} obj The object with x, y, vx, vy, pX and pY.
 * @returns {number} The portal index plus 1, or 0 if the object is not in such a portal.
 */
export function checkTeleportDroite(obj) {
	let j;
	let x = obj.x >> 8;
	const y = obj.y >> 8;
	x += obj.pX;
	for (j = 0; j < 2; j++) {
		const tx = game.portals[j].x >> 8;
		const ty = game.portals[j].y >> 8;
		if (game.portals[j].used && game.portals[j].direction == DROITE && game.portals[1 - j].used) {
			if (y >= ty - 6 && y + obj.pY <= ty + 38 && x > tx && x - tx <= 20) {
				const ecrt = (32 - obj.pY) >> 1;
				obj.y = (ty + ecrt) << 8;
				if (game.bossNum == 0 || obj.type != 'plasma') obj.vy = 0;
				if (x - tx >= obj.pX >> 1 && obj.vx > 0) {
					transfertPortal(j, obj);
				}
				return j + 1;
			}
		}
	}
	return 0;
}

/**
 * Check if an object is in a portal on a floor, and teleport it when it moves into the portal far enough.
 *
 * @param {object} obj The object with x, y, vx, vy, pX and pY.
 * @returns {number} The portal index plus 1, or 0 if the object is not in such a portal.
 */
export function checkTeleportBas(obj) {
	let j;
	const x = obj.x >> 8;
	let y = obj.y >> 8;
	y += obj.pY;

	if (obj.type == 'plasma' && obj.vy == 0) return 0;

	for (j = 0; j < 2; j++) {
		const tx = game.portals[j].x >> 8;
		const ty = game.portals[j].y >> 8;
		if (game.portals[j].used && game.portals[j].direction == BAS && game.portals[1 - j].used == 1) {
			if (x >= tx - 4 && x + obj.pX < tx + 36 && y >= ty && y - ty <= 20) {
				obj.x = (tx + 8) << 8;
				if (y - ty >= 16 && obj.vy > 0) {
					transfertPortal(j, obj);
				}
				return j + 1;
			}
		}
	}
	return 0;
}

/**
 * Check if an object is in a portal on a ceiling, and teleport it when it moves into the portal far enough.
 *
 * @param {object} obj The object with x, y, vx, vy, pX and pY.
 * @returns {number} The portal index plus 1, or 0 if the object is not in such a portal.
 */
export function checkTeleportHaut(obj) {
	let j;
	const x = obj.x >> 8;
	let y = obj.y >> 8;
	y -= 1;

	if (obj.type == 'plasma' && obj.vy == 0) return 0;

	for (j = 0; j < 2; j++) {
		const tx = game.portals[j].x >> 8;
		const ty = (game.portals[j].y >> 8) + 4;
		if (game.portals[j].used && game.portals[j].direction == HAUT && game.portals[1 - j].used == 1) {
			if (x >= tx - 4 && x + obj.pX < tx + 36 && y < ty && ty - y <= 20) {
				obj.x = (tx + 8) << 8;
				if (ty - y >= 16 && obj.vy < 0) {
					transfertPortal(j, obj);
				}
				return j + 1;
			}
		}
	}
	return 0;
}

/**
 * Check if an object is in a portal.
 *
 * @param {object} obj The object with x, y, vx, vy, pX and pY.
 * @returns {number} The portal index plus 1, or 0 if the object is not in a portal.
 */
export function dansUnPortal(obj) {
	let p = checkTeleportBas(obj);
	if (p == 0) p = checkTeleportHaut(obj);
	if (p == 0) p = checkTeleportGauche(obj);
	if (p == 0) p = checkTeleportDroite(obj);

	return p;
}

/**
 * Move an object from one portal to the other and turn its speed to the direction of the exit portal.
 *
 * @param {number} p The index of the portal that the object enters.
 * @param {object} obj The object.
 * @returns {void}
 */
function transfertPortal(p, obj) {
	let ecrt, oldx;
	const entree = game.portals[p].direction;
	const sortie = game.portals[1 - p].direction;

	playSound(sfx_enterPortal);

	if (obj.type == 'tourelle') {
		obj.canExplode = 1;
	}

	if (obj.type == 'perso') {
		game.perso.timePassedPortal = p == 0 ? 42 : -42;
	}

	if (sortie == DROITE) {
		ecrt = (32 - obj.pY) >> 1;
		obj.x = game.portals[1 - p].x - ((obj.pX >> 1) << 8);
		obj.y = game.portals[1 - p].y + (ecrt << 8);
	} else if (sortie == GAUCHE) {
		ecrt = (32 - obj.pY) >> 1;
		obj.x = game.portals[1 - p].x - ((obj.pX >> 1) << 8);
		obj.y = game.portals[1 - p].y + (ecrt << 8);
	} else if (sortie == HAUT) {
		obj.x = game.portals[1 - p].x + (8 << 8);
		obj.y = game.portals[1 - p].y - ((obj.pY >> 1) << 8) + (4 << 8);
	} else if (sortie == BAS) {
		obj.x = game.portals[1 - p].x + (8 << 8);
		obj.y = game.portals[1 - p].y - ((obj.pY >> 1) << 8);
	}

	if (game.bossNum == 0 || obj.type != 'plasma') {
		if (entree == BAS && sortie == BAS) {
			obj.vy = -obj.vy;
			if (obj.vy > -1100) obj.vy = -1100;
		} else if (entree == BAS && sortie == GAUCHE) {
			oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy = oldx;
		} else if (entree == BAS && sortie == DROITE) {
			oldx = obj.vx;
			obj.vx = -obj.vy;
			obj.vy = oldx;
		} else if (entree == GAUCHE && sortie == BAS) {
			obj.vy = -1000;
		} else if (entree == DROITE && sortie == BAS) {
			obj.vy = -1000;
		} else if (entree == DROITE && sortie == DROITE) {
			obj.vx = -1000;
		} else if (entree == GAUCHE && sortie == GAUCHE) {
			obj.vx = 1000;
		} else if (entree == HAUT && sortie == HAUT) {
			obj.vy = 650;
		} else if (entree == GAUCHE && sortie == DROITE) {
			obj.vx = -650;
		} else if (entree == DROITE && sortie == GAUCHE) {
			obj.vx = 650;
		} else if (entree == DROITE && sortie == HAUT) {
			obj.vy = 650;
		} else if (entree == GAUCHE && sortie == HAUT) {
			obj.vy = 650;
		} else if (entree == HAUT && sortie == GAUCHE) {
			obj.vx = 650;
		} else if (entree == HAUT && sortie == DROITE) {
			obj.vx = -650;
		} else if (entree == HAUT && sortie == BAS) {
			obj.vy = -1000;
		} else if (entree == HAUT && sortie == HAUT) {
			obj.vy = -obj.vy;
		}
	} else if ((game.bossNum == 3 || game.bossNum == 4) && obj.type == 'plasma') {
		if ((entree == BAS && sortie == BAS) || (entree == HAUT && sortie == HAUT)) {
			obj.vy = -obj.vy;
		} else if ((entree == BAS && sortie == GAUCHE) || (entree == HAUT && sortie == DROITE)) {
			oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy = oldx;
		} else if ((entree == BAS && sortie == DROITE) || (entree == HAUT && sortie == GAUCHE)) {
			oldx = obj.vx;
			obj.vx = -obj.vy;
			obj.vy = oldx;
		} else if ((entree == GAUCHE && sortie == BAS) || (entree == DROITE && sortie == HAUT)) {
			oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy = oldx;
		} else if ((entree == DROITE && sortie == BAS) || (entree == GAUCHE && sortie == HAUT)) {
			oldx = obj.vx;
			obj.vx = obj.vy;
			obj.vy = -oldx;
		} else if ((entree == DROITE && sortie == DROITE) || (entree == GAUCHE && sortie == GAUCHE)) {
			obj.vx = -obj.vx;
		}
	}
}

/**
 * Remove both portals, unless an object is in a portal.
 *
 * @returns {void}
 */
export function clearPortals() {
	let ok = 1;
	let i = 0;
	for (i in game.caisses) {
		if (!ok) break;
		if (game.caisses[i].shrink == 0 && dansUnPortal(game.caisses[i])) ok = 0;
	}

	if (ok) {
		for (i in game.tourelles) {
			if (game.tourelles[i].mort == 0 && dansUnPortal(game.tourelles[i])) ok = 0;
		}
	}

	if (ok && game.plasmaBall.length > 0 && dansUnPortal(game.plasmaBall[0])) ok = 0;

	if (ok && dansUnPortal(game.perso)) ok = 0;

	if (ok) {
		for (i = 0; i < 2; i++) {
			game.portals[i].used = 0;
			removeSparkles(i, 3);
		}
	}
}

/**
 * Find the portal at a point.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} 1 for the blue portal, 0 for the red portal, or -1 if no portal is there.
 */
export function pointInPortal(x, y) {
	let i;
	for (i in game.portals) {
		const xp = game.portals[i].x >> 8;
		const yp = game.portals[i].y >> 8;

		if (game.portals[i].direction == GAUCHE || game.portals[i].direction == DROITE) {
			if (x >= xp && x <= xp + 3 && y >= yp && y <= yp + 32) {
				return 1 - i;
			}
		} else if (game.portals[i].direction == HAUT || game.portals[i].direction == BAS) {
			if (x >= xp && x <= xp + 32 && y >= yp && y <= yp + 3) {
				return 1 - i;
			}
		}
	}
	return -1;
}

/** @type {Line[]} The segments of the last portal shot, for the drawing in low quality. */
export let portalLines;
