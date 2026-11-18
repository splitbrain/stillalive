/**
 * The root element: it shows the screen of the route and drives the stage.
 */

import { hasCampaign, navigate, route, RouteName, routePath, up } from '../../router.js';
import { CampaignId, LEVELS_PER_CAMPAIGN, StageMode } from '../../stage/constants.js';
import { campaignById, campaigns, campaignsReady, requireCampaign } from '../../data/campaigns.js';
import { requireElement, setAttributes } from '../dom.js';
import { Screen, UiElement } from '../element.js';
import { dialogShown, showAlert } from './Dialog.js';
import {
	getBestTime,
	loadBestReplay,
	loadMusicSetting,
	loadSoundSetting,
	maxLevel,
	saveBestTime,
	saveMusicSetting,
	saveProgress,
	saveSoundSetting,
} from '../../data/storage.js';
import { toTime } from '../time.js';
import { checkReady, ready } from '../../loader.js';

/** @typedef {import('../../stage/sessions/replay.js').ReplayFile} ReplayFile */

/**
 * A route that the root element applies, with the state that the route handlers need.
 *
 * @typedef {object} RouteContext
 * @property {import('../../router.js').Route} current The route.
 * @property {import('../../router.js').Route|null} previous The route that the root element applied before, or null.
 * @property {import('../../data/campaigns.js').Campaign|null} campaign The campaign of the route, or null for no
 *     campaign.
 * @property {import('../../stage/world/level.js').Level|null} level The level of the route, or null for no level.
 * @property {boolean} sameLevel True if the previous route played the same level of the same campaign.
 * @property {boolean} again True if the previous route was the same route of the same level.
 * @property {object|null} reopen The attributes of the intermission panel to open again, or null.
 */

/** @type {string} The selector of the buttons that play the hover sound and the click sound. */
const SOUND_BUTTONS = 'ui-button, .selection a.back, ui-main-menu .sound, ui-main-menu .music, ui-vcr-panel button';

/** @type {string[]} The screens that show the stage. */
const STAGE_SCREENS = [Screen.SELECT, Screen.PLAY, Screen.REPLAY, Screen.EDITOR, Screen.TEST, Screen.SAVE, Screen.LOAD];

/** @type {string[]} The routes that run a level: the play route and the replay route. */
const LEVEL_ROUTES = [RouteName.PLAY, RouteName.REPLAY];

/** @type {string[]} The routes of the editor: the editor, its test run, its save screen and its load screen. */
const EDITOR_ROUTES = [RouteName.EDITOR, RouteName.TEST, RouteName.SAVE, RouteName.LOAD];

/**
 * Check if a route is a level route: a play or a replay route.
 *
 * @param {import('../../router.js').Route|null} route The route, or null.
 * @returns {route is import('../../router.js').Route} True for a play or a replay route.
 */
function isLevelRoute(route) {
	return route !== null && LEVEL_ROUTES.includes(route.name);
}

/** @type {string} The narrator text of the editor and of its save screen and load screen. */
const EDITOR_TEXT =
	'Welcome to the Still Alive Level Editor! Here you can easily create your own maps. Select a tile or an object, then draw it with the left mouse button, remove it with the right mouse button, or fill an area with a tile with the middle mouse button. Then, try out your map. Have fun!';

/**
 * The custom element <ui-root>. It shows the screen of the route, commands the stage and stores the results of the
 * levels. It shows the loading screen until the game is loaded and the player clicks or presses a key.
 */
export class Root extends UiElement {
	/** @type {boolean} True after the click or the key press that starts the game. */
	#started = false;

	/** @type {string|null} The code of the key that started the game while the player holds it, or null. */
	#startKey = null;

	/** @type {import('../../router.js').Route|null} The route that the element applied last, or null. */
	#applied = null;

	/** @type {ReplayFile|null} The replay in the file format that the replay route plays, or null. */
	#replay = null;

