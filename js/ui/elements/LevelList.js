/**
 * The level list element.
 */

import { routePath, RouteName } from '../../router.js';
import { campaignById } from '../../data/campaigns.js';
import { UiElement } from '../element.js';

/**
 * The custom element <ui-level-list>. It shows a menu button with a link for each level of a campaign.
 *
 * The attribute campaign is the campaign id. A level that cannot be played has no link target, so its
 * button is disabled. Each link has the level number in the attribute data-choice.
 */
export class LevelList extends UiElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign'];

	/**
	 * Make the level buttons from the attribute and the campaign and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const id = this.getAttribute('campaign');
		const campaign = campaignById(id);
		if (!campaign) {
			this.replaceChildren();
			return;
		}
		const buttons = [];
		for (let level = 1; level <= campaign.levels.length; level++) {
			const link = document.createElement('a');
			link.textContent = `Level ${level}`;
			link.dataset.choice = String(level);
			if (campaign.isOpen(level)) link.setAttribute('href', routePath(RouteName.SELECT, campaign.id, level));
			const button = document.createElement('ui-button');
			button.append(link);
			buttons.push(button);
		}
		this.replaceChildren(...buttons);
	}
}
