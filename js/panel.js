/**
 * The best times panel next to the game.
 *
 * In the level selection, the panel shows the best time of the selected level and buttons for the replays. During
 * play, the panel shows the current time and the best time. The panel always shows the sum of all best times of the
 * campaign.
 */

import { alertDialog } from './dialog.js';
import { pickJsonFile } from './files.js';
import { unclick } from './input.js';
import { campaigns, loadLevel, loadPreviewMap } from './level.js';
import { decodeReplay, downloadReplay } from './replay.js';
import { game, ui } from './state.js';
import { getBestTime, getCampaignTotal, loadBestReplay } from './storage.js';
import { toTime } from './utils.js';

/** @type {number} Number of ticks between two updates of the current time. */
const TIME_UPDATE_INTERVAL = 30;

/** @type {string} The HTML of the last update, to skip updates without a change. */
let lastHtml = '';

/**
 * Format a time for the panel.
 *
 * @param {number|null} ticks The time in ticks.
 * @returns {string} The formatted time, or a dash if there is no time.
 */
function formatTime(ticks) {
	return ticks === null ? '-' : toTime(ticks);
}

/**
 * Check if the player is in the level selection of a campaign.
 *
 * @returns {boolean} True in the level selection.
 */
function inLevelSelection() {
	return ui.currentMenu === 1 && ui.selectMenu === 1;
}

/**
 * Create the HTML of the panel for the current game state.
 *
 * @returns {string} The HTML, or an empty string if the panel has no content.
 */
function panelHtml() {
	const playing = ui.currentMenu === 2;
	if (!playing && !inLevelSelection()) return '';

	const campaign = campaigns[ui.lvlType].folder;
	const level = playing ? ui.currentLevel : ui.previewMap;
	const best = level > 0 ? getBestTime(campaign, level) : null;
	const total = getCampaignTotal(campaign);
	let html = '';

	if (playing) {
		const time = game.perso.fadeNextLevel === -1 ? game.TIME - (game.TIME % TIME_UPDATE_INTERVAL) : game.TIME;
		html += `<p class="title">Level ${level}${game.replayMode ? ' (replay)' : ''}</p>`;
		html += `<p>Time: ${toTime(time)}</p>`;
		html += `<p>Best time: ${formatTime(best)}</p>`;
	} else {
		if (level > 0) {
			html += `<p class="title">Level ${level}</p>`;
			html += `<p>Best time: ${formatTime(best)}</p>`;
			if (best !== null) {
				html += '<p><button data-action="watch">Watch replay</button></p>';
				html += '<p><button data-action="export">Export replay</button></p>';
			}
		}
		html += '<p><button data-action="import">Import replay</button></p>';
	}

	html += `<p class="total">Campaign total: ${toTime(total.ticks)}<br>${total.levels} of 28 levels</p>`;
	return html;
}

/**
 * Update the panel content if the game state has changed.
 *
 * @returns {void}
 */
export function updatePanel() {
	const html = panelHtml();
	if (html === lastHtml) return;
	lastHtml = html;
	document.getElementById('highscores_in').innerHTML = html;
}

/**
 * Start the playback of a replay.
 *
 * @param {object} data The replay in the file format.
 * @returns {void}
 * @throws {Error} If the replay is not valid or the campaign or level does not exist.
 */
function startReplay(data) {
	const recorded = decodeReplay(data);
	const campaign = campaigns.findIndex((c) => c.folder === data.campaign && c.folder !== 'tutorial');
	if (campaign < 0 || data.level < 1 || data.level > 28) throw new Error('The replay is for an unknown level.');

	ui.lvlType = campaign;
	ui.previewMap = data.level;
	ui.currentLevel = data.level;
	loadPreviewMap(data.level);

	game.replay = recorded;
	game.replayMode = true;
	game.ECART_X = 64;
	game.ECART_Y = 96;
	ui.currentMenu = 2;
	loadLevel(ui.currentLevel);
	unclick();
}

/**
 * Show an error message to the player.
 *
 * @param {Error} error The error.
 * @returns {void}
 */
function showError(error) {
	alertDialog(error.message, 'Replay');
}

/**
 * Run the action of a panel button.
 *
 * @param {string} action The action name from the data-action attribute.
 * @returns {Promise<void>}
 */
async function runAction(action) {
	if (!inLevelSelection()) return;
	if (action === 'import') {
		const data = await pickJsonFile();
		if (inLevelSelection()) startReplay(data);
		return;
	}

	const data = await loadBestReplay(campaigns[ui.lvlType].folder, ui.previewMap);
	if (!data) throw new Error('There is no stored replay for this level.');
	if (action === 'watch') startReplay(data);
	else if (action === 'export') downloadReplay(data);
}

document.getElementById('highscores_in').addEventListener('click', (event) => {
	const action = event.target.closest('button')?.dataset.action;
	if (action) runAction(action).catch(showError);
});
