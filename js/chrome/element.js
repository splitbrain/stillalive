/**
 * The base of the chrome elements: the loader of their markup, the names of the screens and the base class.
 */

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
 * The names of the screens of the app: the route names and the loading screen.
 *
 * @type {Readonly<{LOADING: string, MAIN: string, SELECT: string, PLAY: string, EDITOR: string, EDITOR_FILE: string,
 *     CREDITS: string}>}
 */
export const Screen = Object.freeze({
	LOADING: 'loading',
	MAIN: 'main',
	SELECT: 'select',
	PLAY: 'play',
	EDITOR: 'editor',
	EDITOR_FILE: 'editor-file',
	CREDITS: 'credits',
});

/**
 * The base class of the chrome elements. On its first connect, the element clones the template of its class into
 * itself, in the light DOM, and then calls setUp() and render(). On every connect, it subscribes with subscribe(), and
 * on every disconnect it removes these subscriptions. A change of an observed attribute calls render() after the
 * build only. A change before the build has no effect, because the first render() applies all attributes.
 */
export class ChromeElement extends HTMLElement {
	/** @type {HTMLTemplateElement|null} The template of the component, from loadMarkup(), or null for no markup. */
	static template = null;

	/** @type {Array<function(): void>} The functions that remove the subscriptions. */
	#unsubscribe = [];

	/** @type {boolean} True after the first connect, which builds the markup. */
	#built = false;

	/**
	 * On the first connect, build the markup and call setUp() and render(). On every connect, subscribe.
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
	 * Remove the subscriptions.
	 *
	 * @returns {void}
	 */
	disconnectedCallback() {
		for (const unsubscribe of this.#unsubscribe) unsubscribe();
		this.#unsubscribe = [];
	}

	/**
	 * Render the element after a change of an observed attribute. Before the build, do nothing.
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
	 * Hook that runs on every connect and subscribes to the state.
	 *
	 * @returns {Array<function(): void>} The functions that remove the subscriptions. The default is an empty list.
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
	 * Tell if the element shows on a screen of the app.
	 *
	 * @param {string} screen The screen, a value of Screen.
	 * @returns {boolean} True if the element shows on the screen. The default is true.
	 */
	// eslint-disable-next-line no-unused-vars
	shouldShow(screen) {
		return true;
	}

	/**
	 * The stage element of the page.
	 *
	 * @returns {HTMLElement} The <game-stage> element.
	 */
	get stage() {
		return document.querySelector('game-stage');
	}
}
