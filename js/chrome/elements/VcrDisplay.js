/**
 * The VCR display element.
 */

import { isReplayRoute } from '../../router.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the VCR display. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * Format a level time as the time code of a VCR.
 *
 * @param {number} time The time in ticks of 1/60 second.
 * @returns {string} The time as hours, minutes and seconds, e.g. "0:01:23".
 */
function toTimeCode(time) {
	const seconds = Math.floor(time / 60);
	const h = Math.floor(seconds / 3600);
	const m = Math.floor(seconds / 60) % 60;
	const s = seconds % 60;
	return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/**
 * The custom element <vcr-display>. In the playback of a replay, it shows the mode of the playback and the time code
 * of the level time on top of the stage, in the style of a VCR.
 */
export class VcrDisplay extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the VCR display. */
	static template = TEMPLATE;

	/**
	 * Subscribe to the speed, the pause and the time of the stage.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const stage = this.stage;
		const mode = this.querySelector('.mode');
		const label = this.querySelector('.label');
		const time = this.querySelector('.time');
		const showMode = () => {
			const speed = stage.speed.get();
			if (stage.paused.get()) mode.dataset.mode = 'pause';
			else mode.dataset.mode = speed > 1 ? 'fast' : 'play';
			label.textContent = { pause: 'PAUSE', fast: speed + 'x', play: 'PLAY' }[mode.dataset.mode];
		};
		return [
			stage.speed.subscribe(showMode),
			stage.paused.subscribe(showMode),
			stage.time.subscribe((value) => {
				time.textContent = toTimeCode(value);
			}),
		];
	}

	/**
	 * Tell if the VCR display shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the play screen of a replay route.
	 */
	shouldShow(screen) {
		return screen === Screen.PLAY && isReplayRoute();
	}
}
