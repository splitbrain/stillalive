/**
 * The pause menu element.
 */

import { requireElement, setLink, settingLabel } from '../dom.js';
import { loadMarkup, Screen, UiElement } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the pause menu. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <ui-pause-menu>. It shows the choices of the pause of a level.
 *
 * The attribute restart is the path of the Restart link, and the attribute exit is the path of the Exit link. The
 * sound and music buttons turn their setting on and off and show it. The root element stores the settings.
 */
export class PauseMenu extends UiElement {
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
		requireElement(this, '.resume', HTMLElement).addEventListener('click', () => this.stage.resume());
		requireElement(this, '.sound', HTMLElement).addEventListener('click', () =>
			this.stage.setSound(!this.stage.sound.get()),
		);
		requireElement(this, '.music', HTMLElement).addEventListener('click', () =>
			this.stage.setMusic(!this.stage.music.get()),
		);
	}

	/**
	 * Subscribe to the sound and the music settings.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const sound = requireElement(this, '.sound', HTMLElement);
		const music = requireElement(this, '.music', HTMLElement);
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
		setLink(requireElement(this, '.restart', HTMLAnchorElement), this.getAttribute('restart'));
		setLink(requireElement(this, '.exit', HTMLAnchorElement), this.getAttribute('exit'));
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
