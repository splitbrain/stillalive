import { test, expect } from '@playwright/test';
import { CAMPAIGNS, campaignLevels, hashString, openGame, runLevel } from './adapter.js';

/**
 * Number of ticks for each idle test.
 *
 * @type {number}
 */
const TICKS = 600;

for (const campaign of CAMPAIGNS) {
	test(`idle ${campaign.name}`, async ({ page }) => {
		await openGame(page);
		for (const { level, id } of campaignLevels(campaign)) {
			const result = await runLevel(page, {
				campaign: campaign.index,
				level,
				ticks: TICKS,
				seed: hashString(`idle ${id}`),
			});
			expect.soft(result).toMatchSnapshot(['idle', `${id}.txt`]);
		}
	});
}
