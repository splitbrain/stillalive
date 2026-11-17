/**
 * The events of a level and the message of the narrator.
 */

import { Direction, DIRECTIONS, TILE_SIZE, TILE_SIZE_BITS } from '../constants.js';
import { keyLabels } from '../browser/keys.js';
import { toSubpixels } from '../utils.js';

/**
 * The sides that a portal of the level file opens to, with the Direction of the portal and the pixel offset of the
 * portal in its wall tile. The offsets are the same as for a shot portal.
 *
 * @type {Object<string, {direction: number, dx: number, dy: number}>}
 */
const PORTAL_PLACEMENTS = {
	up: { direction: Direction.DOWN, dx: 0, dy: 0 },
	down: { direction: Direction.UP, dx: 0, dy: 12 },
	left: { direction: Direction.RIGHT, dx: 0, dy: 0 },
	right: { direction: Direction.LEFT, dx: 12, dy: 0 },
};

/**
 * The events of one level and their state. Each level start creates a new object.
 */
export class LevelEvents {
	/**
	 * @type {{text: string, wait: boolean, portrait: number}|null} The message of the narrator, or null. The property
	 *     wait is true while the message waits for a click. The portrait is 0 for the robot or the number of the boss.
	 *     Each event creates a new object.
	 */
	message = null;

	/** @type {import('../map/mapFile.js').MapEvent[]} The events of the level file, in their order. */
	#list;

	/** @type {boolean[]} True for each event of the list that fired. */
	#fired;

	/** @type {import('../map/mapFile.js').MapEvent|null} The event that waits for a click, or null. */
	#waiting = null;

	/** @type {Set<string>} The triggers without a condition that happened: start, bossArrived, bossDied and exit. */
	#triggers = new Set(['start']);

	/** @type {boolean} True if the waits end at once and their texts do not show. */
	#skipWaits;

	/** @type {import('./World.js').World} The World of the level. */
	#world;

	/**
	 * Create the state of the events of a level. The start events fire in the first call of update().
	 *
	 * @param {import('./World.js').World} world The World of the level.
	 * @param {import('../map/mapFile.js').MapEvent[]} list The events of the level file. The list is shared with the
	 *     campaign data and does not change.
	 * @param {boolean} skipWaits True if the waits end at once and their texts do not show, for example in a replay
	 *     and after a restart of the level.
	 */
	constructor(world, list, skipWaits) {
		this.#world = world;
		this.#list = list;
		this.#fired = list.map(() => false);
		this.#skipWaits = skipWaits;
	}

	/**
	 * Note a trigger without a condition. The events of the trigger fire in the next call of update().
	 *
	 * @param {string} trigger The trigger: "bossArrived", "bossDied" or "exit".
	 * @returns {void}
	 */
	trigger(trigger) {
		this.#triggers.add(trigger);
	}

	/**
	 * Check if an event waits for a click. The level time stops during the wait.
	 *
	 * @returns {boolean} True during a wait.
	 */
	isWaiting() {
		return this.#waiting !== null;
	}

	/**
	 * Run the events for one tick of the level. A click ends the current wait before the events fire.
	 *
	 * A click ends the wait only while the level time stands still. During the transition at the level start, a click
	 * has no effect.
	 *
	 * @returns {void}
	 */
	update() {
		const input = this.#world.input;
		if (
			this.#waiting !== null &&
			(this.#world.phase.isHalted() || this.#world.phase.isExitWait()) &&
			input.mouseNewPress
		) {
			this.#endWait();
			input.unclick();
		}
		this.#run();
	}

	/**
	 * End the current wait and remove its message.
	 *
	 * @returns {void}
	 */
	#endWait() {
		if (this.#waiting === null) return;
		this.#waiting = null;
		this.message = null;
	}

	/**
	 * Fire the events whose trigger happened, in the order of the list. An event with a wait stops the list until the
	 * event fires and its wait ends.
	 *
	 * @returns {void}
	 */
	#run() {
		for (const [i, event] of this.#list.entries()) {
			if (this.#waiting !== null) return;
			if (!this.#fired[i] && this.#hasHappened(event)) {
				this.#fired[i] = true;
				this.#fire(event);
			}
			if (event.wait && !this.#fired[i]) return;
		}
	}

	/**
	 * Check if the trigger of an event happened.
	 *
	 * @param {import('../map/mapFile.js').MapEvent} event The event.
	 * @returns {boolean} True if the event can fire.
	 */
	#hasHappened(event) {
		if (event.on === 'playerX') return this.#world.player.midX() >> TILE_SIZE_BITS >= event.x;
		if (event.on === 'time') return this.#world.time >= Math.round(event.seconds * 60);
		return this.#triggers.has(event.on);
	}

	/**
	 * Run the actions of an event: the abilities, the portals, the message and the wait.
	 *
	 * @param {import('../map/mapFile.js').MapEvent} event The event.
	 * @returns {void}
	 */
	#fire(event) {
		if (event.unlock) this.#world.abilities[event.unlock] = true;
		if (event.portals) event.portals.forEach((portal, index) => placePortal(this.#world, index, portal));
		if (event.wait && this.#skipWaits) return;
		if (event.text !== undefined) {
			const text = event.text.replace(/\{(Key[WASDE])\}/g, (_, code) => keyLabels.get()[code]);
			this.message = text ? { text, wait: Boolean(event.wait), portrait: this.#world.boss?.number ?? 0 } : null;
		}
		if (!event.wait) return;
		this.#waiting = event;
		// stop the level time from the next tick on
		if (this.#world.phase.isRunning()) this.#world.phase.halt();
	}
}

/**
 * Place a portal on a wall with its glow sparkles.
 *
 * @param {import('./World.js').World} world The World of the level.
 * @param {number} index The index of the portal.
 * @param {[number, number, string]} portal The column and row of the wall tile, and the side that the portal opens to.
 * @returns {void}
 */
function placePortal(world, index, [column, row, side]) {
	const portal = world.portals.list[index];
	const { direction, dx, dy } = PORTAL_PLACEMENTS[side];
	const x = column * TILE_SIZE + dx;
	const y = row * TILE_SIZE + dy;
	const onSideWall = DIRECTIONS[direction].horizontal;
	Object.assign(portal, {
		direction,
		frame: onSideWall ? 1 : 0,
		platform: null,
		scaleX: 1,
		scaleY: 1,
		used: true,
		x: toSubpixels(x),
		y: toSubpixels(y),
	});

	world.createPortalGlow(index);
}
