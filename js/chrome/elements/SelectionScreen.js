/**
 * The base of the selection screens.
 */

import { ChromeScreen, loadMarkup } from '../element.js';

// the file has only the shared style of the selection screens
await loadMarkup(import.meta.url);

/**
 * The base class of the selection screens: the level selection and the save and load screen of the editor. A selection
 * screen lies on top of a preview on the stage. It has a back link with the class back and a grid of menu buttons
 * with the class choices.
 *
 * On each connect, the element adds the class selection-screen to itself for the shared style. When the pointer moves
 * onto a usable choice, the element calls previewChoice() with the number in the data-choice attribute of the choice.
 * When the pointer leaves the grid, it calls previewChoice() with 0. A hidden screen does not change the preview,
 * because the pointer also leaves the grid when the screen hides.
 */
export class SelectionScreen extends ChromeScreen {
	/**
	 * Add the class selection-screen, then connect as a screen part.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		this.classList.add('selection-screen');
		super.connectedCallback();
	}

	/**
	 * Add the handlers that show the preview of the choice under the pointer.
	 *
	 * @returns {void}
	 */
	setUp() {
		const choices = this.querySelector('.choices');
		choices.addEventListener('pointerover', (event) => {
			const choice = event.target.closest('a[href][data-choice], button[data-choice]:enabled');
			if (choice && !this.hidden) this.previewChoice(Number(choice.dataset.choice));
		});
		choices.addEventListener('pointerleave', () => {
			if (!this.hidden) this.previewChoice(0);
		});
	}

	/**
	 * Show the preview of a choice on the stage. The default does nothing.
	 *
	 * @param {number} choice The number of the choice, or 0 for the preview without a choice.
	 * @returns {void}
	 */
	// eslint-disable-next-line no-unused-vars
	previewChoice(choice) {}
}
