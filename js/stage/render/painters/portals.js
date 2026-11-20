/**
 * The painters of the portals.
 */

import { drawImage } from '../../browser/canvas.js';
import { DIRECTIONS, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, TILE_SIZE_BITS } from '../../constants.js';
import { bluePortal, redPortal, tileset } from '../../browser/images.js';
import { toPixels } from '../../utils.js';

/**
 * The painter of the two portals.
 */
export class PortalPainter {
	/**
	 * Draw the portals with their opening animation.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		for (const [index, portal] of world.portals.list.entries()) {
			if (!portal.used) continue;
			// an opening portal grows from its middle
			const onSideWall = DIRECTIONS[portal.direction].horizontal;
			const dx = onSideWall ? 0 : TILE_SIZE - portal.scaleX * TILE_SIZE;
			const dy = onSideWall ? TILE_SIZE - portal.scaleY * TILE_SIZE : 0;
			drawImage(
				index === 0 ? bluePortal : redPortal,
				0,
				2 * TILE_SIZE * portal.frame,
				2 * TILE_SIZE,
				2 * TILE_SIZE,
				toPixels(portal.x) + dx,
				toPixels(portal.y) + dy,
				2 * TILE_SIZE * portal.scaleX,
				2 * TILE_SIZE * portal.scaleY,
			);
		}
	}
}

/**
 * The painter of the tiles around the portals that cover a body in a portal.
 */
export class FrontTilePainter {
	/**
	 * Draw the tiles around the portals over the bodies that are half in a portal.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		if (!world.bodyInPortal) return;
		for (const portal of world.portals.list) {
			if (portal.platform) continue;
			const onFloor = !DIRECTIONS[portal.direction].horizontal;
			const tx = toPixels(portal.x) >> TILE_SIZE_BITS;
			const ty = toPixels(portal.y) >> TILE_SIZE_BITS;
			for (let i = 0; i < 4; i++) {
				const column = onFloor ? tx + i : tx;
				const row = onFloor ? ty : ty + i;
				if (column < 0 || column >= MAP_WIDTH || row < 0 || row >= MAP_HEIGHT) continue;
				const image = tileset[world.map.display[world.map.index(column, row)]];
				if (image) drawImage(image, column * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
			}
		}
	}
}
