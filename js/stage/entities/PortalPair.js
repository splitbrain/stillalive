/**
 * The PortalPair object.
 */

import { playSound, sfx_cancelPortals, sfx_enterPortal, sfx_noPortal, sfx_portal } from '../audio.js';
import { Direction, SparkleType, TILE_SIZE } from '../constants.js';
import { Crate } from './Crate.js';
import { Platform } from './Platform.js';
import { Portal } from './Portal.js';
import { Sparkle, createPortalGlow, removeSparkles } from './Sparkle.js';
import { isTileKind, Tile, TileKind } from '../tiles.js';
import { getCos, getSin, inScreen, random } from '../utils.js';

/** @type {number[]} The sides of the walls with portals, in the order of the portal checks. */
const PORTAL_CHECK_SIDES = [Direction.DOWN, Direction.UP, Direction.LEFT, Direction.RIGHT];

/**
 * The two portals of a level, the portal shots and the teleport of objects through the portals.
 */
export class PortalPair {
	/**
	 * Create the two portals. The portals are not placed.
	 *
	 * @param {import('../World.js').World} world The World of the portals.
	 */
	constructor(world) {
		/** @type {import('../World.js').World} The World of the portals. */
		this.world = world;
		/** @type {Portal[]} The blue portal at index 0 and the red portal at index 1. */
		this.list = [new Portal(), new Portal()];
	}

