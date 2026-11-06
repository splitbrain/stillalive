/**
 * The level list element.
 */

import { campaignPath } from '../../router.js';
import { LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the level list, null because the list has only a style. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <level-list>. It shows a menu button with a link for each level of a campaign.
 *
 * The attribute campaign is the folder name of the campaign, and the attribute unlocked is the highest unlocked level
 * number. A locked level has no link target, so its button is disabled. Each link has the level number in the
 * attribute data-level.
 */
export class LevelList extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the level list, null because the list has only a style. */
	static template = TEMPLATE;

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
		const buttons = [];
		for (let n = 1; folder !== null && n <= LEVELS_PER_CAMPAIGN; n++) {
			const link = document.createElement('a');
			link.textContent = 'Level ' + n;
			link.dataset.level = String(n);
			if (n <= unlocked) link.setAttribute('href', campaignPath(folder, n));
			const button = document.createElement('menu-button');
			button.append(link);
			buttons.push(button);
		}
		this.replaceChildren(...buttons);
	}
}
