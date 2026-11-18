/**
 * The map file format and its check. The campaign levels and the editor maps use the same format.
 */

import { BACKGROUND_COUNT, MAP_SIZE, NUM_TILES } from '../constants.js';
import { Tile, isBodyTile } from './tiles.js';

/** @type {number} The version of the map file format. */
export const MAP_FORMAT = 1;

/** @type {number} The number of bosses. */
const BOSS_COUNT = 4;

/** @type {string[]} The abilities of the player that a level can disable and an event can enable. */
const ABILITIES = ['jump', 'portals'];

/**
 * The triggers of the events, with the number properties that each trigger needs and the check of their type.
 *
 * @type {Object<string, Object<string, (value: any) => boolean>>}
 */
const EVENT_TRIGGERS = {
	start: {},
	playerX: { x: Number.isInteger },
	time: { seconds: Number.isFinite },
	bossArrived: {},
	bossDied: {},
	exit: {},
};

/** @type {string[]} The sides that a portal of an event opens to. */
const PORTAL_SIDES = ['up', 'down', 'left', 'right'];

/**
 * A map in the file format. A map file is this object as JSON.
 *
 * @typedef {object} MapFile
 * @property {number} [format] The version of the file format, always 1. The editor map of the stage has no format.
 * @property {number[]} tiles The 768 tile ids of the 32 x 24 tiles, row by row.
 * @property {number} bg The index of the background image.
 * @property {string} [title] The name of the level in the level selection.
 * @property {number} [boss] The boss of the level from 1 to 4. Only a boss level can contain the tube.
 * @property {string} [text] The message at the level start. It is the same as an event with the trigger "start" and
 *     this text, before the other events.
 * @property {{jump?: boolean, portals?: boolean}} [abilities] The abilities that the level disables at the level start.
 *     The key "jump" or "portals" with the value false disables the ability. All abilities are enabled by default.
 * @property {MapEvent[]} [events] The events of the level. An event fires once.
 * @property {MapLabel[]} [labels] The texts that show at positions of the playfield.
 */

/**
 * The data of a map file after the check.
 *
 * @typedef {object} MapData
 * @property {number[]} tiles The 768 tile ids.
 * @property {number} bg The background index.
 * @property {string} title The name of the level, or an empty text for none.
 * @property {number} boss The boss, or 0 for a level without a boss.
 * @property {{jump: boolean, portals: boolean}} abilities The abilities of the player at the level start.
 * @property {MapEvent[]} events The events of the level, with the text of the level as the first start event.
 * @property {MapLabel[]} labels The texts at positions of the playfield.
 */

/**
 * An event of a map.
 *
 * The trigger "start" fires when the level starts. "playerX" fires when the center of the player enters the column x
 * or a column to the right of it. "time" fires when the level time reaches the seconds. "bossArrived" fires when the
 * boss reached its place, and "bossDied" when the boss died after its third hit. "exit" fires when the player reached
 * the exit. The closing transition of the level clears the message, so the text of an exit event shows only with the
 * wait "click", which holds the transition until the click.
 *
 * @typedef {object} MapEvent
 * @property {string} on The trigger: "start", "playerX", "time", "bossArrived", "bossDied" or "exit".
 * @property {number} [x] The column for the trigger "playerX".
 * @property {number} [seconds] The level time in seconds for the trigger "time". The seconds can have decimals.
 * @property {string} [text] The new message. An empty text removes the message. The text can contain {KeyW}, {KeyA},
 *     {KeyS}, {KeyD} and {KeyE}. They stand for the label of that key on the keyboard of the player.
 * @property {string} [wait] "click" stops the level time until the player clicks. The click removes the message. The
 *     events after this event in the list fire only after the click.
 * @property {string} [unlock] The ability to enable, "jump" or "portals".
 * @property {Array<[number, number, string]>} [portals] The two portals to place, as [[column, row, side], [column,
 *     row, side]]. The column and row are the wall tile of the portal, and the side "up", "down", "left" or "right" is
 *     the side that the portal opens to. The portal covers this tile and the tile below, or the tile to the right for
 *     the sides "up" and "down".
 */

/**
 * A text at a position of the playfield.
 *
 * @typedef {object} MapLabel
 * @property {number} x The x position of the tile that the text is centered on, in whole or half tiles. For example,
 *     16.5 centers the text between two tiles.
 * @property {number} y The y position of the tile that the text is centered on, in whole or half tiles.
 * @property {string} text The text. A line break in the text starts a new line.
 */

