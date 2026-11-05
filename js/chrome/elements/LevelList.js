/**
 * The level list element.
 */

import { campaignPath } from '../../router.js';
import { LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { ChromeElement, loadMarkup } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the level list, null because the list has only a style. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <level-list>. It shows a link for each level of a campaign.
 *
 * The attribute campaign is the folder name of the campaign, the attribute selected is the selected level number, and
 * the attribute unlocked is the highest unlocked level number. A locked level has no link target. The selected level
 * has the class selected.
 */
export class LevelList extends ChromeElement {
	/** @type {HTMLTemplateElement|null} The markup of the level list, null because the list has only a style. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'selected', 'unlocked'];

	/**
	 * Make the level links from the attributes and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		const folder = this.getAttribute('campaign');
		const selected = Number(this.getAttribute('selected') ?? 0);
		const unlocked = Number(this.getAttribute('unlocked') ?? 0);
		const links = [];
		for (let n = 1; folder !== null && n <= LEVELS_PER_CAMPAIGN; n++) {
			const link = document.createElement('a');
			link.textContent = 'Level ' + n;
			if (n <= unlocked) link.setAttribute('href', campaignPath(folder, n));
			link.classList.toggle('selected', n == selected);
			links.push(link);
		}
		this.replaceChildren(...links);
	}
}
