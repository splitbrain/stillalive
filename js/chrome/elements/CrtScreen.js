/**
 * The CRT screen element.
 */

import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the shadow root of the CRT screen, with its style. */
const SHADOW_TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <crt-screen>. It shows its content behind the glass of an old CRT screen, in a crooked frame. The
 * frame, the glass and the effects on the glass are in the shadow root; the content stays in the light DOM, so the
 * styles of the page still apply to it.
 *
 * The page gives the element its size, and the screen is as large as this size allows. It is centered vertically and
 * lies at the left edge. The custom property --crt-aspect sets the aspect ratio of the content, and the page must set
 * it. The content is clipped to the shape of the glass, which the element also sets as the custom property
 * --crt-glass. Apart from its custom properties, the element sets no inherited properties, so the content inherits from
 * the page as before.
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
