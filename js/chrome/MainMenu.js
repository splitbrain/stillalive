/**
 * The main menu element.
 */

import { CAMPAIGN_FINISHED, CampaignId } from '../stage/constants.js';
import { maxLevel } from './storage.js';

/**
 * The custom element <main-menu>. Its markup in the page has the links to the campaigns, the editor and the tutorial,
 * and the sound button. The element adds a plus to the label of the first campaign when the player has finished it,
 * shows the sound setting on the sound button and turns the sound on and off with it. The app element stores the
 * change.
 *
 * The element gets the stage with document.querySelector('game-stage') when it connects. The start code registers the
 * stage element before the chrome elements, so the stage is ready for use at that time.
 */
export class MainMenu extends HTMLElement {
	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which adds the event handler. */
	#setUp = false;

	/**
	 * Subscribe to the progress of the first campaign and to the sound setting. On the first connect, add the handler of
	 * the sound button.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		const stage = document.querySelector('game-stage');
		const soundButton = this.querySelector('#sound-button');
		if (!this.#setUp) {
			this.#setUp = true;
			soundButton.addEventListener('click', () => stage.setSound(!stage.sound.get()));
		}
		const classic = this.querySelector('#main-classic');
		this.#unsubscribe = [
			maxLevel[CampaignId.NORMAL].subscribe((level) => {
				classic.textContent = 'Classic Mode' + (level == CAMPAIGN_FINISHED ? ' +' : '');
			}),
			stage.sound.subscribe((on) => soundButton.classList.toggle('off', !on)),
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
}
