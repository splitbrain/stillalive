/**
 * Collision and tile query functions, and the handling of objects that the player carries.
 */

import { playSound, sfx_throwObject } from './audio.js';
import { BAS, DROITE, GAUCHE, GRAVITY, HAUT, LEFT } from './constants.js';
import { caisseSurPerso, caisseToucheObjet, collideCaisse } from './entities/Caisse.js';
import { inForceFieldTp } from './entities/ForceField.js';
import { collidePlateforme, onCarpet } from './entities/Platform.js';
import {
	checkTeleportBas,
	checkTeleportDroite,
	checkTeleportGauche,
	checkTeleportHaut,
	dansUnPortal,
} from './portals.js';
import { game, input } from './state.js';
import { FIRST_OF_KIND, Tile, TileKind, inForceFieldRange, isCrateCode, isDeadlyTile, isTileKind } from './tiles.js';
import { getCos, getDistance, getSin } from './utils.js';

export function touchingGround(obj) {
	if (obj.vy >= 0) {
		const touche = getTile((obj.x >> 8) + 1, (obj.y >> 8) + obj.pY);
		const touche2 = getTile((obj.x >> 8) + obj.pX - 1, (obj.y >> 8) + obj.pY);

		if (isTileKind(touche, TileKind.BELT_RIGHT) || isTileKind(touche2, TileKind.BELT_RIGHT)) return 3;
		if (isTileKind(touche, TileKind.BELT_LEFT) || isTileKind(touche2, TileKind.BELT_LEFT)) return 4;
		if (touche == Tile.MIRROR || touche2 == Tile.MIRROR) return 2;
		else if (touche || touche2) return 1;
	}
	return 0;
}

function objetToucheTileMort(x, y) {
	if (x >= 512 || y >= 384 || y < 0 || x < 0) return 0;
	const tile = game.map[(y >> 4) * 32 + (x >> 4)];
	return isDeadlyTile(tile);
}

export function toucheTileMort(obj) {
	const x = obj.x >> 8;
	const y = obj.y >> 8;
	const pX = obj.pX;
	const pY = obj.pY;

	let touche = objetToucheTileMort(x, y);
	if (!touche) touche = objetToucheTileMort(x + pX - 1, y);
	if (!touche) touche = objetToucheTileMort(x, y + (pY >> 1));
	if (!touche) touche = objetToucheTileMort(x, y + pY - 6);
	if (!touche) touche = objetToucheTileMort(x + pX - 1, y + (pY >> 1));
	if (!touche) touche = objetToucheTileMort(x + pX - 1, y + pY - 6);

	return touche;
}

export function getTileNoCaisse(x, y) {
	if (x >= 512 || y >= 384 || y < 0 || x < 0) return 0;
	let tile = game.map[(y >> 4) * 32 + (x >> 4)];

	if (!tile) {
		//check contact with a platform
		tile = collidePlateforme(x, y);
	}

	if (tile == Tile.EXIT || isDeadlyTile(tile) || tile == Tile.PLAYER_START || inForceFieldRange(tile))
		tile = Tile.EMPTY;

	return tile;
}

export function getTileNoCaisseNoPlate(x, y) {
	if (x >= 512 || y >= 384 || y < 0 || x < 0) return 0;
	let tile = game.map[(y >> 4) * 32 + (x >> 4)];

	if (tile == Tile.EXIT || isDeadlyTile(tile) || tile == Tile.PLAYER_START || inForceFieldRange(tile))
		tile = Tile.EMPTY;

	return tile;
}

export function getTile(x, y) {
	if (x >= 512 || y >= 384 || y < 0 || x < 0) return 0;
	let tile = game.map[(y >> 4) * 32 + (x >> 4)];

	if (!tile) {
		//check contact with a crate
		tile = collideCaisse(x, y);
		if (!tile) {
			//check contact with a platform
			tile = collidePlateforme(x, y);
		}
	}

	if (tile == Tile.EXIT || isDeadlyTile(tile) || tile == Tile.PLAYER_START || inForceFieldRange(tile))
		tile = Tile.EMPTY;

	return tile;
}

export function getTilePortal(x, y) {
	if (x >= 512 || y >= 384 || y < 0 || x < 0) return 0;
	let tile = game.map[(y >> 4) * 32 + (x >> 4)];
	//passes through: crate, finish, razor wheel, red plasma, cake, start
	if (
		tile == Tile.EXIT ||
		tile == FIRST_OF_KIND[TileKind.WHEEL] ||
		isTileKind(tile, TileKind.NO_PORTAL) ||
		tile == Tile.CAKE ||
		tile == Tile.PLAYER_START ||
		isCrateCode(tile)
	)
		tile = Tile.EMPTY;

	if (!tile) {
		//check contact with a platform
		tile = collidePlateforme(x, y);
	}

	return tile;
}

