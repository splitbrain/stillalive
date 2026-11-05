/**
 * The slot list element.
 */

import { LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { dispatch } from '../dom.js';
import { ChromeElement, loadMarkup } from '../element.js';
import { editorMap } from '../storage.js';

/** @type {HTMLTemplateElement|null} The markup of the slot list, null because the list has only a style. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <slot-list>. It shows a button for each slot of the editor maps.
 *
 * The attribute mode is save or load, and the attribute selected is the selected slot number, or 0 for none. A slot
 * with a stored map has the class stored. The load screen disables the empty slots. The selected slot has the class
 * selected. A click on a slot dispatches the bubbling event slot-select with the slot number as detail.slot.
 */
export class SlotList extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the slot list, null because the list has only a style. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode', 'selected'];

	/**
	 * Add the click handler of the slot buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-slot]');
			if (button) dispatch(this, 'slot-select', { slot: Number(button.dataset.slot) });
		});
	}

	/**
	 * Subscribe to the stored maps of the slots.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const unsubscribe = [];
		for (let n = 1; n <= LEVELS_PER_CAMPAIGN; n++) unsubscribe.push(editorMap(n).subscribe(() => this.render()));
		return unsubscribe;
	}

	/**
	 * Make the slot buttons from the attributes and the stored maps and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const loading = this.getAttribute('mode') == 'load';
		const selected = Number(this.getAttribute('selected') ?? 0);
		const buttons = [];
		for (let n = 1; n <= LEVELS_PER_CAMPAIGN; n++) {
			const button = document.createElement('button');
			const stored = editorMap(n).get() != null;
			button.textContent = 'Slot ' + n;
			button.dataset.slot = String(n);
			button.classList.toggle('stored', stored);
			button.classList.toggle('selected', n == selected);
			button.disabled = loading && !stored;
			buttons.push(button);
		}
		this.replaceChildren(...buttons);
	}
}
