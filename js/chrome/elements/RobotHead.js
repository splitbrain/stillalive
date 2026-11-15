/**
 * The robot head element.
 */

import { ChromeScreen, loadMarkup, Screen } from '../element.js';

/** @type {HTMLTemplateElement|null} The markup of the robot head. */
const TEMPLATE = await loadMarkup(import.meta.url);

/** @type {number} The time between two steps of the idle animation of the robot head in milliseconds. */
const ROBOT_STEP_TIME = 250;

/**
 * The custom element <robot-head>. It shows the head and the eye of the robot behind the glass of a framed window
 * with a lab scene. The attribute eye is the number of the eye image, from 1 to 4. The attribute absent hides the head
 * and the eye.
 *
 * While the eye is visible, an idle animation moves the eye and the head at random and makes the eye blink.
 */
export class RobotHead extends ChromeScreen {
	/** @type {HTMLTemplateElement|null} The markup of the robot head. */
	static template = TEMPLATE;

	/** @type {string[]} The attributes that cause a new render when they change. */
	static observedAttributes = ['eye'];

	/** @type {Object<string, number>} The position of each moving part, -1, 0 or 1, by its custom property. */
	#positions = { '--eye-x': 0, '--eye-y': 0, '--head-x': 0 };

	/**
	 * End the blink at the end of its animation.
	 *
	 * @returns {void}
	 */
	setUp() {
		const eye = this.querySelector('.eye');
		const endBlink = () => eye.classList.remove('blink');
		eye.addEventListener('animationend', endBlink);
		eye.addEventListener('animationcancel', endBlink);
	}

	/**
	 * Start the timer of the idle animation.
	 *
	 * @returns {Array<() => void>} The function that stops the timer.
	 */
	subscribe() {
		const timer = setInterval(() => this.#step(), ROBOT_STEP_TIME);
		return [() => clearInterval(timer)];
	}

	/**
	 * Show the eye image of the attribute eye.
	 *
	 * @returns {void}
	 */
	render() {
		const eye = this.getAttribute('eye') ?? '1';
		/** @type {HTMLElement} */ (this.querySelector('.eye')).style.backgroundImage =
			`url("gfx/sprites/robotEye${eye}.svg")`;
	}

	/**
	 * Run one step of the idle animation while the eye is visible. The step starts a move or a blink at random.
	 *
	 * @returns {void}
	 */
	#step() {
		if (!this.querySelector('.eye').checkVisibility({ visibilityProperty: true })) return;
		const roll = Math.floor(Math.random() * 100);
		if (roll < 2) this.#move('--eye-x', roll === 0 ? -1 : 1);
		else if (roll < 4) this.#move('--eye-y', roll === 2 ? -1 : 1);
		else if (roll < 6) this.#move('--head-x', roll === 4 ? -1 : 1);
		else if (roll >= 90) this.querySelector('.eye').classList.add('blink');
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

	/**
	 * Tell if the robot head shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True on the play, the replay and the test run screen.
	 */
	shouldShow(screen) {
		return [Screen.PLAY, Screen.REPLAY, Screen.TEST].includes(screen);
	}
}
