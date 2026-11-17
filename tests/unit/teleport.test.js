import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Direction, MAP_HEIGHT, MAP_WIDTH } from '../../js/stage/constants.js';
import { Body } from '../../js/stage/bodies/Body.js';
import { traceGravPipeField } from '../../js/stage/bodies/GravPipe.js';
import { Plasma } from '../../js/stage/bodies/Plasma.js';
import { Portal } from '../../js/stage/portals/Portal.js';
import { Tile } from '../../js/stage/map/tiles.js';
import { at, floorTiles, startWorld } from './helpers.js';

/** @type {number[][]} The speeds [vx, vy] before a teleport, the same for each pair of portal directions. */
const SPEEDS = [
	[300, 500],
	[-200, -700],
	[50, 1500],
];

/**
 * @type {Object<string, number[][]>} The speeds [vx, vy] of a body after a teleport, one for each entry of SPEEDS, by
 *     the directions of the entry portal and the exit portal.
 */
const BODY_TURNS = {
	UP_UP: [
		[300, 650],
		[-200, 650],
		[50, 650],
	],
	UP_DOWN: [
		[300, -1000],
		[-200, -1000],
		[50, -1000],
	],
	UP_LEFT: [
		[650, 500],
		[650, -700],
		[650, 1500],
	],
	UP_RIGHT: [
		[-650, 500],
		[-650, -700],
		[-650, 1500],
	],
	DOWN_UP: SPEEDS,
	DOWN_DOWN: [
		[300, -1100],
		[-200, -1100],
		[50, -1500],
	],
	DOWN_LEFT: [
		[500, 300],
		[-700, -200],
		[1500, 50],
	],
	DOWN_RIGHT: [
		[-500, 300],
		[700, -200],
		[-1500, 50],
	],
	LEFT_UP: [
		[300, 650],
		[-200, 650],
		[50, 650],
	],
	LEFT_DOWN: [
		[300, -1000],
		[-200, -1000],
		[50, -1000],
	],
	LEFT_LEFT: [
		[1000, 500],
		[1000, -700],
		[1000, 1500],
	],
	LEFT_RIGHT: [
		[-650, 500],
		[-650, -700],
		[-650, 1500],
	],
	RIGHT_UP: [
		[300, 650],
		[-200, 650],
		[50, 650],
	],
	RIGHT_DOWN: [
		[300, -1000],
		[-200, -1000],
		[50, -1000],
	],
	RIGHT_LEFT: [
		[650, 500],
		[650, -700],
		[650, 1500],
	],
	RIGHT_RIGHT: [
		[-1000, 500],
		[-1000, -700],
		[-1000, 1500],
	],
};

/**
 * @type {Object<string, number[][]>} The speeds [vx, vy] of a homing plasma ball after a teleport, one for each entry
 *     of SPEEDS, by the directions of the entry portal and the exit portal.
 */
const HOMING_TURNS = {
	UP_UP: [
		[300, -500],
		[-200, 700],
		[50, -1500],
	],
	UP_DOWN: SPEEDS,
	UP_LEFT: [
		[-500, 300],
		[700, -200],
		[-1500, 50],
	],
	UP_RIGHT: [
		[500, 300],
		[-700, -200],
		[1500, 50],
	],
	DOWN_UP: SPEEDS,
	DOWN_DOWN: [
		[300, -500],
		[-200, 700],
		[50, -1500],
	],
	DOWN_LEFT: [
		[500, 300],
		[-700, -200],
		[1500, 50],
	],
	DOWN_RIGHT: [
		[-500, 300],
		[700, -200],
		[-1500, 50],
	],
	LEFT_UP: [
		[500, -300],
		[-700, 200],
		[1500, -50],
	],
	LEFT_DOWN: [
		[500, 300],
		[-700, -200],
		[1500, 50],
	],
	LEFT_LEFT: [
		[-300, 500],
		[200, -700],
		[-50, 1500],
	],
	LEFT_RIGHT: SPEEDS,
	RIGHT_UP: [
		[500, 300],
		[-700, -200],
		[1500, 50],
	],
	RIGHT_DOWN: [
		[500, -300],
		[-700, 200],
		[1500, -50],
	],
	RIGHT_LEFT: SPEEDS,
	RIGHT_RIGHT: [
		[-300, 500],
		[200, -700],
		[-50, 1500],
	],
};

/**
 * Create a placed portal.
 *
 * @param {number} direction The side of the wall with the portal, a value of Direction.
 * @param {number} [x] The x position in pixels.
 * @param {number} [y] The y position in pixels.
 * @returns {Portal} The portal.
 */
function portalAt(direction, x = 0, y = 0) {
	const portal = new Portal();
	portal.used = true;
	portal.direction = direction;
	portal.x = x << 8;
	portal.y = y << 8;
	return portal;
}

/**
 * Teleport a body with each start speed of SPEEDS for each pair of portal directions.
 *
 * @param {() => Body} create A function that creates the body.
 * @returns {Object<string, number[][]>} The speeds [vx, vy] after the teleport, by the directions of the entry portal
 *     and the exit portal.
 */
function teleportAll(create) {
	const result = {};
	for (const [fromName, from] of Object.entries(Direction)) {
		for (const [toName, to] of Object.entries(Direction)) {
			result[`${fromName}_${toName}`] = SPEEDS.map(([vx, vy]) => {
				const body = create();
				body.vx = vx;
				body.vy = vy;
				body.teleported(portalAt(from), portalAt(to));
				return [body.vx, body.vy];
			});
		}
	}
	return result;
}

test('a body turns its speed in the same way for each pair of portal directions', () => {
	assert.deepEqual(
		teleportAll(() => new Body(null, 0, 0, 16, 16)),
		BODY_TURNS,
	);
});

test('a plasma ball that is not homing turns its speed like a body', () => {
	assert.deepEqual(
		teleportAll(() => new Plasma(null, 0, 0, 0, 0)),
		BODY_TURNS,
	);
});

test('a homing plasma ball swaps or mirrors its speed for each pair of portal directions', () => {
	assert.deepEqual(
		teleportAll(() => new Plasma(null, 0, 0, 0, 0, true)),
		HOMING_TURNS,
	);
});

test('a pipe field continues from the exit portal in the direction of the exit', () => {
	// walls at the left and the top edge and a wall column in the middle, which holds the entry portal
	let tiles = floorTiles();
	for (let row = 0; row < MAP_HEIGHT; row++) tiles = tiles.with(at(0, row), Tile.WALL).with(at(20, row), Tile.WALL);
	for (let column = 0; column < MAP_WIDTH; column++) tiles = tiles.with(at(column, 0), Tile.WALL);

	const fields = {};
	for (const [name, direction] of Object.entries(Direction)) {
		const world = startWorld(tiles);
		world.portals.list = [portalAt(Direction.RIGHT, 320, 160), portalAt(direction, 160, 64)];
		fields[name] = traceGravPipeField(world, 32, 160, 1, 0).map((field) => [
			field.x,
			field.y,
			field.width,
			field.height,
			field.vx,
			field.vy,
		]);
	}

	// the field from the pipe to the entry portal, then the field from the exit portal
	const toEntry = [32, 160, 288, 32, 1, 0];
	assert.deepEqual(fields, {
		UP: [toEntry, [160, 64, 32, 304, 0, 1]],
		DOWN: [toEntry, [160, 64, 32, -48, 0, -1]],
		LEFT: [toEntry, [163, 64, 157, 32, 1, 0]],
		RIGHT: [toEntry, [160, 64, -144, 32, -1, 0]],
	});
});
