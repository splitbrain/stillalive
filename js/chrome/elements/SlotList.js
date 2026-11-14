/**
 * The slot list element.
 */

import { RouteMode } from '../../router.js';
import { LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { dispatch } from '../dom.js';
import { ChromeElement } from '../element.js';
import { editorMap } from '../storage.js';

/**
 * The custom element <slot-list>. It shows a menu button for each slot of the editor maps.
 *
 * The attribute mode is save or load, a value of RouteMode. In the load mode, the empty slots are disabled. Each
 * button has the slot number in the attribute data-choice. A click on a slot dispatches the bubbling event slot-select
 * with the slot number in detail.slot.
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
			const target = /** @type {Element} */ (event.target);
			const button = /** @type {HTMLButtonElement|null} */ (target.closest('button[data-choice]'));
			if (button) dispatch(this, 'slot-select', { slot: Number(button.dataset.choice) });
		});
	}

	/**
	 * Subscribe to the stored maps of the slots.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const unsubscribe = [];
		for (let slot = 1; slot <= LEVELS_PER_CAMPAIGN; slot++) {
			unsubscribe.push(editorMap(slot).subscribe(() => this.render()));
		}
		return unsubscribe;
	}

	/**
	 * Make the slot buttons from the attribute and the stored maps and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const loading = this.getAttribute('mode') === RouteMode.LOAD;
		const buttons = [];
		for (let slot = 1; slot <= LEVELS_PER_CAMPAIGN; slot++) {
			const stored = editorMap(slot).get() != null;
			const button = document.createElement('button');
			button.textContent = stored ? `Slot ${slot}` : 'Empty';
			button.dataset.choice = String(slot);
			button.disabled = loading && !stored;
			const menuButton = document.createElement('menu-button');
			menuButton.append(button);
			buttons.push(menuButton);
		}
		this.replaceChildren(...buttons);
	}
}