	/** @type {ReplayFile|null} The replay from watch() for the next replay route, or null. */
	#pendingReplay = null;

	/** @type {ReplayFile|null} The replay of the level that ended, for the Watch Replay button of the panel, or null. */
	#intermissionReplay = null;

	/** @type {object|null} The attributes of the open intermission panel except the open attribute, or null. */
	#intermission = null;

	/**
	 * @type {{path: string, intermission: object|null}|null} Where the running replay goes back to: the path of the
	 *     route and the attributes of the intermission panel to open there, or null for no panel.
	 */
	#replayReturn = null;

	/** @type {{path: string, intermission: object|null}|null} The return from watch() for the next replay route. */
	#pendingReturn = null;

	/**
	 * Set the sound and the music from the storage, and add the event handlers of the page and the stage. The event
	 * testend of the stage goes up to the editor. The level selection asks for the preview of a level with the event
	 * level-shown.
	 *
	 * @returns {void}
	 */
	setUp() {
		const stage = this.stage;
		stage.setSound(loadSoundSetting());
		stage.setMusic(loadMusicSetting());
		if (new URLSearchParams(location.search).has('unlock')) campaignsReady.subscribe((ready) => this.#unlockAll(ready));
		window.addEventListener('click', (event) => {
			if (!this.#start() && /** @type {Element} */ (event.target).closest(SOUND_BUTTONS)) stage.playClickSound();
		});
		window.addEventListener('pointerover', (event) => {
			const button = /** @type {Element} */ (event.target).closest(SOUND_BUTTONS);
			if (button && !button.contains(/** @type {Node|null} */ (event.relatedTarget))) stage.playHoverSound();
		});
		window.addEventListener('focusin', (event) => {
			const target = /** @type {Element} */ (event.target);
			if (target.closest(SOUND_BUTTONS) && target.matches(':focus-visible')) stage.playHoverSound();
		});
		window.addEventListener('keydown', (event) => this.#onStartKey(event), { capture: true });
		window.addEventListener('keyup', (event) => this.#onStartKey(event), { capture: true });
		stage.addEventListener('finished', (event) =>
			this.#onFinished(/** @type {CustomEvent<{time: number, replay: ReplayFile}>} */ (event).detail),
		);
		stage.addEventListener('testend', () => this.#onTestEnd());
		stage.addEventListener('brokenreplay', () => this.#onBrokenReplay());
		stage.addEventListener('replaystop', () => this.#leaveReplay());
		this.addEventListener('replay-stop', () => this.#leaveReplay());
		this.addEventListener('level-shown', (event) => {
			const current = route.get();
			if (current.name !== RouteName.SELECT) return;
			const { level } = /** @type {CustomEvent<{level: number}>} */ (event).detail;
			this.#previewLevel(requireCampaign(current.campaign), level);
		});
		this.addEventListener('replay-watch', () => {
			const current = route.get();
			const path = routePath(current.name, current.campaign, current.level);
			if (this.#intermissionReplay) this.watch(this.#intermissionReplay, { path, intermission: this.#intermission });
		});
	}

	/**
	 * Subscribe to the route, to the loading, to the stage and to the settings. A change of the mode of the stage shows
	 * the screen again. The sound and music settings are stored after the game starts. A change of the sound setting
	 * checks again if the game can start, because the game waits for the sounds only while the sound is on. The first
	 * call of the route subscription shows the loading screen.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const stage = this.stage;
		return [
			route.subscribe(() => this.#applyRoute()),
			ready.subscribe(() => this.#applyRoute()),
			stage.mode.subscribe(() => this.#showScreen()),
			stage.paused.subscribe(() => this.#showScreen()),
			dialogShown.subscribe(() => this.#showScreen()),
			stage.sound.subscribe((on) => {
				checkReady();
				if (this.#started) saveSoundSetting(on);
			}),
			stage.music.subscribe((on) => {
				if (this.#started) saveMusicSetting(on);
			}),
		];
	}

	/**
	 * Play a replay: go to the replay route of its level with this replay.
	 *
	 * @param {ReplayFile} replay The replay in the file format.
	 * @param {{path: string, intermission: object|null}|null} [back] Where the replay goes back to, or null for the
	 *     selection of its level.
	 * @returns {void}
	 */
	watch(replay, back = null) {
		this.#pendingReplay = replay;
		this.#pendingReturn = back;
		navigate(routePath(RouteName.REPLAY, replay.campaign, replay.level));
	}

	/**
	 * End the replay on the replay route and go up to where the replay started. A replay from the intermission panel goes
	 * back to the panel, and any other replay goes to the selection of its level.
	 *
	 * @returns {void}
	 */
	#leaveReplay() {
		const current = route.get();
		if (current.name !== RouteName.REPLAY) return;
		up(this.#replayReturn?.path ?? routePath(RouteName.SELECT, current.campaign, current.level));
	}

	/**
	 * Store all levels of all campaigns as finished, so that the player can play each level. The URL parameter unlock
	 * calls it, for manual tests.
	 *
	 * @param {boolean} ready True when all campaign and level files are loaded.
	 * @returns {void}
	 */
	#unlockAll(ready) {
		if (!ready) return;
		for (const campaign of campaigns) saveProgress(campaign.id, campaign.levels.length + 1);
	}

	/**
	 * Leave the loading screen and apply the route, when everything is loaded.
	 *
	 * @returns {boolean} True if the game starts now.
	 */
	#start() {
		if (this.#started || !ready.get()) return false;
		this.#started = true;
		this.stage.playClickSound();
		this.#applyRoute();
		return true;
	}

	/**
	 * Start the game on a key press, and keep the key that starts the game from the stage: its press, the repeats while
	 * the player holds it, and its release. The handler runs in the capture phase, before the stage gets the key.
	 *
	 * @param {KeyboardEvent} event The keydown or keyup event.
	 * @returns {void}
	 */
	#onStartKey(event) {
		if (this.#startKey === null) {
			if (event.type !== 'keydown' || !this.#start()) return;
			this.#startKey = event.code;
		} else if (event.code !== this.#startKey) {
			return;
		} else if (event.type === 'keyup') {
			this.#startKey = null;
		}
		event.stopImmediatePropagation();
	}

	/**
	 * Get the screen to show. Before the start, it is the loading screen. After the start, it is the screen with the
	 * name of the route: each value of RouteName is also a value of Screen. The test route shows the editor screen when
	 * the stage has stopped the test run, until the step up to the editor route arrives.
	 *
	 * @returns {string} The screen, a value of Screen.
	 */
	#screen() {
		if (!this.#started) return Screen.LOADING;
		const name = route.get().name;
		return name === RouteName.TEST && this.stage.mode.get() !== StageMode.TEST ? Screen.EDITOR : name;
	}

	/**
	 * Show the stage and the UI elements that the current screen shows, and hide the others. A UI element whose
	 * shouldShow() returns null keeps its hidden attribute.
	 *
	 * @returns {void}
	 */
	#showScreen() {
		const screen = this.#screen();
		for (const element of this.querySelectorAll('*')) {
			if (!(element instanceof UiElement)) continue;
			const show = element.shouldShow(screen);
			if (show !== null) element.hidden = !show;
		}
		this.stage.hidden = !STAGE_SCREENS.includes(screen);
	}

	/**
	 * Apply the route to the stage and the parts, and show the screen. The handler of the route name applies the route
	 * to the stage.
	 *
	 * A route to a missing or locked level goes to the selection of its campaign. The replay route needs only an existing
	 * level. A selection of another level of the campaign that was played last goes to the selection of the level that
	 * the player left. A play route of the level that was played last starts as a restart. The play route where a replay
	 * started opens the intermission panel of the replay again.
	 *
	 * @returns {void}
	 */
	#applyRoute() {
		if (!this.#started) {
			this.#showScreen();
			return;
		}
		const current = route.get();
		const campaign = campaignById(current.campaign);
		// a level above 0 comes only with a campaign
		if (campaign && current.level > 0) {
			const usable =
				current.name === RouteName.REPLAY ? campaign.levels[current.level - 1] != null : campaign.isOpen(current.level);
			if (!usable) {
				navigate(routePath(RouteName.SELECT, current.campaign), true);
				return;
			}
		}

		const previous = this.#applied;
		const otherLevel =
			isLevelRoute(previous) && previous.campaign === current.campaign && previous.level !== current.level;
		if (current.name === RouteName.SELECT && current.level > 0 && otherLevel) {
			navigate(routePath(RouteName.SELECT, current.campaign, previous.level), true);
			return;
		}
		const sameLevel =
			isLevelRoute(previous) && previous.campaign === current.campaign && previous.level === current.level;
		const again = sameLevel && previous.name === current.name;
		const path = LEVEL_ROUTES.includes(current.name) ? routePath(current.name, current.campaign, current.level) : null;
		const replayLeft = previous?.name === RouteName.REPLAY && !again;
		const reopen = replayLeft && this.#replayReturn?.path === path ? this.#replayReturn.intermission : null;
		this.#applied = current;
		const level = campaign && current.level > 0 ? campaign.levels[current.level - 1] : null;

		const context = { current, previous, campaign, level, sameLevel, again, reopen };
		this.#applyToStage(context);
		// a handler that went on to another route leaves the parts to the apply of that route
		if (route.get() !== current) return;
		this.stage.playMusic(current.name === RouteName.PLAY ? 'level' : 'menu');
		this.#updateParts(context);
		this.#showScreen();
	}

	/**
	 * Apply the route to the stage with the handler of the route name. A route without a handler stops the stage. A
	 * handler can go on to another route; then the apply of the new route sets the parts.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {void}
	 */
	#applyToStage(context) {
		switch (context.current.name) {
			case RouteName.SELECT:
				return this.#showSelection(context);
			case RouteName.PLAY:
				return this.#playLevel(context);
			case RouteName.REPLAY:
				return this.#watchReplay(context);
			case RouteName.EDITOR:
				return this.#openEditor(context);
			case RouteName.TEST:
				return this.#testMap();
			case RouteName.SAVE:
			case RouteName.LOAD:
				return this.#previewEditorMap();
			default:
				return this.#stopStage();
		}
	}

	/**
	 * Show the preview of the level that the selection shows.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {void}
	 */
	#showSelection({ current, campaign }) {
		if (!campaign) throw new Error('A select route has a campaign.');
		this.#previewLevel(campaign, current.level);
	}

	/**
	 * Show the preview of a level of a campaign on the stage. If the campaign does not show a level for the number, stop
	 * the stage.
	 *
	 * @param {import('../../data/campaigns.js').Campaign} campaign The campaign.
	 * @param {number} level The level number, or 0 for the highest unlocked level.
	 * @returns {void}
	 */
	#previewLevel(campaign, level) {
		const shown = campaign.shownLevel(level);
		if (shown) this.stage.preview(shown);
		else this.stage.stop();
	}

	/**
	 * Play the level of the route. The level of the last route starts as a restart. If the intermission panel of a
	 * replay opens again, stop the stage.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {void}
	 */
	#playLevel({ level, sameLevel, reopen }) {
		if (reopen) {
			this.stage.stop();
			return;
		}
		if (!level) throw new Error('A usable play route has a level.');
		this.stage.play(level, { restart: sameLevel });
	}

	/**
	 * Play the replay of the route, and keep where the replay goes back to.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {void}
	 */
	#watchReplay({ current, level, again }) {
		if (!level || !hasCampaign(current)) throw new Error('A usable replay route has a campaign and a level.');
		this.#replayReturn = this.#pendingReturn;
		this.#pendingReturn = null;
		this.#playReplay(current, level, again);
	}

	/**
	 * Start the test run of the editor map. If the test run does not start, go to the editor.
	 *
	 * @returns {void}
	 */
	#testMap() {
		this.stage.test();
		if (this.stage.mode.get() !== StageMode.TEST) navigate('#/editor', true);
	}

