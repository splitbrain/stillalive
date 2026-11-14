import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Crate } from '../../js/stage/entities/Crate.js';
import { floorTiles, runTicks, runUntilRunning, seedRandom, startWorld } from './helpers.js';

/**
 * Throw a crate from a point in the air to the right, against the boss.
 *
 * @param {import('../../js/stage/World.js').World} world The World of a boss level.
 * @returns {Crate} The crate.
 */
function throwCrate(world) {
	const crate = new Crate(world, 400 << 8, 170 << 8);
	crate.vx = 4 << 8;
	world.crates.push(crate);
	return crate;
}

test('a crate thrown against the boss counts a hit', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(floorTiles(), { boss: 2, restart: true });
	runUntilRunning(world);
	const crate = throwCrate(world);
	let ticks = 0;
	while (world.boss.hits === 0 && ticks < 60) {
		runTicks(world, 1);
		ticks++;
	}
	assert.equal(world.boss.hits, 1);
	// boss 2 makes no crates, so the crate drops from the top again
	assert.deepEqual([crate.x, crate.y, crate.vx], [5 << 12, -(1 << 12), 0]);
});

test('a crate that hits a boss that makes crates goes away', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(floorTiles(), { boss: 1, restart: true });
	runUntilRunning(world);
	const crate = throwCrate(world);
	let ticks = 0;
	while (world.boss.hits === 0 && ticks < 60) {
		runTicks(world, 1);
		ticks++;
	}
	assert.equal(world.boss.hits, 1);
	assert.equal(world.crates.includes(crate), false);
});

test('the third hit kills the boss', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(floorTiles(), { boss: 2, restart: true });
	runUntilRunning(world);
	for (let hit = 1; hit <= 3; hit++) {
		throwCrate(world);
		let ticks = 0;
		while (world.boss.hits < hit && ticks < 60) {
			runTicks(world, 1);
			ticks++;
		}
	}
	assert.equal(world.boss.hits, 3);
	assert.equal(world.boss.phase(), 'leaving');
	assert.deepEqual(world.projectiles, []);
});
