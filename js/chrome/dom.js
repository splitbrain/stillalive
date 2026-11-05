/**
 * Helpers for the elements of the page that set attributes and links and dispatch events.
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
