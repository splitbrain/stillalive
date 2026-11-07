/**
 * Portal shots and the teleport of objects through portals.
 */

import { playSound, sfx_cancelPortals, sfx_enterPortal, sfx_noPortal, sfx_portal } from './audio.js';
import { Direction, SparkleType } from './constants.js';
import { Sparkle, removeSparkles } from './entities/Sparkle.js';
import { getTile, getTilePortal, getTileSimple } from './physics.js';
import { game, input } from './state.js';
import { inForceFieldRange, isCrateCode, isPlatformCode, isTileKind, PLATFORM_CODE, Tile, TileKind } from './tiles.js';
import { getCos, getSin, inScreen, random } from './utils.js';

/**
 * Shoot a portal from the player towards the mouse.
 *
 * The shot follows a straight line, bounces off icy walls, and places the portal on the first wall or platform. The
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

	game.portals[p].vx = getCos(input.mouseX, input.mouseY, x >> 8, y >> 8) * 256;
	game.portals[p].vy = getSin(input.mouseX, input.mouseY, x >> 8, y >> 8) * 256;

	for (i = 0; i < game.sparkles.length; i++) {
		if (game.sparkles[i].color == p && game.sparkles[i].type == SparkleType.PORTAL_SHOT) {
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

		if (tile == Tile.ICYWALL) {
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
				s.type = SparkleType.PORTAL_SHOT;
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
			game.portalShots++;
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
		game.portals[p].used = true;

		removeSparkles(p, SparkleType.PORTAL_GLOW);

		for (i = 0; i < 13; i++) {
			s = new Sparkle();
			s.x = game.portals[p].x;
			s.y = game.portals[p].y + ((i * 2) << 8);
			s.xOrig = s.x;
			s.yOrig = s.y;
			s.portalNum = p;
			s.type = SparkleType.PORTAL_GLOW;
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
			game.portals[p].used = true;
			game.portals[p].frame = 0;

			removeSparkles(p, SparkleType.PORTAL_GLOW);

			for (i = 0; i < 13; i++) {
				s = new Sparkle();

				s.x = game.portals[p].x + ((i * 2) << 8);
				s.y = game.portals[p].y;
				s.xOrig = s.x;
				s.yOrig = s.y;
				s.type = SparkleType.PORTAL_GLOW;
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

/** @type {number[]} The sides of the walls with portals, in the order of the portal checks. */
const PORTAL_SIDES = [Direction.DOWN, Direction.UP, Direction.LEFT, Direction.RIGHT];

/**
 * Find the portal on one side that an object touches. The function does not change the object.
 *
 * @param {object} obj The object with x, y, vx, vy, pX, pY and type.
 * @param {number} side The side of the wall with the portal: Direction.LEFT, Direction.RIGHT, Direction.DOWN for a
 *     floor or Direction.UP for a ceiling.
 * @returns {{index: number, deep: boolean}|null} The index of the portal, and true in deep if the object moves into
 *     the portal far enough for a teleport, or null if the object touches no portal on this side.
 */
function findPortal(obj, side) {
	const x = obj.x >> 8;
	const y = obj.y >> 8;
	const vertical = side == Direction.DOWN || side == Direction.UP;
	if (vertical && obj.type == 'plasma' && obj.vy == 0) return null;

	for (let j = 0; j < 2; j++) {
		const portal = game.portals[j];
		if (!portal.used || portal.direction != side || !game.portals[1 - j].used) continue;
		const px = portal.x >> 8;
		const py = portal.y >> 8;
		if (side == Direction.LEFT) {
			const tx = px + 3;
			const edge = x - 1;
			if (y >= py - 6 && y + obj.pY <= py + 38 && edge < tx && tx - edge <= 20)
				return { index: j, deep: tx - edge >= obj.pX >> 1 && obj.vx < 0 };
		} else if (side == Direction.RIGHT) {
			const edge = x + obj.pX;
			if (y >= py - 6 && y + obj.pY <= py + 38 && edge > px && edge - px <= 20)
				return { index: j, deep: edge - px >= obj.pX >> 1 && obj.vx > 0 };
		} else if (side == Direction.DOWN) {
			const edge = y + obj.pY;
			if (x >= px - 4 && x + obj.pX < px + 36 && edge >= py && edge - py <= 20)
				return { index: j, deep: edge - py >= 16 && obj.vy > 0 };
		} else if (side == Direction.UP) {
			const ty = py + 4;
			const edge = y - 1;
			if (x >= px - 4 && x + obj.pX < px + 36 && edge < ty && ty - edge <= 20)
				return { index: j, deep: ty - edge >= 16 && obj.vy < 0 };
		}
	}
	return null;
}

