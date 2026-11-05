/**
 * The best times element.
 */

import { campaignPath } from '../../router.js';
import { LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { decodeReplay } from '../../stage/replay.js';
import { campaigns } from '../campaigns.js';
import { alertDialog } from '../dialog.js';
import { ChromeElement, loadMarkup, Screen } from '../element.js';
import { downloadJson, pickJsonFile } from '../files.js';
import { bestTimes, getBestTime, getCampaignTotal, loadBestReplay } from '../storage.js';
import { toTime } from '../time.js';

/** @type {HTMLTemplateElement|null} The markup of the best times panel. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <best-times>. It is a panel with lines about the best times. The element shows the lines that
 * apply and fills them.
 *
 * The attribute campaign is the folder name of the campaign, and the attribute level is the level number, or 0 for
 * none. Without the attribute mode, the panel is the one of the level selection: the best time of the selected level,
 * the Watch link to the replay route, the Export button for the stored replay of the best time, and the Import button
 * for a replay file. With the attribute mode, play or replay, the panel is the one of a running level: the level time
 * and the best time. The panel always shows the sum of the best times of the campaign. It opens only for a campaign
 * with records, and then has the class open.
 *
 * The import checks the replay file and dispatches the bubbling event replay-import with the replay in the file format
 * as detail.replay. The app element plays it.
 */
export class BestTimes extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the best times panel. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'level', 'mode'];

	/**
	 * Add the handlers of the Export and the Import buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		const onError = (error) => alertDialog(error.message, 'Replay');
		this.querySelector('.export button').addEventListener('click', () => this.#export().catch(onError));
		this.querySelector('.import button').addEventListener('click', () => this.#import().catch(onError));
	}

	/**
	 * Subscribe to the best times and to the level time.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const time = this.querySelector('.time span');
		return [
			bestTimes.subscribe(() => this.render()),
			this.stage.time.subscribe((ticks) => {
				time.textContent = toTime(ticks);
			}),
		];
	}

	/**
	 * Show the lines of the panel that apply and fill them from the attributes and the best times.
	 *
	 * @returns {void}
	 */
	render() {
		const folder = this.getAttribute('campaign');
		const campaign = folder === null ? undefined : campaigns?.find((c) => c.folder === folder);
		this.classList.toggle('open', campaign?.records === true);
		if (!campaign?.records) return;

		const level = Number(this.getAttribute('level') ?? 0);
		const mode = this.getAttribute('mode');
		const best = level > 0 ? getBestTime(folder, level) : null;
		const total = getCampaignTotal(folder);
		const selecting = mode === null;

		const title = this.querySelector('.title');
		title.hidden = level == 0;
		title.textContent = 'Level ' + level + (mode === 'replay' ? ' (replay)' : '');
		this.querySelector('.time').hidden = selecting;
		const bestLine = this.querySelector('.best');
		bestLine.hidden = level == 0;
		bestLine.querySelector('span').textContent = best === null ? '-' : toTime(best);
		this.querySelector('.watch').hidden = !selecting || best === null;
		this.querySelector('.watch a').setAttribute('href', campaignPath(folder, level, 'replay'));
		this.querySelector('.export').hidden = !selecting || best === null;
		this.querySelector('.import').hidden = !selecting;
		this.querySelector('.total-time').textContent = toTime(total.ticks);
		this.querySelector('.total-levels').textContent = total.levels + ' of ' + LEVELS_PER_CAMPAIGN + ' levels';
	}

	/**
	 * Tell if the panel shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the select and the play screen.
	 */
	shouldShow(screen) {
		return screen === Screen.SELECT || screen === Screen.PLAY;
	}

	/**
	 * Let the browser download the stored replay of the best time of the level as a JSON file.
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If there is no stored replay.
	 */
	async #export() {
		const data = await loadBestReplay(this.getAttribute('campaign'), Number(this.getAttribute('level')));
		if (!data) throw new Error('There is no stored replay for this level.');
		downloadJson(data, `stillalivejs-${data.campaign}-${String(data.level).padStart(2, '0')}.json`);
	}

	/**
	 * Let the player select a replay file, check it and dispatch the replay-import event. Nothing happens if the panel
	 * is not the one of the level selection when the player has selected the file.
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If the replay is not valid or the campaign or level does not exist.
	 */
	async #import() {
		const data = await pickJsonFile();
		if (data === null || !this.hasAttribute('campaign') || this.hasAttribute('mode')) return;
		decodeReplay(data);
		const known = campaigns.some((c) => c.folder === data.campaign && c.records);
		if (!known || data.level < 1 || data.level > LEVELS_PER_CAMPAIGN) {
			throw new Error('The replay is for an unknown level.');
		}
		this.dispatchEvent(new CustomEvent('replay-import', { bubbles: true, detail: { replay: data } }));
	}
}
