/**
 * The loading screen element.
 */

import { keyLabels } from '../../stage/keys.js';
import { campaignsLoading, campaignsReady } from '../campaigns.js';
import { ChromeElement, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the loading screen. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <loading-screen>. It shows the loading progress of the images, the sounds and the campaigns, the
 * files that could not be loaded, the controls with the key labels of the keyboard of the player, and "Click to
 * continue" when everything is loaded.
 *
 * The sound-off button turns the sound off, so that the stage does not wait for the sounds. The app element does not
 * store sound changes before the game starts, so this change is for the session only. The click that starts the game
 * bubbles to the app element, which handles it.
 */
export class LoadingScreen extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the loading screen. */
	static template = TEMPLATE;

	/**
	 * Add the handler of the sound-off button.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.querySelector('.sound-off').addEventListener('click', () => this.stage.setSound(false));
	}

	/**
	 * Subscribe to the loading of the stage and the campaigns and to the key labels.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const stage = this.stage;
		// the click to continue is possible when the stage and the campaigns are ready
		const showContinue = () => {
			this.querySelector('.continue').hidden = !(stage.ready.get() && campaignsReady.get());
		};
		return [
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
	 * Tell if the loading screen shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the loading screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.LOADING;
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
