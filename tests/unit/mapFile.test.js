import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../../js/stage/mapFile.js';
import { emptyTiles } from '../../js/stage/TileMap.js';
import { Tile } from '../../js/stage/tiles.js';

/** @type {{message: string}} The error of a map that parseMap() rejects. */
const INVALID = { message: 'This is not a valid Still Alive map file.' };

/**
 * Create a valid map in the file format.
 *
 * @returns {import('../../js/stage/mapFile.js').MapFile} The map data.
 */
function validMap() {
	return { format: 1, tiles: emptyTiles(), bg: 0 };
}

test('parseMap() accepts a valid map', () => {
	const data = validMap();
	data.tiles[0] = Tile.EXIT;
	data.tiles[1] = Tile.GRAVPIPE_DOWN;
	assert.deepEqual(parseMap(data), {
		tiles: data.tiles,
		bg: 0,
		title: '',
		boss: 0,
		abilities: { jump: true, portals: true },
		events: [],
		labels: [],
	});
});

test('parseMap() reads the abilities, the events and the labels', () => {
	const events = [
		{ on: 'start', text: 'Hello', wait: 'click', unlock: 'jump' },
		{ on: 'playerX', x: 6, text: '' },
		{
			on: 'time',
			seconds: 2.5,
			portals: [
				[9, 14, 'left'],
				[11, 14, 'right'],
			],
		},
		{ on: 'bossArrived', text: 'Here I am' },
		{ on: 'bossDied', unlock: 'portals' },
		{ on: 'exit', text: 'Goodbye', wait: 'click' },
	];
	const labels = [
		{ x: 10, y: 20, text: 'Here' },
		{ x: 16.5, y: 3.5, text: 'Portal\nHere' },
	];
	const result = parseMap({ ...validMap(), abilities: { portals: false }, events, labels });
	assert.deepEqual(result.abilities, { jump: true, portals: false });
	assert.deepEqual(result.events, events);
	assert.deepEqual(result.labels, labels);
});

test('parseMap() puts the text before the events as a start event', () => {
	const events = [{ on: 'bossArrived', text: 'Here I am' }];
	const result = parseMap({ ...validMap(), text: 'Hello', events });
	assert.deepEqual(result.events, [{ on: 'start', text: 'Hello' }, ...events]);
});

test('parseMap() reads the title', () => {
	assert.equal(parseMap({ ...validMap(), title: 'Hello' }).title, 'Hello');
});

test('parseMap() reads the boss and accepts the tube only in a boss level', () => {
	const data = validMap();
	assert.equal(parseMap(data).boss, 0);
	data.tiles[1] = Tile.TUBE;
	assert.equal(parseMap({ ...data, boss: 4 }).boss, 4);
	assert.throws(() => parseMap(data), INVALID);
});

test('parseMap() rejects a damaged map', () => {
	const tiles = (index, value) => validMap().tiles.with(index, value);
	const cases = {
		'no data': null,
		'wrong format': { ...validMap(), format: 2 },
		'too few tiles': { ...validMap(), tiles: emptyTiles().slice(1) },
		'no tiles': { ...validMap(), tiles: undefined },
		'negative tile id': { ...validMap(), tiles: tiles(5, -1) },
		'unknown tile id': { ...validMap(), tiles: tiles(5, 99) },
		'unknown object id': { ...validMap(), tiles: tiles(5, 112) },
		'tile id as text': { ...validMap(), tiles: tiles(5, '1') },
		'negative background': { ...validMap(), bg: -1 },
		'background out of range': { ...validMap(), bg: 1000 },
		'unknown boss': { ...validMap(), boss: 5 },
		'negative boss': { ...validMap(), boss: -1 },
		'boss as text': { ...validMap(), boss: '1' },
		'text as number': { ...validMap(), text: 1 },
		'title as number': { ...validMap(), title: 1 },
		'abilities as list': { ...validMap(), abilities: [false] },
		'unknown ability': { ...validMap(), abilities: { fly: false } },
		'ability as text': { ...validMap(), abilities: { jump: 'false' } },
		'events as object': { ...validMap(), events: { on: 'start' } },
		'event as text': { ...validMap(), events: ['start'] },
		'unknown trigger': { ...validMap(), events: [{ on: 'end' }] },
		'trigger as list': { ...validMap(), events: [{ on: ['start'] }] },
		'no trigger': { ...validMap(), events: [{ text: 'Hello' }] },
		'player x missing': { ...validMap(), events: [{ on: 'playerX' }] },
		'player column with decimals': { ...validMap(), events: [{ on: 'playerX', x: 6.5 }] },
		'seconds as text': { ...validMap(), events: [{ on: 'time', seconds: '5' }] },
		'negative seconds': { ...validMap(), events: [{ on: 'time', seconds: -1 }] },
		'event text as number': { ...validMap(), events: [{ on: 'start', text: 1 }] },
		'unknown wait': { ...validMap(), events: [{ on: 'start', wait: 'key' }] },
		'unknown unlock': { ...validMap(), events: [{ on: 'start', unlock: 'fly' }] },
		'one portal': { ...validMap(), events: [{ on: 'start', portals: [[1, 2, 'left']] }] },
		'unknown portal direction': {
			...validMap(),
			events: [
				{
					on: 'start',
					portals: [
						[1, 2, 'left'],
						[3, 4, 'back'],
					],
				},
			],
		},
		'labels as object': { ...validMap(), labels: { x: 1, y: 2, text: 'Here' } },
		'label without text': { ...validMap(), labels: [{ x: 1, y: 2 }] },
		'label position as text': { ...validMap(), labels: [{ x: '1', y: 2, text: 'Here' }] },
		'label position in quarter tiles': { ...validMap(), labels: [{ x: 1.25, y: 2, text: 'Here' }] },
	};
	for (const [name, data] of Object.entries(cases)) {
		assert.throws(() => parseMap(data), INVALID, name);
	}
});

test('parseMap() accepts each background index and rejects the next index', () => {
	for (let bg = 0; bg < 11; bg++) assert.equal(parseMap({ ...validMap(), bg }).bg, bg);
	assert.throws(() => parseMap({ ...validMap(), bg: 11 }), INVALID);
});
