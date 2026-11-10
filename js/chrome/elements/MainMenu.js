/**
 * The main menu element.
 */

import { campaignPath } from '../../router.js';
import { CampaignId, LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { campaigns, campaignsReady, listCampaigns } from '../campaigns.js';
import { ChromeScreen, loadMarkup, Screen } from '../element.js';
import { bestTimes, editorMap, maxLevel } from '../storage.js';

/** @type {HTMLTemplateElement|null} The markup of the main menu. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <main-menu>. It shows the list of the campaigns with the number of finished levels and the link to
 * the editor. A campaign with a parent shows in a sub list below its parent, and the custom campaign shows in a sub
 * list below the editor. The test campaign shows only when the URL contains "?test".
 */
export class MainMenu extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the main menu. */
	static template = TEMPLATE;

	/**
	 * Subscribe to the loading of the campaigns, to the progress of all campaigns, to the best times and to the editor
	 * maps of the slots.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const slots = Array.from({ length: LEVELS_PER_CAMPAIGN }, (_, i) => editorMap(i + 1));
		return [
			campaignsReady.subscribe(() => this.render()),
			...maxLevel.map((value) => value.subscribe(() => this.render())),
			bestTimes.subscribe(() => this.render()),
			...slots.map((value) => value.subscribe(() => this.render())),
		];
	}

	/**
	 * Build the list of the campaigns after all campaign files are loaded.
	 *
	 * @returns {void}
	 */
	render() {
		if (!campaignsReady.get()) return;
		const items = new Map();
		const top = [];
		const showTest = new URLSearchParams(location.search).has('test');
		for (const campaign of listCampaigns()) {
			if (campaign.id === CampaignId.CUSTOM || (campaign.id === CampaignId.TEST && !showTest)) continue;
			const item = this.#createItem(campaign);
			items.set(campaign.folder, item);
			const parent = items.get(campaign.parent);
			if (parent) {
				let list = parent.querySelector('ul');
				if (!list) list = parent.appendChild(document.createElement('ul'));
				list.append(item);
			} else {
				top.push(item);
			}
		}
		this.querySelector('.campaigns').replaceChildren(...top);
		this.querySelector('.custom').replaceChildren(this.#createItem(campaigns[CampaignId.CUSTOM], true));
	}

	/**
	 * Create the list item of a campaign with a menu button. The link shows the title and the number of finished levels
	 * of all levels that are there. A campaign with a parent gets a small button.
	 *
	 * @param {import('../campaigns.js').Campaign} campaign The campaign.
	 * @param {boolean} [small] True to give the campaign a small button without a parent.
	 * @returns {HTMLLIElement} The list item.
	 */
	#createItem(campaign, small = false) {
		const count = document.createElement('span');
		count.textContent = campaign.completed + '/' + campaign.levels.filter((level) => level != null).length;
		const link = document.createElement('a');
		link.href = campaignPath(campaign.folder);
		link.append(campaign.title, ' ', count);
		const button = document.createElement('menu-button');
		button.toggleAttribute('small', small || campaign.parent !== '');
		button.append(link);
		const item = document.createElement('li');
		item.append(button);
		return item;
	}

	/**
	 * Tell if the main menu shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the main screen only.
	 */
	shouldShow(screen) {
		return screen === Screen.MAIN;
	}
}
