/**
 * The app element: it shows the screen of the route and drives the stage.
 */

import { campaignPath, navigate, route, up } from '../../router.js';
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

	/** @type {object|null} The replay in the file format that the replay route plays, or null. */
	#replay = null;

	/** @type {object|null} The replay from watch() for the next replay route, or null. */
	#pendingReplay = null;

	/** @type {object|null} The replay of the level that ended, for the Watch Replay button of the panel, or null. */
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
			if (!this.#start() && event.target.closest(SOUND_BUTTONS)) stage.playClickSound();
		});
		window.addEventListener('pointerover', (event) => {
			const button = event.target.closest(SOUND_BUTTONS);
			if (button && !button.contains(event.relatedTarget)) stage.playHoverSound();
		});
		window.addEventListener('focusin', (event) => {
			if (event.target.closest(SOUND_BUTTONS) && event.target.matches(':focus-visible')) stage.playHoverSound();
		});
		window.addEventListener('keydown', (event) => this.#onStartKey(event), { capture: true });
		window.addEventListener('keyup', (event) => this.#onStartKey(event), { capture: true });
		stage.addEventListener('finished', (event) => this.#onFinished(event.detail));
		stage.addEventListener('brokenreplay', () => this.#onBrokenReplay());
		stage.addEventListener('replaystop', () => this.#leaveReplay());
		stage.addEventListener('focuslost', () => stage.pause());
		this.addEventListener('replay-stop', () => this.#leaveReplay());
		this.addEventListener('replay-watch', () => {
			const r = route.get();
			const path = campaignPath(r.campaign, r.level, r.mode);
			this.watch(this.#intermissionReplay, { path, intermission: this.#intermission });
		});
	}

	/**
	 * Subscribe to the route, to the loading, to the stage and to the settings. The end of the test run on the stage goes
	 * up to the editor. The sound and music settings are stored after the game starts. A change of the sound setting
	 * checks again if the game can start, because the game waits for the sounds only while the sound is on. The first
	 * call of the route subscription shows the loading screen.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const stage = this.stage;
		return [
			route.subscribe(() => this.#applyRoute()),
			ready.subscribe(() => this.#applyRoute()),
			stage.mode.subscribe((mode) => {
				const r = route.get();
				if (mode != 'test' && r.name == 'editor' && r.mode == 'test') up('#/editor');
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
	 * @param {object} replay The replay in the file format.
	 * @param {{path: string, intermission: object|null}|null} [back] Where the replay goes back to, or null for the
	 *     selection of its level.
	 * @returns {void}
	 */
	watch(replay, back = null) {
		this.#pendingReplay = replay;
		this.#pendingReturn = back;
		navigate(campaignPath(replay.campaign, replay.level, 'replay'));
	}

	/**
	 * End the replay on a replay route and go up to where the replay started. A replay from the intermission panel goes
	 * back to the panel, and any other replay goes to the selection of its level.
	 *
	 * @returns {void}
	 */
	#leaveReplay() {
		const r = route.get();
		if (r.name != 'play' || r.mode != 'replay') return;
		up(this.#replayReturn?.path ?? campaignPath(r.campaign, r.level));
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
			if (event.type != 'keydown' || !this.#start()) return;
			this.#startKey = event.code;
		} else if (event.code != this.#startKey) {
			return;
		} else if (event.type == 'keyup') {
			this.#startKey = null;
		}
		event.stopImmediatePropagation();
	}

	/**
	 * Get the screen to show.
	 *
	 * @returns {string} The screen, a value of Screen. The route names have the same values.
	 */
	#screen() {
		if (!this.#started) return Screen.LOADING;
		const name = route.get().name;
		if (name == Screen.EDITOR && this.stage.mode.get() == 'test') return Screen.PLAY;
		return name;
	}

	/**
	 * Show the parts and the stage that the current screen shows and hide all other parts.
	 *
	 * @returns {void}
	 */
	#showScreen() {
		const screen = this.#screen();
		for (const part of this.querySelectorAll('.chrome-screen')) part.hidden = !part.shouldShow(screen);
		this.stage.hidden = !STAGE_SCREENS.includes(screen);
	}

	/**
	 * Apply the route to the stage and the parts, and show the screen.
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
		const r = route.get();
		const campaign = campaignByFolder(r.campaign);
		if (r.level > 0) {
			const usable = r.mode == 'replay' ? campaign.levels[r.level - 1] != null : campaign.isOpen(r.level);
			if (!usable) {
				navigate(campaignPath(r.campaign), true);
				return;
			}
		}

		const previous = this.#applied;
		const otherLevel = previous?.name == 'play' && previous.campaign === r.campaign && previous.level !== r.level;
		if (r.name == 'select' && r.level > 0 && otherLevel) {
			navigate(campaignPath(r.campaign, previous.level), true);
			return;
		}
		const sameLevel = previous?.name == 'play' && previous.campaign === r.campaign && previous.level === r.level;
		const again = sameLevel && previous.mode === r.mode;
		const path = r.name == 'play' ? campaignPath(r.campaign, r.level, r.mode) : null;
		const replayLeft = previous?.mode == 'replay' && !again;
		const reopen = replayLeft && this.#replayReturn?.path === path ? this.#replayReturn.intermission : null;
		this.#applied = r;
		const level = r.level > 0 ? campaign.levels[r.level - 1] : null;

		if (r.name == 'select') {
			const shown = campaign.shownLevel(r.level);
			if (shown) this.stage.preview(shown);
			else this.stage.stop();
		} else if (r.name == 'play' && r.mode == 'play' && reopen) {
			this.stage.stop();
		} else if (r.name == 'play' && r.mode == 'play') {
			this.stage.play(level, { restart: sameLevel });
		} else if (r.name == 'play') {
			this.#replayReturn = this.#pendingReturn;
			this.#pendingReturn = null;
			this.#playReplay(r, level, again);
		} else if (r.name == 'editor' && r.mode == 'test') {
			this.stage.test();
			if (this.stage.mode.get() != 'test') {
				navigate('#/editor', true);
				return;
			}
		} else if (r.name == 'editor' && this.stage.mode.get() == 'test') {
			this.stage.stopTest();
		} else if (r.name == 'editor') {
			this.stage.edit();
			if (previous?.name != 'editor-file' && previous?.name != 'editor') this.stage.setBrush(1);
		} else if (r.name == 'editor-file') {
			this.stage.preview(this.stage.getMap());
		} else {
			this.stage.stop();
		}
		this.stage.playMusic(r.name == 'play' && r.mode == 'play' ? 'level' : 'menu');
		setAttributes(this.querySelector('level-selection'), { campaign: r.campaign, level: r.level });
		const play = r.name == 'play';
		const exit = play ? '#/' : null;
		setAttributes(this.querySelector('pause-menu'), {
			restart: play ? campaignPath(r.campaign, r.level, r.mode) : null,
			exit,
		});
		this.#intermission = r.name == 'play' ? reopen : null;
		setAttributes(this.querySelector('intermission-panel'), { exit, ...reopen, open: reopen ? '' : null });
		setAttributes(this.querySelector('robot-head'), {
			eye: play && campaign.id == CampaignId.STORY ? Math.min(Math.floor((r.level - 1) / 7), 3) + 1 : null,
			absent: play && level.boss > 0 ? '' : null, // the boss is the robot
		});
		setAttributes(this.querySelector('narrator-text'), { text: r.name.startsWith('editor') ? EDITOR_TEXT : null });
		setAttributes(this.querySelector('editor-files'), { mode: r.name == 'editor-file' ? r.mode : null });
		this.#showScreen();
	}

	/**
	 * Play a replay on the replay route: the replay from watch(), the same replay again for a restart, or else the
	 * stored replay of the best time.
	 *
	 * @param {import('../../router.js').Route} r The replay route.
	 * @param {import('../../stage/level.js').Level} level The level.
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
	 * Start the playback of a replay. If there is no replay or the replay is not valid, a message shows and the player
	 * goes up to the selection of the level.
	 *
	 * @param {import('../../router.js').Route} r The replay route.
	 * @param {import('../../stage/level.js').Level} level The level.
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
			up(campaignPath(r.campaign, r.level));
		}
	}

	/**
	 * Store the level time and the replay if the time is a new best time.
	 *
	 * @param {import('../../router.js').Route} r The route of the level.
	 * @param {number} time The level time in ticks.
	 * @param {object} replay The replay in the file format.
	 * @returns {Promise<string>} The message for the intermission panel. Resolves when the new best time is stored.
	 *     The message is empty if the time cannot be stored.
	 */
	async #checkBestTime(r, time, replay) {
		const best = getBestTime(r.campaign, r.level);
		if (best != null && best <= time) return 'Best time: ' + toTime(best);

		try {
			await saveBestTime(r.campaign, r.level, time, replay);
		} catch (e) {
			console.error(e);
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
	 * @param {{time: number, replay: object}} detail The detail of the finished event of the stage.
	 * @returns {Promise<void>} Resolves when the next screen shows.
	 */
	async #onFinished({ time, replay }) {
		const r = route.get();
		if (!this.#started || r.name != 'play') return;
		if (r.mode == 'replay') {
			this.#leaveReplay();
			return;
		}
		const campaign = campaignByFolder(r.campaign);
		let message = '';
		let credits = false;
		if (r.mode == 'play') message = await this.#checkBestTime(r, time, replay);
		if (r.mode == 'play' && campaign.id != CampaignId.CUSTOM && maxLevel[campaign.id].get() < r.level + 1) {
			credits = campaign.id == CampaignId.STORY && maxLevel[campaign.id].get() == LEVELS_PER_CAMPAIGN;
			saveProgress(campaign.id, r.level + 1);
		}

		if (credits) {
			navigate('#/credits', true);
		} else {
			const next = campaign.nextLevel(r.level);
			this.#intermissionReplay = replay;
			this.#intermission = {
				time,
				message,
				next: next > 0 ? campaignPath(r.campaign, next, 'play') : null,
				restart: campaign.isOpen(r.level) ? campaignPath(r.campaign, r.level, 'play') : null,
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
		const r = route.get();
		if (r.name != 'play') return;
		alertDialog(
			"The replay you're watching seems to be broken -_-;\n" + 'Sorry for the inconvenience.',
			'An error occurred',
		);
		up(campaignPath(r.campaign, r.level));
	}
}
