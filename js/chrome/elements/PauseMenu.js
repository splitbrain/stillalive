/**
 * The pause menu element.
 */

import { isReplayRoute } from '../../router.js';
import { setLink, settingLabel } from '../dom.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the pause menu. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <pause-menu>. It shows the Resume button, the Restart and Exit links and the sound and music buttons. It shows
 * on the play screen while the stage is paused, but not in the playback of a replay, which the VCR panel controls. The attribute restart is the path of the Restart link, the current
 * play route, and the attribute exit is the path of the Exit link. The Exit link goes up in the history to its path. The Resume button continues the level; the sound button turns the sound on and off, the music button the music,
 * and both show their setting. The app element stores the changes.
 */
export class PauseMenu extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the pause menu. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['restart', 'exit'];

	/**
	 * Add the handlers of the Resume, the sound and the music buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.querySelector('.resume').addEventListener('click', () => this.stage.resume());
		this.querySelector('.sound').addEventListener('click', () => this.stage.setSound(!this.stage.sound.get()));
		this.querySelector('.music').addEventListener('click', () => this.stage.setMusic(!this.stage.music.get()));
	}

	/**
	 * Subscribe to the sound and the music settings.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const sound = this.querySelector('.sound');
		const music = this.querySelector('.music');
		return [
			this.stage.sound.subscribe((on) => {
				sound.textContent = settingLabel('Sounds', on);
			}),
			this.stage.music.subscribe((on) => {
				music.textContent = settingLabel('Music', on);
			}),
		];
	}

	/**
	 * Set the paths of the Restart and the Exit links from the attributes.
	 *
	 * @returns {void}
	 */
	render() {
		setLink(this.querySelector('.restart'), this.getAttribute('restart'));
		setLink(this.querySelector('.exit'), this.getAttribute('exit'));
	}

	/**
	 * Tell if the pause menu shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the play screen while the stage is paused, except on a replay route.
	 */
	shouldShow(screen) {
		return screen === Screen.PLAY && this.stage.paused.get() && !isReplayRoute();
	}
}
