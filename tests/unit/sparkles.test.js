import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SparkleType } from '../../js/stage/constants.js';
import { Sparkle } from '../../js/stage/entities/Sparkle.js';
import { Tile } from '../../js/stage/tiles.js';
import { at, floorTiles, runTicks, seedRandom, startWorld } from './helpers.js';

/** @type {number} The start value of the fade of the sparkles in the tests. */
const FADING = 200;

/**
 * Follow a sparkle that starts without speed 68 pixels above the floor, until it goes away.
 *
 * @param {number} type The sparkle type, a value of SparkleType.
 * @param {number[]} [tiles] The tile ids of the map.
 * @returns {{landed: number, gone: number, fading: number[]}} The tick in which the sparkle landed on the floor or -1,
 *     the tick in which it went away, and its fade after each tick.
 */
function followSparkle(type, tiles = floorTiles()) {
	const world = startWorld(tiles);
	const sparkle = new Sparkle(world, type, 100 << 8, 300 << 8, 0, 0, FADING, 0);
	world.sparkles.push(sparkle);
	const fading = [];
	let landed = -1;
	while (world.sparkles.includes(sparkle) && fading.length < 1000) {
		runTicks(world, 1);
		fading.push(sparkle.fading);
		if (landed < 0 && sparkle.floorTime >= 0) landed = fading.length;
	}
	return { landed, gone: fading.length, fading };
}

test('the portal shot, teleport, cake and smoke sparkles fade by 8 per tick and go away', (context) => {
	context.after(seedRandom(1));
	for (const name of ['PORTAL_SHOT', 'TELEPORT', 'CAKE', 'SMOKE']) {
		const { landed, gone, fading } = followSparkle(SparkleType[name]);
		assert.equal(landed, -1, name);
		assert.equal(gone, FADING / 8, name);
		assert.equal(fading[0], FADING - 8, name);
	}
});

test('the portal shot and teleport sparkles go away on a solid tile', (context) => {
	context.after(seedRandom(1));
	const tiles = floorTiles().with(at(6, 18), Tile.WALL).with(at(6, 19), Tile.WALL);
	for (const name of ['PORTAL_SHOT', 'TELEPORT']) {
		assert.equal(followSparkle(SparkleType[name], tiles).gone, 1, name);
	}
});

test('a shot hit sparkle falls, stays 120 ticks on the floor and then fades', (context) => {
	context.after(seedRandom(1));
	const { landed, gone, fading } = followSparkle(SparkleType.SHOT_HIT);
	assert.equal(landed, 23);
	// the landing tick is the first of the 120 ticks, and fading[i] is the fade after tick i + 1
	const lastFull = landed + 119;
	assert.equal(fading[lastFull - 1], FADING);
	assert.ok(fading[lastFull] < FADING);
	assert.equal(gone, lastFull + Math.ceil(FADING / 0.7));
});

test('a low life sparkle falls slower and fades from its landing on', (context) => {
	context.after(seedRandom(1));
	const { landed, gone, fading } = followSparkle(SparkleType.LOW_LIFE);
	assert.equal(landed, 33);
	assert.equal(fading[landed - 1], FADING);
	assert.ok(fading[landed] < FADING);
	assert.equal(gone, landed + Math.ceil(FADING / 0.7));
});

test('a death sparkle falls slower and goes away on the floor', (context) => {
	context.after(seedRandom(1));
	const { landed, gone, fading } = followSparkle(SparkleType.DEATH);
	assert.equal(landed, -1);
	assert.equal(gone, 33);
	assert.equal(fading.at(-2), FADING);
});

test('a portal glow sparkle fades with its distance from the portal and starts again', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(floorTiles());
	const sparkle = new Sparkle(world, SparkleType.PORTAL_GLOW, 100 << 8, 300 << 8, 1 << 8, 0, FADING, 0);
	sparkle.startX = sparkle.x;
	sparkle.startY = sparkle.y;
	sparkle.portalIndex = 0;
	world.sparkles.push(sparkle);
	runTicks(world, 39);
	assert.equal(sparkle.fading, FADING - 5 * 39);
	assert.equal(sparkle.x, (100 + 39) << 8);
	runTicks(world, 1);
	assert.equal(sparkle.fading, FADING);
	assert.equal(sparkle.x, sparkle.startX);
	assert.ok(world.sparkles.includes(sparkle));
});
