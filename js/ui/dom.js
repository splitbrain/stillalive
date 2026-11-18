/**
 * Helpers for the elements of the page.
 */

/**
 * Set attributes of an element. A null value removes the attribute.
 *
 * @param {HTMLElement} element The element.
 * @param {Object<string, string|number|null>} attributes The values of the attributes by name.
 * @returns {void}
 */
export function setAttributes(element, attributes) {
	for (const [name, value] of Object.entries(attributes)) {
		if (value === null) element.removeAttribute(name);
		else element.setAttribute(name, String(value));
	}
}

/**
 * Set the path of a link and show it, or hide the link.
 *
 * @param {HTMLAnchorElement} link The link.
 * @param {string|null} path The path, or null to hide the link.
 * @returns {void}
 */
export function setLink(link, path) {
	link.hidden = path === null;
	if (path !== null) link.setAttribute('href', path);
}

/**
 * Get the label of a setting that is on or off.
 *
 * @param {string} name The name of the setting, e.g. "Sounds".
 * @param {boolean} on True if the setting is on.
 * @returns {string} The label, e.g. "Sounds: On".
 */
export function settingLabel(name, on) {
	return `${name}: ${on ? 'On' : 'Off'}`;
}

/**
 * Dispatch a bubbling event from an element.
 *
 * @param {HTMLElement} element The element.
 * @param {string} type The event type.
 * @param {object} [detail] The detail of the event.
 * @returns {void}
 */
export function dispatch(element, type, detail = {}) {
	element.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
}

/**
 * Find the first element below a root that matches a selector. The markup of the UI elements comes from their
 * templates and from index.html, so a missing element is a fault in the markup or in the selector.
 *
 * @template {Element} T
 * @param {ParentNode} root The element or the document to search.
 * @param {string} selector The CSS selector.
 * @param {new () => T} type The class that the element must have, e.g. HTMLElement or HTMLAnchorElement.
 * @returns {T} The element.
 * @throws {Error} If no element matches the selector, or if the element does not have the class.
 */
export function requireElement(root, selector, type) {
	const element = root.querySelector(selector);
	if (!(element instanceof type)) throw new Error(`No ${type.name} matches "${selector}".`);
	return element;
}
