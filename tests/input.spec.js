import { test, expect } from '@playwright/test';
import { CAMPAIGNS, campaignLevels, hashString, openGame, runLevel } from './adapter.js';
import { generateInputs } from './input-generator.js';

/**
 * Number of ticks for each level.
 *
 * @type {number}
 */
const TICKS = 1800;

for (const campaign of CAMPAIGNS) {
	test(`input ${campaign.name}`, async ({ page }) => {
		await openGame(page);
		for (const { level, id } of campaignLevels(campaign)) {
			const result = await runLevel(page, {
				campaign: campaign.index,
				level,
				ticks: TICKS,
				seed: hashString(`input ${id}`),
				inputs: generateInputs(hashString(`inputs ${id}`), TICKS),
			});
			expect.soft(result).toMatchSnapshot(['input', `${id}.txt`]);
		}
	});
}
