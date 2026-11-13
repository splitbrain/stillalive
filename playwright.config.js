import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the regression tests. The tests use much CPU time, so more than two workers make them
 * slower on small machines.
 */
export default defineConfig({
	testDir: './tests',
	snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
	fullyParallel: true,
	workers: 2,
	timeout: 180000,
	forbidOnly: !!process.env.CI,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:8080/',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'npm start -- -s',
		url: 'http://127.0.0.1:8080/',
		reuseExistingServer: !process.env.CI,
	},
});
