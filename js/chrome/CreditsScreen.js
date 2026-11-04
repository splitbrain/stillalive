/**
 * The credits element.
 */

import { navigate } from '../router.js';
import { credits } from './campaigns.js';

/**
 * The custom element <credits-screen>. It fills the lines of the credits from its template into its scroll element.
 * A CSS animation scrolls the lines. The scroll element is in a link to the main menu, so a click goes to the main
 * menu. The end of the animation goes to the main menu too.
 *
 * The animation starts again each time the screen shows, because the hidden attribute removes the screen from the
 * layout and a CSS animation starts when its element comes back into the layout.
 */
export class CreditsScreen extends HTMLElement {
	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which adds the event handler. */
	#setUp = false;

	/**
	 * Subscribe to the lines of the credits. On the first connect, handle the end of the animation.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (!this.#setUp) {
			this.#setUp = true;
			this.addEventListener('animationend', (event) => {
				if (event.animationName === 'credits-scroll') navigate('#/');
			});
		}
		const scroll = this.querySelector('.scroll');
		const template = this.querySelector('template');
		this.#unsubscribe = [
			credits.subscribe((lines) => {
				scroll.replaceChildren(
					...lines.map((line) => {
						const paragraph = template.content.firstElementChild.cloneNode();
						paragraph.textContent = line;
						return paragraph;
					}),
				);
			}),
		];
	}

	/**
	 * Remove the subscriptions.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
	}
}
