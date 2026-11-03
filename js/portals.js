/**
 * Portal shots and the teleport of objects through portals.
 */

import { playSound, sfx_enterPortal, sfx_noPortal, sfx_portal } from './audio.js';
import { Direction } from './constants.js';
import { Sparkle, removeSparkles } from './entities/Sparkle.js';
import { getTile, getTilePortal } from './physics.js';
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
	game.player.portalCooldown = 0;
	game.player.lastLaunched = p;

	let x = game.player.x + ((game.player.pX >> 1) << 8);
	let y = game.player.y + ((game.player.pY >> 1) << 8);

	game.portals[p].vx = getCos(input.mouseX, input.mouseY, (x >> 8) + game.offsetX, (y >> 8) + game.offsetY) * 256;
	game.portals[p].vy = getSin(input.mouseX, input.mouseY, (x >> 8) + game.offsetX, (y >> 8) + game.offsetY) * 256;

	for (i = 0; i < game.sparkles.length; i++) {
		if (game.sparkles[i].color == p && game.sparkles[i].used == 1) {
			game.sparkles.splice(i, 1);
			i--;
		}
	}

	i = 0;
	let bounces = 0;
	let tile;
	let now = 0;

	let inScreenOK;

	do {
		inScreenOK = false;
		now++;
		x += game.portals[p].vx;
		y += game.portals[p].vy;
		tile = getTilePortal(x >> 8, y >> 8);

		if (tile == Tile.MIRROR) {
			const up = getTilePortal(x >> 8, (y >> 8) - 1);
			const down = getTilePortal(x >> 8, (y >> 8) + 1);
			const left = getTilePortal((x >> 8) - 1, y >> 8);
			const right = getTilePortal((x >> 8) + 1, y >> 8);
			if ((!down || !up) && left && right) {
				game.portals[p].vy = -game.portals[p].vy;
			} else if ((!left || !right) && up && down) {
				game.portals[p].vx = -game.portals[p].vx;
			}
			tile = 0;
			bounces++;
		}

		if (i % 6 == 0 && now > 15) {
			for (k = 0; k < 1; k++) {
				const s = new Sparkle();
				s.x = x + random(-5 << 8, 5 << 8) - (8 << 8);
				s.y = y + random(-5 << 8, 5 << 8) - (8 << 8);
				s.used = 1;
				s.vx = random(96, 192);
				s.vy = random(96, 192);
				s.fading = 255;
				s.color = p;
				s.portalNum = -1;
				if (random(0, 2) == 0) s.vx = -s.vx;
				if (random(0, 2) == 0) s.vy = -s.vy;
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
	} while (tile == Tile.EMPTY && inScreenOK && bounces < 5);

	if (isTileKind(tile, TileKind.WALL) || isPlatformCode(tile)) {
		const ok = setPortalDir(p, x >> 8, y >> 8);
		if (ok) {
			if (game.portals[p].direction == Direction.RIGHT || game.portals[p].direction == Direction.LEFT) {
				game.portals[p].scaleX = 1;
				game.portals[p].scaleY = 0;
				game.portals[p].platformIndex = -1;
			} else {
				game.portals[p].scaleX = 0;
				game.portals[p].scaleY = 1;
				const platformCode = getTilePortal(x >> 8, y >> 8);
				if (isPlatformCode(platformCode)) game.portals[p].platformIndex = platformCode - PLATFORM_CODE;
				else game.portals[p].platformIndex = -1;
			}
			const r = random(0, 2);
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

	let wallCount = 0;
	//first check if the portal is on a left or right wall
	for (i = y - 14; i < y + 14; i++) {
		tile = getTilePortal(x, i);
		if (tile != Tile.EMPTY) {
			if (isTileKind(tile, TileKind.WALL) || isPlatformCode(tile)) wallCount++;
		}
	}
	if (wallCount == 28) {
		wallCount = 0;
		for (i = x - 16; i < x + 16; i++) {
			//make sure that nothing touches horizontally
			if (getTile(i, y - 14) != Tile.EMPTY && !isCrateCode(getTile(i, y - 14))) wallCount++;
			if (getTile(i, y + 13) != Tile.EMPTY && !isCrateCode(getTile(i, y + 13))) wallCount++;
		}
		if (wallCount > 36) return 0;

		if (vx < 0) {
			//if the portal is on the left
			x -= 3;
			game.portals[p].direction = Direction.LEFT;
		} else game.portals[p].direction = Direction.RIGHT;
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
			if (game.portals[p].direction == Direction.RIGHT) {
				s.vx = -random(128, 384);
				s.xOrig -= 7 << 8;
			} else s.vx = random(128, 384);
			s.vy = 0;
			s.fading = 200;
			s.color = p;

			game.sparkles.push(s);
		}

		return 1;
	} else {
		//then check if the portal is on a top or bottom wall
		wallCount = 0;
		for (i = x - 14; i < x + 14; i++) {
			tile = getTilePortal(i, y);
			if (tile != Tile.EMPTY) {
				if (isTileKind(tile, TileKind.WALL) || isPlatformCode(tile)) wallCount++;
			}
		}
		if (wallCount == 28) {
			wallCount = 0;
			for (i = y - 16; i < y + 16; i++) {
				//make sure that nothing touches vertically
				if (getTile(x - 14, i) != Tile.EMPTY && !isCrateCode(getTile(x - 14, i))) wallCount++;
				if (getTile(x + 13, i) != Tile.EMPTY && !isCrateCode(getTile(x + 13, i))) wallCount++;
			}
			if (wallCount > 36) return 0;

			if (vy < 0) {
				//if the portal is at the top
				y -= 3;
				game.portals[p].direction = Direction.UP;
			} else game.portals[p].direction = Direction.DOWN;
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
				if (game.portals[p].direction == Direction.DOWN) {
					s.vy = -random(128, 384);
					s.yOrig -= 8 << 8;
				} else s.vy = random(128, 384);
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
export function checkTeleportLeft(obj) {
	let j;
	let x = obj.x >> 8;
	const y = obj.y >> 8;
	x -= 1;
	for (j = 0; j < 2; j++) {
		const tx = (game.portals[j].x >> 8) + 3;
		const ty = game.portals[j].y >> 8;
		if (game.portals[j].used && game.portals[j].direction == Direction.LEFT && game.portals[1 - j].used) {
			if (y >= ty - 6 && y + obj.pY <= ty + 38 && x < tx && tx - x <= 20) {
				const gap = (32 - obj.pY) >> 1;
				obj.y = (ty + gap) << 8;
				if (game.bossNum == 0 || obj.type != 'plasma') obj.vy = 0;
				if (tx - x >= obj.pX >> 1 && obj.vx < 0) {
					teleport(j, obj);
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
export function checkTeleportRight(obj) {
	let j;
	let x = obj.x >> 8;
	const y = obj.y >> 8;
	x += obj.pX;
	for (j = 0; j < 2; j++) {
		const tx = game.portals[j].x >> 8;
		const ty = game.portals[j].y >> 8;
		if (game.portals[j].used && game.portals[j].direction == Direction.RIGHT && game.portals[1 - j].used) {
			if (y >= ty - 6 && y + obj.pY <= ty + 38 && x > tx && x - tx <= 20) {
				const gap = (32 - obj.pY) >> 1;
				obj.y = (ty + gap) << 8;
				if (game.bossNum == 0 || obj.type != 'plasma') obj.vy = 0;
				if (x - tx >= obj.pX >> 1 && obj.vx > 0) {
					teleport(j, obj);
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
export function checkTeleportDown(obj) {
	let j;
	const x = obj.x >> 8;
	let y = obj.y >> 8;
	y += obj.pY;

	if (obj.type == 'plasma' && obj.vy == 0) return 0;

	for (j = 0; j < 2; j++) {
		const tx = game.portals[j].x >> 8;
		const ty = game.portals[j].y >> 8;
		if (game.portals[j].used && game.portals[j].direction == Direction.DOWN && game.portals[1 - j].used == 1) {
			if (x >= tx - 4 && x + obj.pX < tx + 36 && y >= ty && y - ty <= 20) {
				obj.x = (tx + 8) << 8;
				if (y - ty >= 16 && obj.vy > 0) {
					teleport(j, obj);
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
export function checkTeleportUp(obj) {
	let j;
	const x = obj.x >> 8;
	let y = obj.y >> 8;
	y -= 1;

	if (obj.type == 'plasma' && obj.vy == 0) return 0;

	for (j = 0; j < 2; j++) {
		const tx = game.portals[j].x >> 8;
		const ty = (game.portals[j].y >> 8) + 4;
		if (game.portals[j].used && game.portals[j].direction == Direction.UP && game.portals[1 - j].used == 1) {
			if (x >= tx - 4 && x + obj.pX < tx + 36 && y < ty && ty - y <= 20) {
				obj.x = (tx + 8) << 8;
				if (ty - y >= 16 && obj.vy < 0) {
					teleport(j, obj);
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
export function inPortal(obj) {
	let p = checkTeleportDown(obj);
	if (p == 0) p = checkTeleportUp(obj);
	if (p == 0) p = checkTeleportLeft(obj);
	if (p == 0) p = checkTeleportRight(obj);

	return p;
}

/**
 * Move an object from one portal to the other and turn its speed to the direction of the exit portal.
 *
 * @param {number} p The index of the portal that the object enters.
 * @param {object} obj The object.
 * @returns {void}
 */
function teleport(p, obj) {
	let gap, swap;
	const entry = game.portals[p].direction;
	const exit = game.portals[1 - p].direction;

	playSound(sfx_enterPortal);

	if (obj.type == 'turret') {
		obj.canExplode = true;
	}

	if (obj.type == 'player') {
		game.player.teleportTime = p == 0 ? 42 : -42;
	}

	if (exit == Direction.RIGHT) {
		gap = (32 - obj.pY) >> 1;
		obj.x = game.portals[1 - p].x - ((obj.pX >> 1) << 8);
		obj.y = game.portals[1 - p].y + (gap << 8);
	} else if (exit == Direction.LEFT) {
		gap = (32 - obj.pY) >> 1;
		obj.x = game.portals[1 - p].x - ((obj.pX >> 1) << 8);
		obj.y = game.portals[1 - p].y + (gap << 8);
	} else if (exit == Direction.UP) {
		obj.x = game.portals[1 - p].x + (8 << 8);
		obj.y = game.portals[1 - p].y - ((obj.pY >> 1) << 8) + (4 << 8);
	} else if (exit == Direction.DOWN) {
		obj.x = game.portals[1 - p].x + (8 << 8);
		obj.y = game.portals[1 - p].y - ((obj.pY >> 1) << 8);
	}

	if (game.bossNum == 0 || obj.type != 'plasma') {
		if (entry == Direction.DOWN && exit == Direction.DOWN) {
			obj.vy = -obj.vy;
			if (obj.vy > -1100) obj.vy = -1100;
		} else if (entry == Direction.DOWN && exit == Direction.LEFT) {
			swap = obj.vx;
			obj.vx = obj.vy;
			obj.vy = swap;
		} else if (entry == Direction.DOWN && exit == Direction.RIGHT) {
			swap = obj.vx;
			obj.vx = -obj.vy;
			obj.vy = swap;
		} else if (entry == Direction.LEFT && exit == Direction.DOWN) {
			obj.vy = -1000;
		} else if (entry == Direction.RIGHT && exit == Direction.DOWN) {
			obj.vy = -1000;
		} else if (entry == Direction.RIGHT && exit == Direction.RIGHT) {
			obj.vx = -1000;
		} else if (entry == Direction.LEFT && exit == Direction.LEFT) {
			obj.vx = 1000;
		} else if (entry == Direction.UP && exit == Direction.UP) {
			obj.vy = 650;
		} else if (entry == Direction.LEFT && exit == Direction.RIGHT) {
			obj.vx = -650;
		} else if (entry == Direction.RIGHT && exit == Direction.LEFT) {
			obj.vx = 650;
		} else if (entry == Direction.RIGHT && exit == Direction.UP) {
			obj.vy = 650;
		} else if (entry == Direction.LEFT && exit == Direction.UP) {
			obj.vy = 650;
		} else if (entry == Direction.UP && exit == Direction.LEFT) {
			obj.vx = 650;
		} else if (entry == Direction.UP && exit == Direction.RIGHT) {
			obj.vx = -650;
		} else if (entry == Direction.UP && exit == Direction.DOWN) {
			obj.vy = -1000;
		}
	} else if ((game.bossNum == 3 || game.bossNum == 4) && obj.type == 'plasma') {
		if ((entry == Direction.DOWN && exit == Direction.DOWN) || (entry == Direction.UP && exit == Direction.UP)) {
			obj.vy = -obj.vy;
		} else if (
			(entry == Direction.DOWN && exit == Direction.LEFT) ||
			(entry == Direction.UP && exit == Direction.RIGHT)
		) {
			swap = obj.vx;
			obj.vx = obj.vy;
			obj.vy = swap;
		} else if (
			(entry == Direction.DOWN && exit == Direction.RIGHT) ||
			(entry == Direction.UP && exit == Direction.LEFT)
		) {
			swap = obj.vx;
			obj.vx = -obj.vy;
			obj.vy = swap;
		} else if (
			(entry == Direction.LEFT && exit == Direction.DOWN) ||
			(entry == Direction.RIGHT && exit == Direction.UP)
		) {
			swap = obj.vx;
			obj.vx = obj.vy;
			obj.vy = swap;
		} else if (
			(entry == Direction.RIGHT && exit == Direction.DOWN) ||
			(entry == Direction.LEFT && exit == Direction.UP)
		) {
			swap = obj.vx;
			obj.vx = obj.vy;
			obj.vy = -swap;
		} else if (
			(entry == Direction.RIGHT && exit == Direction.RIGHT) ||
			(entry == Direction.LEFT && exit == Direction.LEFT)
		) {
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
	let i;
	for (i = 0; i < game.crates.length; i++) {
		if (!ok) break;
		if (game.crates[i].shrink == 0 && inPortal(game.crates[i])) ok = 0;
	}

	if (ok) {
		for (i = 0; i < game.turrets.length; i++) {
			if (!game.turrets[i].dead && inPortal(game.turrets[i])) ok = 0;
		}
	}

	if (ok && game.plasmaBall.length > 0 && inPortal(game.plasmaBall[0])) ok = 0;

	if (ok && inPortal(game.player)) ok = 0;

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
	for (i = 0; i < game.portals.length; i++) {
		const xp = game.portals[i].x >> 8;
		const yp = game.portals[i].y >> 8;

		if (game.portals[i].direction == Direction.LEFT || game.portals[i].direction == Direction.RIGHT) {
			if (x >= xp && x <= xp + 3 && y >= yp && y <= yp + 32) {
				return 1 - i;
			}
		} else if (game.portals[i].direction == Direction.UP || game.portals[i].direction == Direction.DOWN) {
			if (x >= xp && x <= xp + 32 && y >= yp && y <= yp + 3) {
				return 1 - i;
			}
		}
	}
	return -1;
}
