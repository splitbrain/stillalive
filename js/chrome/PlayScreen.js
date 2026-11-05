/**
 * The elements of the play screen: the screen, the robot head, the narrator text, the HUD, the keys of a replay, the
 * pause menu and the intermission panel.
 */

import { campaignPath } from '../router.js';
import {
	CAMPAIGN_FOLDERS,
	CampaignId,
	KEY_CLEAR,
	KEY_DOWN,
	KEY_JUMP,
	KEY_LEFT,
	KEY_RIGHT,
	MOUSE_LEFT,
	MOUSE_RIGHT,
} from '../stage/constants.js';
import { keyLabels } from '../stage/keys.js';
import { campaigns } from './campaigns.js';
import { setAttributes, setLink } from './dom.js';
import { toTime } from './time.js';

/** @type {number} The time between two steps of the idle animation of the robot head in milliseconds. */
const ROBOT_STEP_TIME = 250;

/** @type {number} The time between two characters of the narrator text in milliseconds: 45 characters per second. */
const TYPE_TIME = 1000 / 45;

/** @type {string} The narrator text of the test run of the editor map. */
const TEST_TEXT = 'Press <Enter> or <Escape> key to stop testing.';

/** @type {string[]} The names of the HUD values of the stage, which are also the data-value names of their nodes. */
const HUD_VALUES = ['life', 'cakes', 'steps', 'portals', 'fps'];

/** @type {Object<string, number>} The key bit of each key cap of the replay keys, by the data-key name of the cap. */
const KEY_CAPS = {
	KeyW: KEY_JUMP,
	KeyA: KEY_LEFT,
	KeyS: KEY_DOWN,
	KeyD: KEY_RIGHT,
	KeyE: KEY_CLEAR,
	left: MOUSE_LEFT,
	right: MOUSE_RIGHT,
};

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

/**
 * The custom element <robot-head>. Its markup in the page has the head image and the eye. The attribute eye is the
 * number of the eye image, from 1 to 4.
 *
 * An idle animation runs on a timer while the element is visible: from time to time the eye looks to a side, up or
 * down, the head moves to a side, or the eye blinks. The element sets the custom properties --eye-x, --eye-y and
 * --head-x to -1, 0 or 1 and adds the class blink to the eye; the style sheet moves the parts and runs the blink.
 */
export class RobotHead extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['eye'];

	/** @type {number} The id of the timer of the idle animation. */
	#timer = 0;

	/** @type {Object<string, number>} The position of each moving part, -1, 0 or 1, by its custom property. */
	#positions = { '--eye-x': 0, '--eye-y': 0, '--head-x': 0 };

	/** @type {boolean} True after the first connect, which adds the event handlers. */
	#setUp = false;

	/**
	 * Start the idle animation. On the first connect, end the blink at the end of its animation.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (!this.#setUp) {
			this.#setUp = true;
			const eye = this.querySelector('.eye');
			const endBlink = () => eye.classList.remove('blink');
			eye.addEventListener('animationend', endBlink);
			eye.addEventListener('animationcancel', endBlink);
		}
		this.#timer = setInterval(() => this.#step(), ROBOT_STEP_TIME);
	}

	/**
	 * Stop the idle animation.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		clearInterval(this.#timer);
	}

	/**
	 * Render the eye again after a change of the attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Show the eye image of the attribute eye.
	 *
	 * @returns {void}
	 */
	render() {
		const eye = this.getAttribute('eye') ?? '1';
		this.querySelector('.eye').style.backgroundImage = `url("sprites/robotEye${eye}.svg")`;
	}

	/**
	 * Run one step of the idle animation: start a move or a blink at random. Nothing happens while the element is not
	 * visible.
	 *
	 * @returns {void}
	 */
	#step() {
		if (!this.checkVisibility({ visibilityProperty: true })) return;
		const r = Math.floor(Math.random() * 100);
		if (r < 2) this.#move('--eye-x', r == 0 ? -1 : 1);
		else if (r < 4) this.#move('--eye-y', r == 2 ? -1 : 1);
		else if (r < 6) this.#move('--head-x', r == 4 ? -1 : 1);
		else if (r >= 90) this.querySelector('.eye').classList.add('blink');
	}

	/**
	 * Move a part one position in a direction, but not past the outer positions.
	 *
	 * @param {string} property The custom property of the part.
	 * @param {number} dir The direction, -1 or 1.
	 * @returns {void}
	 */
	#move(property, dir) {
		this.#positions[property] = Math.max(-1, Math.min(1, this.#positions[property] + dir));
		this.style.setProperty(property, String(this.#positions[property]));
	}
}

