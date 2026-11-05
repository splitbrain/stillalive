/**
 * The level selection element.
 */

import { campaignPath } from '../../router.js';
import { CAMPAIGN_FINISHED, CAMPAIGN_FOLDERS, CampaignId } from '../../stage/constants.js';
import { setLink } from '../dom.js';
import { ChromeElement, loadMarkup, Screen } from '../element.js';
import { maxLevel } from '../storage.js';

/** @type {HTMLTemplateElement|null} The markup of the level selection. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <level-selection>. It is the selection screen of a campaign. It shows the list of the levels and
 * the Exit, mode and Play links.
 *
 * The attribute campaign is the folder name of the campaign, and the attribute level is the selected level number, or
 * 0 for none. The element gives the campaign, the selected level and the highest unlocked level to the level list. The
 * Play link goes to the play route of the selected level. The mode link switches between the normal and the advanced
 * campaign. It shows in the advanced campaign, and in the normal campaign after the player has finished it.
 */
export class LevelSelection extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the level selection. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'level'];

	/**
	 * Subscribe to the progress of all campaigns. The mode link depends on the progress of the normal campaign.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		return maxLevel.map((value) => value.subscribe(() => this.render()));
	}

	/**
	 * Set the attributes of the level list and the links from the attributes and the progress.
	 *
	 * @returns {void}
	 */
	render() {
		const folder = this.getAttribute('campaign');
		const index = CAMPAIGN_FOLDERS.indexOf(folder);
		if (index < 0) return;
		const level = Number(this.getAttribute('level') ?? 0);
		const list = this.querySelector('level-list');
		list.setAttribute('campaign', folder);
		list.setAttribute('selected', String(level));
		list.setAttribute('unlocked', String(maxLevel[index].get()));

		setLink(this.querySelector('.play'), level > 0 ? campaignPath(folder, level, 'play') : null);
		const hasMode =
			index == CampaignId.ADVANCED ||
			(index == CampaignId.NORMAL && maxLevel[CampaignId.NORMAL].get() == CAMPAIGN_FINISHED);
		const other = index == CampaignId.NORMAL ? CampaignId.ADVANCED : CampaignId.NORMAL;
		const mode = this.querySelector('.mode');
		setLink(mode, hasMode ? campaignPath(CAMPAIGN_FOLDERS[other]) : null);
		mode.textContent = index == CampaignId.NORMAL ? 'Hard Mode' : 'Normal Mode';
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
