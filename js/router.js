/**
 * The hash router of the page.
 *
 * The hash of the URL holds the navigation state: the screen, the campaign, the level and the sub screen of the editor.
 *
 * The hash #/ or an empty hash is the main route. The hash #/campaign/normal is the select route of the campaign
 * without a level, and #/campaign/normal/5 is the select route with level 5 selected. The hash
 * #/campaign/normal/5/play is the play route with mode play, and #/campaign/normal/5/replay is the play route with
 * mode replay, the playback of a replay. The hash #/editor is the editor route. The hashes #/editor/save and
 * #/editor/load are the editor-file route with mode save or load. The hash #/credits is the credits route.
 *
 * The campaign is the folder name of the campaign. The router checks only the form of the hash and replaces an unknown
 * hash with #/. It does not know the progress of the player: the app element replaces a locked level.
 *
 * A navigation to the hash that the URL has already, by a link or by navigate(), sets the route again. The subscribers
 * then apply the same route again, e.g. to restart a level.
 */

import { CAMPAIGN_FOLDERS } from './stage/constants.js';
import { Value } from './value.js';

/**
 * A route: the parsed hash.
 *
 * @typedef {object} Route
 * @property {string} name The screen: main, select, play, editor, editor-file or credits.
 * @property {string|null} campaign The folder name of the campaign, or null if the route has no campaign.
 * @property {number} level The level number, starting at 1, or 0 if the route has no level.
 * @property {string|null} mode The mode: play or replay for the play route, save or load for the editor-file route,
 *     else null.
 */

/** @type {RegExp} The pattern of the campaign routes: the campaign, the level and the play mode. */
const CAMPAIGN_PATTERN = /^#\/campaign\/([a-z]+)(?:\/([1-9]\d*)(?:\/(play|replay))?)?$/;

/** @type {RegExp} The pattern of the editor routes: the mode of the save and load screen. */
const EDITOR_PATTERN = /^#\/editor(?:\/(save|load))?$/;

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
 * Parse a hash.
 *
 * @param {string} hash The hash of the URL, with the leading "#", or an empty text.
 * @returns {Route|null} The route, or null for an unknown hash.
 */
function parseHash(hash) {
	if (hash === '' || hash === '#' || hash === '#/') return createRoute('main');
	if (hash === '#/credits') return createRoute('credits');

	const campaign = CAMPAIGN_PATTERN.exec(hash);
	if (campaign && CAMPAIGN_FOLDERS.includes(campaign[1])) {
		const level = Number(campaign[2] ?? 0);
		const mode = campaign[3] ?? null;
		return createRoute(mode ? 'play' : 'select', campaign[1], level, mode);
	}

	const editor = EDITOR_PATTERN.exec(hash);
	if (editor) return editor[1] ? createRoute('editor-file', null, 0, editor[1]) : createRoute('editor');

	return null;
}

/**
 * Parse the hash of the URL. An unknown hash is replaced with #/ without a new entry in the history.
 *
 * @returns {Route} The route.
 */
function currentRoute() {
	const parsed = parseHash(location.hash);
	if (parsed) return parsed;
	history.replaceState(null, '', '#/');
	return createRoute('main');
}

/** @type {Value} The current route, a Route object. */
export const route = new Value(currentRoute());

window.addEventListener('hashchange', () => route.set(currentRoute()));

document.addEventListener('click', (event) => {
	if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
	const link = event.target.closest?.('a[href^="#/"]');
	if (link && link.getAttribute('href') === location.hash) route.set(currentRoute());
});

/**
 * Get the path of a campaign route.
 *
 * @param {string} campaign The folder name of the campaign.
 * @param {number} [level] The level number, or 0 for the selection without a level.
 * @param {string|null} [mode] "play" or "replay" for the play route, or null for the selection.
 * @returns {string} The path, e.g. "#/campaign/normal/5/play".
 */
export function campaignPath(campaign, level = 0, mode = null) {
	let path = '#/campaign/' + campaign;
	if (level > 0) path += '/' + level;
	if (level > 0 && mode) path += '/' + mode;
	return path;
}

/**
 * Go to a path. A path that the URL has already sets the route again.
 *
 * @param {string} path The path, e.g. "#/editor".
 * @param {boolean} [replace] True to replace the current entry of the history instead of adding a new entry.
 * @returns {void}
 */
export function navigate(path, replace = false) {
	if (replace) {
		history.replaceState(null, '', path);
		route.set(currentRoute());
	} else if (location.hash === path) {
		route.set(currentRoute());
	} else {
		location.hash = path;
	}
}
