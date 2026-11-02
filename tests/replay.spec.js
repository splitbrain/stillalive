import { test, expect } from '@playwright/test';
import { CAMPAIGNS, campaignLevels, hashString, openGame, recordedReplay, runLevel } from './adapter.js';
import { generateInputs } from './input-generator.js';

/**
 * Number of ticks for each recording.
 *
 * @type {number}
 */
const TICKS = 300;

/**
 * Number of ticks of the transition at the start of a level. The level time does not run during the transition.
 *
 * @type {number}
 */
const INTRO_TICKS = 30;

/**
 * The boss levels of the story campaign. A replay skips the boss intro, so the ticks of play and replay differ.
 *
 * @type {string[]}
 */
const BOSS_LEVELS = ['story-07', 'story-14', 'story-21', 'story-28'];

for (const campaign of CAMPAIGNS.filter((c) => c.name !== 'tutorial')) {
	test(`replay ${campaign.name}`, async ({ page }) => {
		await openGame(page);
		let checked = 0;
		const levels = campaignLevels(campaign).filter(({ level, id }) => level % 2 === 1 && !BOSS_LEVELS.includes(id));
		for (const { level, id } of levels) {
			const played = await runLevel(page, {
				campaign: campaign.index,
				level,
				ticks: TICKS,
				seed: hashString(`replay ${id}`),
				inputs: generateInputs(hashString(`replay inputs ${id}`), TICKS),
			});

			// the replay only holds the last attempt, so only a run without a death can be compared
			const last = JSON.parse(played.trim().split('\n').at(-1));
			if (last.time !== TICKS - INTRO_TICKS || last.perso[5]) continue;

			const replay = await recordedReplay(page);
			const replayed = await runLevel(page, {
				campaign: campaign.index,
				level,
				ticks: TICKS,
				seed: hashString(`replay playback ${id}`),
				replay,
			});
			expect.soft(replayed, id).toBe(played);
			checked++;
		}
		expect(checked, 'number of levels without a death').toBeGreaterThan(0);
		console.log(`replay ${campaign.name}: ${checked} of ${levels.length} levels compared`);
	});
}
