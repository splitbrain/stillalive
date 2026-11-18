/**
 * The CRT element.
 */

import { loadMarkup, UiElement } from '../element.js';

/** @type {HTMLTemplateElement} The markup of the shadow root of the CRT, with its style. Crt.html has a template. */
const SHADOW_TEMPLATE = /** @type {HTMLTemplateElement} */ (await loadMarkup(import.meta.url));

/**
 * The custom element <ui-crt>. It shows its content behind the glass of an old CRT monitor, in a crooked frame. The
 * content stays in the light DOM, so the styles of the page apply to it. The page sets the size of the element and
 * the aspect ratio of the content in the custom property --crt-aspect.
 */
export class Crt extends UiElement {
	/**
	 * Create the shadow root with the frame, the glass, the effects and the slot for the content.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.attachShadow({ mode: 'open' }).append(document.importNode(SHADOW_TEMPLATE.content, true));
	}
}