export function placeObject(obj) {
	let po, col;
	const x = game.perso.x + (game.perso.pX << 7);
	const y = game.perso.y + (game.perso.pY << 7);

	obj.x = x - (obj.pX << 7);
	obj.y = y - (obj.pY << 7);

	const cos = getCos(input.mouseX, input.mouseY, (x >> 8) + game.ECART_X, (y >> 8) + game.ECART_Y);
	const sin = getSin(input.mouseX, input.mouseY, (x >> 8) + game.ECART_X, (y >> 8) + game.ECART_Y);

	obj.vx = cos * (16 << 8);
	obj.vy = sin * (16 << 8);

	for (po = 0; po < 2; po++) {
		obj.x += obj.vx >> 1;
		obj.y += obj.vy >> 1;

		if (!checkTeleportGauche(obj) && !checkTeleportBas(obj) && !checkTeleportHaut(obj) && !checkTeleportDroite(obj)) {
			col = checkCollisions(obj);
		}
	}

	obj.vx = (cos * (30 << 8)) >> 2;
	obj.vy = (sin * (30 << 8)) >> 2;
}

export function moveObject(obj) {
	let col, i, c;
	const ffield = inForceFieldTp(obj);
	for (i in ffield) {
		const f = ffield[i];
		if (game.forceFields[f].vx != 0) {
			if (checkTeleportHaut(obj) || checkTeleportBas(obj)) {
				if (obj.y >> 8 < game.forceFields[f].y) obj.y += 768;
				else if ((obj.y >> 8) + obj.pY > game.forceFields[f].y + 32) obj.y -= 768;
			} else if (obj.y >> 8 < game.forceFields[f].y + (16 - (obj.pY >> 1))) obj.y += 512;
			else if ((obj.y >> 8) + obj.pY > game.forceFields[f].y + 32 - (16 - (obj.pY >> 1))) obj.y -= 512;
		} else if (game.forceFields[f].vy != 0) {
			if (obj.x >> 8 < game.forceFields[f].x + (16 - (obj.pY >> 1))) obj.x += 256;
			else if ((obj.x >> 8) + obj.pX > game.forceFields[f].x + 32 - (16 - (obj.pY >> 1))) obj.x -= 256;
		}

		obj.vx = game.forceFields[f].vx * 384;
		obj.vy = game.forceFields[f].vy * 384;

		if (obj.type == 'tourelle' && !obj.canExplode) {
			obj.canExplode = true;
		}
	}

	const carp = onCarpet(obj);
	if (carp) {
		obj.x += carp == 3 ? 384 : carp == 4 ? -384 : 0;
		obj.vx = carp == 3 ? 8 : carp == 4 ? -8 : 0;
	}
	if (obj.type == 'caisse') {
		if (carp == 0 && obj.carpet != 0) obj.vx = obj.carpet == 3 ? 384 : obj.carpet == 4 ? -384 : 0;
		obj.carpet = carp;
	}

	const checkTgauche = checkTeleportGauche(obj);
	const checkTdroite = checkTeleportDroite(obj);

	const toucheSol = touchingGround(obj);

	if (!toucheSol || checkTeleportBas(obj)) {
		if (ffield.length == 0) obj.vy += GRAVITY;
		if (obj.vy > 10 << 8) obj.vy = 10 << 8;
	}

	if (obj.vy == 0 && obj.vx == 0) return;

	if (obj.vx > 0) {
		if (toucheSol && !checkTgauche) obj.vx -= 64;
		else obj.vx -= 10;
		if (obj.vx < 0) obj.vx = 0;
	} else if (obj.vx < 0) {
		if (toucheSol && !checkTdroite) obj.vx += 64;
		else obj.vx += 10;
		if (obj.vx > 0) obj.vx = 0;
	}

	if (obj.vx > 512 && toucheSol == 1 && !checkTgauche) obj.vx = 512;
	else if (obj.vx < -512 && toucheSol == 1 && !checkTdroite) obj.vx = -512;

	let j;
	for (j = 0; j < 8; j++) {
		if (!checkTeleportBas(obj) && !checkTeleportHaut(obj)) obj.x += obj.vx >> 3;
		if (!checkTeleportGauche(obj) && !checkTeleportDroite(obj) && !caisseSurPerso(obj)) obj.y += obj.vy >> 3;

		if (obj.type == 'caisse') {
			if (caisseToucheObjet(game.perso) && obj.invincibility == 0) {
				game.perso.x += obj.vx >> 3;

				if (obj.vx < 0) {
					if (leftCollision(game.perso)) {
						while (leftCollision(game.perso)) game.perso.x += 128;
						obj.vx = 0;
					}
				} else if (obj.vx > 0) {
					if (rightCollision(game.perso)) {
						while (rightCollision(game.perso)) game.perso.x -= 128;
						obj.vx = 0;
					}
				}
			}

			if (obj.vx != 0 && !dansUnPortal(obj)) {
				for (c in game.caisses) {
					const ca = game.caisses[c];
					if (dansUnPortal(ca)) continue;
					if (obj.x != ca.x && obj.y != ca.y) {
						const y = obj.y >> 8;
						let x = obj.x >> 8;

						if (obj.vx > 0) x += 16;
						else if (obj.vx < 0) x -= 1;

						let needReturn = false;

						if (pointDansObjet(x, y + 1, ca)) {
							if (ca.porter) game.perso.vx = obj.vx;
							else if (obj.porter) game.perso.vx = ca.vx;
							ca.vx = obj.vx;
							obj.vx >>= 1;
							needReturn = true;
						} else if (pointDansObjet(x, y + 8, ca)) {
							if (ca.porter) game.perso.vx = obj.vx;
							else if (obj.porter) game.perso.vx = ca.vx;
							ca.vx = obj.vx;
							obj.vx >>= 1;
							needReturn = true;
						} else if (pointDansObjet(x, y + 13, ca)) {
							if (ca.porter) game.perso.vx = obj.vx;
							else if (obj.porter) game.perso.vx = ca.vx;
							ca.vx = obj.vx;
							obj.vx >>= 1;
							needReturn = true;
						}

						if (needReturn) {
							col = 1;
							while (col && !dansUnPortal(obj)) {
								col = checkCollisions(obj);
							}
							return;
						}
					}
				}
			}
		}
	}

	col = 1;
	while (col && !dansUnPortal(obj)) {
		col = checkCollisions(obj);
	}
}

