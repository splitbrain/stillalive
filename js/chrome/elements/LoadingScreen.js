/**
 * The loading screen element.
 */

import { campaignsLoading, campaignsReady } from '../campaigns.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the loading screen. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <loading-screen>. It shows a title, the start button, the credits and the files that could not be
 * loaded. While the images, the sounds and the campaigns load, the start button is disabled and shows the total
 * progress. When everything is loaded, the title and the button tell that the game can start. The app element handles
 * the click or the key press that starts the game.
 */
export class LoadingScreen extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the loading screen. */
	static template = TEMPLATE;

	/**
	 * Subscribe to the loading of the stage and the campaigns.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const stage = this.stage;
		const update = () => this.#update();
		return [
			stage.loading.subscribe(({ images, sounds }) => {
				this.#showMissing('images', images, 'Some images could not be loaded: ');
				this.#showMissing('sounds', sounds, 'Some sounds could not be loaded: ');
				update();
			}),
			campaignsLoading.subscribe((loading) => {
				this.#showMissing('campaigns', loading, 'Some levels could not be loaded: ');
				update();
			}),
			stage.ready.subscribe(update),
			campaignsReady.subscribe(update),
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
	 * Show the total progress in the start button, or enable the button when the stage and the campaigns are ready.
	 * The total progress is the mean of the progress of the images, the sounds and the campaigns.
	 *
	 * @returns {void}
	 */
	#update() {
		const ready = this.stage.ready.get() && campaignsReady.get();
		const { images, sounds } = this.stage.loading.get();
		const percent = Math.floor(((images.progress + sounds.progress + campaignsLoading.get().progress) / 3) * 100);
		const button = this.querySelector('.start');
		button.disabled = !ready;
		button.style.setProperty('--progress', `${percent}%`);
		button.textContent = ready ? 'Begin testing' : `Loading... ${percent}%`;
		this.querySelector('.title').textContent = ready
			? 'The test equipment is ready.'
			: 'Warming up the test equipment...';
	}

	/**
	 * Show the files of one kind that could not be loaded.
	 *
	 * @param {string} kind The kind of files: images, sounds or campaigns.
	 * @param {{progress: number, missing: string[]}} loading The progress from 0 to 1 and the missing files.
	 * @param {string} prefix The text before the list of the missing files.
	 * @returns {void}
	 */
	#showMissing(kind, { missing }, prefix) {
		const line = this.querySelector(`[data-missing="${kind}"]`);
		line.hidden = missing.length == 0;
		line.textContent = prefix + missing.join(', ');
	}
}
