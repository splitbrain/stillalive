/**
 * The menu button element.
 */

import { ChromeElement, loadMarkup } from '../element.js';

// the file has no template, only the style
await loadMarkup(import.meta.url);

/** @type {number} The number of the custom properties that move the corners of the button. */
const SKEW_PROPERTIES = 8;

/**
 * The custom element <menu-button>. It gives the look of a menu button to the link or the button inside it. The link
 * or the button keeps all its attributes and its behavior. The attribute small gives a smaller button. A link without a
 * target and a disabled button show as disabled.
 *
 * Each menu button gets a random crooked shape when it is built.
 */
export class MenuButton extends ChromeElement {
	/**
	 * Set the custom properties that move the corners of the button to random values from 0 to 1.
	 *
	 * @returns {void}
	 */
	setUp() {
		for (let n = 1; n <= SKEW_PROPERTIES; n++) {
			this.style.setProperty('--skew-' + n, Math.random().toFixed(2));
		}
	}
}
