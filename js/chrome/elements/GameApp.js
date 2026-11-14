/**
 * The app element: it shows the screen of the route and drives the stage.
 */

import { campaignPath, navigate, route, RouteMode, RouteName, up } from '../../router.js';
import { CampaignId, LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { campaignByFolder, campaigns, campaignsReady } from '../campaigns.js';
import { alertDialog } from '../dialog.js';
import { setAttributes } from '../dom.js';
import { ChromeElement, Screen } from '../element.js';
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
} from '../storage.js';
import { toTime } from '../time.js';
import { checkReady, ready } from '../../loader.js';

/** @typedef {import('../../stage/replay.js').ReplayFile} ReplayFile */

/**
 * A route that GameApp applies, with the state that the route handlers need.
 *
 * @typedef {object} RouteContext
 * @property {import('../../router.js').Route} current The route.
 * @property {import('../../router.js').Route|null} previous The route that GameApp applied before, or null.
 * @property {import('../campaigns.js').Campaign|null} campaign The campaign of the route, or null for no campaign.
 * @property {import('../../stage/level.js').Level|null} level The level of the route, or null for no level.
 * @property {boolean} sameLevel True if the previous route played the same level of the same campaign.
 * @property {boolean} again True if the previous route played the same level in the same mode.
 * @property {object|null} reopen The attributes of the intermission panel to open again, or null.
 */

/** @type {string} The selector of the buttons that play the hover sound and the click sound. */
const SOUND_BUTTONS = 'menu-button, .selection-screen a.back, main-menu .sound, main-menu .music, vcr-panel button';

/** @type {string[]} The screens that show the stage. */
const STAGE_SCREENS = [Screen.SELECT, Screen.PLAY, Screen.EDITOR, Screen.EDITOR_FILE];

/** @type {string} The narrator text of the editor and of its save and load screen. */
const EDITOR_TEXT =
	'Welcome to the Still Alive Level Editor! Here you can easily create your own maps. Select a tile or an object, then draw it with the left mouse button, remove it with the right mouse button, or fill an area with a tile with the middle mouse button. Then, try out your map. Have fun!';

/**
 * The custom element <game-app>. It shows the screen of the route, commands the stage and stores the results of the
 * levels. It shows the loading screen until the game is loaded and the player clicks or presses a key.
 */
