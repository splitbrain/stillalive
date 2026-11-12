/**
 * The intermission panel element.
 */

import { dispatch, setLink } from '../dom.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';
import { toTime } from '../time.js';

/** @type {HTMLTemplateElement|null} The markup of the intermission panel. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <intermission-panel>. It shows the choice after a level: the time, the message, the Exit, Restart
 * and Continue links and the Watch Replay button. It shows on the play screen while it has the attribute open.
 *
 * The attribute time is the level time in ticks, message is the message under the time, exit, restart and next are the
 * paths of the Exit, Restart and Continue links. A link without its attribute is hidden. The Exit link goes up in
 * the history to its path, and the Continue link replaces the entry of the level. The Watch Replay button dispatches the bubbling event replay-watch; the app
 * element plays the replay of the level that just ended.
 */
export class IntermissionPanel extends ChromeScreen {
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
		this.querySelector('.replay').addEventListener('click', () => {
			dispatch(this, 'replay-watch');
		});
	}

	/**
	 * Fill the time and the message, and set the links and the button from the attributes.
	 *
	 * @returns {void}
	 */
	render() {
		this.querySelector('.time').textContent = 'Your time: ' + toTime(Number(this.getAttribute('time') ?? 0));
		this.querySelector('.message').textContent = this.getAttribute('message') ?? '';
		setLink(this.querySelector('.exit'), this.getAttribute('exit'));
		setLink(this.querySelector('.restart'), this.getAttribute('restart'));
		setLink(this.querySelector('.next'), this.getAttribute('next'));
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
