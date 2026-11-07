/**
 * The level list element.
 */

import { campaignPath } from '../../router.js';
import { campaigns } from '../campaigns.js';
import { ChromeElement } from '../element.js';

/**
 * The custom element <level-list>. It shows a menu button with a link for each level of a campaign.
 *
 * The attribute campaign is the folder name of the campaign, and the attribute unlocked is the highest unlocked level
 * number. A locked level has no link target, so its button is disabled. Each link has the level number in the
 * attribute data-choice.
 */
export class LevelList extends ChromeElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'unlocked'];

	/**
	 * Make the level buttons from the attributes and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const folder = this.getAttribute('campaign');
		const unlocked = Number(this.getAttribute('unlocked') ?? 0);
		const count = campaigns?.find((c) => c.folder === folder)?.levels.length ?? 0;
		const buttons = [];
		for (let n = 1; n <= count; n++) {
			const link = document.createElement('a');
			link.textContent = 'Level ' + n;
			link.dataset.choice = String(n);
			if (n <= unlocked) link.setAttribute('href', campaignPath(folder, n));
			const button = document.createElement('menu-button');
			button.append(link);
			buttons.push(button);
		}
		this.replaceChildren(...buttons);
	}
}