export class GameApp extends ChromeElement {
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
	 * @type {Record<string, (context: RouteContext) => boolean>} The handlers of the routes, by the route name and the
	 *     mode, e.g. "play/replay", or by the route name alone. A handler applies the route to the stage. It returns
	 *     false if it went on to another route, so that the parts are left to that route.
	 */
	#routeHandlers = {
		[RouteName.SELECT]: (context) => this.#showSelection(context),
		[`${RouteName.PLAY}/${RouteMode.PLAY}`]: (context) => this.#playLevel(context),
		[`${RouteName.PLAY}/${RouteMode.REPLAY}`]: (context) => this.#watchReplay(context),
		[RouteName.EDITOR]: (context) => this.#openEditor(context),
		[`${RouteName.EDITOR}/${RouteMode.TEST}`]: () => this.#testMap(),
		[RouteName.EDITOR_FILE]: () => this.#previewEditorMap(),
	};

	/**
	 * Set the sound and the music from the storage, and add the event handlers of the page and the stage.
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
		stage.addEventListener('brokenreplay', () => this.#onBrokenReplay());
		stage.addEventListener('replaystop', () => this.#leaveReplay());
		stage.addEventListener('focuslost', () => stage.pause());
		this.addEventListener('replay-stop', () => this.#leaveReplay());
		this.addEventListener('replay-watch', () => {
			const current = route.get();
			const path = campaignPath(current.campaign, current.level, current.mode);
			this.watch(this.#intermissionReplay, { path, intermission: this.#intermission });
		});
	}

	/**
	 * Subscribe to the route, to the loading, to the stage and to the settings. The end of the test run on the stage goes
	 * up to the editor. The sound and music settings are stored after the game starts. A change of the sound setting
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
			stage.mode.subscribe((mode) => {
				const current = route.get();
				if (mode !== 'test' && current.name === RouteName.EDITOR && current.mode === RouteMode.TEST) up('#/editor');
				this.#showScreen();
			}),
			stage.paused.subscribe(() => this.#showScreen()),
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
		navigate(campaignPath(replay.campaign, replay.level, RouteMode.REPLAY));
	}

	/**
	 * End the replay on a replay route and go up to where the replay started. A replay from the intermission panel goes
	 * back to the panel, and any other replay goes to the selection of its level.
	 *
	 * @returns {void}
	 */
	#leaveReplay() {
		const current = route.get();
		if (current.name !== RouteName.PLAY || current.mode !== RouteMode.REPLAY) return;
		up(this.#replayReturn?.path ?? campaignPath(current.campaign, current.level));
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
	 * Get the screen to show. Before the start, it is the loading screen. The test run of the editor map shows the play
	 * screen. Every other route shows the screen with the name of the route: each value of RouteName is also a value of
	 * Screen.
	 *
	 * @returns {string} The screen, a value of Screen.
	 */
	#screen() {
		if (!this.#started) return Screen.LOADING;
		const name = route.get().name;
		return name === RouteName.EDITOR && this.stage.mode.get() === 'test' ? Screen.PLAY : name;
	}

	/**
	 * Show the parts and the stage that the current screen shows and hide all other parts.
	 *
	 * @returns {void}
	 */
	#showScreen() {
		const screen = this.#screen();
		const parts = /** @type {NodeListOf<import('../element.js').ChromeScreen>} */ (
			this.querySelectorAll('.chrome-screen')
		);
		for (const part of parts) part.hidden = !part.shouldShow(screen);
		this.stage.hidden = !STAGE_SCREENS.includes(screen);
	}

	/**
	 * Apply the route to the stage and the parts, and show the screen. The handler of the route from the table applies
	 * the route to the stage.
	 *
	 * A route to a missing or locked level goes to the selection of its campaign. A replay route needs only an existing
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
		const campaign = campaignByFolder(current.campaign);
		if (current.level > 0) {
			const usable =
				current.mode === RouteMode.REPLAY ? campaign.levels[current.level - 1] != null : campaign.isOpen(current.level);
			if (!usable) {
				navigate(campaignPath(current.campaign), true);
				return;
			}
		}

		const previous = this.#applied;
		const otherLevel =
			previous?.name === RouteName.PLAY && previous.campaign === current.campaign && previous.level !== current.level;
		if (current.name === RouteName.SELECT && current.level > 0 && otherLevel) {
			navigate(campaignPath(current.campaign, previous.level), true);
			return;
		}
		const sameLevel =
			previous?.name === RouteName.PLAY && previous.campaign === current.campaign && previous.level === current.level;
		const again = sameLevel && previous.mode === current.mode;
		const path = current.name === RouteName.PLAY ? campaignPath(current.campaign, current.level, current.mode) : null;
		const replayLeft = previous?.mode === RouteMode.REPLAY && !again;
		const reopen = replayLeft && this.#replayReturn?.path === path ? this.#replayReturn.intermission : null;
		this.#applied = current;
		const level = current.level > 0 ? campaign.levels[current.level - 1] : null;

		const context = { current, previous, campaign, level, sameLevel, again, reopen };
		if (!this.#routeHandler(current)(context)) return;
		this.stage.playMusic(current.name === RouteName.PLAY && current.mode === RouteMode.PLAY ? 'level' : 'menu');
		this.#updateParts(context);
		this.#showScreen();
	}

	/**
	 * Get the handler of a route from the table: the handler of the route name and the mode, else the handler of the
	 * route name, else the handler that stops the stage.
	 *
	 * @param {import('../../router.js').Route} current The route.
	 * @returns {(context: RouteContext) => boolean} The handler.
	 */
	#routeHandler({ name, mode }) {
		return this.#routeHandlers[`${name}/${mode}`] ?? this.#routeHandlers[name] ?? (() => this.#stopStage());
	}

	/**
	 * Show the preview of the level that the selection shows. If no level shows, stop the stage.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {boolean} True, because the route stays.
	 */
	#showSelection({ current, campaign }) {
		const shown = campaign.shownLevel(current.level);
		if (shown) this.stage.preview(shown);
		else this.stage.stop();
		return true;
	}

	/**
	 * Play the level of the route. The level of the last route starts as a restart. If the intermission panel of a
	 * replay opens again, stop the stage.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {boolean} True, because the route stays.
	 */
	#playLevel({ level, sameLevel, reopen }) {
		if (reopen) this.stage.stop();
		else this.stage.play(level, { restart: sameLevel });
		return true;
	}

	/**
	 * Play the replay of the route, and keep where the replay goes back to.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {boolean} True, because the route stays.
	 */
	#watchReplay({ current, level, again }) {
		this.#replayReturn = this.#pendingReturn;
		this.#pendingReturn = null;
		this.#playReplay(current, level, again);
		return true;
	}

	/**
	 * Start the test run of the editor map. If the test run does not start, go to the editor.
	 *
	 * @returns {boolean} True if the test run started, false if the handler went to the editor route.
	 */
	#testMap() {
		this.stage.test();
		if (this.stage.mode.get() === 'test') return true;
		navigate('#/editor', true);
		return false;
	}

	/**
	 * Open the editor, or stop the test run if it runs. A step from a screen outside the editor sets the brush to the
	 * first tile.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {boolean} True, because the route stays.
	 */
	#openEditor({ previous }) {
		if (this.stage.mode.get() === 'test') {
			this.stage.stopTest();
		} else {
			this.stage.edit();
			if (previous?.name !== RouteName.EDITOR_FILE && previous?.name !== RouteName.EDITOR) this.stage.setBrush(1);
		}
		return true;
	}

	/**
	 * Show the preview of the editor map behind the save and load screen.
	 *
	 * @returns {boolean} True, because the route stays.
	 */
	#previewEditorMap() {
		this.stage.preview(this.stage.getMap());
		return true;
	}

	/**
	 * Stop the stage, for the routes that show no level.
	 *
	 * @returns {boolean} True, because the route stays.
	 */
	#stopStage() {
		this.stage.stop();
		return true;
	}

	/**
	 * Set the attributes of the parts from the route: the level selection, the pause menu, the intermission panel, the
	 * robot head, the narrator text and the save and load screen.
	 *
	 * @param {RouteContext} context The route and its state.
	 * @returns {void}
	 */
	#updateParts({ current, campaign, level, reopen }) {
		setAttributes(this.querySelector('level-selection'), { campaign: current.campaign, level: current.level });
		const play = current.name === RouteName.PLAY;
		const exit = play ? '#/' : null;
		setAttributes(this.querySelector('pause-menu'), {
			restart: play ? campaignPath(current.campaign, current.level, current.mode) : null,
			exit,
		});
		this.#intermission = play ? reopen : null;
		setAttributes(this.querySelector('intermission-panel'), { exit, ...reopen, open: reopen ? '' : null });
		setAttributes(this.querySelector('robot-head'), {
			eye: play && campaign.id === CampaignId.STORY ? Math.min(Math.floor((current.level - 1) / 7), 3) + 1 : null,
			absent: play && level.boss > 0 ? '' : null, // the boss is the robot
		});
		setAttributes(this.querySelector('narrator-text'), {
			text: current.name === RouteName.EDITOR || current.name === RouteName.EDITOR_FILE ? EDITOR_TEXT : null,
		});
		setAttributes(this.querySelector('editor-files'), {
			mode: current.name === RouteName.EDITOR_FILE ? current.mode : null,
		});
	}

	/**
	 * Play a replay on the replay route: the replay from watch(), the same replay again for a restart, or else the
	 * stored replay of the best time.
	 *
	 * @param {import('../../router.js').Route} current The replay route.
	 * @param {import('../../stage/level.js').Level} level The level.
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
	 * @param {import('../../router.js').Route} current The replay route.
	 * @param {import('../../stage/level.js').Level} level The level.
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
			alertDialog(error.message, 'Replay');
			up(campaignPath(current.campaign, current.level));
		}
	}

	/**
	 * Store the level time and the replay if the time is a new best time.
	 *
	 * @param {import('../../router.js').Route} current The route of the level.
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
		if (!this.#started || current.name !== RouteName.PLAY) return;
		if (current.mode === RouteMode.REPLAY) {
			this.#leaveReplay();
			return;
		}
		const campaign = campaignByFolder(current.campaign);
		let message = '';
		let credits = false;
		if (current.mode === RouteMode.PLAY) message = await this.#checkBestTime(current, time, replay);
		if (
			current.mode === RouteMode.PLAY &&
			campaign.id !== CampaignId.CUSTOM &&
			maxLevel[campaign.id].get() < current.level + 1
		) {
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
				next: next > 0 ? campaignPath(current.campaign, next, RouteMode.PLAY) : null,
				restart: campaign.isOpen(current.level) ? campaignPath(current.campaign, current.level, RouteMode.PLAY) : null,
			};
			setAttributes(this.querySelector('intermission-panel'), { ...this.#intermission, open: '' });
			this.#showScreen();
		}
	}

	/**
	 * Stop a broken replay with a message and leave the level.
	 *
	 * @returns {void}
	 */
	#onBrokenReplay() {
		const current = route.get();
		if (current.name !== RouteName.PLAY) return;
		alertDialog(
			"The replay you're watching seems to be broken -_-;\nSorry for the inconvenience.",
			'An error occurred',
		);
		up(campaignPath(current.campaign, current.level));
	}
}
