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

/** @type {Object<string, number>} The portal directions of the level file and their Direction values. */
const PORTAL_DIRECTIONS = {
	up: Direction.UP,
	down: Direction.DOWN,
	left: Direction.LEFT,
	right: Direction.RIGHT,
};

/** @type {boolean[]} True for each event of the level that fired. */
let fired = [];

/** @type {import('./mapFile.js').MapEvent|null} The event that waits for a click, or null. */
let waiting = null;

/** @type {Set<string>} The triggers without a condition that happened in the level: start, bossArrived and bossDied. */
let triggers = new Set();

/** @type {boolean} True if the waits end at once and their texts do not show: in a replay and after a restart. */
let skipWaits = false;

/**
 * Check if the boss ends the wait of an event. The boss ends the wait of its death speech by its own rules.
 *
 * @param {import('./mapFile.js').MapEvent} event The event.
 * @returns {boolean} True for the event of the death of the boss.
 */
function isBossWait(event) {
	return event.on == 'bossDied';
}

/**
 * Start the events of the level in game.events and fire the start events.
 *
 * In a replay and after a restart of the level, the waits end at once and their texts do not show. The wait of the
 * death of the boss is not skipped.
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
 * @param {string} trigger The trigger: "bossArrived" or "bossDied".
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
 * A click ends the wait only while the level time stands still, so not during the transition at the level start. The
 * caller does not call this function at the level end.
 *
 * @returns {void}
 */
export function updateEvents() {
	if (waiting !== null && !isBossWait(waiting) && game.player.fadeNextLevel == 0 && input.mouseNewPress) {
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
	if (event.on == 'playerX') return game.player.x >> 8 > event.x;
	if (event.on == 'time') return game.time >= event.ticks;
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
	if (event.wait && skipWaits && !isBossWait(event)) return;
	if (event.text !== undefined) {
		const text = event.text.replace(/\{(Key[WASDE])\}/g, (_, code) => keyLabels[code]);
		game.message = text ? { text, wait: Boolean(event.wait), portrait: game.bossNum } : null;
	}
	if (!event.wait) return;
	waiting = event;
	// the level time stops in this tick; the boss stops it after its death itself
	if (!isBossWait(event) && game.player.fadeNextLevel == -1) game.player.fadeNextLevel = 0;
}

/**
 * Place a portal on a wall with its glow sparkles.
 *
 * @param {number} p The index of the portal.
 * @param {[number, number, string]} portal The position in pixels and the direction of the portal.
 * @returns {void}
 */
function placePortal(p, [x, y, name]) {
	const portal = game.portals[p];
	const direction = PORTAL_DIRECTIONS[name];
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
