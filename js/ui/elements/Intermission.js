/**
 * The intermission panel element.
 */

import { dispatch, requireElement, setLink } from '../dom.js';
import { loadMarkup, Screen, UiElement } from '../element.js';
import { toTime } from '../time.js';

/** @type {HTMLTemplateElement|null} The markup of the intermission panel. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <ui-intermission>. It shows the time and the choices after a level. It shows on the play
 * screen while it has the attribute open.
 *
 * The attribute time is the level time in ticks, and the attribute message is the text under the time. The attributes
 * exit, restart and next are the paths of the Exit, Restart and Continue links. A link without its attribute is
 * hidden. The Watch Replay button dispatches the bubbling event replay-watch.
 */
export class Intermission extends UiElement {
	/** @type {HTMLTemplateElement|null} The markup of the intermission panel. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['time', 'message', 'exit', 'restart', 'next'];

	/**
	 * Add the handler of the Watch Replay button.
	 *
	 * @returns {void}
	 */
	setUp() {
		requireElement(this, '.replay', HTMLElement).addEventListener('click', () => {
			dispatch(this, 'replay-watch');
		});
	}

	/**
	 * Fill the time and the message, and set the links from the attributes.
	 *
	 * @returns {void}
	 */
	render() {
		requireElement(this, '.time', HTMLElement).textContent =
			`Your time: ${toTime(Number(this.getAttribute('time') ?? 0))}`;
		requireElement(this, '.message', HTMLElement).textContent = this.getAttribute('message') ?? '';
		setLink(requireElement(this, '.exit', HTMLAnchorElement), this.getAttribute('exit'));
		setLink(requireElement(this, '.restart', HTMLAnchorElement), this.getAttribute('restart'));
		setLink(requireElement(this, '.next', HTMLAnchorElement), this.getAttribute('next'));
	}

	/**
	 * Tell if the intermission panel shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the play screen while the panel is open.
	 */
	shouldShow(screen) {
		return screen === Screen.PLAY && this.hasAttribute('open');
	}
}
