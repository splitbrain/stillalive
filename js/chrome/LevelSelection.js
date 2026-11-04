/**
 * The elements of the level selection: the selection screen, the list of the levels and the best times panel.
 */

import { campaignPath } from '../router.js';
import { CAMPAIGN_FINISHED, CAMPAIGN_FOLDERS, CampaignId, LEVELS_PER_CAMPAIGN } from '../stage/constants.js';
import { decodeReplay } from '../stage/replay.js';
import { campaigns } from './campaigns.js';
import { alertDialog } from './dialog.js';
import { setLink } from './dom.js';
import { downloadJson, pickJsonFile } from './files.js';
import { bestTimes, getBestTime, getCampaignTotal, loadBestReplay, maxLevel } from './storage.js';
import { toTime } from './time.js';

/**
 * The custom element <level-selection>. It is the selection screen of a campaign. Its markup in the page has the
 * <level-list> element and the Exit, mode and Play links.
 *
 * The attribute campaign is the folder name of the campaign, and the attribute level is the selected level number, or
 * 0 for none. The element gives the campaign, the selected level and the highest unlocked level to the level list. The
 * Play link goes to the play route of the selected level. The mode link switches between the normal and the advanced
 * campaign. It shows in the advanced campaign, and in the normal campaign after the player has finished it.
 */
export class LevelSelection extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'level'];

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/**
	 * Subscribe to the progress of all campaigns. The mode link depends on the progress of the normal campaign.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		this.#unsubscribe = maxLevel.map((value) => value.subscribe(() => this.render()));
	}

	/**
	 * Remove the subscriptions.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
	}

	/**
	 * Render the selection again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
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
}

/**
 * The custom element <level-list>. It shows a link for each level of a campaign, made from the link in its template.
 *
 * The attribute campaign is the folder name of the campaign, the attribute selected is the selected level number, and
 * the attribute unlocked is the highest unlocked level number. A locked level has no link target. The selected level
 * has the class selected.
 */
export class LevelList extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'selected', 'unlocked'];

	/** @type {HTMLTemplateElement|null} The template of a level link, kept when the element replaces its children. */
	#template = null;

	/**
	 * Render the list again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Build the level links from the attributes and replace the children with them.
	 *
	 * @returns {void}
	 */
	render() {
		this.#template ??= this.querySelector('template');
		const folder = this.getAttribute('campaign');
		const selected = Number(this.getAttribute('selected') ?? 0);
		const unlocked = Number(this.getAttribute('unlocked') ?? 0);
		const links = [];
		for (let n = 1; folder !== null && n <= LEVELS_PER_CAMPAIGN; n++) {
			const link = this.#template.content.firstElementChild.cloneNode();
			link.textContent = 'Level ' + n;
			if (n <= unlocked) link.setAttribute('href', campaignPath(folder, n));
			link.classList.toggle('selected', n == selected);
			links.push(link);
		}
		this.replaceChildren(this.#template, ...links);
	}
}

/**
 * The custom element <best-times>. Its markup in the page has a paragraph for each line of the panel. The element
 * shows the lines that apply and fills them.
 *
 * The attribute campaign is the folder name of the campaign, and the attribute level is the level number, or 0 for
 * none. Without the attribute mode, the panel is the one of the level selection: the best time of the selected level,
 * the Watch link to the replay route, the Export button for the stored replay of the best time, and the Import button
 * for a replay file. With the attribute mode, play or replay, the panel is the one of a running level: the level time
 * and the best time. The panel always shows the sum of the best times of the campaign. It opens only for a campaign
 * with records.
 *
 * The import checks the replay file and dispatches the bubbling event replay-import with the replay in the file format
 * as detail.replay. The app element plays it.
 */
export class BestTimes extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'level', 'mode'];

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which adds the event handlers. */
	#setUp = false;

	/**
	 * Subscribe to the best times and to the level time. On the first connect, add the handlers of the Export and the
	 * Import buttons.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		const stage = document.querySelector('game-stage');
		if (!this.#setUp) {
			this.#setUp = true;
			const onError = (error) => alertDialog(error.message, 'Replay');
			this.querySelector('.export button').addEventListener('click', () => this.#export().catch(onError));
			this.querySelector('.import button').addEventListener('click', () => this.#import().catch(onError));
		}
		const time = this.querySelector('.time span');
		this.#unsubscribe = [
			bestTimes.subscribe(() => this.render()),
			stage.time.subscribe((ticks) => {
				time.textContent = toTime(ticks);
			}),
		];
	}

	/**
	 * Remove the subscriptions.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
	}

	/**
	 * Render the panel again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Show the lines of the panel that apply and fill them from the attributes and the best times.
	 *
	 * @returns {void}
	 */
	render() {
		const folder = this.getAttribute('campaign');
		const campaign = folder === null ? undefined : campaigns?.find((c) => c.folder === folder);
		this.classList.toggle('open', campaign?.records === true);
		if (!campaign?.records) return;

		const level = Number(this.getAttribute('level') ?? 0);
		const mode = this.getAttribute('mode');
		const best = level > 0 ? getBestTime(folder, level) : null;
		const total = getCampaignTotal(folder);
		const selecting = mode === null;

		const title = this.querySelector('.title');
		title.hidden = level == 0;
		title.textContent = 'Level ' + level + (mode === 'replay' ? ' (replay)' : '');
		this.querySelector('.time').hidden = selecting;
		const bestLine = this.querySelector('.best');
		bestLine.hidden = level == 0;
		bestLine.querySelector('span').textContent = best === null ? '-' : toTime(best);
		this.querySelector('.watch').hidden = !selecting || best === null;
		this.querySelector('.watch a').setAttribute('href', campaignPath(folder, level, 'replay'));
		this.querySelector('.export').hidden = !selecting || best === null;
		this.querySelector('.import').hidden = !selecting;
		this.querySelector('.total-time').textContent = toTime(total.ticks);
		this.querySelector('.total-levels').textContent = total.levels + ' of ' + LEVELS_PER_CAMPAIGN + ' levels';
	}

	/**
	 * Let the browser download the stored replay of the best time of the level as a JSON file.
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If there is no stored replay.
	 */
	async #export() {
		const data = await loadBestReplay(this.getAttribute('campaign'), Number(this.getAttribute('level')));
		if (!data) throw new Error('There is no stored replay for this level.');
		downloadJson(data, `stillalivejs-${data.campaign}-${String(data.level).padStart(2, '0')}.json`);
	}

	/**
	 * Let the player select a replay file, check it and dispatch the replay-import event. Nothing happens if the panel
	 * is not the one of the level selection when the player has selected the file.
	 *
	 * @returns {Promise<void>}
	 * @throws {Error} If the replay is not valid or the campaign or level does not exist.
	 */
	async #import() {
		const data = await pickJsonFile();
		if (data === null || !this.hasAttribute('campaign') || this.hasAttribute('mode')) return;
		decodeReplay(data);
		const known = campaigns.some((c) => c.folder === data.campaign && c.records);
		if (!known || data.level < 1 || data.level > LEVELS_PER_CAMPAIGN) {
			throw new Error('The replay is for an unknown level.');
		}
		this.dispatchEvent(new CustomEvent('replay-import', { bubbles: true, detail: { replay: data } }));
	}
}