	/**
	 * Open the editor, or stop the test run if it runs. A step from a screen outside the editor sets the brush to the
	 * first tile.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {void}
	 */
	#openEditor({ previous }) {
		if (this.stage.mode.get() === StageMode.TEST) {
			this.stage.stopTest();
		} else {
			this.stage.edit();
			if (!(previous && EDITOR_ROUTES.includes(previous.name))) this.stage.setBrush(1);
		}
	}

	/**
	 * Show the preview of the editor map on the save screen and on the load screen.
	 *
	 * @returns {void}
	 */
	#previewEditorMap() {
		this.stage.preview(this.stage.getMap());
	}

	/**
	 * Stop the stage, for the routes that show no level.
	 *
	 * @returns {void}
	 */
	#stopStage() {
		this.stage.stop();
	}

	/**
	 * Set the attributes of the parts from the route: the level selection, the pause menu, the intermission panel, the
	 * robot head, the narrator text and the editor files.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {void}
	 */
	#updateParts({ current, campaign, level, reopen }) {
		setAttributes(requireElement(this, 'ui-level-selection', HTMLElement), {
			campaign: current.campaign,
			level: current.level,
		});
		const play = LEVEL_ROUTES.includes(current.name);
		const exit = play ? '#/' : null;
		setAttributes(requireElement(this, 'ui-pause-menu', HTMLElement), {
			restart: play ? routePath(current.name, current.campaign, current.level) : null,
			exit,
		});
		this.#intermission = play ? reopen : null;
		setAttributes(requireElement(this, 'ui-intermission', HTMLElement), { exit, ...reopen, open: reopen ? '' : null });
		setAttributes(requireElement(this, 'ui-robot-head', HTMLElement), {
			eye:
				play && campaign && campaign.id === CampaignId.STORY
					? Math.min(Math.floor((current.level - 1) / 7), 3) + 1
					: null,
			absent: play && level && level.boss > 0 ? '' : null, // the boss is the robot
		});
		setAttributes(requireElement(this, 'ui-narrator-text', HTMLElement), {
			text: EDITOR_ROUTES.includes(current.name) ? EDITOR_TEXT : null,
		});
		setAttributes(requireElement(this, 'ui-editor-files', HTMLElement), {
			mode: current.name === RouteName.SAVE || current.name === RouteName.LOAD ? current.name : null,
		});
	}

	/**
	 * Play a replay on the replay route: the replay from watch(), the same replay again for a restart, or else the
	 * stored replay of the best time.
	 *
	 * @param {import('../../router.js').CampaignRoute} current The replay route.
	 * @param {import('../../stage/world/level.js').Level} level The level.
	 * @param {boolean} restart True if the route applies again.
	 * @returns {void}
	 */
	#playReplay(current, level, restart) {
		const pending = this.#pendingReplay;
		this.#pendingReplay = null;
		if (pending?.campaign === current.campaign && pending.level === current.level) {
			this.#startReplay(current, level, pending, restart);
		} else if (restart && this.#replay) {
			this.#startReplay(current, level, this.#replay, restart);
		} else {
			this.stage.stop();
			loadBestReplay(current.campaign, current.level)
				.catch(() => null)
				.then((data) => {
					if (route.get() === current) this.#startReplay(current, level, data, false);
				});
		}
	}

	/**
	 * Start the playback of a replay. If there is no replay or the replay is not valid, a message shows and the player
	 * goes up to the selection of the level.
	 *
	 * @param {import('../../router.js').CampaignRoute} current The replay route.
	 * @param {import('../../stage/world/level.js').Level} level The level.
	 * @param {ReplayFile|null|undefined} data The replay in the file format, or nothing.
	 * @param {boolean} restart True to skip the waits at the level start.
	 * @returns {void}
	 */
	#startReplay(current, level, data, restart) {
		try {
			if (!data) throw new Error('There is no stored replay for this level.');
			this.stage.play(level, { replay: data, restart });
			this.#replay = data;
		} catch (error) {
			showAlert(error.message, 'Replay');
			up(routePath(RouteName.SELECT, current.campaign, current.level));
		}
	}

	/**
	 * Store the level time and the replay if the time is a new best time.
	 *
	 * @param {import('../../router.js').CampaignRoute} current The route of the level.
	 * @param {number} time The level time in ticks.
	 * @param {ReplayFile} replay The replay in the file format.
	 * @returns {Promise<string>} The message for the intermission panel. Resolves when the new best time is stored.
	 *     The message is empty if the time cannot be stored.
	 */
	async #checkBestTime(current, time, replay) {
		const best = getBestTime(current.campaign, current.level);
		if (best != null && best <= time) return `Best time: ${toTime(best)}`;

		try {
			await saveBestTime(current.campaign, current.level, time, replay);
		} catch (error) {
			console.error(error);
			return '';
		}
		return 'New best time!';
	}

	/**
	 * Handle the end of a level: the best time, the progress and the next route. After the last story level, the
	 * credits show the first time. Else the intermission panel shows the time, the message and the links of the
	 * choice. The Continue link goes to the next level that can be played. The custom campaign has no progress. The end
	 * of a replay goes back to where the replay started.
	 *
	 * @param {{time: number, replay: ReplayFile}} detail The detail of the finished event of the stage.
	 * @returns {Promise<void>} Resolves when the next screen shows.
	 */
	async #onFinished({ time, replay }) {
		const current = route.get();
		// a level route always has a campaign
		if (!this.#started || !LEVEL_ROUTES.includes(current.name) || !hasCampaign(current)) return;
		if (current.name === RouteName.REPLAY) {
			this.#leaveReplay();
			return;
		}
		const campaign = requireCampaign(current.campaign);
		let credits = false;
		const message = await this.#checkBestTime(current, time, replay);
		if (campaign.id !== CampaignId.CUSTOM && maxLevel[campaign.id].get() < current.level + 1) {
			credits = campaign.id === CampaignId.STORY && maxLevel[campaign.id].get() === LEVELS_PER_CAMPAIGN;
			saveProgress(campaign.id, current.level + 1);
		}

		if (credits) {
			navigate('#/credits', true);
		} else {
			const next = campaign.nextLevel(current.level);
			this.#intermissionReplay = replay;
			this.#intermission = {
				time,
				message,
				next: next > 0 ? routePath(RouteName.PLAY, current.campaign, next) : null,
				restart: campaign.isOpen(current.level) ? routePath(RouteName.PLAY, current.campaign, current.level) : null,
			};
			setAttributes(requireElement(this, 'ui-intermission', HTMLElement), { ...this.#intermission, open: '' });
			this.#showScreen();
		}
	}

	/**
	 * Go up to the editor after the end of the test run. A test run that ends because the route left the test route
	 * also reports its end, so only the test route goes up.
	 *
	 * @returns {void}
	 */
	#onTestEnd() {
		if (route.get().name === RouteName.TEST) up('#/editor');
	}

	/**
	 * Stop a broken replay with a message and leave the level.
	 *
	 * @returns {void}
	 */
	#onBrokenReplay() {
		const current = route.get();
		if (current.name !== RouteName.REPLAY) return;
		showAlert("The replay you're watching seems to be broken -_-;\nSorry for the inconvenience.", 'An error occurred');
		up(routePath(RouteName.SELECT, current.campaign, current.level));
	}
}
