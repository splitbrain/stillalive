/**
 * The main menu element.
 */

import { CAMPAIGN_FINISHED, CampaignId } from '../../stage/constants.js';
import { ChromeElement, loadMarkup, Screen } from '../element.js';
import { maxLevel } from '../storage.js';

/** @type {HTMLTemplateElement|null} The markup of the main menu. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <main-menu>. It shows the links to the campaigns, the editor and the tutorial, and the sound
 * button. The element adds a plus to the label of the first campaign when the player has finished it, shows the sound
 * setting on the sound button and turns the sound on and off with it. The app element stores the change.
 */
export class MainMenu extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the main menu. */
	static template = TEMPLATE;

	/**
	 * Add the handler of the sound button.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.querySelector('#sound-button').addEventListener('click', () => this.stage.setSound(!this.stage.sound.get()));
	}

	/**
	 * Subscribe to the progress of the first campaign and to the sound setting.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const classic = this.querySelector('#main-classic');
		const soundButton = this.querySelector('#sound-button');
		return [
			maxLevel[CampaignId.NORMAL].subscribe((level) => {
				classic.textContent = 'Classic Mode' + (level == CAMPAIGN_FINISHED ? ' +' : '');
			}),
			this.stage.sound.subscribe((on) => soundButton.classList.toggle('off', !on)),
		];
	}

	/**
	 * Tell if the main menu shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the main screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.MAIN;
	}
}
