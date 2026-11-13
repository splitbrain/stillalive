/**
 * The CRT screen element.
 */

import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the shadow root of the CRT screen, with its style. */
const SHADOW_TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <crt-screen>. It shows its content behind the glass of an old CRT screen, in a crooked frame. The
 * content stays in the light DOM, so the styles of the page apply to it. The page sets the size of the element and
 * the aspect ratio of the content in the custom property --crt-aspect.
 */
export class CrtScreen extends ChromeElement {
	/**
	 * Create the shadow root with the frame, the glass, the effects and the slot for the content.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.attachShadow({ mode: 'open' }).append(document.importNode(SHADOW_TEMPLATE.content, true));
	}
}
