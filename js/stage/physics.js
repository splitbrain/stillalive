/**
 * Collision and tile query functions, and the handling of objects that the player carries.
 */

import { playSound, sfx_pickUp, sfx_throwObject } from './audio.js';
import {
	Direction,
	GRAVITY,
	MouseButton,
	PLAYFIELD_HEIGHT,
	PLAYFIELD_WIDTH,
	TILE_SIZE,
	TILE_SIZE_BITS,
} from './constants.js';
import { crateAt, crateLandsOnPlayer, movingCrateTouching } from './entities/Crate.js';
import { gravPipeFieldsAt } from './entities/GravPipeField.js';
import { onBelt, platformAt } from './entities/Platform.js';
import { isInPortal, passPortal, portalAt } from './portals.js';
import { game, input } from './state.js';
import { FIRST_OF_KIND, inForceFieldRange, isDeadlyTile, isTileKind, Tile, TileKind } from './tiles.js';
import { getCos, getDistance, getSin, inScreen } from './utils.js';

/**
 * Check what an object stands on.
 *
 * @param {import('./entities/Body.js').Body} obj The object. It must also have the vertical speed vy.
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
 * @returns {number} The id of the deadly tile at the point, or 0.
 */
function pointOnDeadlyTile(x, y) {
	const tile = game.map.atPixel(x, y);
	return isDeadlyTile(tile) ? tile : 0;
}

/**
 * Check if an object touches a deadly tile at one of its six test points.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {number} The id of the deadly tile that the object touches, or 0.
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
 * Check if objects pass through a tile. The exit, the deadly tiles, the player start and the force fields are not
 * solid.
 *
 * @param {number} tile The tile id.
 * @returns {boolean} True if objects pass the tile.
 */
function isPassable(tile) {
	return tile == Tile.EXIT || isDeadlyTile(tile) || tile == Tile.PLAYER_START || inForceFieldRange(tile);
}

/**
 * A solid thing at a point: a tile id, a crate or a platform. The tile id Tile.EMPTY means that nothing solid is there.
 *
 * @typedef {number|import('./entities/Crate.js').Crate|import('./entities/Platform.js').Platform} Solid
 */

/**
 * Get the solid tile at a point, or the object at the point where the map is empty.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @param {function(number, number): (Solid|null)} objectAt Gets the object at a point, or null for none.
 * @returns {Solid} The tile id or the object, or Tile.EMPTY if nothing solid is there or the point is outside the
 *     playfield.
 */
function solidAt(x, y, objectAt) {
	if (!inScreen(x, y)) return Tile.EMPTY;
	const map = game.map;
	const tile = map.tiles[map.index(x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS)];
	if (tile == Tile.EMPTY) return objectAt(x, y) || Tile.EMPTY;
	return isPassable(tile) ? Tile.EMPTY : tile;
}

/** @type {function(number, number): (Solid|null)} Gets the crate or else the platform at a point, or null for none. */
const crateOrPlatformAt = (x, y) => crateAt(x, y) || platformAt(x, y);

/** @type {function(number, number): null} Gets no object. */
const nothingAt = () => null;

/**
 * Get the solid tile or platform at a point, without the crates.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {Solid} The tile id, the platform, or Tile.EMPTY if nothing solid is there.
 */
export function getTileWithoutCrates(x, y) {
	return solidAt(x, y, platformAt);
}

/**
 * Get the solid tile at a point, without the crates and the platforms.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {number} The tile id, or Tile.EMPTY if nothing solid is there.
 */
export function getTileWithoutObjects(x, y) {
	return solidAt(x, y, nothingAt);
}

/**
 * Get the solid tile, crate or platform at a point.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {Solid} The tile id, the crate, the platform, or Tile.EMPTY if nothing solid is there.
 */
export function getTile(x, y) {
	return solidAt(x, y, crateOrPlatformAt);
}

/**
 * Get the tile or platform at a point for a portal shot. The shot passes through the exit, the first wheel frame, the
 * red energy walls, the cakes and the player start.
 *
 * @param {number} x The x coordinate in pixels.
 * @param {number} y The y coordinate in pixels.
 * @returns {Solid} The tile id, the platform, or Tile.EMPTY if the shot passes.
 */
export function getTilePortal(x, y) {
	if (x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT || y < 0 || x < 0) return 0;
	const map = game.map;
	let tile = map.tiles[map.index(x >> TILE_SIZE_BITS, y >> TILE_SIZE_BITS)];
	if (
		tile == Tile.EXIT ||
		tile == FIRST_OF_KIND[TileKind.WHEEL] ||
		isTileKind(tile, TileKind.ENERGYWALL) ||
		tile == Tile.CAKE ||
		tile == Tile.PLAYER_START
	)
		tile = Tile.EMPTY;

	if (!tile) {
		tile = platformAt(x, y) || Tile.EMPTY;
	}

	return tile;
}

/**
 * Hold a carried object in front of the player, in the direction of the mouse. The object also gets the speed for
 * the throw.
 *
 * @param {import('./entities/Body.js').Body} obj The crate or turret.
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

	obj.vx = cos * (TILE_SIZE << 8);
	obj.vy = sin * (TILE_SIZE << 8);

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
 * Move a crate or turret for one tick.
 *
 * @param {import('./entities/Body.js').Body} obj The crate or turret.
 * @returns {void}
 */
