/**
 * The editor buttons element.
 */

import { navigate } from '../../router.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <editor-buttons>. It shows the row of the Try, Clear, Save, Load, Export, Import and Exit buttons
 * on the editor screen and during the test run of the map. The Try button starts the test run of the map, and the
 * Clear button clears the map of the stage. A button with a data-href attribute goes to that route. The Export and
 * Import buttons have no function yet.
 *
 * During the test run, the Try button is labeled Stop and ends the test run, and all other buttons are disabled.
 */
export class EditorButtons extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
	static template = TEMPLATE;

	/**
	 * Add the click handlers of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.querySelector('.test').addEventListener('click', () => {
			if (this.stage.mode.get() == 'test') this.stage.stopTest();
			else this.stage.test();
		});
		this.querySelector('.clear').addEventListener('click', () => this.stage.clearMap());
		for (const button of this.querySelectorAll('[data-href]')) {
			button.addEventListener('click', () => navigate(button.dataset.href));
		}
	}

	/**
	 * Subscribe to the mode of the stage to label the Try button and to disable the other buttons during the test run.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const test = this.querySelector('.test');
		return [
			this.stage.mode.subscribe((mode) => {
				const testing = mode == 'test';
				test.textContent = testing ? 'Stop' : 'Try';
				for (const button of this.querySelectorAll('button')) {
					if (button != test) button.disabled = testing;
				}
			}),
		];
	}

	/**
	 * Tell if the editor buttons show on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the editor screen, and on the play screen during the test run of the editor map.
	 */
	shouldShow(screen) {
		return screen === Screen.EDITOR || (screen === Screen.PLAY && this.stage.mode.get() == 'test');
	}
}
