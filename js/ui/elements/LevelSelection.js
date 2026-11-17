/**
 * The level selection element.
 */

import { routePath, RouteName } from '../../router.js';
import { campaignById } from '../../data/campaigns.js';
import { dispatch } from '../dom.js';
import { loadMarkup, Screen } from '../element.js';
import { bestTimes, getBestTime, maxLevel } from '../../data/storage.js';
import { toTime } from '../time.js';
import { Selection } from './Selection.js';

/** @type {HTMLTemplateElement|null} The markup of the level selection. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <ui-level-selection>. It shows the levels of a campaign on the select screen, on top of the
 * preview of a level.
 *
 * The attribute campaign is the campaign id, and the attribute level is the selected level number, or
 * 0 for none. Without a selected level, the element shows the level list. With a selected level, the element shows
 * the details of the level. The back link goes up from the details to the level list, and from the level list to the
 * main menu. The pointer on a level of the list dispatches the bubbling event level-shown with the level number in
 * detail.level, or with 0 when the pointer leaves the list.
 */
export class LevelSelection extends Selection {
	/** @type {HTMLTemplateElement|null} The markup of the level selection. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'level'];

	/**
	 * Subscribe to the progress of all campaigns and to the best times.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		return [
			bestTimes.subscribe(() => this.render()),
			...Object.values(maxLevel).map((value) => value.subscribe(() => this.render())),
		];
	}

	/**
	 * Show the level list or the details of the selected level, and set the links from the attributes, the progress
	 * and the best times.
	 *
	 * @returns {void}
	 */
	render() {
		const id = this.getAttribute('campaign');
		const campaign = campaignById(id);
		if (!campaign) return;
		const level = Number(this.getAttribute('level') ?? 0);
		const list = /** @type {HTMLElement} */ (this.querySelector('ui-level-list'));
		list.hidden = level > 0;
		list.setAttribute('campaign', id);
		/** @type {HTMLElement} */ (this.querySelector('.details')).hidden = level === 0;
		this.querySelector('.back').setAttribute('href', level > 0 ? routePath(RouteName.SELECT, id) : '#/');
		if (level > 0) this.#renderDetails(campaign, level);
	}

	/**
	 * Fill the details of the selected level. A level without a title shows its number as the title. A level without a
	 * best time has a disabled Replay link.
	 *
	 * @param {import('../../data/campaigns.js').Campaign} campaign The campaign.
	 * @param {number} level The level number.
	 * @returns {void}
	 */
	#renderDetails(campaign, level) {
		const id = campaign.id;
		const title = campaign.levels[level - 1]?.title ?? '';
		const best = getBestTime(id, level);
		this.querySelector('.title').textContent = title || `Level ${level}`;
		const number = /** @type {HTMLElement} */ (this.querySelector('.number'));
		number.hidden = title === '';
		number.textContent = `Level ${level}`;
		this.querySelector('.best span').textContent = best === null ? '-' : toTime(best);
		this.querySelector('.play').setAttribute('href', routePath(RouteName.PLAY, id, level));
		const replay = this.querySelector('.replay');
		if (best === null) replay.removeAttribute('href');
		else replay.setAttribute('href', routePath(RouteName.REPLAY, id, level));
	}

	/**
	 * Dispatch the bubbling event level-shown with the level for the preview in detail.level. Only the level list
	 * changes the preview.
	 *
	 * @param {number} level The level number, or 0 for the highest unlocked level.
	 * @returns {void}
	 */
	previewChoice(level) {
		if (Number(this.getAttribute('level') ?? 0) > 0) return;
		dispatch(this, 'level-shown', { level });
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
