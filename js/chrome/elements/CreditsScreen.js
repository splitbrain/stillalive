/**
 * The credits element.
 */

import { navigate } from '../../router.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the credits. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <credits-screen>. It shows the paragraphs of the credits in its scroll element. A CSS
 * animation scrolls them. The scroll element is in a link to the main menu, so a click goes to the main menu. The
 * end of the animation goes to the main menu too.
 *
 * The animation starts again each time the screen shows, because the hidden attribute removes the screen from the
 * layout and a CSS animation starts when its element comes back into the layout.
 */
export class CreditsScreen extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the credits. */
	static template = TEMPLATE;

	/**
	 * Go to the main menu at the end of the scroll animation.
	 *
	 * @returns {void}
	 */
	setUp() {
		this.addEventListener('animationend', (event) => {
			if (event.animationName === 'credits-scroll') navigate('#/');
		});
	}

	/**
	 * Tell if the credits show on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the credits screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.CREDITS;
	}
}
