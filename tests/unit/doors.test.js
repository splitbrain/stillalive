import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAP_HEIGHT, MAP_WIDTH } from '../../js/stage/constants.js';
import { emptyTiles } from '../../js/stage/world/TileMap.js';
import { Tile } from '../../js/stage/map/tiles.js';
import { at, floorTiles, runTicks, runUntilRunning, seedRandom, startWorld } from './helpers.js';

/** @type {number} The map index of the switch, in the floor. */
const SWITCH = at(10, 23);

/** @type {number} The map index of the lower switch door tile. */
const SWITCH_DOOR = at(20, 22);

/**
 * Create the tiles of a map with a floor, a switch in the floor and a switch door of two tiles on the floor.
 *
 * @returns {number[]} The tile ids.
 */
function switchTiles() {
	return floorTiles().with(SWITCH, Tile.SWITCH).with(SWITCH_DOOR, Tile.SWITCH_DOOR).with(at(20, 21), Tile.SWITCH_DOOR);
}

/**
 * Check if the switch door is open.
 *
 * @param {import('../../js/stage/world/World.js').World} world The World.
 * @returns {boolean} True if the bodies pass the lower switch door tile.
 */
function switchDoorOpen(world) {
	return world.map.tiles[SWITCH_DOOR] === Tile.EMPTY;
}

test('the switch door opens while the player stands on the switch', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(switchTiles());
	runUntilRunning(world);
	runTicks(world, 10);
	assert.equal(switchDoorOpen(world), false);

	world.player.x = 10 << 12;
	runTicks(world, 1);
	assert.ok(world.switches.pressed);
	assert.ok(switchDoorOpen(world));

	world.player.x = 14 << 12;
	runTicks(world, 1);
	assert.equal(world.switches.pressed, false);
	assert.equal(switchDoorOpen(world), false);
});

test('the switch door opens while a crate stands on the switch', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(switchTiles().with(at(10, 22), Tile.CRATE));
	runTicks(world, 1);
	assert.ok(world.switches.pressed);
	assert.ok(switchDoorOpen(world));

	runUntilRunning(world);
	world.crates[0].x = 14 << 12;
	runTicks(world, 1);
	assert.equal(world.switches.pressed, false);
	assert.equal(switchDoorOpen(world), false);
});

test('a closing switch door puts the crate in the door back to its start', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(switchTiles().with(at(5, 22), Tile.CRATE));
	runUntilRunning(world);
	world.player.x = 10 << 12;
	runTicks(world, 1);
	const crate = world.crates[0];
	crate.x = 20 << 12;
	world.player.x = 14 << 12;
	runTicks(world, 1);
	assert.equal(switchDoorOpen(world), false);
	assert.deepEqual([crate.x, crate.y], [crate.startX, crate.startY]);
});

/**
 * Create the tiles of a map with two plasma tunnels and a plasma door. In each tunnel, a plasma ball flies from the
 * plasma start on the left to the plasma slot on the right. The upper tunnel is shorter, so its slot is filled first.
 *
 * @returns {number[]} The tile ids.
 */
function plasmaTiles() {
	const tiles = emptyTiles().fill(Tile.WALL);
	const tunnel = (row, length) => {
		tiles[at(1, row)] = Tile.PLASMA_START;
		tiles.fill(Tile.EMPTY, at(2, row), at(2 + length, row));
		tiles[at(2 + length, row)] = Tile.PLASMA_SLOT;
	};
	tunnel(3, 6);
	tunnel(6, 20);
	// the player stands in a room at the bottom, away from the plasma balls
	for (let row = MAP_HEIGHT - 4; row < MAP_HEIGHT - 1; row++) {
		tiles.fill(Tile.EMPTY, at(1, row), at(MAP_WIDTH - 1, row));
	}
	tiles[at(2, MAP_HEIGHT - 2)] = Tile.PLAYER_START;
	tiles[at(20, MAP_HEIGHT - 2)] = Tile.PLASMA_DOOR;
	return tiles;
}

test('the plasma door opens when the last plasma slot is filled', (context) => {
	context.after(seedRandom(1));
	const world = startWorld(plasmaTiles());
	const door = at(20, MAP_HEIGHT - 2);
	const slots = () => world.map.tiles.filter((tile) => tile === Tile.PLASMA_SLOT).length;
	runUntilRunning(world);
	assert.equal(world.plasmaBall.length, 2);

	let ticks = 0;
	while (slots() === 2 && ticks < 300) {
		runTicks(world, 1);
		ticks++;
	}
	assert.equal(slots(), 1);
	assert.equal(world.map.tiles[door], Tile.PLASMA_DOOR);
	// the ball of the filled slot goes back to its start and flies again
	const [first] = world.plasmaBall;
	assert.ok(first.used);
	assert.deepEqual([first.x, first.y], [first.startX, first.startY]);

	while (slots() === 1 && ticks < 300) {
		runTicks(world, 1);
		ticks++;
	}
	assert.equal(slots(), 0);
	assert.equal(world.map.tiles[door], Tile.EMPTY);
	assert.equal(world.plasmaBall[1].used, false);
});
