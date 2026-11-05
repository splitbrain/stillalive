/**
 * The play screen element.
 */

import { campaignPath } from '../router.js';
import { CAMPAIGN_FOLDERS, CampaignId } from '../stage/constants.js';
import { campaigns } from './campaigns.js';
import { setAttributes } from './dom.js';

/**
 * The custom element <play-screen>. It is the frame of the parts of a running level: the robot head, the HUD, the keys
 * of a replay, the pause menu and the intermission panel. Its markup in the page has these elements.
 *
 * The attribute campaign is the folder name of the campaign, level is the level number, mode is play or replay, and
 * exit is the path to leave the level to. The app element sets them on the play route and removes them on the test
 * run of the editor map. The attribute intermission shows the intermission panel; the app element sets the attributes
 * of the panel.
 *
 * The element hides the robot head in boss levels, because the boss is the robot, and gives it the eye of the part of
 * the story. It gives the restart and exit paths to the pause menu and the exit path to the intermission panel. It
 * shows the pause menu while the stage is paused and the keys during the playback of a replay.
 */
export class PlayScreen extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['campaign', 'level', 'mode', 'exit', 'intermission'];

	/** @type {import('../stage/GameStage.js').GameStage} The stage element. */
	#stage;

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/**
	 * Subscribe to the pause of the stage.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		this.#stage = document.querySelector('game-stage');
		this.#unsubscribe = [this.#stage.paused.subscribe(() => this.render())];
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
	 * Render the screen again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Set the attributes and the visibility of the parts from the attributes and the pause. Nothing happens before the
	 * element connects, because the pause comes from the stage.
	 *
	 * @returns {void}
	 */
	render() {
		if (!this.#stage) return;
		const folder = this.getAttribute('campaign');
		const index = CAMPAIGN_FOLDERS.indexOf(folder);
		const level = Number(this.getAttribute('level') ?? 0);
		const mode = this.getAttribute('mode');
		const exit = this.getAttribute('exit');

		const robot = this.querySelector('robot-head');
		robot.hidden = campaigns?.[index]?.levels[level - 1]?.boss > 0;
		const eye = index == CampaignId.STORY ? Math.min(Math.floor((level - 1) / 7), 3) + 1 : 1;
		robot.setAttribute('eye', String(eye));

		const pauseMenu = this.querySelector('pause-menu');
		pauseMenu.hidden = !this.#stage.paused.get();
		setAttributes(pauseMenu, { restart: index >= 0 ? campaignPath(folder, level, mode) : null, exit });

		const intermission = this.querySelector('intermission-panel');
		intermission.hidden = !this.hasAttribute('intermission');
		setAttributes(intermission, { exit });

		this.querySelector('replay-keys').hidden = mode !== 'replay';
	}
}
