/**
 * The hash router of the page.
 *
 * The hash of the URL holds the navigation state: the screen, the campaign, the level and the sub screen of the editor.
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
 * The names of the routes. A route name is also the name of the screen that the route shows, except for the test run.
 *
 * @type {Readonly<{MAIN: string, SELECT: string, PLAY: string, EDITOR: string, EDITOR_FILE: string, CREDITS: string}>}
 */
export const RouteName = Object.freeze({
	MAIN: 'main',
	SELECT: 'select',
	PLAY: 'play',
	EDITOR: 'editor',
	EDITOR_FILE: 'editor-file',
	CREDITS: 'credits',
});

/**
 * The modes of the routes. A mode is also the last part of the path of its route, e.g. "#/editor/test".
 *
 * @type {Readonly<{PLAY: string, REPLAY: string, TEST: string, SAVE: string, LOAD: string}>}
 */
export const RouteMode = Object.freeze({
	PLAY: 'play',
	REPLAY: 'replay',
	TEST: 'test',
	SAVE: 'save',
	LOAD: 'load',
});

/**
 * A route: the parsed hash.
 *
 * @typedef {object} Route
 * @property {string} name The screen, a value of RouteName.
 * @property {string|null} campaign The folder name of the campaign, or null if the route has no campaign.
 * @property {number} level The level number, starting at 1, or 0 if the route has no level.
 * @property {string|null} mode The mode, a value of RouteMode: play or replay for the play route, test for the test
 *     run on the editor route, save or load for the editor-file route, else null.
 */

/** @type {RegExp} The pattern of the campaign routes: the campaign, the level and the play mode. */
const CAMPAIGN_PATTERN = /^#\/campaign\/([a-z]+)(?:\/([1-9]\d*)(?:\/(play|replay))?)?$/;

/** @type {RegExp} The pattern of the editor routes: the mode of the test run or of the save and load screen. */
const EDITOR_PATTERN = /^#\/editor(?:\/(save|load|test))?$/;

/**
 * Create a route.
 *
 * @param {string} name The screen.
 * @param {string|null} [campaign] The folder name of the campaign.
 * @param {number} [level] The level number.
 * @param {string|null} [mode] The mode.
 * @returns {Route} The route.
 */
function createRoute(name, campaign = null, level = 0, mode = null) {
	return { name, campaign, level, mode };
}

/**
 * Parse a hash. The campaign is the folder name of a known campaign, and the level can be any number from 1.
 *
 * The hash #/ or an empty hash is the main route, and #/credits is the credits route. The hash #/campaign/normal is the
 * select route, and #/campaign/normal/5 selects level 5. The hashes #/campaign/normal/5/play and
 * #/campaign/normal/5/replay are the play route with mode play or replay. The hash #/editor is the editor route, and
 * #/editor/test adds mode test. The hashes #/editor/save and #/editor/load are the editor-file route.
 *
 * @param {string} hash The hash of the URL, with the leading "#", or an empty text.
 * @returns {Route|null} The route, or null for an unknown hash.
 */
function parseHash(hash) {
	if (hash === '' || hash === '#' || hash === '#/') return createRoute(RouteName.MAIN);
	if (hash === '#/credits') return createRoute(RouteName.CREDITS);

	const campaign = CAMPAIGN_PATTERN.exec(hash);
	if (campaign && CAMPAIGN_FOLDERS.includes(campaign[1])) {
		const level = Number(campaign[2] ?? 0);
		const mode = campaign[3] ?? null;
		return createRoute(mode ? RouteName.PLAY : RouteName.SELECT, campaign[1], level, mode);
	}

	const editor = EDITOR_PATTERN.exec(hash);
	if (!editor) return null;
	const mode = editor[1] ?? null;
	return mode === RouteMode.SAVE || mode === RouteMode.LOAD
		? createRoute(RouteName.EDITOR_FILE, null, 0, mode)
		: createRoute(RouteName.EDITOR, null, 0, mode);
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
	const path = link.getAttribute('href');
	if (link.hasAttribute('data-up')) up(path);
	else navigate(path, link.hasAttribute('data-replace'));
});

/**
 * Get the path of a campaign route.
 *
 * @param {string} campaign The folder name of the campaign.
 * @param {number} [level] The level number, or 0 for the selection without a level.
 * @param {string|null} [mode] RouteMode.PLAY or RouteMode.REPLAY for the play route, or null for the selection.
 * @returns {string} The path, e.g. "#/campaign/normal/5/play".
 */
export function campaignPath(campaign, level = 0, mode = null) {
	const parts = level > 0 ? [campaign, level, mode] : [campaign];
	return ['#/campaign', ...parts.filter(Boolean)].join('/');
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

/**
 * Check if the route plays a replay.
 *
 * @returns {boolean} True on a replay route.
 */
export function isReplayRoute() {
	return route.get().mode === RouteMode.REPLAY;
}
