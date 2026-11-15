/**
 * The base of the selection elements.
 */

import { loadMarkup, UiElement } from '../element.js';

// the file has only the shared style of the selection elements
await loadMarkup(import.meta.url);

/**
 * The base class of the selection elements. A selection lies on top of a preview on the stage. It has a back
 * link with the class back and a grid of menu buttons with the class choices. Each choice has its number in the
 * attribute data-choice.
 */
export class Selection extends UiElement {
	/**
	 * Add the class selection for the shared style, then connect as a UI element.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		this.classList.add('selection');
		super.connectedCallback();
	}

	/**
	 * Add the handlers that show the preview of the usable choice under the pointer. When the pointer leaves the grid,
	 * the stage shows the preview without a choice. A hidden element does not change the preview, because the pointer
	 * also leaves the grid when the element hides.
	 *
	 * @returns {void}
	 */
	setUp() {
		const choices = this.querySelector('.choices');
		choices.addEventListener('pointerover', (event) => {
			const target = /** @type {Element} */ (event.target);
			const choice = /** @type {HTMLElement|null} */ (
				target.closest('a[href][data-choice], button[data-choice]:enabled')
			);
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
