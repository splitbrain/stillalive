/**
 * The app element: it shows the screen of the route and drives the stage.
 */

import { campaignPath, navigate, route } from '../router.js';
import { CampaignId, CAMPAIGN_FOLDERS, LEVELS_PER_CAMPAIGN, MAP_SIZE } from '../stage/constants.js';
import { campaigns, campaignsReady, loadCampaigns, loadCreditsText } from './campaigns.js';
import { alertDialog } from './dialog.js';
import {
	getBestTime,
	loadBestReplay,
	loadSoundSetting,
	maxLevel,
	saveBestTime,
	saveProgress,
	saveSoundSetting,
} from './storage.js';
import { setIntermission, setScreen, startPage, toTime } from './tempPage.js';

/**
 * The custom element <game-app>. It wraps the screens of the page and the stage.
 *
 * Each part of a screen names the screens that show it in its data-screens attribute: loading, main, select, play,
 * editor, editor-file or credits. The element sets the hidden attribute of the parts that the current screen does not
 * show, and it sets its data-screen attribute to the current screen.
 *
 * The loading screen shows until the stage and the campaigns are ready and the player clicks the loading screen,
 * whatever the route is. Then the element shows the screen of the route and commands the stage. The test run of the
 * editor map shows the play screen. The element replaces a route with a locked level by the selection of the campaign,
 * because the router does not know the progress of the player.
 *
 * At the end of a level, the element stores the best time, the replay and the progress, and chooses the next route.
 *
 * The element starts the loading of the campaigns and the credits, and sets the sound of the stage from the storage.
 * It stores each change of the sound after the game starts, from the buttons of the page or from the key of the stage.
 * A change on the loading screen is for the session only.
 */
export class GameApp extends HTMLElement {
	/** @type {import('../stage/GameStage.js').GameStage} The stage element. */
	stage;

	/** @type {boolean} True after the click on the loading screen that starts the game. */
	#started = false;

	/** @type {import('../router.js').Route|null} The route that the element applied last, or null. */
	#applied = null;

	/** @type {object|null} The replay in the file format that the replay route plays, or null. */
	#replay = null;

	/** @type {object|null} The replay that watch() gives to the next replay route, or null. */
	#pendingReplay = null;

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which starts the page and adds the event handlers. */
	#setUp = false;

	/**
	 * Subscribe to the route, to the loading and to the sound. On the first connect, set the sound from the storage,
	 * start the loading, start the temporary page module and handle the clicks of the loading screen and the events of
	 * the stage.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (!this.#setUp) {
			this.#setUp = true;
			this.stage = this.querySelector('game-stage');
			this.stage.setSound(loadSoundSetting());
			loadCampaigns();
			loadCreditsText();
			startPage(this);
			this.querySelector('loading-screen').addEventListener('click', () => this.#start());
			this.stage.addEventListener('finished', (event) => this.#onFinished(event.detail));
			this.stage.addEventListener('brokenreplay', () => this.#onBrokenReplay());
		}
		this.#unsubscribe = [
			route.subscribe(() => this.#applyRoute()),
			this.stage.ready.subscribe(() => this.#applyRoute()),
			campaignsReady.subscribe(() => this.#applyRoute()),
			this.stage.mode.subscribe(() => this.#showScreen()),
			this.stage.sound.subscribe((on) => {
				if (this.#started) saveSoundSetting(on);
			}),
		];
	}

	/**
	 * Remove the subscriptions.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
	}

	/**
	 * Play a replay: go to the replay route of its level with this replay.
	 *
	 * @param {object} replay The replay in the file format.
	 * @returns {void}
	 */
	watch(replay) {
		this.#pendingReplay = replay;
		navigate(campaignPath(replay.campaign, replay.level, 'replay'));
	}

