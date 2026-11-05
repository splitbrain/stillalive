/**
 * The element of the buttons of the save and load screen.
 */

import { dispatch } from '../dom.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the buttons of the save and load screen. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <editor-file-buttons>. It shows the Exit link back to the editor and the Export, Import and accept
 * buttons.
 *
 * The attribute mode is save or load, and the attribute selected is the selected slot number, or 0 for none. The
 * accept button is labeled Save or Load by the mode and shows only with a selected slot. The Export button shows on
 * the save screen, and on the load screen with a selected slot. A click on the Export button dispatches the bubbling
 * event file-export, on the Import button file-import, and on the accept button file-accept. The name of each event is
 * in the data-event attribute of its button.
 */
export class EditorFileButtons extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the buttons of the save and load screen. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode', 'selected'];

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

	/**
	 * Show the buttons that apply and label the accept button.
	 *
	 * @returns {void}
	 */
	render() {
		const saving = this.getAttribute('mode') == 'save';
		const selected = Number(this.getAttribute('selected') ?? 0) > 0;
		const accept = this.querySelector('.accept');
		accept.textContent = saving ? 'Save' : 'Load';
		accept.hidden = !selected;
		this.querySelector('.export').hidden = !saving && !selected;
	}
}