/**
 * The custom element <narrator-text>. Its markup in the page has a paragraph for the text. The element types the text
 * at 45 characters per second, and starts again for each new text and for each new message of the stage, also when the
 * message has the same text. The typing stops while the stage is paused.
 *
 * The text is the key hint during the test run of the editor map, else the attribute text, which the app element sets
 * on the screens with a fixed text, else the text of the message of the stage.
 */
export class NarratorText extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['text'];

	/** @type {import('../stage/GameStage.js').GameStage} The stage element. */
	#stage;

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {string|object|null} The source of the text: the fixed text, or the message object of the stage. */
	#source = null;

	/** @type {string} The text that the element types. */
	#text = '';

	/** @type {number} The number of characters of the text that show. */
	#shown = 0;

	/** @type {number} The id of the timer of the typing, or 0 if the typing stopped. */
	#timer = 0;

	/**
	 * Subscribe to the message, the pause and the mode of the stage.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		this.#stage = document.querySelector('game-stage');
		this.#unsubscribe = [
			this.#stage.message.subscribe(() => this.render()),
			this.#stage.paused.subscribe(() => this.render()),
			this.#stage.mode.subscribe(() => this.render()),
		];
	}

	/**
	 * Remove the subscriptions and stop the typing.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
		this.#stopTyping();
	}

	/**
	 * Render the text again after a change of the attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Start a new text from its first character, and run the typing while the stage is not paused and characters are
	 * left to type. Nothing happens before the element connects, because the text comes from the stage.
	 *
	 * @returns {void}
	 */
	render() {
		if (!this.#stage) return;
		const testing = this.#stage.mode.get() == 'test';
		const source = testing ? TEST_TEXT : (this.getAttribute('text') ?? this.#stage.message.get());
		if (source !== this.#source) {
			this.#source = source;
			this.#text = typeof source == 'string' ? source : (source?.text ?? '');
			this.#shown = 0;
			this.#show();
		}
		if (this.#stage.paused.get() || this.#shown >= this.#text.length) this.#stopTyping();
		else if (this.#timer == 0) this.#timer = setInterval(() => this.#type(), TYPE_TIME);
	}

	/**
	 * Type one more character, and stop the typing at the end of the text.
	 *
	 * @returns {void}
	 */
	#type() {
		this.#shown++;
		this.#show();
		if (this.#shown >= this.#text.length) this.#stopTyping();
	}

	/**
	 * Show the typed part of the text.
	 *
	 * @returns {void}
	 */
	#show() {
		this.querySelector('p').textContent = this.#text.slice(0, this.#shown);
	}

	/**
	 * Stop the timer of the typing.
	 *
	 * @returns {void}
	 */
	#stopTyping() {
		clearInterval(this.#timer);
		this.#timer = 0;
	}
}

/**
 * The custom element <game-hud>. Its markup in the page has a node with a data-value attribute for each HUD value of
 * the stage: life, cakes, steps, portals and the frame rate. The element shows each value in its node.
 */
export class GameHud extends HTMLElement {
	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/**
	 * Subscribe to the HUD values of the stage.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		const stage = document.querySelector('game-stage');
		this.#unsubscribe = HUD_VALUES.map((name) => {
			const node = this.querySelector(`[data-value="${name}"]`);
			return stage[name].subscribe((value) => {
				node.textContent = String(value);
			});
		});
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
}

/**
 * The custom element <replay-keys>. Its markup in the page has a key cap with a data-key attribute for each key and
 * mouse button of the controls. The element marks the caps that are pressed in the playback of a replay with the
 * class pressed, and shows the key labels of the keyboard of the player on the key caps.
 */
export class ReplayKeys extends HTMLElement {
	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/**
	 * Subscribe to the keys of the replay and to the key labels.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		const stage = document.querySelector('game-stage');
		const caps = [...this.querySelectorAll('[data-key]')];
		this.#unsubscribe = [
			stage.replayKeys.subscribe((keys) => {
				for (const cap of caps) cap.classList.toggle('pressed', (keys & KEY_CAPS[cap.dataset.key]) != 0);
			}),
			keyLabels.subscribe((labels) => {
				for (const cap of caps) if (cap.dataset.key in labels) cap.textContent = labels[cap.dataset.key];
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
}

/**
 * The custom element <pause-menu>. Its markup in the page has the Resume button, the Restart and Exit links and the
 * sound button. The attribute restart is the path of the Restart link, the current play route, and the attribute exit
 * is the path of the Exit link. The Exit link replaces the entry of the level in the history. The Resume button
 * continues the level; the sound button turns the sound on and off and shows the setting. The app element stores the
 * change of the sound.
 */
export class PauseMenu extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['restart', 'exit'];

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which adds the event handlers. */
	#setUp = false;

	/**
	 * Subscribe to the sound setting. On the first connect, add the handlers of the buttons.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		const stage = document.querySelector('game-stage');
		const sound = this.querySelector('.sound');
		if (!this.#setUp) {
			this.#setUp = true;
			this.querySelector('.resume').addEventListener('click', () => stage.resume());
			sound.addEventListener('click', () => stage.setSound(!stage.sound.get()));
		}
		this.#unsubscribe = [
			stage.sound.subscribe((on) => {
				sound.textContent = 'Sounds : ' + (on ? 'On' : 'Off');
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
	 * Render the menu again after a change of an attribute.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		this.render();
	}

	/**
	 * Set the paths of the Restart and the Exit links from the attributes.
	 *
	 * @returns {void}
	 */
	render() {
		setLink(this.querySelector('.restart'), this.getAttribute('restart'));
		setLink(this.querySelector('.exit'), this.getAttribute('exit'));
	}
}

/**
 * The custom element <intermission-panel>. It shows the choice after a level. Its markup in the page has the time, the
 * message, the Exit, Restart and Continue links and the Watch Replay button.
 *
 * The attribute time is the level time in ticks, message is the message under the time, exit, restart and next are the
 * paths of the Exit, Restart and Continue links, and the attribute replay shows the Watch Replay button. A link without
 * its attribute is hidden. The Exit link replaces the entry of the level in the history. The Watch Replay button
 * dispatches the bubbling event replay-watch; the app element plays the replay of the level that just ended.
 */
export class IntermissionPanel extends HTMLElement {
	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['time', 'message', 'exit', 'restart', 'next', 'replay'];

	/** @type {boolean} True after the first connect, which adds the event handler. */
	#setUp = false;

	/**
	 * On the first connect, add the handler of the Watch Replay button.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (this.#setUp) return;
		this.#setUp = true;
		this.querySelector('.replay').addEventListener('click', () => {
			this.dispatchEvent(new CustomEvent('replay-watch', { bubbles: true }));
		});
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
	 * Fill the time and the message, and set the links and the button from the attributes.
	 *
	 * @returns {void}
	 */
	render() {
		this.querySelector('.time').textContent = 'Your time : ' + toTime(Number(this.getAttribute('time') ?? 0));
		this.querySelector('.message').textContent = this.getAttribute('message') ?? '';
		setLink(this.querySelector('.exit'), this.getAttribute('exit'));
		setLink(this.querySelector('.restart'), this.getAttribute('restart'));
		setLink(this.querySelector('.next'), this.getAttribute('next'));
		this.querySelector('.replay').hidden = !this.hasAttribute('replay');
	}
}
