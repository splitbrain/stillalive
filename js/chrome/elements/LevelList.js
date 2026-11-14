/**
 * The level list element.
 */

import { campaignPath } from '../../router.js';
import { campaignByFolder } from '../campaigns.js';
import { ChromeElement } from '../element.js';

/**
 * The custom element <level-list>. It shows a menu button with a link for each level of a campaign.
 *
 * The attribute campaign is the folder name of the campaign. A level that cannot be played has no link target, so its
 * button is disabled. Each link has the level number in the attribute data-choice.
 */
export class LevelList extends ChromeElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign'];

	/**
	 * Make the level buttons from the attribute and the campaign and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const folder = this.getAttribute('campaign');
		const campaign = campaignByFolder(folder);
		const count = campaign?.levels.length ?? 0;
		const buttons = [];
		for (let level = 1; level <= count; level++) {
			const link = document.createElement('a');
			link.textContent = `Level ${level}`;
			link.dataset.choice = String(level);
			if (campaign.isOpen(level)) link.setAttribute('href', campaignPath(folder, level));
			const button = document.createElement('menu-button');
			button.append(link);
			buttons.push(button);
		}
		this.replaceChildren(...buttons);
	}
}