export function objetPortee() {
	let i;
	for (i in game.caisses) {
		if (game.caisses[i].porter == 1) return 1;
	}
	for (i in game.tourelles) {
		if (game.tourelles[i].porter == 1) return 1;
	}
	return 0;
}

function pointDansObjet(x, y, obj) {
	const x2 = obj.x >> 8;
	const y2 = obj.y >> 8;
	if (x >= x2 && x < x2 + obj.pX && y >= y2 && y < y2 + obj.pY) return 1;
	else return 0;
}

export function grabObject() {
	let x1, y1, i;
	let ok = 0;
	if (!objetPortee()) {
		if (input.mousePressed && input.mouseButton == LEFT) {
			const x2 = (game.perso.x >> 8) + (game.perso.pX >> 1);
			const y2 = (game.perso.y >> 8) + (game.perso.pY >> 1);
			for (i in game.caisses) {
				x1 = (game.caisses[i].x >> 8) + (game.caisses[i].pX >> 1);
				y1 = (game.caisses[i].y >> 8) + (game.caisses[i].pY >> 1);
				if (
					getDistance(x1, y1, x2, y2) < 32 &&
					pointDansObjet(input.mouseX - game.ECART_X, input.mouseY - game.ECART_Y, game.caisses[i])
				) {
					game.caisses[i].porter = 1;
					ok = 1;
					break;
				}
			}
			if (!ok) {
				for (i in game.tourelles) {
					x1 = (game.tourelles[i].x >> 8) + (game.tourelles[i].pX >> 1);
					y1 = (game.tourelles[i].y >> 8) + (game.tourelles[i].pY >> 1);
					if (
						!game.tourelles[i].mort &&
						getDistance(x1, y1, x2, y2) < 32 &&
						pointDansObjet(input.mouseX - game.ECART_X, input.mouseY - game.ECART_Y, game.tourelles[i])
					) {
						game.tourelles[i].porter = 1;
						break;
					}
				}
			}
		}
	} else {
		if (!input.mousePressed) {
			ok = 0;
			for (i in game.caisses) {
				if (game.caisses[i].porter == 1) {
					game.caisses[i].porter = 0;
					ok = 1;
					game.caisses[i].invincibility = 3;
					game.caisses[i].noRemove = 90;
					playSound(sfx_throwObject);
					break;
				}
			}
			if (!ok) {
				for (i in game.tourelles) {
					if (game.tourelles[i].porter == 1) {
						game.tourelles[i].porter = 0;
						game.tourelles[i].canExplode = 1;
						playSound(sfx_throwObject);
						break;
					}
				}
			}
		}
	}
}

