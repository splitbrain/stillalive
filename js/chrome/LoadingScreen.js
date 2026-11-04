/**
 * The loading screen element.
 */

import { keyLabels } from '../stage/keys.js';
import { campaignsLoading, campaignsReady } from './campaigns.js';

/**
 * The custom element <loading-screen>. It shows the loading progress of the images, the sounds and the campaigns, the
 * files that could not be loaded, the controls with the key labels of the keyboard of the player, and "Click to
 * continue" when everything is loaded. Its markup is in the page.
 *
 * The sound-off button turns the sound off, so that the stage does not wait for the sounds. The app element does not
 * store sound changes before the game starts, so this change is for the session only. The click that starts the game
 * bubbles to the app element, which handles it.
 *
 * The element gets the stage with document.querySelector('game-stage') when it connects. The start code registers the
 * stage element before the chrome elements, so the stage is ready for use at that time.
 */
export class LoadingScreen extends HTMLElement {
	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which adds the event handler. */
	#setUp = false;

	/**
	 * Subscribe to the loading of the stage and the campaigns and to the key labels. On the first connect, add the
	 * handler of the sound-off button.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		const stage = document.querySelector('game-stage');
		if (!this.#setUp) {
			this.#setUp = true;
			this.querySelector('.sound-off').addEventListener('click', () => stage.setSound(false));
		}
		// the click to continue is possible when the stage and the campaigns are ready
		const showContinue = () => {
			this.querySelector('.continue').hidden = !(stage.ready.get() && campaignsReady.get());
		};
		this.#unsubscribe = [
			stage.loading.subscribe(({ images, sounds }) => {
				this.#showProgress('images', images, 'Some images could not be loaded: ');
				this.#showProgress('sounds', sounds, 'Some sounds could not be loaded: ');
			}),
			campaignsLoading.subscribe((loading) => {
				this.#showProgress('campaigns', loading, 'Some levels could not be loaded: ');
			}),
			stage.ready.subscribe(showContinue),
			campaignsReady.subscribe(showContinue),
			keyLabels.subscribe((labels) => {
				for (const key of this.querySelectorAll('kbd[data-key]')) key.textContent = labels[key.dataset.key];
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
	 * Show the progress of one kind of files and the files of this kind that could not be loaded.
	 *
	 * @param {string} kind The kind of files: images, sounds or campaigns.
	 * @param {{progress: number, missing: string[]}} loading The progress from 0 to 1 and the missing files.
	 * @param {string} prefix The text before the list of the missing files.
	 * @returns {void}
	 */
	#showProgress(kind, { progress, missing }, prefix) {
		this.querySelector(`progress[data-progress="${kind}"]`).value = progress;
		const line = this.querySelector(`[data-missing="${kind}"]`);
		line.hidden = missing.length == 0;
		line.textContent = prefix + missing.join(', ');
	}
}
