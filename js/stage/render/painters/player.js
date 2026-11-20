/**
 * The PlayerPainter object.
 */

import { ctx, drawImage } from '../../browser/canvas.js';
import { TILE_SIZE } from '../../constants.js';
import { head, playerBody, portalGun } from '../../browser/images.js';
import { mirrorAround } from '../shapes.js';
import { degToRad, getAngle, radToDeg } from '../../utils.js';

/**
 * @type {number[]} The vertical offset of the head for each frame of the body, in canvas pixels. The head follows the
 *     collar, which is higher in the frames where one leg passes the other.
 */
const HEAD_BOB = [0, 0, -0.21, 0, -0.21];

/** @type {number[]} The point of the head image that the head turns around, the neck, in canvas pixels. */
const HEAD_PIVOT = [7, 11];

/**
 * The pose of the player. In the aim pose, the gun and the head follow the mouse position of the last tick. In the
 * still pose, the gun points right and the head is straight. The start pose has no gun and shows the standing figure
 * that faces right.
 *
 * @typedef {{pose: 'aim'}|{pose: 'still'}|{pose: 'start'}} PlayerPose
 */

/**
 * Limit the angle of the head of the player, so the head does not turn too far up or down.
 *
 * @param {number} angle The angle from the neck to the mouse in degrees.
 * @param {boolean} facingLeft True when the player faces left.
 * @returns {number} The angle of the head in degrees. Facing left, the angle is turned by 180 degrees.
 */
function limitHeadAngle(angle, facingLeft) {
	if (!facingLeft) return Math.min(Math.max(angle, -23), 15);
	const turned = angle - 180;
	return turned >= -360 && turned <= -270 ? Math.min(turned, -334) : Math.max(turned, -15);
}

/**
 * The painter of the player in one pose.
 */
export class PlayerPainter {
	/** @type {PlayerPose} The pose. */
	#pose;

	/**
	 * Create the painter of the player.
	 *
	 * @param {PlayerPose} pose The pose.
	 */
	constructor(pose) {
		this.#pose = pose;
	}

	/**
	 * Draw the player of a World in the pose of the painter.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		const pose = this.#pose;
		const player = world.player;
		switch (pose.pose) {
			case 'aim':
				this.#drawAim(world, getAngle(player.midX(), player.midY(), world.input.mouseX, world.input.mouseY));
				break;
			case 'still':
				this.#drawStill(player);
				break;
			case 'start':
				this.#drawStart(player.pixelX, player.pixelY);
				break;
		}
	}

	/**
	 * Draw the player in the start pose as the brush of the editor.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @returns {void}
	 */
	drawBrush(x, y) {
		this.#drawStart(x, y);
	}

	/**
	 * Draw the player in the start pose.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @returns {void}
	 */
	#drawStart(x, y) {
		this.#drawFigure(x, y, 1, 0);
	}

	/**
	 * Draw the player figure with the head straight. The figure faces right. For the left direction, the figure is
	 * mirrored.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @param {number} facing The direction, -1 left, else right.
	 * @param {number} frame The frame of the body: 0 for the standing figure, 1 to 4 for the walk cycle.
	 * @returns {void}
	 */
	#drawFigure(x, y, facing, frame) {
		ctx.save();
		if (facing < 0) mirrorAround(x + TILE_SIZE / 2);
		drawImage(head, x, y + HEAD_BOB[frame], 16, 14);
		ctx.restore();
		this.#drawBody(x, y, facing, frame);
	}

	/**
	 * Draw the player with the portal gun and the head turned towards the mouse. The gun shows only when the player
	 * can shoot portals.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @param {number} angle The angle from the middle of the player to the mouse in radians.
	 * @returns {void}
	 */
	#drawAim(world, angle) {
		const player = world.player;
		const facingLeft = player.facing < 0;
		if (!facingLeft && world.abilities.portals) this.#drawGun(player, angle);
		this.#drawRotatedHead(player, angle, facingLeft);
		this.#drawBody(player.pixelX, player.pixelY, player.facing, player.frame);
		if (facingLeft && world.abilities.portals) this.#drawGun(player, angle);
	}

	/**
	 * Draw the player with the portal gun pointing right and the head straight.
	 *
	 * @param {import('../../bodies/Player.js').Player} player The player.
	 * @returns {void}
	 */
	#drawStill(player) {
		this.#drawGun(player, 0);
		this.#drawFigure(player.pixelX, player.pixelY, player.facing, player.frame);
	}

	/**
	 * Draw the portal gun of the player.
	 *
	 * @param {import('../../bodies/Player.js').Player} player The player.
	 * @param {number} angle The angle of the gun in radians, 0 for right.
	 * @returns {void}
	 */
	#drawGun(player, angle) {
		ctx.save();
		ctx.translate(player.midX(), player.midY());
		ctx.rotate(angle);
		drawImage(portalGun, -5, -5);
		ctx.restore();
	}

	/**
	 * Draw the head of the player, turned towards the mouse within the limits of the neck.
	 *
	 * @param {import('../../bodies/Player.js').Player} player The player.
	 * @param {number} angle The angle from the middle of the player to the mouse in radians.
	 * @param {boolean} facingLeft True when the player faces left.
	 * @returns {void}
	 */
	#drawRotatedHead(player, angle, facingLeft) {
		ctx.save();
		// facing left, the head image is mirrored around the pivot, so the pivot sits at the mirrored x of the neck
		const [pivotX, pivotY] = HEAD_PIVOT;
		ctx.translate(player.pixelX + (facingLeft ? 16 - pivotX : pivotX), player.pixelY + pivotY + HEAD_BOB[player.frame]);
		ctx.rotate(degToRad(limitHeadAngle(radToDeg(angle), facingLeft)));
		if (facingLeft) ctx.scale(-1, 1);
		drawImage(head, -pivotX, -pivotY, 16, 14);
		ctx.restore();
	}

	/**
	 * Draw a frame of the body of the player. The image faces right. For the left direction, the image is mirrored.
	 *
	 * @param {number} x The x coordinate in canvas pixels.
	 * @param {number} y The y coordinate in canvas pixels.
	 * @param {number} facing The direction, -1 left, else right.
	 * @param {number} frame The frame: 0 for the standing figure, 1 to 4 for the walk cycle.
	 * @returns {void}
	 */
	#drawBody(x, y, facing, frame) {
		ctx.save();
		if (facing < 0) mirrorAround(x + TILE_SIZE / 2);
		drawImage(playerBody, frame * TILE_SIZE, 0, TILE_SIZE, 27, x, y, TILE_SIZE, 27);
		ctx.restore();
	}
}
