/**
 * The main menu element.
 */

import { routePath, RouteName } from '../../router.js';
import { CampaignId, LEVELS_PER_CAMPAIGN } from '../../stage/constants.js';
import { campaignsReady, listCampaigns, requireCampaign } from '../../data/campaigns.js';
import { requireElement, settingLabel } from '../dom.js';
import { loadMarkup, Screen, UiElement } from '../element.js';
import { bestTimes, editorMap, maxLevel } from '../../data/storage.js';

/** @type {HTMLTemplateElement|null} The markup of the main menu. */
const TEMPLATE = await loadMarkup(import.meta.url);

/**
 * The custom element <ui-main-menu>. It shows the campaigns with the number of finished levels and the link to the
 * editor. The sound and music buttons turn their setting on and off and show it. The root element stores the settings.
 */
export class MainMenu extends UiElement {
	/** @type {HTMLTemplateElement|null} The markup of the main menu. */
	static template = TEMPLATE;

	/**
	 * Add the handlers of the sound and the music buttons.
	 *
	 * @returns {void}
	 */
	setUp() {
		requireElement(this, '.sound', HTMLElement).addEventListener('click', () =>
			this.stage.setSound(!this.stage.sound.get()),
		);
		requireElement(this, '.music', HTMLElement).addEventListener('click', () =>
			this.stage.setMusic(!this.stage.music.get()),
		);
	}

	/**
	 * Subscribe to the loading of the campaigns, to the progress of all campaigns, to the best times, to the editor maps
	 * of the slots and to the sound and the music settings.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions.
	 */
	subscribe() {
		const slots = Array.from({ length: LEVELS_PER_CAMPAIGN }, (_, i) => editorMap(i + 1));
		const icon = requireElement(this, '.sound img', HTMLImageElement);
		const musicIcon = requireElement(this, '.music img', HTMLImageElement);
		return [
			this.stage.sound.subscribe((on) => {
				icon.src = on ? 'gfx/ui/sound-on.svg' : 'gfx/ui/sound-off.svg';
				icon.alt = settingLabel('Sounds', on);
			}),
			this.stage.music.subscribe((on) => {
				musicIcon.src = on ? 'gfx/ui/music-on.svg' : 'gfx/ui/music-off.svg';
				musicIcon.alt = settingLabel('Music', on);
			}),
			campaignsReady.subscribe(() => this.render()),
			...Object.values(maxLevel).map((value) => value.subscribe(() => this.render())),
			bestTimes.subscribe(() => this.render()),
			...slots.map((value) => value.subscribe(() => this.render())),
		];
	}

	/**
	 * Build the list of the campaigns after all campaign files are loaded. A campaign with a parent shows in a sub list
	 * below its parent, and the custom campaign shows in a sub list below the editor link when a slot has a level. The
	 * test campaign shows only when the URL has the parameter test.
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
			items.set(campaign.id, item);
			const parent = items.get(campaign.parent);
			if (parent) {
				let list = parent.querySelector('ul');
				if (!list) list = parent.appendChild(document.createElement('ul'));
				list.append(item);
			} else {
				top.push(item);
			}
		}
		requireElement(this, '.campaigns', HTMLElement).replaceChildren(...top);
		const custom = requireCampaign(CampaignId.CUSTOM);
		requireElement(this, '.custom', HTMLElement).replaceChildren(
			...(custom.unlocked ? [this.#createItem(custom, true)] : []),
		);
	}

	/**
	 * Create the list item of a campaign with a menu button. The link shows the title and the number of finished levels
	 * of all levels that are there. A campaign with a parent gets a small button.
	 *
	 * @param {import('../../data/campaigns.js').Campaign} campaign The campaign.
	 * @param {boolean} [small] True to give the campaign a small button without a parent.
	 * @returns {HTMLLIElement} The list item.
	 */
	#createItem(campaign, small = false) {
		const count = document.createElement('span');
		count.textContent = `${campaign.completed}/${campaign.levelCount}`;
		const link = document.createElement('a');
		link.href = routePath(RouteName.SELECT, campaign.id);
		link.append(campaign.title, ' ', count);
		const button = document.createElement('ui-button');
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
