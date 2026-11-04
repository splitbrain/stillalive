/**
 * Collision and tile query functions, and the handling of objects that the player carries.
 */

import { playSound, sfx_throwObject } from './audio.js';
import { Direction, GRAVITY, MouseButton, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from './constants.js';
import { crateAt, crateLandsOnPlayer, movingCrateTouching } from './entities/Crate.js';
import { gravPipeFieldsAt } from './entities/GravPipeField.js';
import { onBelt, platformAt } from './entities/Platform.js';
import { isInPortal, passPortal, portalAt } from './portals.js';
import { game, input } from './state.js';
import { FIRST_OF_KIND, inForceFieldRange, isCrateCode, isDeadlyTile, isTileKind, Tile, TileKind } from './tiles.js';
import { getCos, getDistance, getSin } from './utils.js';

/**
 * Check what an object stands on.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} 0 if the object is in the air, 1 for normal ground, 2 for an icy wall, 3 for a conveyor belt to
 *     the right and 4 for a conveyor belt to the left.
 */
export function touchingGround(obj) {
	if (obj.vy >= 0) {
		const hit = getTile((obj.x >> 8) + 1, (obj.y >> 8) + obj.pY);
		const hit2 = getTile((obj.x >> 8) + obj.pX - 1, (obj.y >> 8) + obj.pY);

		if (isTileKind(hit, TileKind.BELT_RIGHT) || isTileKind(hit2, TileKind.BELT_RIGHT)) return 3;
		if (isTileKind(hit, TileKind.BELT_LEFT) || isTileKind(hit2, TileKind.BELT_LEFT)) return 4;
		if (hit == Tile.ICYWALL || hit2 == Tile.ICYWALL) return 2;
		else if (hit || hit2) return 1;
	}
	return 0;
}

/**
 * Check if a point is on a deadly tile.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {boolean} True if the tile at the point is deadly.
 */
function pointOnDeadlyTile(x, y) {
	if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
	const tile = game.map[(y >> 4) * 32 + (x >> 4)];
	return isDeadlyTile(tile);
}

/**
 * Check if an object touches a deadly tile at one of its six test points.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {boolean} True if the object touches a deadly tile.
 */
export function touchesDeadlyTile(obj) {
	const x = obj.x >> 8;
	const y = obj.y >> 8;
	const pX = obj.pX;
	const pY = obj.pY;

	let hit = pointOnDeadlyTile(x, y);
	if (!hit) hit = pointOnDeadlyTile(x + pX - 1, y);
	if (!hit) hit = pointOnDeadlyTile(x, y + (pY >> 1));
	if (!hit) hit = pointOnDeadlyTile(x, y + pY - 6);
	if (!hit) hit = pointOnDeadlyTile(x + pX - 1, y + (pY >> 1));
	if (!hit) hit = pointOnDeadlyTile(x + pX - 1, y + pY - 6);

	return hit;
}

/**
 * Get the solid tile or platform at a point, without the crates.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The tile id, a platform code, or Tile.EMPTY if nothing solid is there.
 */
export function getTileWithoutCrates(x, y) {
	if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
	let tile = game.map[(y >> 4) * 32 + (x >> 4)];

	if (!tile) {
		tile = platformAt(x, y);
	}

	if (tile == Tile.EXIT || isDeadlyTile(tile) || tile == Tile.PLAYER_START || inForceFieldRange(tile))
		tile = Tile.EMPTY;

	return tile;
}

/**
 * Get the solid tile at a point, without the crates and the platforms.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The tile id, or Tile.EMPTY if nothing solid is there.
 */
export function getTileWithoutObjects(x, y) {
	if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
	let tile = game.map[(y >> 4) * 32 + (x >> 4)];

	if (tile == Tile.EXIT || isDeadlyTile(tile) || tile == Tile.PLAYER_START || inForceFieldRange(tile))
		tile = Tile.EMPTY;

	return tile;
}

/**
 * Get the solid tile, crate or platform at a point.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The tile id, a crate code, a platform code, or Tile.EMPTY if nothing solid is there.
 */
export function getTile(x, y) {
	if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
	let tile = game.map[(y >> 4) * 32 + (x >> 4)];

	if (!tile) {
		tile = crateAt(x, y);
		if (!tile) {
			tile = platformAt(x, y);
		}
	}

	if (tile == Tile.EXIT || isDeadlyTile(tile) || tile == Tile.PLAYER_START || inForceFieldRange(tile))
		tile = Tile.EMPTY;

	return tile;
}

/**
 * Get the tile or platform at a point for a portal shot. The shot passes through the exit, the first wheel frame, the
 * red energy walls, the cakes and the player start.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The tile id, a platform code, or Tile.EMPTY if the shot passes.
 */
export function getTilePortal(x, y) {
	if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
	let tile = game.map[(y >> 4) * 32 + (x >> 4)];
	if (
		tile == Tile.EXIT ||
		tile == FIRST_OF_KIND[TileKind.WHEEL] ||
		isTileKind(tile, TileKind.ENERGYWALL) ||
		tile == Tile.CAKE ||
		tile == Tile.PLAYER_START ||
		isCrateCode(tile)
	)
		tile = Tile.EMPTY;

	if (!tile) {
		tile = platformAt(x, y);
	}

	return tile;
}

/**
 * Throw a carried object from the center of the player towards the mouse.
 *
 * @param {object} obj The crate or turret.
 * @returns {void}
 */
export function placeObject(obj) {
	let step;
	const x = game.player.x + (game.player.pX << 7);
	const y = game.player.y + (game.player.pY << 7);

	obj.x = x - (obj.pX << 7);
	obj.y = y - (obj.pY << 7);

	const cos = getCos(input.mouseX, input.mouseY, x >> 8, y >> 8);
	const sin = getSin(input.mouseX, input.mouseY, x >> 8, y >> 8);

	obj.vx = cos * (16 << 8);
	obj.vy = sin * (16 << 8);

	for (step = 0; step < 2; step++) {
		obj.x += obj.vx >> 1;
		obj.y += obj.vy >> 1;

		if (
			!passPortal(obj, Direction.LEFT) &&
			!passPortal(obj, Direction.DOWN) &&
			!passPortal(obj, Direction.UP) &&
			!passPortal(obj, Direction.RIGHT)
		) {
			checkCollisions(obj);
		}
	}

	obj.vx = (cos * (30 << 8)) >> 2;
	obj.vy = (sin * (30 << 8)) >> 2;
}

/**
 * Move a crate or turret for one tick: pipe fields, conveyor belts, gravity, friction, the push of the player and
 * other crates, and the collisions.
 *
 * @param {object} obj The crate or turret.
 * @returns {void}
 */
export function moveObject(obj) {
	let col, i, c;
	const fields = gravPipeFieldsAt(obj);
	for (i = 0; i < fields.length; i++) {
		const f = fields[i];
		if (game.gravPipeFields[f].vx != 0) {
			if (portalAt(obj, Direction.UP) || portalAt(obj, Direction.DOWN)) {
				if (obj.y >> 8 < game.gravPipeFields[f].y) obj.y += 768;
				else if ((obj.y >> 8) + obj.pY > game.gravPipeFields[f].y + 32) obj.y -= 768;
			} else if (obj.y >> 8 < game.gravPipeFields[f].y + (16 - (obj.pY >> 1))) obj.y += 512;
			else if ((obj.y >> 8) + obj.pY > game.gravPipeFields[f].y + 32 - (16 - (obj.pY >> 1))) obj.y -= 512;
		} else if (game.gravPipeFields[f].vy != 0) {
			// the height pY centers the object on the x axis; a fix would change the gameplay for the turrets
			if (obj.x >> 8 < game.gravPipeFields[f].x + (16 - (obj.pY >> 1))) obj.x += 256;
			else if ((obj.x >> 8) + obj.pX > game.gravPipeFields[f].x + 32 - (16 - (obj.pY >> 1))) obj.x -= 256;
		}

		obj.vx = game.gravPipeFields[f].vx * 384;
		obj.vy = game.gravPipeFields[f].vy * 384;

		if (obj.type == 'turret' && !obj.canExplode) {
			obj.canExplode = true;
		}
	}

	const belt = onBelt(obj);
	if (belt) {
		obj.x += belt == 3 ? 384 : belt == 4 ? -384 : 0;
		obj.vx = belt == 3 ? 8 : belt == 4 ? -8 : 0;
	}
	if (obj.type == 'crate') {
		if (belt == 0 && obj.carpet != 0) obj.vx = obj.carpet == 3 ? 384 : obj.carpet == 4 ? -384 : 0;
		obj.carpet = belt;
	}

	const inLeftPortal = portalAt(obj, Direction.LEFT);
	const inRightPortal = portalAt(obj, Direction.RIGHT);

	const ground = touchingGround(obj);

	if (!ground || portalAt(obj, Direction.DOWN)) {
		if (fields.length == 0) obj.vy += GRAVITY;
		if (obj.vy > 10 << 8) obj.vy = 10 << 8;
	}

	if (obj.vy == 0 && obj.vx == 0) return;

	if (obj.vx > 0) {
		if (ground && !inLeftPortal) obj.vx -= 64;
		else obj.vx -= 10;
		if (obj.vx < 0) obj.vx = 0;
	} else if (obj.vx < 0) {
		if (ground && !inRightPortal) obj.vx += 64;
		else obj.vx += 10;
		if (obj.vx > 0) obj.vx = 0;
	}

	if (obj.vx > 512 && ground == 1 && !inLeftPortal) obj.vx = 512;
	else if (obj.vx < -512 && ground == 1 && !inRightPortal) obj.vx = -512;

	let j;
	for (j = 0; j < 8; j++) {
		if (!passPortal(obj, Direction.DOWN) && !passPortal(obj, Direction.UP)) obj.x += obj.vx >> 3;
		if (!passPortal(obj, Direction.LEFT) && !passPortal(obj, Direction.RIGHT) && !crateLandsOnPlayer(obj))
			obj.y += obj.vy >> 3;

		if (obj.type == 'crate') {
			if (movingCrateTouching(game.player) && obj.invincibility == 0) {
				game.player.x += obj.vx >> 3;

				if (obj.vx < 0) {
					if (leftCollision(game.player)) {
						while (leftCollision(game.player)) game.player.x += 128;
						obj.vx = 0;
					}
				} else if (obj.vx > 0) {
					if (rightCollision(game.player)) {
						while (rightCollision(game.player)) game.player.x -= 128;
						obj.vx = 0;
					}
				}
			}

			if (obj.vx != 0 && !isInPortal(obj)) {
				for (c = 0; c < game.crates.length; c++) {
					const ca = game.crates[c];
					if (isInPortal(ca)) continue;
					// a crate with the same x or the same y position is skipped; a fix would change the gameplay
					if (obj.x != ca.x && obj.y != ca.y) {
						const y = obj.y >> 8;
						let x = obj.x >> 8;

						if (obj.vx > 0) x += 16;
						else if (obj.vx < 0) x -= 1;

						let needReturn = false;

						if (pointInObject(x, y + 1, ca)) {
							if (ca.carried) game.player.vx = obj.vx;
							else if (obj.carried) game.player.vx = ca.vx;
							ca.vx = obj.vx;
							obj.vx >>= 1;
							needReturn = true;
						} else if (pointInObject(x, y + 8, ca)) {
							if (ca.carried) game.player.vx = obj.vx;
							else if (obj.carried) game.player.vx = ca.vx;
							ca.vx = obj.vx;
							obj.vx >>= 1;
							needReturn = true;
						} else if (pointInObject(x, y + 13, ca)) {
							if (ca.carried) game.player.vx = obj.vx;
							else if (obj.carried) game.player.vx = ca.vx;
							ca.vx = obj.vx;
							obj.vx >>= 1;
							needReturn = true;
						}

						if (needReturn) {
							col = 1;
							while (col && !isInPortal(obj)) {
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
	while (col && !isInPortal(obj)) {
		col = checkCollisions(obj);
	}
}

/**
 * Check if the player carries an object.
 *
 * @returns {number} 1 if the player carries a crate or a turret, else 0.
 */
export function carriesObject() {
	let i;
	for (i = 0; i < game.crates.length; i++) {
		if (game.crates[i].carried) return 1;
	}
	for (i = 0; i < game.turrets.length; i++) {
		if (game.turrets[i].carried) return 1;
	}
	return 0;
}

/**
 * Check if a point is inside an object.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} 1 if the point is inside, else 0.
 */
function pointInObject(x, y, obj) {
	const x2 = obj.x >> 8;
	const y2 = obj.y >> 8;
	if (x >= x2 && x < x2 + obj.pX && y >= y2 && y < y2 + obj.pY) return 1;
	else return 0;
}

/**
 * Pick up a crate or turret under the mouse while the left button is pressed, and throw the carried object when the
 * button is released.
 *
 * @returns {void}
 */
export function grabObject() {
	let x1, y1, i;
	let ok = 0;
	if (!carriesObject()) {
		if (input.mousePressed && input.mouseButton == MouseButton.LEFT) {
			const x2 = (game.player.x >> 8) + (game.player.pX >> 1);
			const y2 = (game.player.y >> 8) + (game.player.pY >> 1);
			for (i = 0; i < game.crates.length; i++) {
				x1 = (game.crates[i].x >> 8) + (game.crates[i].pX >> 1);
				y1 = (game.crates[i].y >> 8) + (game.crates[i].pY >> 1);
				if (getDistance(x1, y1, x2, y2) < 32 && pointInObject(input.mouseX, input.mouseY, game.crates[i])) {
					game.crates[i].carried = true;
					ok = 1;
					break;
				}
			}
			if (!ok) {
				for (i = 0; i < game.turrets.length; i++) {
					x1 = (game.turrets[i].x >> 8) + (game.turrets[i].pX >> 1);
					y1 = (game.turrets[i].y >> 8) + (game.turrets[i].pY >> 1);
					if (
						!game.turrets[i].dead &&
						getDistance(x1, y1, x2, y2) < 32 &&
						pointInObject(input.mouseX, input.mouseY, game.turrets[i])
					) {
						game.turrets[i].carried = true;
						break;
					}
				}
			}
		}
	} else {
		if (!input.mousePressed) {
			ok = 0;
			for (i = 0; i < game.crates.length; i++) {
				if (game.crates[i].carried) {
					game.crates[i].carried = false;
					ok = 1;
					game.crates[i].invincibility = 3;
					game.crates[i].noRemove = 90;
					playSound(sfx_throwObject);
					break;
				}
			}
			if (!ok) {
				for (i = 0; i < game.turrets.length; i++) {
					if (game.turrets[i].carried) {
						game.turrets[i].carried = false;
						game.turrets[i].canExplode = true;
						playSound(sfx_throwObject);
						break;
					}
				}
			}
		}
	}
}

/**
 * Get the solid tile below an object.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} The tile id or code of the first solid point along the bottom edge, else 0.
 */
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

/**
 * Get the solid tile above an object.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} The tile id or code of the first solid point along the top edge, else 0.
 */
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

/**
 * Get the solid tile left of an object.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} The tile id or code of the first solid point along the left edge, else 0.
 */
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

/**
 * Get the solid tile right of an object.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} The tile id or code of the first solid point along the right edge, else 0.
 */
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

/**
 * Find the side of an object that is deepest in a solid tile.
 *
 * @param {object} obj The object with x, y, pX and pY.
 * @returns {number} Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT, or -1 if the object touches nothing.
 */
export function getCollision(obj) {
	let i;
	const hit = [0, 0, 0, 0]; //top, bottom, left, right
	const x = obj.x >> 8;
	const y = obj.y >> 8;

	let max = 0;

	for (i = x; i < x + obj.pX; i += 2) {
		//top
		if (getTile(i, y)) hit[0]++;
	}
	let maxVal = hit[0];

	for (i = x + 1; i < x + obj.pX - 1; i += 2) {
		//bottom
		if (getTile(i, y + obj.pY - 1)) hit[1]++;
	}
	if (hit[1] > maxVal) {
		max = 1;
		maxVal = hit[1];
	}

	for (i = y; i < y + obj.pY; i += 2) {
		//left
		if (getTile(x, i)) hit[2]++;
	}
	if (hit[2] > maxVal) {
		max = 2;
		maxVal = hit[2];
	}

	for (i = y; i < y + obj.pY; i += 2) {
		//right
		if (getTile(x + obj.pX - 1, i)) hit[3]++;
	}
	if (hit[3] > maxVal) {
		max = 3;
		maxVal = hit[3];
	}

	if (maxVal == 0) return -1;
	return max;
}

/**
 * Push an object out of the solid tiles and stop its speed in that direction.
 *
 * @param {object} obj The object with x, y, vx, vy, pX and pY.
 * @returns {number} 1 if a collision was resolved, 0 if there was none or the object is stuck between two sides.
 */
export function checkCollisions(obj) {
	let coll = 0;

	if (getCollision(obj) == Direction.UP) {
		coll = 1;
		if (obj.vy < 0) {
			obj.vx >>= 1;
			obj.vy = 0;
		}
		do {
			obj.y += 256;
			if (getCollision(obj) == Direction.DOWN) {
				coll = 0;
				break;
			}
		} while (getCollision(obj) == Direction.UP);
	}

	if (!coll && getCollision(obj) == Direction.DOWN) {
		coll = 1;
		if (obj.vy > 0) {
			obj.vy = 0;
		}
		do {
			obj.y -= 256;
			if (getCollision(obj) == Direction.UP) {
				coll = 0;
				break;
			}
		} while (getCollision(obj) == Direction.DOWN);
	}

	if (!coll && getCollision(obj) == Direction.LEFT) {
		coll = 1;
		if (obj.vx < 0) obj.vx = 0;
		do {
			obj.x += 256;
			if (getCollision(obj) == Direction.RIGHT) {
				coll = 0;
				obj.vy = 0;
				break;
			}
		} while (getCollision(obj) == Direction.LEFT);
	}

	if (!coll && getCollision(obj) == Direction.RIGHT) {
		coll = 1;
		if (obj.vx > 0) obj.vx = 0;
		do {
			obj.x -= 256;
			if (getCollision(obj) == Direction.LEFT) {
				coll = 0;
				obj.vy = 0;
				break;
			}
		} while (getCollision(obj) == Direction.RIGHT);
	}

	return coll;
}

/**
 * Check if the player touches the exit.
 *
 * @returns {number} 1 if the player is on the open exit, else 0.
 */
export function atExit() {
	if (!isInPortal(game.player)) {
		// only the diagonal line through the player is checked; a full check would change the gameplay
		for (let j = 2; j <= 14; j += 2) {
			if (getTileSimple((game.player.x >> 8) + j, (game.player.y >> 8) + j) == Tile.EXIT) return 1;
		}
	}

	return 0;
}

/**
 * Get the tile id of the map at a point.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The tile id, or 0 outside the playfield.
 */
export function getTileSimple(x, y) {
	if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
	const tile = game.map[(y >> 4) * 32 + (x >> 4)];

	return tile;
}
