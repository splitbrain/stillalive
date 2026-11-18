/**
 * The hash router of the page.
 *
 * The hash of the URL holds the navigation state: the route name, the campaign and the level. The route name is also
 * the name of the screen.
 *
 * The history follows the tree of the screens. A step down to a child screen adds an entry, a step to the side
 * replaces the entry, and a step up goes back in the history to the entry of the parent screen. If the parent screen is
 * not below in the history, e.g. after a typed URL, the step up replaces the entry.
 *
 * The router handles the clicks on the links to a route. A link adds an entry. A link with the attribute data-replace
 * replaces the entry, and a link with the attribute data-up goes up to its path. A click with a modifier key is left to
 * the browser.
 */

import { CAMPAIGN_FOLDERS } from './stage/constants.js';
import { Value } from './value.js';

/**
 * The names of the routes. A route name is also the name of the screen that the route shows, except the test route
 * after the stage has stopped the test run, which shows the editor screen.
 *
 * @type {Readonly<{MAIN: string, CREDITS: string, SELECT: string, PLAY: string, REPLAY: string, EDITOR: string,
 *     TEST: string, SAVE: string, LOAD: string}>}
 */
export const RouteName = Object.freeze({
	MAIN: 'main',
	CREDITS: 'credits',
	SELECT: 'select',
	PLAY: 'play',
	REPLAY: 'replay',
	EDITOR: 'editor',
	TEST: 'test',
	SAVE: 'save',
	LOAD: 'load',
});

/**
 * A route: the parsed hash.
 *
 * @typedef {object} Route
 * @property {string} name The name of the route, a value of RouteName.
 * @property {string|null} campaign The campaign id, or null if the route has no campaign.
 * @property {number} level The level number, starting at 1, or 0 if the route has no level.
 */

/**
 * @type {string[]} The routes with a campaign. The select route can have a level, and the other routes must have a
 *     level.
 */
const CAMPAIGN_ROUTES = [RouteName.SELECT, RouteName.PLAY, RouteName.REPLAY];

/** @type {RegExp} The pattern of a hash: the route name, the campaign and the level. */
const HASH_PATTERN = /^#\/([a-z]+)(?:\/([a-z]+)(?:\/([1-9]\d*))?)?$/;

/**
 * Create a route.
 *
 * @param {string} name The name of the route.
 * @param {string|null} [campaign] The campaign id.
 * @param {number} [level] The level number.
 * @returns {Route} The route.
 */
function createRoute(name, campaign = null, level = 0) {
	return { name, campaign, level };
}

/**
 * Parse a hash of the form #/name/campaign/level. The campaign is the id of a known campaign, and the level
 * can be any number from 1.
 *
 * The hash #/ or an empty hash is the main route. The hashes #/credits, #/editor, #/test, #/save and #/load have no
 * campaign and no level. The hash #/select/normal is the select route, and #/select/normal/5 selects level 5. The
 * hashes #/play/normal/5 and #/replay/normal/5 play level 5 or its replay.
 *
 * @param {string} hash The hash of the URL, with the leading "#", or an empty text.
 * @returns {Route|null} The route, or null for an unknown hash.
 */
function parseHash(hash) {
	if (hash === '' || hash === '#' || hash === '#/') return createRoute(RouteName.MAIN);
	const match = HASH_PATTERN.exec(hash);
	if (!match) return null;
	const [, name, campaign, level] = match;
	if (!campaign) {
		return Object.values(RouteName).includes(name) && !CAMPAIGN_ROUTES.includes(name) ? createRoute(name) : null;
	}
	if (!CAMPAIGN_ROUTES.includes(name) || !CAMPAIGN_FOLDERS.includes(campaign)) return null;
	if (!level && name !== RouteName.SELECT) return null;
	return createRoute(name, campaign, Number(level ?? 0));
}

/**
 * Parse the hash of the URL. An unknown hash and the other forms of the main route are replaced with #/ without a new
 * entry in the history.
 *
 * @returns {Route} The route.
 */
function currentRoute() {
	const parsed = parseHash(location.hash);
	if (parsed && (parsed.name !== RouteName.MAIN || location.hash === '#/')) return parsed;
	history.replaceState(history.state, '', '#/');
	return createRoute(RouteName.MAIN);
}

/**
 * Get the hashes of the entries below the current entry of the history, from the state of the current entry.
 *
 * @returns {string[]} The hashes, the lowest first.
 */
function trail() {
	return history.state?.trail ?? [];
}

/** @type {Value<Route>} The current route. */
export const route = new Value(currentRoute());

/** @type {string} The hash of the route that the router set last. */
let routeHash = location.hash;

/**
 * Set the route from the URL.
 *
 * @returns {void}
 */
function applyHash() {
	const next = currentRoute();
	routeHash = location.hash;
	route.set(next);
}

if (!history.state?.trail) history.replaceState({ trail: [] }, '');

// a step in the history and a typed hash can fire both events, and the second event finds the same hash
for (const type of ['popstate', 'hashchange']) {
	window.addEventListener(type, () => {
		if (location.hash !== routeHash) applyHash();
	});
}

document.addEventListener('click', (event) => {
	if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
	const link = /** @type {Element} */ (event.target).closest?.('a[href^="#/"]');
	if (!link) return;
	event.preventDefault();
	// the selector guarantees the attribute
	const path = /** @type {string} */ (link.getAttribute('href'));
	if (link.hasAttribute('data-up')) up(path);
	else navigate(path, link.hasAttribute('data-replace'));
});

/**
 * Get the path of a route.
 *
 * @param {string} name The name of the route, a value of RouteName.
 * @param {string|null} [campaign] The campaign id, or null for a route without a campaign.
 * @param {number} [level] The level number, or 0 for a route without a level.
 * @returns {string} The path, e.g. "#/play/normal/5", or "#/" for the main route.
 */
export function routePath(name, campaign = null, level = 0) {
	return name === RouteName.MAIN ? '#/' : ['#', name, campaign, level].filter(Boolean).join('/');
}

/**
 * Go to a path. A path that the URL has already sets the route again and adds no entry, e.g. to restart a level.
 *
 * @param {string} path The path, e.g. "#/editor".
 * @param {boolean} [replace] True to replace the current entry of the history instead of adding a new entry.
 * @returns {void}
 */
export function navigate(path, replace = false) {
	if (replace) {
		history.replaceState({ trail: trail() }, '', path);
	} else if (location.hash !== path) {
		history.pushState({ trail: [...trail(), location.hash] }, '', path);
	}
	applyHash();
}

/**
 * Go up to the path of a parent screen: back in the history to the nearest entry below with this path, or else
 * replace the current entry.
 *
 * @param {string} path The path, e.g. "#/".
 * @returns {void}
 */
export function up(path) {
	const below = trail();
	const index = below.lastIndexOf(path);
	if (location.hash === path || index < 0) navigate(path, true);
	else history.go(index - below.length);
}