export function downCollision(obj) {
	const x = obj.x >> 8;
	const y = (obj.y >> 8) + obj.pY - 1;
	const pX = obj.pX;

	let i;
	for (i = x; i < x + pX; i++) {
		const tile = getTile(i, y);
		if (tile) return tile;
	}

	return 0;
}

export function upCollision(obj) {
	const x = obj.x >> 8;
	const y = obj.y >> 8;
	const pX = obj.pX;

	let i;
	for (i = x; i < x + pX; i++) {
		const tile = getTile(i, y);
		if (tile) return tile;
	}

	return 0;
}

export function leftCollision(obj) {
	const x = (obj.x >> 8) - 1;
	const y = obj.y >> 8;
	const pY = obj.pY;

	let i;
	for (i = y; i < y + pY; i++) {
		const tile = getTile(x, i);
		if (tile) return tile;
	}

	return 0;
}

export function rightCollision(obj) {
	const x = (obj.x >> 8) + obj.pX;
	const y = obj.y >> 8;
	const pY = obj.pY;

	let i;
	for (i = y; i < y + pY; i++) {
		const tile = getTile(x, i);
		if (tile) return tile;
	}

	return 0;
}

export function getCollision(obj) {
	let i;
	const touche = [0, 0, 0, 0]; //top, bottom, left, right
	const x = obj.x >> 8;
	const y = obj.y >> 8;

	let max = 0;
	let maxVal = 0;

	for (i = x; i < x + obj.pX; i += 2) {
		//top
		if (getTile(i, y)) touche[0]++;
	}
	maxVal = touche[0];

	for (i = x + 1; i < x + obj.pX - 1; i += 2) {
		//bottom
		if (getTile(i, y + obj.pY - 1)) touche[1]++;
	}
	if (touche[1] > maxVal) {
		max = 1;
		maxVal = touche[1];
	}

	for (i = y; i < y + obj.pY; i += 2) {
		//left
		if (getTile(x, i)) touche[2]++;
	}
	if (touche[2] > maxVal) {
		max = 2;
		maxVal = touche[2];
	}

	for (i = y; i < y + obj.pY; i += 2) {
		//right
		if (getTile(x + obj.pX - 1, i)) touche[3]++;
	}
	if (touche[3] > maxVal) {
		max = 3;
		maxVal = touche[3];
	}

	/*i = 0;
	for(x=0;x<4;x++){
		i+=touche[x];
		;
	}*/

	if (maxVal == 0) return -1;
	return max;
}

export function checkCollisions(obj) {
	let coll = 0;

	if (getCollision(obj) == HAUT) {
		coll = 1;
		if (obj.vy < 0) {
			obj.vx >>= 1;
			obj.vy = 0;
		}
		do {
			obj.y += 256;
			if (getCollision(obj) == BAS) {
				coll = 0;
				//*hitbox->y-= 64;
				break;
			}
		} while (getCollision(obj) == HAUT);
	}

	if (!coll && getCollision(obj) == BAS) {
		coll = 1;
		if (obj.vy > 0) {
			obj.vy = 0;
		}
		do {
			obj.y -= 256;
			if (getCollision(obj) == HAUT) {
				coll = 0;
				//*hitbox->y+= 64;
				break;
			}
		} while (getCollision(obj) == BAS);
	}

	if (!coll && getCollision(obj) == GAUCHE) {
		coll = 1;
		if (obj.vx < 0) obj.vx = 0;
		do {
			obj.x += 256;
			if (getCollision(obj) == DROITE) {
				coll = 0;
				obj.vy = 0;
				//*hitbox->x-= 64;
				break;
			}
		} while (getCollision(obj) == GAUCHE);
	}

	if (!coll && getCollision(obj) == DROITE) {
		coll = 1;
		if (obj.vx > 0) obj.vx = 0;
		do {
			obj.x -= 256;
			if (getCollision(obj) == GAUCHE) {
				coll = 0;
				obj.vy = 0;
				//*hitbox->x+= 64;
				break;
			}
		} while (getCollision(obj) == DROITE);
	}

	return coll;
}

export function finNiveau() {
	if (!dansUnPortal(game.perso)) {
		let i, j;
		for (i = 4; i <= 28; i += 2) {
			for (j = 2; j <= 14; j += 2) {
				if (getTileSimple((game.perso.x >> 8) + j, (game.perso.y >> 8) + j) == 22) return 1;
			}
		}
	}

	return 0;
}

export function getTileSimple(x, y) {
	if (x >= 512 || y >= 384 || y < 0 || x < 0) return 0;
	const tile = game.map[(y >> 4) * 32 + (x >> 4)];

	return tile;
}