	/**
	 * Check if the stage and the campaigns are loaded.
	 *
	 * @returns {boolean} True when the game can start.
	 */
	#isLoaded() {
		return this.stage.ready.get() && campaignsReady.get();
	}

	/**
	 * Leave the loading screen and apply the route, when everything is loaded.
	 *
	 * @returns {void}
	 */
	#start() {
		if (this.#started || !this.#isLoaded()) return;
		this.#started = true;
		this.#applyRoute();
	}

	/**
	 * Get the screen to show.
	 *
	 * @returns {string} The name of the screen.
	 */
	#screen() {
		if (!this.#started) return 'loading';
		const name = route.get().name;
		if (name == 'editor' && this.stage.mode.get() == 'test') return 'play';
		return name;
	}

	/**
	 * Show the parts of the current screen and hide all other parts.
	 *
	 * @returns {void}
	 */
	#showScreen() {
		const screen = this.#screen();
		this.dataset.screen = screen;
		for (const part of this.querySelectorAll('[data-screens]')) {
			part.hidden = !part.dataset.screens.split(' ').includes(screen);
		}
	}

	/**
	 * Get the index of the campaign of a route.
	 *
	 * @param {import('../router.js').Route} r The route.
	 * @returns {number} The campaign index.
	 */
	#campaignIndex(r) {
		return CAMPAIGN_FOLDERS.indexOf(r.campaign);
	}

	/**
	 * Check if a level can be played: the level exists, and in a campaign with records, the player has unlocked it.
	 *
	 * @param {number} index The campaign index.
	 * @param {number} level The level number.
	 * @returns {boolean} True for a level that can be played.
	 */
	#isOpen(index, level) {
		const campaign = campaigns[index];
		return level <= campaign.levels.length && (!campaign.records || level <= maxLevel[index].get());
	}

	/**
	 * Get the path to leave a level to: the selection with the level selected. A campaign without records, like the
	 * tutorial, has no selection in the main menu, so its levels go back to the main menu.
	 *
	 * @param {import('../router.js').Route} r The route of the level.
	 * @returns {string} The path.
	 */
	#exitPath(r) {
		return campaigns[this.#campaignIndex(r)].records ? campaignPath(r.campaign, r.level) : '#/';
	}

	/**
	 * Apply the route: command the stage and show the screen. A level that does not exist or that is locked goes to the
	 * selection of its campaign. The playback of a replay needs only an existing level. A campaign without records has
	 * no selection, so its selection goes to the main menu. A level that follows a play route of the same level starts
	 * as a restart, which skips the waits at the level start.
	 *
	 * @returns {void}
	 */
	#applyRoute() {
		if (!this.#started) {
			this.#showScreen();
			setScreen('loading');
			return;
		}
		const r = route.get();
		const index = this.#campaignIndex(r);
		if (r.name == 'select' && !campaigns[index].records) {
			navigate('#/', true);
			return;
		}
		if (r.level > 0) {
			const usable = r.mode == 'replay' ? r.level <= campaigns[index].levels.length : this.#isOpen(index, r.level);
			if (!usable) {
				navigate(campaignPath(r.campaign), true);
				return;
			}
		}

		const previous = this.#applied;
		const sameLevel = previous?.name == 'play' && previous.campaign === r.campaign && previous.level === r.level;
		const again = sameLevel && previous.mode === r.mode;
		this.#applied = r;
		const level = r.level > 0 ? campaigns[index].levels[r.level - 1] : null;

		if (r.name == 'select' && level) {
			this.stage.preview(level);
		} else if (r.name == 'play' && r.mode == 'play') {
			this.stage.play(level, { restart: sameLevel });
		} else if (r.name == 'play') {
			this.#playReplay(r, level, again);
		} else if (r.name == 'editor' && previous?.name == 'editor-file') {
			this.stage.edit();
		} else if (r.name == 'editor') {
			this.stage.edit({ tiles: new Array(MAP_SIZE).fill(0), bg: 0 });
			this.stage.setBrush(1);
		} else {
			this.stage.stop();
		}
		this.#showScreen();
		setScreen(r.name, { campaign: index, level: r.level, mode: r.mode, exit: r.level > 0 ? this.#exitPath(r) : '#/' });
	}

	/**
	 * Play a replay on the replay route: the replay from watch(), the same replay again for a restart, or else the
	 * stored replay of the best time.
	 *
	 * @param {import('../router.js').Route} r The replay route.
	 * @param {import('../stage/level.js').Level} level The level.
	 * @param {boolean} restart True if the route applies again.
	 * @returns {void}
	 */
	#playReplay(r, level, restart) {
		const pending = this.#pendingReplay;
		this.#pendingReplay = null;
		if (pending?.campaign === r.campaign && pending.level === r.level) {
			this.#startReplay(r, level, pending, restart);
		} else if (restart && this.#replay) {
			this.#startReplay(r, level, this.#replay, restart);
		} else {
			this.stage.stop();
			loadBestReplay(r.campaign, r.level)
				.catch(() => null)
				.then((data) => {
					if (route.get() === r) this.#startReplay(r, level, data, false);
				});
		}
	}

	/**
	 * Start the playback of a replay. If there is no replay or the replay is not valid, a message shows and the
	 * selection of the level replaces the route.
	 *
	 * @param {import('../router.js').Route} r The replay route.
	 * @param {import('../stage/level.js').Level} level The level.
	 * @param {object|null|undefined} data The replay in the file format, or nothing.
	 * @param {boolean} restart True to skip the waits at the level start.
	 * @returns {void}
	 */
	#startReplay(r, level, data, restart) {
		try {
			if (!data) throw new Error('There is no stored replay for this level.');
			this.stage.play(level, { replay: data, restart });
			this.#replay = data;
		} catch (error) {
			alertDialog(error.message, 'Replay');
			navigate(campaignPath(r.campaign, r.level), true);
		}
	}

	/**
	 * Store the level time and the replay if the time is a new best time.
	 *
	 * @param {import('../router.js').Route} r The route of the level.
	 * @param {number} time The level time in ticks.
	 * @param {object} replay The replay in the file format.
	 * @returns {string} The message for the intermission screen.
	 */
	#checkBestTime(r, time, replay) {
		const best = getBestTime(r.campaign, r.level);
		if (best != null && best <= time) return 'Best time : ' + toTime(best);

		saveBestTime(r.campaign, r.level, time, replay).catch((e) => console.error(e));
		return 'New best time !';
	}

	/**
	 * Handle the end of a level: the best time, the progress and the next route. In a campaign without intermission
	 * screens, the next level starts at once. The last level always shows the intermission screen, with the end text of
	 * the campaign if it has one. After the last story level, the credits show the first time.
	 *
	 * @param {{time: number, replay: object}} detail The detail of the finished event of the stage.
	 * @returns {void}
	 */
	#onFinished({ time, replay }) {
		const r = route.get();
		if (!this.#started || r.name != 'play') return;
		const index = this.#campaignIndex(r);
		const campaign = campaigns[index];
		const isLastLevel = r.level == campaign.levels.length;
		const records = campaign.records && r.mode == 'play';
		let message = '';
		let credits = false;
		if (records) message = this.#checkBestTime(r, time, replay);
		if (isLastLevel && campaign.endText) message = campaign.endText;
		if (records && maxLevel[index].get() < r.level + 1) {
			credits = index == CampaignId.STORY && maxLevel[index].get() == LEVELS_PER_CAMPAIGN;
			saveProgress(index, r.level + 1);
		}

		if (!campaign.intermission && !isLastLevel) {
			navigate(campaignPath(r.campaign, r.level + 1, 'play'), true);
		} else if (credits) {
			navigate('#/credits', true);
		} else {
			setIntermission({
				time,
				message,
				replay: campaign.records ? replay : null,
				next: !isLastLevel && this.#isOpen(index, r.level + 1) ? campaignPath(r.campaign, r.level + 1, 'play') : null,
				restart: this.#isOpen(index, r.level) ? campaignPath(r.campaign, r.level, 'play') : null,
			});
		}
	}

	/**
	 * Stop a broken replay with a message and leave the level.
	 *
	 * @returns {void}
	 */
	#onBrokenReplay() {
		if (route.get().name != 'play') return;
		alertDialog(
			"The replay you're watching seems to be broken -_-;\n" + 'Sorry for any inconveniences.',
			'An error occurred',
		);
		navigate(this.#exitPath(route.get()), true);
	}
}
