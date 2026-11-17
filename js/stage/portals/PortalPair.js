/**
 * The PortalPair object.
 */

import { playSound, sfx_cancelPortals, sfx_enterPortal, sfx_noPortal, sfx_portal } from '../browser/audio.js';
import { Direction, DIRECTIONS, TILE_SIZE } from '../constants.js';
import { Crate } from '../bodies/Crate.js';
import { Platform } from '../bodies/Platform.js';
import { Portal } from './Portal.js';
import { PortalGlow, PortalShotSparkle } from '../effects/sparkles.js';
import { isTileKind, Tile, TileKind } from '../map/tiles.js';
import { getCos, getSin, inScreen, random, toPixels, toSubpixels } from '../utils.js';

/** @type {number[]} The sides of the walls with portals, in the order of the portal checks. */
const PORTAL_CHECK_SIDES = [Direction.DOWN, Direction.UP, Direction.LEFT, Direction.RIGHT];

/**
 * The two portals of a level, the portal shots and the teleport of bodies through the portals.
 */
export class PortalPair {
	/**
	 * Create the two portals. The portals are not placed.
	 *
	 * @param {import('../world/World.js').World} world The World of the portals.
	 */
	constructor(world) {
		/** @type {import('../world/World.js').World} The World of the portals. */
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
	 * @param {number} index The portal index, 0 for blue and 1 for red.
	 * @param {number} targetX The x coordinate of the target point in playfield units, e.g. the mouse position.
	 * @param {number} targetY The y coordinate of the target point in playfield units.
	 * @returns {void}
	 */
	launchPortal(index, targetX, targetY) {
		const portal = this.list[index];
		this.world.player.portalCooldown = 0;

		let x = this.world.player.x + toSubpixels(this.world.player.width >> 1);
		let y = this.world.player.y + toSubpixels(this.world.player.height >> 1);

		// a click on the start point gives no direction
		const startX = toPixels(x);
		const startY = toPixels(y);
		if (targetX === startX && targetY === startY) {
			playSound(sfx_noPortal);
			return;
		}

		// the shot moves one pixel in each step
		portal.vx = getCos(targetX, targetY, startX, startY) * 256;
		portal.vy = getSin(targetX, targetY, startX, startY) * 256;

		this.world.effects.removeSparkles(PortalShotSparkle, index);

		let steps = 0;
		let bounces = 0;
		let tile;
		let inScreenOK;
		do {
			steps++;
			x += portal.vx;
			y += portal.vy;
			const pixelX = toPixels(x);
			const pixelY = toPixels(y);
			tile = this.world.getTilePortal(pixelX, pixelY);

			if (tile === Tile.ICYWALL) {
				const up = this.world.getTilePortal(pixelX, pixelY - 1);
				const down = this.world.getTilePortal(pixelX, pixelY + 1);
				const left = this.world.getTilePortal(pixelX - 1, pixelY);
				const right = this.world.getTilePortal(pixelX + 1, pixelY);
				if ((!down || !up) && left && right) {
					portal.vy = -portal.vy;
				} else if ((!left || !right) && up && down) {
					portal.vx = -portal.vx;
				}
				tile = 0;
				bounces++;
			}

			if (steps > 15 && steps % 6 === 1) {
				const sparkle = new PortalShotSparkle(
					this.world,
					x + random(toSubpixels(-5), toSubpixels(5)) - toSubpixels(8),
					y + random(toSubpixels(-5), toSubpixels(5)) - toSubpixels(8),
					random(96, 192),
					random(96, 192),
					255,
					index,
				);
				if (random(0, 2) === 0) sparkle.vx = -sparkle.vx;
				if (random(0, 2) === 0) sparkle.vy = -sparkle.vy;
				this.world.effects.addSparkle(sparkle);
			}
			// a shot above the playfield continues if it flies down
			inScreenOK = inScreen(pixelX, pixelY) || (pixelY < 0 && portal.vy > 0);
		} while (tile === Tile.EMPTY && inScreenOK && bounces < 5);

		if (isTileKind(tile, TileKind.WALL) || tile instanceof Platform) {
			if (this.#placePortal(index, toPixels(x), toPixels(y))) {
				if (DIRECTIONS[portal.direction].horizontal) {
					portal.scaleX = 1;
					portal.scaleY = 0;
					portal.platform = null;
				} else {
					portal.scaleX = 0;
					portal.scaleY = 1;
					const hit = this.world.getTilePortal(toPixels(x), toPixels(y));
					portal.platform = hit instanceof Platform ? hit : null;
				}
				playSound(sfx_portal[random(0, 2)]);
				this.world.portalShots++;
			} else playSound(sfx_noPortal);
		} else playSound(sfx_noPortal);
	}

	/**
	 * Check if all points are on a wall or a platform that can hold a portal.
	 *
	 * @param {number[][]} points The points in pixels, each as [x, y].
	 * @returns {boolean} True if each point is a wall tile or a platform.
	 */
	#allWall(points) {
		return points.every(([x, y]) => {
			const tile = this.world.getTilePortal(x, y);
			return isTileKind(tile, TileKind.WALL) || tile instanceof Platform;
		});
	}

