/**
 * The VCR panel element.
 */

import { dispatch } from '../dom.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the VCR panel. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {number[]} The speeds of the playback, in the order of the Speed button. */
const SPEEDS = [1, 2, 4];

/**
 * The custom element <vcr-panel>. It is the front of a VCR that controls the playback of a replay. The Stop button
 * dispatches the bubbling event replay-stop.
 */
export class VcrPanel extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the VCR panel. */
	static template = TEMPLATE;

	/**
	 * Add the handlers of the buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		const stage = this.stage;
		this.querySelector('.stop').addEventListener('click', () => {
			dispatch(this, 'replay-stop');
		});
		this.querySelector('.play').addEventListener('click', () => {
			if (stage.paused.get()) stage.resume();
			else stage.pause();
		});
		this.querySelector('.fast').addEventListener('click', () => {
			const next = SPEEDS[(SPEEDS.indexOf(stage.speed.get()) + 1) % SPEEDS.length];
			stage.setSpeed(next);
		});
	}

	/**
	 * Subscribe to the speed of the stage to light the lamp of the current speed.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const lamps = /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('.lamp'));
		return [
			this.stage.speed.subscribe((speed) => {
				for (const lamp of lamps) lamp.classList.toggle('on', Number(lamp.dataset.speed) === speed);
			}),
		];
	}

	/**
	 * Tell if the VCR panel shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the replay screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.REPLAY;
	}
}
