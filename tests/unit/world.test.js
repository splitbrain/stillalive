import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FADE_START, FADE_STEP, KEY_RIGHT } from '../../js/stage/constants.js';
import { Tile } from '../../js/stage/map/tiles.js';
import { at, floorTiles, runTicks, runUntilRunning, seedRandom, startWorld } from './helpers.js';

/** @type {number} The ticks of the opening and of the closing transition, which take 4 points of the fade per tick. */
const TRANSITION_TICKS = FADE_START / FADE_STEP;

test('a World from a map runs ticks without the stage element', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(floorTiles());
	const state = () => ({ time: world.time, x: world.player.x, y: world.player.y });
	const states = [state()];
	for (let tick = 0; tick < TRANSITION_TICKS + 60; tick++) {
		runTicks(world, 1, KEY_RIGHT);
		states.push(state());
	}
	const running = states.slice(TRANSITION_TICKS + 1);
	const last = states.at(-1);

	// the level time and the player stand still during the opening transition
	assert.deepEqual(states[TRANSITION_TICKS], states[0]);
	assert.equal(last.time, 60);
	// the player walks to the right on the floor
	assert.ok(running.every((entry, i) => i === 0 || entry.x > running[i - 1].x));
	assert.ok(running.every((entry) => entry.y === last.y));
});

test('the opening transition ends after FADE_START / FADE_STEP ticks', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(floorTiles());
	assert.ok(world.phase.isOpening());
	runTicks(world, TRANSITION_TICKS - 1);
	assert.ok(world.phase.isOpening());
	runTicks(world, 1);
	assert.ok(world.phase.isRunning());
	assert.equal(world.time, 0);
});

test('the level closes when the player reaches the exit and ends after the closing transition', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(floorTiles().with(at(8, 22), Tile.EXIT));
	runUntilRunning(world);
	let ticks = 0;
	while (world.phase.isRunning() && ticks < 300) {
		runTicks(world, 1, KEY_RIGHT);
		ticks++;
	}
	assert.ok(world.phase.isClosing());
	assert.ok(world.phase.closingStarted());
	assert.ok(world.phase.reachedExit());
	runTicks(world, TRANSITION_TICKS - 1);
	assert.ok(world.phase.isClosing());
	assert.equal(world.outcome, null);
	runTicks(world, 1);
	assert.ok(world.phase.isEnded());
	assert.equal(world.outcome, 'finished');
});
