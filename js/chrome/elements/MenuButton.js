/**
 * The menu button element.
 */

import { ChromeElement, loadMarkup } from '../element.js';

// the file has no template, only the style
await loadMarkup(import.meta.url);

/** @type {number} The number of the custom properties that move the corners of the button. */
const SKEW_PROPERTIES = 8;

/**
 * The custom element <menu-button>. It gives the look of a menu button to the link or the button inside it. The
 * attribute small gives a smaller button. A link without a target and a disabled button show as disabled.
 */
export class MenuButton extends ChromeElement {
	/**
	 * Give the button a random crooked shape.
	 *
	 * @returns {void}
	 */
	setUp() {
		for (let index = 1; index <= SKEW_PROPERTIES; index++) {
			this.style.setProperty(`--skew-${index}`, Math.random().toFixed(2));
		}
	}
}
