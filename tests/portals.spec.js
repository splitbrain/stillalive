import { test, expect } from '@playwright/test';
import { hashString, openGame, runPortalScene } from './adapter.js';
import { KEY_RIGHT } from '../js/stage/constants.js';

/** @type {number[]} The shot from the middle of the room to the floor, below the x position 208. */
const FLOOR = [200, 200, 208, 380];
/** @type {number[]} The shot from the middle of the room to the ceiling, above the x position 208. */
const CEILING = [200, 200, 208, 4];
/** @type {number[]} The shot to the left wall, low above the floor. */
const LEFT_LOW = [200, 340, 4, 352];
/** @type {number[]} The shot to the right wall, low above the floor. */
const RIGHT_LOW = [200, 340, 508, 352];
/** @type {number[]} The shot to the left wall in the middle of the room. */
const LEFT_MIDDLE = [200, 200, 4, 200];
/** @type {number[]} The shot to the right wall in the middle of the room. */
const RIGHT_MIDDLE = [200, 200, 508, 200];

/**
 * The portal scenes by name. In each scene, the player or a body moves through the portals.
 *
 * @type {Object<string, {portals: number[][], player: number[], keys: number, ticks: number,
 *     body?: {type: string, x: number, y: number, vx?: number, vy?: number}}>}
 */
const SCENES = {
	'player-floor-to-ceiling': { portals: [FLOOR, CEILING], player: [206, 250], keys: 0, ticks: 150 },
	'player-wall-to-wall': { portals: [RIGHT_LOW, LEFT_LOW], player: [300, 340], keys: KEY_RIGHT, ticks: 150 },
	'player-wall-to-floor': { portals: [RIGHT_LOW, FLOOR], player: [300, 340], keys: KEY_RIGHT, ticks: 150 },
	'crate-floor-to-wall': {
		portals: [FLOOR, RIGHT_MIDDLE],
		player: [60, 340],
		body: { type: 'crate', x: 199, y: 250 },
		keys: 0,
		ticks: 150,
	},
	'crate-floor-to-ceiling': {
		portals: [FLOOR, CEILING],
		player: [60, 340],
		body: { type: 'crate', x: 199, y: 250 },
		keys: 0,
		ticks: 150,
	},
	'turret-floor-to-wall': {
		portals: [FLOOR, LEFT_MIDDLE],
		player: [400, 340],
		body: { type: 'turret', x: 199, y: 250 },
		keys: 0,
		ticks: 150,
	},
	'plasma-wall-to-floor': {
		portals: [RIGHT_MIDDLE, FLOOR],
		player: [60, 340],
		body: { type: 'plasma', x: 300, y: 200, vx: 424, vy: 0 },
		keys: 0,
		ticks: 200,
	},
	'plasma-wall-to-wall': {
		portals: [RIGHT_MIDDLE, LEFT_LOW],
		player: [400, 100],
		body: { type: 'plasma', x: 300, y: 200, vx: 424, vy: 0 },
		keys: 0,
		ticks: 200,
	},
};

test('portal scenes', async ({ page }) => {
	await openGame(page);
	for (const [name, scene] of Object.entries(SCENES)) {
		const result = await runPortalScene(page, { ...scene, seed: hashString(`portal ${name}`) });
		expect.soft(result).toMatchSnapshot(['portals', `${name}.txt`]);
	}
});
