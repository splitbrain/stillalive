/**
 * The level selection element.
 */

import { campaignPath } from '../../router.js';
import { CAMPAIGN_FOLDERS } from '../../stage/constants.js';
import { campaigns } from '../campaigns.js';
import { ChromeElement, loadMarkup, Screen } from '../element.js';
import { bestTimes, getBestTime, maxLevel } from '../storage.js';
import { toTime } from '../time.js';

/** @type {HTMLTemplateElement|null} The markup of the level selection. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <level-selection>. It is the selection screen of a campaign, on top of the preview of a level.
 *
 * The attribute campaign is the folder name of the campaign, and the attribute level is the selected level number, or
 * 0 for none. Without a selected level, the element shows the level list. The stage then shows the preview of the
 * level under the pointer, or of the highest unlocked level when the pointer is on no unlocked level. With a selected
 * level, the element shows the details of the level: its title, its number, its best time, the Play link and the
 * Replay link. The Replay link is disabled when the level has no best time. The back link goes from the details to the
 * level list, and from the level list to the main menu.
 */
export class LevelSelection extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the level selection. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'level'];

	/**
	 * Add the handlers that show the preview of the level under the pointer.
	 *
	 * @returns {void}
	 */
	setUp() {
		const list = this.querySelector('level-list');
		list.addEventListener('pointerover', (event) => {
			const link = event.target.closest('a[href]');
			if (link) this.#preview(Number(link.dataset.level));
		});
		list.addEventListener('pointerleave', () => this.#preview(0));
	}

	/**
	 * Subscribe to the progress of all campaigns and to the best times.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		return [bestTimes.subscribe(() => this.render()), ...maxLevel.map((value) => value.subscribe(() => this.render()))];
	}

	/**
	 * Show the level list or the details of the selected level, and set the links from the attributes, the progress
	 * and the best times.
	 *
	 * @returns {void}
	 */
	render() {
		const folder = this.getAttribute('campaign');
		const index = CAMPAIGN_FOLDERS.indexOf(folder);
		if (index < 0) return;
		const level = Number(this.getAttribute('level') ?? 0);
		const list = this.querySelector('level-list');
		list.hidden = level > 0;
		list.setAttribute('campaign', folder);
		list.setAttribute('unlocked', String(maxLevel[index].get()));
		this.querySelector('.details').hidden = level == 0;
		this.querySelector('.back').setAttribute('href', level > 0 ? campaignPath(folder) : '#/');
		if (level > 0) this.#renderDetails(index, level);
	}

	/**
	 * Fill the details of the selected level. A level without a title shows its number as the title.
	 *
	 * @param {number} index The campaign index.
	 * @param {number} level The level number.
	 * @returns {void}
	 */
	#renderDetails(index, level) {
		const folder = CAMPAIGN_FOLDERS[index];
		const title = campaigns?.[index]?.levels[level - 1]?.title ?? '';
		const best = getBestTime(folder, level);
		this.querySelector('.title').textContent = title || 'Level ' + level;
		const number = this.querySelector('.number');
		number.hidden = title === '';
		number.textContent = 'Level ' + level;
		this.querySelector('.best span').textContent = best === null ? '-' : toTime(best);
		this.querySelector('.play').setAttribute('href', campaignPath(folder, level, 'play'));
		const replay = this.querySelector('.replay');
		if (best === null) replay.removeAttribute('href');
		else replay.setAttribute('href', campaignPath(folder, level, 'replay'));
	}

	/**
	 * Show the preview of a level on the stage. Only the level list changes the preview.
	 *
	 * @param {number} level The level number, or 0 for the highest unlocked level.
	 * @returns {void}
	 */
	#preview(level) {
		if (Number(this.getAttribute('level') ?? 0) > 0) return;
		const campaign = campaigns[CAMPAIGN_FOLDERS.indexOf(this.getAttribute('campaign'))];
		this.stage.preview(campaign.levels[(level || campaign.unlocked) - 1]);
	}

	/**
	 * Tell if the level selection shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the select screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.SELECT;
	}
}
