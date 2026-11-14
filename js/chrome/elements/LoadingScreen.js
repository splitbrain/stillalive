/**
 * The loading screen element.
 */

import { loading, ready } from '../../loader.js';
import { keyLabels } from '../../stage/keys.js';
import { campaignsLoading } from '../campaigns.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the loading screen. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <loading-screen>. It shows the progress of the loading, the controls of the game and the files
 * that could not be loaded. The app element starts the game on a click or a key press.
 */
export class LoadingScreen extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the loading screen. */
	static template = TEMPLATE;

	/**
	 * Subscribe to the loading of the game and the campaigns, and to the key labels of the keyboard of the player.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const update = () => this.#update();
		return [
			loading.subscribe(({ code, images, sounds }) => {
				this.#showMissing('code', code, 'Some parts of the game could not be loaded: ');
				this.#showMissing('images', images, 'Some images could not be loaded: ');
				this.#showMissing('sounds', sounds, 'Some sounds could not be loaded: ');
				update();
			}),
			campaignsLoading.subscribe((loading) => {
				this.#showMissing('campaigns', loading, 'Some levels could not be loaded: ');
				update();
			}),
			ready.subscribe(update),
			keyLabels.subscribe((labels) => {
				const spans = /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('[data-key]'));
				for (const span of spans) span.textContent = labels[span.dataset.key];
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
	 * Show the total progress in the start button, or enable the button when the game is loaded. The total progress is
	 * the mean of the progress of the code, the images, the sounds and the campaigns.
	 *
	 * @returns {void}
	 */
	#update() {
		const done = ready.get();
		const { code, images, sounds } = loading.get();
		const progress = code.progress + images.progress + sounds.progress + campaignsLoading.get().progress;
		const percent = Math.floor((progress / 4) * 100);
		const button = /** @type {HTMLButtonElement} */ (this.querySelector('.start'));
		button.disabled = !done;
		button.style.setProperty('--progress', `${percent}%`);
		button.textContent = done ? 'Begin testing' : `Loading... ${percent}%`;
		this.querySelector('.title').textContent = done
			? 'The test equipment is ready.'
			: 'Warming up the test equipment...';
	}

	/**
	 * Show the files of one kind that could not be loaded.
	 *
	 * @param {string} kind The kind of files: code, images, sounds or campaigns.
	 * @param {{progress: number, missing: string[]}} loading The progress from 0 to 1 and the missing files.
	 * @param {string} prefix The text before the list of the missing files.
	 * @returns {void}
	 */
	#showMissing(kind, { missing }, prefix) {
		const line = /** @type {HTMLElement} */ (this.querySelector(`[data-missing="${kind}"]`));
		line.hidden = missing.length === 0;
		line.textContent = prefix + missing.join(', ');
	}
}
