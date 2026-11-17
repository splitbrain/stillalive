import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Crate } from '../../js/stage/bodies/Crate.js';
import { floorTiles, runTicks, runUntilRunning, seedRandom, startWorld } from './helpers.js';

/**
 * Throw a crate from a point in the air to the right, against the boss.
 *
 * @param {import('../../js/stage/world/World.js').World} world The World of a boss level.
 * @returns {Crate} The crate.
 */
function throwCrate(world) {
	const crate = new Crate(world, 400 << 8, 170 << 8);
	crate.vx = 4 << 8;
	world.addCrate(crate);
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

test('the boss removes the oldest removable crate when more than ten crates exist', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(floorTiles(), { boss: 1, restart: true });
	runUntilRunning(world);
	// the first crate of the boss flies out of the level, so the test takes it away at once
	world.removeCrate(world.crates[0]);
	const crates = [];
	for (let i = 0; i < 10; i++) {
		const crate = new Crate(world, (100 + 20 * i) << 8, 300 << 8);
		world.addCrate(crate);
		crates.push(crate);
	}
	crates[0].noRemove = 1000;
	let ticks = 0;
	while (world.crates.every((crate) => crates.includes(crate)) && ticks < 120) {
		runTicks(world, 1);
		ticks++;
	}
	assert.equal(world.crates.length, 10);
	assert.equal(world.crates.includes(crates[0]), true);
	assert.equal(world.crates.includes(crates[1]), false);
	assert.deepEqual(world.crates.slice(1, 9), crates.slice(2));
	assert.equal(crates.includes(world.crates[9]), false);
});

test('removeCrate() changes nothing for a crate that is not in the list', () => {
	const world = startWorld(floorTiles());
	const crate = new Crate(world, 100 << 8, 300 << 8);
	world.addCrate(crate);
	world.removeCrate(new Crate(world, 200 << 8, 300 << 8));
	assert.deepEqual(world.crates, [crate]);
});

test('each boss has the abilities of its number', () => {
	// makesCrates, throwsCrates, shootsWheels, shootsPlasma
	const abilities = {
		1: [true, true, false, false],
		2: [false, false, true, false],
		3: [true, false, false, true],
		4: [true, true, true, true],
	};
	for (const [number, expected] of Object.entries(abilities)) {
		const boss = startWorld(floorTiles(), { boss: Number(number) }).boss;
		assert.equal(boss.number, Number(number));
		assert.deepEqual([boss.makesCrates, boss.throwsCrates, boss.shootsWheels, boss.shootsPlasma], expected, number);
	}
});