/**
 * Check if an object touches a portal on one side. The function does not change the object.
 *
 * @param {object} obj The object with x, y, vx, vy, pX, pY and type.
 * @param {number} side The side of the wall with the portal, a value of Direction.
 * @returns {number} The portal index plus 1, or 0 if the object touches no portal on this side.
 */
export function portalAt(obj, side) {
	const found = findPortal(obj, side);
	return found ? found.index + 1 : 0;
}

/**
 * Check if an object touches a portal. The function does not change the object.
 *
 * @param {object} obj The object with x, y, vx, vy, pX, pY and type.
 * @returns {number} The portal index plus 1, or 0 if the object touches no portal.
 */
export function isInPortal(obj) {
	for (const side of PORTAL_SIDES) {
		const p = portalAt(obj, side);
		if (p) return p;
	}
	return 0;
}

/**
 * Let an object pass a portal on one side while it moves: an object in the portal moves to the middle of the portal,
 * and it teleports to the other portal when it moves into the portal far enough.
 *
 * @param {object} obj The object with x, y, vx, vy, pX, pY and type.
 * @param {number} side The side of the wall with the portal, a value of Direction.
 * @returns {number} The portal index plus 1, or 0 if the object touches no portal on this side.
 */
export function passPortal(obj, side) {
	const found = findPortal(obj, side);
	if (!found) return 0;
	const portal = game.portals[found.index];
	if (side == Direction.LEFT || side == Direction.RIGHT) {
		const gap = (32 - obj.pY) >> 1;
		obj.y = ((portal.y >> 8) + gap) << 8;
		if (game.bossNum == 0 || obj.type != 'plasma') obj.vy = 0;
	} else {
		obj.x = ((portal.x >> 8) + 8) << 8;
	}
	if (found.deep) teleport(found.index, obj);
	return found.index + 1;
}

/**
 * Let an object pass the portals on all sides while it moves, see passPortal().
 *
 * @param {object} obj The object with x, y, vx, vy, pX, pY and type.
 * @returns {number} The portal index plus 1, or 0 if the object touches no portal.
 */
export function passPortals(obj) {
	for (const side of PORTAL_SIDES) {
		const p = passPortal(obj, side);
		if (p) return p;
	}
	return 0;
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
 * Remove the portals when the player enters a force field.
 *
 * @returns {void}
 */
export function clearPortalsAtForceField() {
	if (inForceField(game.player)) removePortals();
}

/**
 * Remove both portals with the cancel sound, if a portal is placed.
 *
 * @returns {void}
 */
function removePortals() {
	if (!game.portals[0].used && !game.portals[1].used) return;
	for (let i = 0; i < 2; i++) {
		game.portals[i].used = false;
		removeSparkles(i, SparkleType.PORTAL_GLOW);
	}
	playSound(sfx_cancelPortals);
}

/**
 * Check if a force field tile is on the diagonal line through an object.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {boolean} True if the object touches a force field tile.
 */
export function inForceField(obj) {
	let i, j;
	for (i = 0; i <= obj.pY - 1; i += 2) {
		for (j = 0; j <= obj.pX - 1; j += 2) {
			const t = getTileSimple((obj.x >> 8) + j, (obj.y >> 8) + j);
			if (inForceFieldRange(t)) {
				return true;
			}
		}
	}
	return false;
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
		if (game.crates[i].shrink == 0 && isInPortal(game.crates[i])) ok = 0;
	}

	if (ok) {
		for (i = 0; i < game.turrets.length; i++) {
			if (!game.turrets[i].dead && isInPortal(game.turrets[i])) ok = 0;
		}
	}

	if (ok && game.plasmaBall.length > 0 && isInPortal(game.plasmaBall[0])) ok = 0;

	if (ok && isInPortal(game.player)) ok = 0;

	if (ok) removePortals();
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