/**
 * Check if a tile id is valid in a map.
 *
 * @param {*} tile The tile id.
 * @param {boolean} isBossLevel True for a boss level, which can contain the tube.
 * @returns {boolean} True for a tile id of the tile set, a body id from 100 to 111, or the tube 120 in a boss
 *     level.
 */
function isValidTile(tile, isBossLevel) {
	return (
		Number.isInteger(tile) &&
		((tile >= 0 && tile < NUM_TILES) || isBodyTile(tile) || (tile === Tile.TUBE && isBossLevel))
	);
}

/**
 * Check if a value is an object and not null or an array.
 *
 * @param {*} value The value.
 * @returns {boolean} True for an object.
 */
function isObject(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check the abilities of a map.
 *
 * @param {*} abilities The abilities, or undefined.
 * @returns {boolean} True for undefined or an object with known abilities and boolean values.
 */
function isValidAbilities(abilities) {
	return (
		abilities === undefined ||
		(isObject(abilities) &&
			Object.entries(abilities).every(([name, value]) => ABILITIES.includes(name) && typeof value === 'boolean'))
	);
}

/**
 * Check the portals that an event places.
 *
 * @param {*} portals The portals.
 * @returns {boolean} True for two portals, each with an integer column and row and a known side.
 */
function isValidPortals(portals) {
	return (
		Array.isArray(portals) &&
		portals.length === 2 &&
		portals.every(
			(portal) =>
				Array.isArray(portal) &&
				portal.length === 3 &&
				Number.isInteger(portal[0]) &&
				Number.isInteger(portal[1]) &&
				PORTAL_SIDES.includes(portal[2]),
		)
	);
}

/**
 * Check an event of a map.
 *
 * @param {*} event The event.
 * @returns {boolean} True for an event with a known trigger, the number properties of the trigger and valid actions.
 */
function isValidEvent(event) {
	return (
		isObject(event) &&
		typeof event.on === 'string' &&
		Object.hasOwn(EVENT_TRIGGERS, event.on) &&
		Object.entries(EVENT_TRIGGERS[event.on]).every(([name, isType]) => isType(event[name]) && event[name] >= 0) &&
		(event.text === undefined || typeof event.text === 'string') &&
		(event.wait === undefined || event.wait === 'click') &&
		(event.unlock === undefined || ABILITIES.includes(event.unlock)) &&
		(event.portals === undefined || isValidPortals(event.portals))
	);
}

/**
 * Check if a value is a position in whole or half tiles.
 *
 * @param {*} value The value.
 * @returns {boolean} True for a number that is a multiple of 0.5.
 */
function isHalfTile(value) {
	return typeof value === 'number' && Number.isInteger(value * 2);
}

/**
 * Check a label of a map.
 *
 * @param {*} label The label.
 * @returns {boolean} True for a label with an x and y in whole or half tiles and a text.
 */
function isValidLabel(label) {
	return isObject(label) && isHalfTile(label.x) && isHalfTile(label.y) && typeof label.text === 'string';
}

/**
 * Check the data of a map file.
 *
 * @param {*} data The parsed content of a map file.
 * @returns {MapData} The data of the map, with the defaults for the missing optional properties.
 * @throws {Error} If the data is not a valid map.
 */
export function parseMap(data) {
	const boss = data?.boss ?? 0;
	if (
		data?.format !== MAP_FORMAT ||
		!Number.isInteger(boss) ||
		boss < 0 ||
		boss > BOSS_COUNT ||
		!Array.isArray(data.tiles) ||
		data.tiles.length !== MAP_SIZE ||
		!data.tiles.every((tile) => isValidTile(tile, boss > 0)) ||
		!Number.isInteger(data.bg) ||
		data.bg < 0 ||
		data.bg >= BACKGROUND_COUNT ||
		!(data.title === undefined || typeof data.title === 'string') ||
		!(data.text === undefined || typeof data.text === 'string') ||
		!isValidAbilities(data.abilities) ||
		!(data.events === undefined || (Array.isArray(data.events) && data.events.every(isValidEvent))) ||
		!(data.labels === undefined || (Array.isArray(data.labels) && data.labels.every(isValidLabel)))
	) {
		throw new Error('This is not a valid Still Alive map file.');
	}
	return {
		tiles: data.tiles,
		bg: data.bg,
		title: data.title ?? '',
		boss,
		abilities: { jump: true, portals: true, ...data.abilities },
		events: [...(data.text ? [{ on: 'start', text: data.text }] : []), ...(data.events ?? [])],
		labels: data.labels ?? [],
	};
}
