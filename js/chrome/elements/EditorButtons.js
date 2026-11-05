/**
 * The editor buttons element.
 */

import { dispatch } from '../dom.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <editor-buttons>. It shows the Exit, Load and Save links and the Clear, Try Map and Help buttons.
 *
 * A click on the Clear button dispatches the bubbling event map-clear, on the Try Map button map-test, and on the Help
 * button help-show. The name of each event is in the data-event attribute of its button.
 */
export class EditorButtons extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the editor buttons. */
	static template = TEMPLATE;

	/**
	 * Add the click handler of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-event]');
			if (button) dispatch(this, button.dataset.event);
		});
	}
}
