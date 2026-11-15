/**
 * The pause menu element.
 */

import { setLink, settingLabel } from '../dom.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the pause menu. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <pause-menu>. It shows the choices of the pause of a level.
 *
 * The attribute restart is the path of the Restart link, and the attribute exit is the path of the Exit link. The
 * sound and music buttons turn their setting on and off and show it. The app element stores the settings.
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
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
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
	 * @returns {boolean} True on the play screen and on the test run screen while the stage is paused.
	 */
	shouldShow(screen) {
		return (screen === Screen.PLAY || screen === Screen.TEST) && this.stage.paused.get();
	}
}
