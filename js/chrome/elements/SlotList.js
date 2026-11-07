/**
 * The slot list element.
 */

import { LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { dispatch } from '../dom.js';
import { ChromeElement } from '../element.js';
import { editorMap } from '../storage.js';

/**
 * The custom element <slot-list>. It shows a menu button for each slot of the editor maps.
 *
 * The attribute mode is save or load. A slot with a stored map is labeled with its number, an empty slot is labeled
 * Empty. The load screen disables the empty slots. Each button has the slot number in the
 * attribute data-choice. A click on a slot dispatches the bubbling event slot-select with the slot number as
 * detail.slot.
 */
export class SlotList extends ChromeElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['mode'];

	/**
	 * Add the click handler of the slot buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-choice]');
			if (button) dispatch(this, 'slot-select', { slot: Number(button.dataset.choice) });
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
	 * Make the slot buttons from the attribute and the stored maps and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const loading = this.getAttribute('mode') == 'load';
		const buttons = [];
		for (let n = 1; n <= LEVELS_PER_CAMPAIGN; n++) {
			const stored = editorMap(n).get() != null;
			const button = document.createElement('button');
			button.textContent = stored ? 'Slot ' + n : 'Empty';
			button.dataset.choice = String(n);
			button.disabled = loading && !stored;
			const menuButton = document.createElement('menu-button');
			menuButton.append(button);
			buttons.push(menuButton);
		}
		this.replaceChildren(...buttons);
	}
}