export function moveObject(obj) {
	let col, i, c;
	const fields = gravPipeFieldsAt(obj);
	for (i = 0; i < fields.length; i++) {
		const field = fields[i];
		if (field.vx != 0) {
			if (portalAt(obj, Direction.UP) || portalAt(obj, Direction.DOWN)) {
				if (obj.y >> 8 < field.y) obj.y += 768;
				else if ((obj.y >> 8) + obj.pY > field.y + 2 * TILE_SIZE) obj.y -= 768;
			} else if (obj.y >> 8 < field.y + (TILE_SIZE - (obj.pY >> 1))) obj.y += 512;
			else if ((obj.y >> 8) + obj.pY > field.y + 2 * TILE_SIZE - (TILE_SIZE - (obj.pY >> 1))) obj.y -= 512;
		} else if (field.vy != 0) {
			if (obj.x >> 8 < field.x + (TILE_SIZE - (obj.pX >> 1))) obj.x += 256;
			else if ((obj.x >> 8) + obj.pX > field.x + 2 * TILE_SIZE - (TILE_SIZE - (obj.pX >> 1))) obj.x -= 256;
		}

		obj.vx = field.vx * 384;
		obj.vy = field.vy * 384;

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
					if (obj.x != ca.x || obj.y != ca.y) {
						const y = obj.y >> 8;
						let x = obj.x >> 8;

						if (obj.vx > 0) x += TILE_SIZE;
						else if (obj.vx < 0) x -= 1;

						let needReturn = false;

						if (ca.contains(x, y + 1) || ca.contains(x, y + TILE_SIZE / 2) || ca.contains(x, y + 13)) {
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
			const x2 = game.player.midX();
			const y2 = game.player.midY();
			for (i = 0; i < game.crates.length; i++) {
				x1 = game.crates[i].midX();
				y1 = game.crates[i].midY();
				if (getDistance(x1, y1, x2, y2) < 2 * TILE_SIZE && game.crates[i].contains(input.mouseX, input.mouseY)) {
					game.crates[i].carried = true;
					playSound(sfx_pickUp);
					ok = 1;
					break;
				}
			}
			if (!ok) {
				for (i = 0; i < game.turrets.length; i++) {
					x1 = game.turrets[i].midX();
					y1 = game.turrets[i].midY();
					if (
						!game.turrets[i].dead &&
						getDistance(x1, y1, x2, y2) < 2 * TILE_SIZE &&
						game.turrets[i].contains(input.mouseX, input.mouseY)
					) {
						game.turrets[i].carried = true;
						playSound(sfx_pickUp);
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
 * Get the solid tile in the bottom row of an object.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {Solid} The tile id or the object of the first solid point along the bottom edge, else Tile.EMPTY.
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
 * Get the solid tile in the top row of an object.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {Solid} The tile id or the object of the first solid point along the top edge, else Tile.EMPTY.
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
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {Solid} The tile id or the object of the first solid point along the left edge, else Tile.EMPTY.
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
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {Solid} The tile id or the object of the first solid point along the right edge, else Tile.EMPTY.
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
 * Find the side of an object with the most points in solid tiles.
 *
 * @param {import('./entities/Body.js').Body} obj The object.
 * @returns {number} Direction.UP, Direction.DOWN, Direction.LEFT or Direction.RIGHT, or -1 if the object touches
 *     nothing.
 */
export function getCollision(obj) {
	let i;
	const hit = [0, 0, 0, 0]; //top, bottom, left, right
	const x = obj.x >> 8;
	const y = obj.y >> 8;

	let max = 0;

	for (i = x; i < x + obj.pX; i += 2) {
		if (getTile(i, y)) hit[0]++;
	}
	let maxVal = hit[0];

	for (i = x + 1; i < x + obj.pX - 1; i += 2) {
		if (getTile(i, y + obj.pY - 1)) hit[1]++;
	}
	if (hit[1] > maxVal) {
		max = 1;
		maxVal = hit[1];
	}

	for (i = y; i < y + obj.pY; i += 2) {
		if (getTile(x, i)) hit[2]++;
	}
	if (hit[2] > maxVal) {
		max = 2;
		maxVal = hit[2];
	}

	for (i = y; i < y + obj.pY; i += 2) {
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
 * @param {import('./entities/Body.js').Body} obj The object. It must also have the speeds vx and vy.
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
	const p = game.player;
	if (!isInPortal(p)) {
		const x = p.x >> 8;
		const y = p.y >> 8;
		// check each tile that the box of the player touches
		for (let ty = y >> TILE_SIZE_BITS; ty <= (y + p.pY - 1) >> TILE_SIZE_BITS; ty++) {
			for (let tx = x >> TILE_SIZE_BITS; tx <= (x + p.pX - 1) >> TILE_SIZE_BITS; tx++) {
				if (game.map.atPixel(tx << TILE_SIZE_BITS, ty << TILE_SIZE_BITS) == Tile.EXIT) return 1;
			}
		}
	}

	return 0;
}
