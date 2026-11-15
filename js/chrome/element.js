/**
 * The base of the chrome elements.
 */

import { RouteName } from '../router.js';

/**
 * Load the HTML file of a component. The file is next to the module and has the name of the module with ".html" in
 * place of ".js". The style of the file goes into the head of the document.
 *
 * @param {string} moduleUrl The URL of the module of the component, import.meta.url.
 * @returns {Promise<HTMLTemplateElement|null>} The template of the file, or null if the file has no template.
 * @throws {Error} If the fetch of the file fails.
 */
export async function loadMarkup(moduleUrl) {
	const url = new URL(moduleUrl.replace(/\.js$/, '.html'));
	const fileName = url.pathname.split('/').pop();
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Cannot load ${fileName}: ${response.status} ${response.statusText}`);
	const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
	const style = doc.querySelector('style');
	if (style) {
		style.dataset.source = fileName;
		document.head.append(document.adoptNode(style));
	}
	return doc.querySelector('template');
}

/**
 * The names of the screens of the app: the loading screen and the route names.
 *
 * @type {Readonly<{LOADING: string} & typeof RouteName>}
 */
export const Screen = Object.freeze({ LOADING: 'loading', ...RouteName });

/**
 * The base class of the chrome elements. The markup of an element is a copy of the template of its class, in the light
 * DOM.
 */
export class ChromeElement extends HTMLElement {
	/** @type {HTMLTemplateElement|null} The template of the component, from loadMarkup(), or null for no markup. */
	static template = null;

	/** @type {Array<() => void>} The functions that remove the subscriptions and stop the timers. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which builds the markup. */
	#built = false;

	/**
	 * On the first connect, copy the template into the element and call setUp() and render(). On every connect, call
	 * subscribe().
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		if (!this.#built) {
			const template = /** @type {typeof ChromeElement} */ (this.constructor).template;
			if (template) this.append(document.importNode(template.content, true));
			this.#built = true;
			this.setUp();
			this.render();
		}
		this.#unsubscribe = this.subscribe();
	}

	/**
	 * Remove the subscriptions and stop the timers.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
	}

	/**
	 * Render the element after a change of an observed attribute. Before the build, do nothing, because the first
	 * render() applies all attributes.
	 *
	 * @returns {void}
	 */
	attributeChangedCallback() {
		if (this.#built) this.render();
	}

	/**
	 * Hook that runs once after the build, for the event handlers. The default does nothing.
	 *
	 * @returns {void}
	 */
	setUp() {}

	/**
	 * Hook that runs on every connect. It subscribes to the state and starts the timers of the element.
	 *
	 * @returns {Array<() => void>} The functions that remove the subscriptions and stop the timers. The default
	 *     is an empty list.
	 */
	subscribe() {
		return [];
	}

	/**
	 * Hook that applies the attributes and the state to the markup. The default does nothing.
	 *
	 * @returns {void}
	 */
	render() {}

	/**
	 * The stage element of the page.
	 *
	 * @returns {import('../stage/GameStage.js').GameStage} The <game-stage> element.
	 */
	get stage() {
		return document.querySelector('game-stage');
	}
}

/**
 * The base class of the screen parts: the chrome elements that the app shows and hides per screen. A part inside a
 * screen part is a plain chrome element, because the screen part controls it.
 */
export class ChromeScreen extends ChromeElement {
	/**
	 * Add the class chrome-screen, so that the app finds the element at any depth. Then build and subscribe as a chrome
	 * element.
	 *
	 * @returns {void}
	 */
	connectedCallback() {
		this.classList.add('chrome-screen');
		super.connectedCallback();
	}

	/**
	 * Tell if the element shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True if the element shows on the screen. The default is true.
	 */
	// eslint-disable-next-line no-unused-vars
	shouldShow(screen) {
		return true;
	}
}
