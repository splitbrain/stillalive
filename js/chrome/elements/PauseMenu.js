/**
 * The pause menu element.
 */

import { setLink } from '../dom.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the pause menu. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <pause-menu>. It shows the Resume button, the Restart and Exit links and the sound button. The
 * attribute restart is the path of the Restart link, the current play route, and the attribute exit is the path of the
 * Exit link. The Exit link replaces the entry of the level in the history. The Resume button continues the level; the
 * sound button turns the sound on and off and shows the setting. The app element stores the change of the sound.
 */
export class PauseMenu extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the pause menu. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['restart', 'exit'];

	/**
	 * Add the handlers of the Resume and the sound buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.querySelector('.resume').addEventListener('click', () => this.stage.resume());
		this.querySelector('.sound').addEventListener('click', () => this.stage.setSound(!this.stage.sound.get()));
	}

	/**
	 * Subscribe to the sound setting.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const sound = this.querySelector('.sound');
		return [
			this.stage.sound.subscribe((on) => {
				sound.textContent = 'Sounds : ' + (on ? 'On' : 'Off');
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
}