	/**
	 * Shoot a portal from the player towards a target point.
	 *
	 * The shot follows a straight line, bounces off icy walls, and places the portal on the first wall or platform.
	 * Sparkles show the path of the shot.
	 *
	 * @param {number} p The portal index, 0 for blue and 1 for red.
	 * @param {number} targetX The x coordinate of the target point in playfield units, e.g. the mouse position.
	 * @param {number} targetY The y coordinate of the target point in playfield units.
	 * @returns {void}
	 */
	launchPortal(p, targetX, targetY) {
		let i;
		this.world.player.portalCooldown = 0;

		let x = this.world.player.x + ((this.world.player.pX >> 1) << 8);
		let y = this.world.player.y + ((this.world.player.pY >> 1) << 8);

		// A click on the start point gives no direction
		if (targetX == x >> 8 && targetY == y >> 8) {
			playSound(sfx_noPortal);
			return;
		}

		this.list[p].vx = getCos(targetX, targetY, x >> 8, y >> 8) * 256;
		this.list[p].vy = getSin(targetX, targetY, x >> 8, y >> 8) * 256;

		for (i = 0; i < this.world.sparkles.length; i++) {
			if (this.world.sparkles[i].color == p && this.world.sparkles[i].type == SparkleType.PORTAL_SHOT) {
				this.world.sparkles.splice(i, 1);
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
			x += this.list[p].vx;
			y += this.list[p].vy;
			tile = this.world.getTilePortal(x >> 8, y >> 8);

			if (tile == Tile.ICYWALL) {
				const up = this.world.getTilePortal(x >> 8, (y >> 8) - 1);
				const down = this.world.getTilePortal(x >> 8, (y >> 8) + 1);
				const left = this.world.getTilePortal((x >> 8) - 1, y >> 8);
				const right = this.world.getTilePortal((x >> 8) + 1, y >> 8);
				if ((!down || !up) && left && right) {
					this.list[p].vy = -this.list[p].vy;
				} else if ((!left || !right) && up && down) {
					this.list[p].vx = -this.list[p].vx;
				}
				tile = 0;
				bounces++;
			}

			if (i % 6 == 0 && now > 15) {
				const s = new Sparkle(
					this.world,
					SparkleType.PORTAL_SHOT,
					x + random(-5 << 8, 5 << 8) - (8 << 8),
					y + random(-5 << 8, 5 << 8) - (8 << 8),
					random(96, 192),
					random(96, 192),
					255,
					p,
				);
				if (random(0, 2) == 0) s.vx = -s.vx;
				if (random(0, 2) == 0) s.vy = -s.vy;
				this.world.sparkles.push(s);
			}
			i++;
			if (inScreen(x >> 8, y >> 8)) {
				inScreenOK = true;
			} else {
				const yy = y >> 8;
				if (yy < 0 && this.list[p].vy > 0) inScreenOK = true;
			}
		} while (tile == Tile.EMPTY && inScreenOK && bounces < 5);

		if (isTileKind(tile, TileKind.WALL) || tile instanceof Platform) {
			const ok = this.#setPortalDir(p, x >> 8, y >> 8);
			if (ok) {
				if (this.list[p].direction == Direction.RIGHT || this.list[p].direction == Direction.LEFT) {
					this.list[p].scaleX = 1;
					this.list[p].scaleY = 0;
					this.list[p].platform = null;
				} else {
					this.list[p].scaleX = 0;
					this.list[p].scaleY = 1;
					const hit = this.world.getTilePortal(x >> 8, y >> 8);
					this.list[p].platform = hit instanceof Platform ? hit : null;
				}
				const r = random(0, 2);
				playSound(sfx_portal[r]);
				this.world.portalShots++;
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
	#setPortalDir(p, x, y) {
		let tile, x2, y2;
		const vx = this.list[p].vx;
		const vy = this.list[p].vy;
		let i;
		const oldDir = this.list[p].direction;

		let wallCount = 0;
		//first check if the portal is on a left or right wall
		for (i = y - 14; i < y + 14; i++) {
			tile = this.world.getTilePortal(x, i);
			if (tile != Tile.EMPTY) {
				if (isTileKind(tile, TileKind.WALL) || tile instanceof Platform) wallCount++;
			}
		}
		if (wallCount == 28) {
			wallCount = 0;
			for (i = x - TILE_SIZE; i < x + TILE_SIZE; i++) {
				//make sure that nothing touches horizontally
				if (this.world.getTile(i, y - 14) != Tile.EMPTY && !(this.world.getTile(i, y - 14) instanceof Crate))
					wallCount++;
				if (this.world.getTile(i, y + 13) != Tile.EMPTY && !(this.world.getTile(i, y + 13) instanceof Crate))
					wallCount++;
			}
			if (wallCount > 36) return 0;

			if (vx < 0) {
				//if the portal is on the left
				x -= 3;
				this.list[p].direction = Direction.LEFT;
			} else this.list[p].direction = Direction.RIGHT;
			y -= TILE_SIZE;

			x2 = this.list[1 - p].x >> 8;
			y2 = this.list[1 - p].y >> 8;
			if (x == x2) {
				// the other portal is on the same wall and overlaps
				if (y2 - y > -2 * TILE_SIZE && y2 - y < 2 * TILE_SIZE && this.list[1 - p].used) {
					this.list[p].direction = oldDir;
					return 0;
				}
			}

			this.list[p].frame = 1;
			this.list[p].y = y << 8;
			this.list[p].x = x << 8;
			this.list[p].used = true;

			createPortalGlow(this.world, p);

			return 1;
		} else {
			//then check if the portal is on a top or bottom wall
			wallCount = 0;
			for (i = x - 14; i < x + 14; i++) {
				tile = this.world.getTilePortal(i, y);
				if (tile != Tile.EMPTY) {
					if (isTileKind(tile, TileKind.WALL) || tile instanceof Platform) wallCount++;
				}
			}
			if (wallCount == 28) {
				wallCount = 0;
				for (i = y - TILE_SIZE; i < y + TILE_SIZE; i++) {
					//make sure that nothing touches vertically
					if (this.world.getTile(x - 14, i) != Tile.EMPTY && !(this.world.getTile(x - 14, i) instanceof Crate))
						wallCount++;
					if (this.world.getTile(x + 13, i) != Tile.EMPTY && !(this.world.getTile(x + 13, i) instanceof Crate))
						wallCount++;
				}
				if (wallCount > 36) return 0;

				if (vy < 0) {
					//if the portal is at the top
					y -= 3;
					this.list[p].direction = Direction.UP;
				} else this.list[p].direction = Direction.DOWN;
				x -= TILE_SIZE;

				x2 = this.list[1 - p].x >> 8;
				y2 = this.list[1 - p].y >> 8;
				if (y == y2) {
					// the other portal is on the same wall and overlaps
					if (x2 - x > -2 * TILE_SIZE && x2 - x < 2 * TILE_SIZE && this.list[1 - p].used) {
						this.list[p].direction = oldDir;
						return 0;
					}
				}

				this.list[p].y = y << 8;
				this.list[p].x = x << 8;
				this.list[p].used = true;
				this.list[p].frame = 0;

				createPortalGlow(this.world, p);

				return 1;
			}
		}
		return 0;
	}

	/**
	 * Find the portal on one side that an object touches. The method does not change the object.
	 *
	 * @param {import('./Body.js').Body} obj The object. It must also have the speeds vx and vy.
	 * @param {number} side The side of the wall with the portal: Direction.LEFT, Direction.RIGHT, Direction.DOWN for a
	 *     floor or Direction.UP for a ceiling.
	 * @returns {{index: number, deep: boolean}|null} The index of the portal, and true in deep if the object moves into
	 *     the portal far enough for a teleport, or null if the object touches no portal on this side.
	 */
	#findPortal(obj, side) {
		const x = obj.x >> 8;
		const y = obj.y >> 8;
		if (!obj.canEnterPortal(side)) return null;

		for (let j = 0; j < 2; j++) {
			const portal = this.list[j];
			if (!portal.used || portal.direction != side || !this.list[1 - j].used) continue;
			const px = portal.x >> 8;
			const py = portal.y >> 8;
			if (side == Direction.LEFT) {
				const tx = px + 3;
				const edge = x - 1;
				if (y >= py - 6 && y + obj.pY <= py + 2 * TILE_SIZE + 6 && edge < tx && tx - edge <= 20)
					return { index: j, deep: tx - edge >= obj.pX >> 1 && obj.vx < 0 };
			} else if (side == Direction.RIGHT) {
				const edge = x + obj.pX;
				if (y >= py - 6 && y + obj.pY <= py + 2 * TILE_SIZE + 6 && edge > px && edge - px <= 20)
					return { index: j, deep: edge - px >= obj.pX >> 1 && obj.vx > 0 };
			} else if (side == Direction.DOWN) {
				const edge = y + obj.pY;
				if (x >= px - 4 && x + obj.pX < px + 2 * TILE_SIZE + 4 && edge >= py && edge - py <= 20)
					return { index: j, deep: edge - py >= 16 && obj.vy > 0 };
			} else if (side == Direction.UP) {
				const ty = py + 4;
				const edge = y - 1;
				if (x >= px - 4 && x + obj.pX < px + 2 * TILE_SIZE + 4 && edge < ty && ty - edge <= 20)
					return { index: j, deep: ty - edge >= 16 && obj.vy < 0 };
			}
		}
		return null;
	}

	/**
	 * Check if an object touches a portal on one side. The method does not change the object.
	 *
	 * @param {import('./Body.js').Body} obj The object. It must also have the speeds vx and vy.
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {Portal|null} The portal, or null if the object touches no portal on this side.
	 */
	portalAt(obj, side) {
		const found = this.#findPortal(obj, side);
		return found ? this.list[found.index] : null;
	}

	/**
	 * Check if an object touches a portal. The method does not change the object.
	 *
	 * @param {import('./Body.js').Body} obj The object. It must also have the speeds vx and vy.
	 * @returns {Portal|null} The portal, or null if the object touches no portal.
	 */
	isInPortal(obj) {
		for (const side of PORTAL_CHECK_SIDES) {
			const p = this.portalAt(obj, side);
			if (p) return p;
		}
		return null;
	}

	/**
	 * Move an object through a portal on one side. An object in the portal moves to the middle of the portal. The object
	 * teleports to the other portal when it moves into the portal far enough.
	 *
	 * @param {import('./Body.js').Body} obj The object. It must also have the speeds vx and vy.
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {Portal|null} The portal, or null if the object touches no portal on this side.
	 */
	passPortal(obj, side) {
		const found = this.#findPortal(obj, side);
		if (!found) return null;
		const portal = this.list[found.index];
		obj.alignToPortal(portal, side);
		if (found.deep) this.#teleport(portal, this.list[1 - found.index], obj);
		return portal;
	}

	/**
	 * Move an object through a portal on any side.
	 *
	 * @param {import('./Body.js').Body} obj The object. It must also have the speeds vx and vy.
	 * @returns {Portal|null} The portal, or null if the object touches no portal.
	 */
	passPortals(obj) {
		for (const side of PORTAL_CHECK_SIDES) {
			const p = this.passPortal(obj, side);
			if (p) return p;
		}
		return null;
	}

	/**
	 * Move an object from one portal to the other. The object then turns its speed to the direction of the exit portal.
	 *
	 * @param {Portal} entry The portal that the object enters.
	 * @param {Portal} exit The other portal.
	 * @param {import('./Body.js').Body} obj The object.
	 * @returns {void}
	 */
	#teleport(entry, exit, obj) {
		let gap;

		playSound(sfx_enterPortal);

		if (exit.direction == Direction.RIGHT || exit.direction == Direction.LEFT) {
			gap = (2 * TILE_SIZE - obj.pY) >> 1;
			obj.x = exit.x - ((obj.pX >> 1) << 8);
			obj.y = exit.y + (gap << 8);
		} else if (exit.direction == Direction.UP) {
			obj.x = exit.x + ((TILE_SIZE / 2) << 8);
			obj.y = exit.y - ((obj.pY >> 1) << 8) + (4 << 8);
		} else if (exit.direction == Direction.DOWN) {
			obj.x = exit.x + ((TILE_SIZE / 2) << 8);
			obj.y = exit.y - ((obj.pY >> 1) << 8);
		}

		obj.teleported(entry, exit);
	}

	/**
	 * Remove the portals when the player enters a force field.
	 *
	 * @returns {void}
	 */
	clearPortalsAtForceField() {
		if (this.world.player.inForceField()) this.#removePortals();
	}

	/**
	 * Remove both portals with the cancel sound, if a portal is placed.
	 *
	 * @returns {void}
	 */
	#removePortals() {
		if (!this.list[0].used && !this.list[1].used) return;
		for (let i = 0; i < 2; i++) {
			this.list[i].used = false;
			removeSparkles(this.world, i, SparkleType.PORTAL_GLOW);
		}
		playSound(sfx_cancelPortals);
	}