	/**
	 * Count the points that something solid blocks. Crates do not count.
	 *
	 * @param {number[][]} points The points in pixels, each as [x, y].
	 * @returns {number} The number of blocked points.
	 */
	#countBlocked(points) {
		return points.filter(([x, y]) => {
			const tile = this.world.getTile(x, y);
			return tile !== Tile.EMPTY && !(tile instanceof Crate);
		}).length;
	}

	/**
	 * Place a portal on the wall at a point and set its direction.
	 *
	 * The wall must be straight along the portal, and the area in front of the portal must be nearly free. A side wall
	 * is checked first, then a floor or a ceiling.
	 *
	 * @param {number} index The portal index.
	 * @param {number} x The x coordinate of the hit in pixels.
	 * @param {number} y The y coordinate of the hit in pixels.
	 * @returns {boolean} True if the portal was placed.
	 */
	#placePortal(index, x, y) {
		const portal = this.list[index];
		// the offsets along the portal and across the area in front of it
		const along = Array.from({ length: 28 }, (_, i) => i - 14);
		const across = Array.from({ length: 2 * TILE_SIZE }, (_, i) => i - TILE_SIZE);

		if (this.#allWall(along.map((offset) => [x, y + offset]))) {
			const area = across.flatMap((offset) => [
				[x + offset, y - 14],
				[x + offset, y + 13],
			]);
			if (this.#countBlocked(area) > 36) return false;
			const left = portal.vx < 0;
			return this.#setPortal(index, left ? x - 3 : x, y - TILE_SIZE, left ? Direction.LEFT : Direction.RIGHT);
		}

		if (this.#allWall(along.map((offset) => [x + offset, y]))) {
			const area = across.flatMap((offset) => [
				[x - 14, y + offset],
				[x + 13, y + offset],
			]);
			if (this.#countBlocked(area) > 36) return false;
			const top = portal.vy < 0;
			return this.#setPortal(index, x - TILE_SIZE, top ? y - 3 : y, top ? Direction.UP : Direction.DOWN);
		}

		return false;
	}

	/**
	 * Set a portal to its place, unless it overlaps the other portal on the same wall.
	 *
	 * @param {number} index The portal index.
	 * @param {number} x The x coordinate of the portal in pixels.
	 * @param {number} y The y coordinate of the portal in pixels.
	 * @param {number} direction The direction of the portal, a value of Direction.
	 * @returns {boolean} True if the portal was placed.
	 */
	#setPortal(index, x, y, direction) {
		const portal = this.list[index];
		const other = this.list[1 - index];
		const onSideWall = DIRECTIONS[direction].horizontal;
		const [line, otherLine] = onSideWall ? [x, toPixels(other.x)] : [y, toPixels(other.y)];
		const [pos, otherPos] = onSideWall ? [y, toPixels(other.y)] : [x, toPixels(other.x)];
		if (other.used && line === otherLine && Math.abs(otherPos - pos) < 2 * TILE_SIZE) return false;

		portal.direction = direction;
		// the portal image has one frame for floors and ceilings and one frame for side walls
		portal.frame = onSideWall ? 1 : 0;
		portal.x = toSubpixels(x);
		portal.y = toSubpixels(y);
		portal.used = true;
		this.world.effects.createPortalGlow(index);
		return true;
	}

	/**
	 * Find the portal on one side that a body touches. The method does not change the body.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body. It must also have the speeds vx and vy.
	 * @param {number} side The side of the wall with the portal: Direction.LEFT, Direction.RIGHT, Direction.DOWN for a
	 *     floor or Direction.UP for a ceiling.
	 * @returns {{index: number, deep: boolean}|null} The index of the portal, and true in deep if the body moves into
	 *     the portal far enough for a teleport, or null if the body touches no portal on this side.
	 */
	#findPortal(body, side) {
		const x = body.pixelX;
		const y = body.pixelY;
		if (!body.canEnterPortal(side)) return null;

		for (const [index, portal] of this.list.entries()) {
			if (!portal.used || portal.direction !== side || !this.other(portal).used) continue;
			const px = toPixels(portal.x);
			const py = toPixels(portal.y);
			switch (side) {
				case Direction.LEFT: {
					const tx = px + 3;
					const edge = x - 1;
					if (y >= py - 6 && y + body.height <= py + 2 * TILE_SIZE + 6 && edge < tx && tx - edge <= 20) {
						return { index, deep: tx - edge >= body.width >> 1 && body.vx < 0 };
					}
					break;
				}
				case Direction.RIGHT: {
					const edge = x + body.width;
					if (y >= py - 6 && y + body.height <= py + 2 * TILE_SIZE + 6 && edge > px && edge - px <= 20) {
						return { index, deep: edge - px >= body.width >> 1 && body.vx > 0 };
					}
					break;
				}
				case Direction.DOWN: {
					const edge = y + body.height;
					if (x >= px - 4 && x + body.width < px + 2 * TILE_SIZE + 4 && edge >= py && edge - py <= 20) {
						return { index, deep: edge - py >= 16 && body.vy > 0 };
					}
					break;
				}
				case Direction.UP: {
					const ty = py + 4;
					const edge = y - 1;
					if (x >= px - 4 && x + body.width < px + 2 * TILE_SIZE + 4 && edge < ty && ty - edge <= 20) {
						return { index, deep: ty - edge >= 16 && body.vy < 0 };
					}
					break;
				}
			}
		}
		return null;
	}

	/**
	 * Check if a body touches a portal on one side. The method does not change the body.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body. It must also have the speeds vx and vy.
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {Portal|null} The portal, or null if the body touches no portal on this side.
	 */
	portalAt(body, side) {
		const found = this.#findPortal(body, side);
		return found ? this.list[found.index] : null;
	}

	/**
	 * Check if a body touches a portal. The method does not change the body.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body. It must also have the speeds vx and vy.
	 * @returns {Portal|null} The portal, or null if the body touches no portal.
	 */
	isInPortal(body) {
		for (const side of PORTAL_CHECK_SIDES) {
			const index = this.portalAt(body, side);
			if (index) return index;
		}
		return null;
	}

	/**
	 * Move a body through a portal on one side. A body in the portal moves to the middle of the portal. The body
	 * teleports to the other portal when it moves into the portal far enough.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body. It must also have the speeds vx and vy.
	 * @param {number} side The side of the wall with the portal, a value of Direction.
	 * @returns {Portal|null} The portal, or null if the body touches no portal on this side.
	 */
	passPortal(body, side) {
		const found = this.#findPortal(body, side);
		if (!found) return null;
		const portal = this.list[found.index];
		body.alignToPortal(portal, side);
		if (found.deep) this.#teleport(portal, this.list[1 - found.index], body);
		return portal;
	}

	/**
	 * Move a body through a portal on any side.
	 *
	 * @param {import('../bodies/Body.js').Body} body The body. It must also have the speeds vx and vy.
	 * @returns {Portal|null} The portal, or null if the body touches no portal.
	 */
	passPortals(body) {
		for (const side of PORTAL_CHECK_SIDES) {
			const index = this.passPortal(body, side);
			if (index) return index;
		}
		return null;
	}

	/**
	 * Move a body from one portal to the other. The body then turns its speed to the direction of the exit portal.
	 *
	 * @param {Portal} entry The portal that the body enters.
	 * @param {Portal} exit The other portal.
	 * @param {import('../bodies/Body.js').Body} body The body.
	 * @returns {void}
	 */
	#teleport(entry, exit, body) {
		playSound(sfx_enterPortal);

		if (DIRECTIONS[exit.direction].horizontal) {
			const gap = (2 * TILE_SIZE - body.height) >> 1;
			body.x = exit.x - toSubpixels(body.width >> 1);
			body.y = exit.y + toSubpixels(gap);
		} else {
			// a body that comes out of a ceiling starts 4 pixels lower
			const drop = exit.direction === Direction.UP ? toSubpixels(4) : 0;
			body.x = exit.x + toSubpixels(TILE_SIZE / 2);
			body.y = exit.y - toSubpixels(body.height >> 1) + drop;
		}

		body.teleported(entry, exit);
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
		for (const [i, portal] of this.list.entries()) {
			portal.used = false;
			this.world.effects.removeSparkles(PortalGlow, i);
		}
		playSound(sfx_cancelPortals);
	}

	/**
	 * Remove both portals, unless a body is in a portal.
	 *
	 * @returns {void}
	 */
	clearPortals() {
		const world = this.world;
		const bodies = [
			...world.crates.filter((crate) => crate.shrink === 0),
			...world.turrets.filter((turret) => !turret.dead),
			...world.plasmaBall.slice(0, 1),
			world.player,
		];
		if (!bodies.some((body) => this.isInPortal(body))) this.#removePortals();
	}

	/**
	 * Find the portal at a point.
	 *
	 * @param {number} x The x coordinate in pixels.
	 * @param {number} y The y coordinate in pixels.
	 * @returns {Portal|null} The portal, or null if no portal is there.
	 */
	pointInPortal(x, y) {
		return (
			this.list.find((portal) => {
				const xp = toPixels(portal.x);
				const yp = toPixels(portal.y);
				const [width, height] = DIRECTIONS[portal.direction].horizontal ? [3, 2 * TILE_SIZE] : [2 * TILE_SIZE, 3];
				return x >= xp && x <= xp + width && y >= yp && y <= yp + height;
			}) ?? null
		);
	}

	/**
	 * Get the other portal of the pair.
	 *
	 * @param {Portal} portal One of the two portals.
	 * @returns {Portal} The other portal.
	 */
	other(portal) {
		return portal === this.list[0] ? this.list[1] : this.list[0];
	}

	/**
	 * Advance the opening animation of the placed portals and move them with their platforms.
	 *
	 * @returns {void}
	 */
	update() {
		for (const index of this.list) {
			if (!index.used) continue;
			index.animate();
			index.move();
		}
	}
}
