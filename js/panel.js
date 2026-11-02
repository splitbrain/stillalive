/**
 * The best times panel next to the game.
 *
 * In the level selection, the panel shows the best time of the selected level and buttons for the replays. During
 * play, the panel shows the current time and the best time. The panel always shows the sum of all best times of the
 * campaign.
 */

import { getBestTime, getCampaignTotal, loadBestReplay } from './storage.js';
import { decodeReplay, downloadReplay, readReplayFile } from './replay.js';

/** @type {number} Number of ticks between two updates of the current time. */
const TIME_UPDATE_INTERVAL = 30;

/** @type {string} The HTML of the last update, to skip updates without a change. */
let lastHtml = '';

/** @type {HTMLInputElement} The hidden file input for the replay import. */
const fileInput = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });

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
	return currentMenu === 1 && selectMenu === 1;
}

/**
 * Create the HTML of the panel for the current game state.
 *
 * @returns {string} The HTML, or an empty string if the panel has no content.
 */
function panelHtml() {
	const playing = currentMenu === 2;
	if (!playing && !inLevelSelection()) return '';

	const campaign = campaigns[lvlType].folder;
	const level = playing ? currentLevel : previewMap;
	const best = level > 0 ? getBestTime(campaign, level) : null;
	const total = getCampaignTotal(campaign);
	let html = '';

	if (playing) {
		const time = perso.fadeNextLevel === -1 ? TIME - (TIME % TIME_UPDATE_INTERVAL) : TIME;
		html += `<p class="title">Level ${level}${replayMode ? ' (replay)' : ''}</p>`;
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

	lvlType = campaign;
	previewMap = data.level;
	currentLevel = data.level;
	loadPreviewMap(data.level);

	replay = recorded;
	replayMode = true;
	ECART_X = 64;
	ECART_Y = 96;
	currentMenu = 2;
	loadLevel(currentLevel);
	unclick();
}

/**
 * Show an error message to the player.
 *
 * @param {Error} error The error.
 * @returns {void}
 */
function showError(error) {
	jAlert(error.message, 'Replay');
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
		fileInput.click();
		return;
	}

	const data = await loadBestReplay(campaigns[lvlType].folder, previewMap);
	if (!data) throw new Error('There is no stored replay for this level.');
	if (action === 'watch') startReplay(data);
	else if (action === 'export') downloadReplay(data);
}

document.getElementById('highscores_in').addEventListener('click', (event) => {
	const action = event.target.closest('button')?.dataset.action;
	if (action) runAction(action).catch(showError);
});

fileInput.addEventListener('change', async () => {
	const file = fileInput.files[0];
	fileInput.value = '';
	if (!file || !inLevelSelection()) return;
	try {
		startReplay(await readReplayFile(file));
	} catch (error) {
		showError(error);
	}
});

Object.assign(window, { updatePanel });
