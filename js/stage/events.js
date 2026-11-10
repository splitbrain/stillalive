/**
 * The events of a level: the triggers, the message, the wait for a click, the abilities and the placed portals.
 *
 * The events come from the level file. The events are shared with the campaign data, so the state of the events is
 * kept in this module and not in the event objects.
 */

import { Direction, SparkleType } from './constants.js';
import { Sparkle, removeSparkles } from './entities/Sparkle.js';
import { unclick } from './inputState.js';
import { keyLabels } from './keys.js';
import { game, input } from './state.js';
import { random } from './utils.js';

/**
 * The sides that a portal of the level file opens to, with the Direction of the portal and the pixel offset of the
 * portal in its wall tile. The offsets are the same as for a shot portal.
 *
 * @type {Object<string, {direction: number, dx: number, dy: number}>}
 */
const PORTAL_SIDES = {
	up: { direction: Direction.DOWN, dx: 0, dy: 0 },
	down: { direction: Direction.UP, dx: 0, dy: 12 },
	left: { direction: Direction.RIGHT, dx: 0, dy: 0 },
	right: { direction: Direction.LEFT, dx: 12, dy: 0 },
};

/** @type {boolean[]} True for each event of the level that fired. */
let fired = [];

/** @type {import('./mapFile.js').MapEvent|null} The event that waits for a click, or null. */
let waiting = null;

/** @type {Set<string>} The triggers without a condition that happened: start, bossArrived, bossDied and exit. */
let triggers = new Set();

/** @type {boolean} True if the waits end at once and their texts do not show: in a replay and after a restart. */
let skipWaits = false;

/**
 * Start the events of the level in game.events and fire the start events.
 *
 * In a replay and after a restart of the level, the waits end at once and their texts do not show.
 *
 * @param {boolean} [restart] True for a restart of the same level, for example after a death.
 * @returns {void}
 */
export function startEvents(restart = false) {
	fired = game.events.map(() => false);
	waiting = null;
	triggers = new Set(['start']);
	skipWaits = restart || game.replayMode;
	game.message = null;
	runEvents();
}

/**
 * Note a trigger without a condition. The events of the trigger fire in the next call of updateEvents().
 *
 * @param {string} trigger The trigger: "bossArrived", "bossDied" or "exit".
 * @returns {void}
 */
export function triggerEvents(trigger) {
	triggers.add(trigger);
}

/**
 * Check if an event waits for a click. The level time stops during the wait.
 *
 * @returns {boolean} True during a wait.
 */
export function isWaiting() {
	return waiting !== null;
}

/**
 * End the current wait and remove its message.
 *
 * @returns {void}
 */
export function endWait() {
	if (waiting === null) return;
	waiting = null;
	game.message = null;
}

/**
 * Run the events for one tick of the level: end the wait after a click, then fire the events whose trigger happened.
 *
 * A click ends the wait only while the level time stands still, so not during the transition at the level start. At
 * the level end, the caller calls this function only until the closing transition starts.
 *
 * @returns {void}
 */
export function updateEvents() {
	if (waiting !== null && game.player.fadeNextLevel == 0 && input.mouseNewPress) {
		endWait();
		unclick();
	}
	runEvents();
}

/**
 * Fire the events whose trigger happened, in the order of the list. An event that waits for a click stops the list
 * until the wait ends.
 *
 * @returns {void}
 */
function runEvents() {
	for (let i = 0; i < game.events.length && waiting === null; i++) {
		const event = game.events[i];
		if (!fired[i] && hasHappened(event)) {
			fired[i] = true;
			fire(event);
		}
		if (event.wait && !fired[i]) return;
	}
}

/**
 * Check if the trigger of an event happened.
 *
 * @param {import('./mapFile.js').MapEvent} event The event.
 * @returns {boolean} True if the event can fire.
 */
function hasHappened(event) {
	if (event.on == 'playerX') return game.player.midX() >> 4 >= event.x;
	if (event.on == 'time') return game.time >= Math.round(event.seconds * 60);
	return triggers.has(event.on);
}

/**
 * Run the actions of an event: the abilities, the portals, the message and the wait.
 *
 * @param {import('./mapFile.js').MapEvent} event The event.
 * @returns {void}
 */
function fire(event) {
	if (event.unlock) game.abilities[event.unlock] = true;
	if (event.portals) event.portals.forEach((portal, p) => placePortal(p, portal));
	if (event.wait && skipWaits) return;
	if (event.text !== undefined) {
		const text = event.text.replace(/\{(Key[WASDE])\}/g, (_, code) => keyLabels.get()[code]);
		game.message = text ? { text, wait: Boolean(event.wait), portrait: game.bossNum } : null;
	}
	if (!event.wait) return;
	waiting = event;
	// the level time stops in this tick
	if (game.player.fadeNextLevel == -1) game.player.fadeNextLevel = 0;
}

/**
 * Place a portal on a wall with its glow sparkles.
 *
 * @param {number} p The index of the portal.
 * @param {[number, number, string]} portal The column and row of the wall tile, and the side that the portal opens to.
 * @returns {void}
 */
function placePortal(p, [column, row, side]) {
	const portal = game.portals[p];
	const { direction, dx, dy } = PORTAL_SIDES[side];
	const x = column * 16 + dx;
	const y = row * 16 + dy;
	const onSideWall = direction == Direction.LEFT || direction == Direction.RIGHT;
	Object.assign(portal, {
		direction,
		frame: onSideWall ? 1 : 0,
		platformIndex: -1,
		scaleX: 1,
		scaleY: 1,
		used: true,
		x: x << 8,
		y: y << 8,
	});

	removeSparkles(p, SparkleType.PORTAL_GLOW);
	for (let i = 0; i < 13; i++) {
		const s = new Sparkle();
		s.x = portal.x + (onSideWall ? 0 : (i * 2) << 8);
		s.y = portal.y + (onSideWall ? (i * 2) << 8 : 0);
		s.xOrig = s.x;
		s.yOrig = s.y;
		s.portalNum = p;
		s.type = SparkleType.PORTAL_GLOW;
		s.vx = 0;
		s.vy = 0;
		if (direction == Direction.RIGHT) {
			s.vx = -random(128, 384);
			s.xOrig -= 7 << 8;
		} else if (direction == Direction.LEFT) {
			s.vx = random(128, 384);
		} else if (direction == Direction.DOWN) {
			s.vy = -random(128, 384);
			s.yOrig -= 8 << 8;
		} else {
			s.vy = random(128, 384);
		}
		s.fading = 200;
		s.color = p;
		game.sparkles.push(s);
	}
}
