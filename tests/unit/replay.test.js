import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeReplay } from '../../js/stage/replay.js';

/**
 * Create a valid replay in the file format.
 *
 * @returns {import('../../js/stage/replay.js').ReplayFile} The replay data.
 */
function validReplay() {
	return {
		format: 2,
		campaign: 'normal',
		level: 3,
		ticks: 5,
		inputs: [
			[2, 1, 10, 20],
			[3, 4, 30, 40],
		],
		states: [[7, 0, 0, 0, 0, 0, 0, 0, 0]],
	};
}

test('decodeReplay() accepts a valid replay', () => {
	const result = decodeReplay(validReplay());
	assert.deepEqual(result.inputs, [1, 1, 4, 4, 4]);
	assert.deepEqual(result.mouseX, [10, 10, 30, 30, 30]);
	assert.deepEqual(result.mouseY, [20, 20, 40, 40, 40]);
	assert.deepEqual(result.states, { 7: [0, 0, 0, 0, 0, 0, 0, 0] });
});

test('decodeReplay() rejects data that is not a replay', () => {
	const cases = [null, 'text', { ...validReplay(), format: 1 }, { ...validReplay(), campaign: 1 }];
	for (const data of cases) {
		assert.throws(
			() => decodeReplay(data),
			{ message: 'This is not a Still Alive replay file.' },
			JSON.stringify(data),
		);
	}
});

test('decodeReplay() rejects a damaged replay', () => {
	const cases = {
		'wrong tick sum': { ticks: 6 },
		'count of zero': { inputs: [[0, 1, 10, 20]], ticks: 0 },
		'short input entry': { inputs: [[5, 1, 10]] },
		'not an integer': { inputs: [[5, 1, 10.5, 20]] },
		'wrong state length': { states: [[7, 0, 0]] },
		'no states': { states: undefined },
	};
	for (const [name, change] of Object.entries(cases)) {
		assert.throws(
			() => decodeReplay({ ...validReplay(), ...change }),
			{ message: 'The replay file is damaged.' },
			name,
		);
	}
});