	/**
	 * Remove both portals, unless an object is in a portal.
	 *
	 * @returns {void}
	 */
	clearPortals() {
		let ok = 1;
		let i;
		for (i = 0; i < this.world.crates.length; i++) {
			if (!ok) break;
			if (this.world.crates[i].shrink == 0 && this.isInPortal(this.world.crates[i])) ok = 0;
		}

		if (ok) {
			for (i = 0; i < this.world.turrets.length; i++) {
				if (!this.world.turrets[i].dead && this.isInPortal(this.world.turrets[i])) ok = 0;
			}
		}

		if (ok && this.world.plasmaBall.length > 0 && this.isInPortal(this.world.plasmaBall[0])) ok = 0;

		if (ok && this.isInPortal(this.world.player)) ok = 0;

		if (ok) this.#removePortals();
	}

	/**
	 * Find the portal at a point.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Portal|null} The portal, or null if no portal is there.
	 */
	pointInPortal(x, y) {
		let i;
		for (i = 0; i < this.list.length; i++) {
			const xp = this.list[i].x >> 8;
			const yp = this.list[i].y >> 8;

			if (this.list[i].direction == Direction.LEFT || this.list[i].direction == Direction.RIGHT) {
				if (x >= xp && x <= xp + 3 && y >= yp && y <= yp + 2 * TILE_SIZE) {
					return this.list[i];
				}
			} else if (this.list[i].direction == Direction.UP || this.list[i].direction == Direction.DOWN) {
				if (x >= xp && x <= xp + 2 * TILE_SIZE && y >= yp && y <= yp + 3) {
					return this.list[i];
				}
			}
		}
		return null;
	}

	/**
	 * Get the other portal of the pair.
	 *
	 * @param {Portal} portal One of the two portals.
	 * @returns {Portal} The other portal.
	 */
	other(portal) {
		return portal == this.list[0] ? this.list[1] : this.list[0];
	}

	/**
	 * Advance the opening animation of the placed portals and move them with their platforms.
	 *
	 * @returns {void}
	 */
	update() {
		for (const p of this.list) {
			if (!p.used) continue;
			p.animate();
			p.move();
		}
	}
}
