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
 * Number of ticks of the transition at the start of a level. The level time starts after the transition.
 *
 * @type {number}
 */
const INTRO_TICKS = 30;

/**
 * The maximum number of input sequences for a boss level. With random inputs, the player often dies in a boss level, so
 * the test tries more sequences until one run has no death.
 *
 * @type {number}
 */
const BOSS_ATTEMPTS = 30;

for (const campaign of CAMPAIGNS) {
	test(`replay ${campaign.name}`, async ({ page }) => {
		await openGame(page);
		let checked = 0;
		// all boss levels, and the other levels with an odd number
		const levels = campaignLevels(campaign).filter(({ level, boss }) => level % 2 === 1 || boss > 0);
		for (const { level, id, boss } of levels) {
			const isBoss = boss > 0;
			let played = null;
			for (let attempt = 0; attempt < (isBoss ? BOSS_ATTEMPTS : 1) && played === null; attempt++) {
				const run = await runLevel(page, {
					campaign: campaign.index,
					level,
					ticks: TICKS,
					seed: hashString(`replay ${id}`),
					inputs: generateInputs(hashString(attempt ? `replay inputs ${id} ${attempt}` : `replay inputs ${id}`), TICKS),
					// a replay skips the boss intro, so the played run skips it too
					skipBossIntro: isBoss,
				});

				// the replay only holds the last attempt, so only a run without a death can be compared
				const last = JSON.parse(run.trim().split('\n').at(-1));
				if (last.time === TICKS - INTRO_TICKS && !last.player[5]) played = run;
			}
			if (isBoss) expect.soft(played, `${id} has a run without a death`).not.toBeNull();
			if (played === null) continue;

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
