import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTime } from '../../js/ui/time.js';

test('toTime() shows minutes, seconds and three digits for the milliseconds', () => {
	const cases = {
		0: '00:00.000',
		1: '00:00.017',
		6: '00:00.100',
		59: '00:00.983',
		60: '00:01.000',
		3599: '00:59.983',
		3600: '01:00.000',
		36001: '10:00.017',
	};
	for (const [ticks, expected] of Object.entries(cases)) {
		assert.equal(toTime(Number(ticks)), expected, `${ticks} ticks`);
	}
});
