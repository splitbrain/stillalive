/**
 * The logic of the tutorial: its start, its pauses and the portals of the portal level.
 */

import { CampaignId, Direction, SparkleType } from './constants.js';
import { Sparkle } from './entities/Sparkle.js';
import { unclick } from './inputState.js';
import { loadLevel } from './level.js';
import { atExit } from './physics.js';
import { game, input, ui } from './state.js';
import { random } from './utils.js';

/**
 * Start the tutorial at its first level.
 *
 * @returns {void}
 */
export function setupTutorial() {
	ui.tutoJump = false;
	ui.tutoPortal = false;
	ui.tutoPause = true;
	ui.portalsDisplayed = false;
	ui.tutoEnded = false;

	ui.campaign = CampaignId.TUTORIAL;
	ui.currentLevel = 1;
	loadLevel(ui.currentLevel);
}

/**
 * Run the tutorial for one tick: the pauses that wait for a click and the portals of the portal level.
 *
 * @returns {void}
 */
export function updateTutorial() {
	if (atExit()) return;
	if (ui.currentLevel == 1) {
		if (!ui.tutoJump && game.player.x >> 8 > 100) {
			ui.tutoJump = true;
			ui.tutoPause = true;
			game.player.fadeNextLevel = 0;
			game.player.intermissionFade = 1;
		}
		if (ui.tutoPause && ui.tutoJump) {
			if (input.mousePressed) endPause();
		} else if (ui.tutoPause && game.player.fadeNextLevel < 1) {
			game.player.fadeNextLevel = 0;
			game.player.intermissionFade = 1;
			if (input.mousePressed) endPause();
		}
	} else if (ui.currentLevel == 3) {
		if (Math.trunc(game.time / 60) == 5 && !ui.portalsDisplayed) {
			displayPortals();
			ui.portalsDisplayed = true;
		}
	} else if (ui.currentLevel == 4) {
		if (ui.tutoPause && !ui.tutoPortal && game.player.fadeNextLevel < 1) {
			game.player.fadeNextLevel = 0;
			game.player.intermissionFade = 1;
			if (input.mousePressed) {
				endPause();
				ui.tutoPortal = true;
			}
		}
	} else if (ui.currentLevel == 5) {
		if (ui.tutoPause && game.player.fadeNextLevel < 1) {
			game.player.fadeNextLevel = 0;
			game.player.intermissionFade = 1;
			if (input.mousePressed) endPause();
		}
	}
}

/**
 * End a pause of the tutorial after a click.
 *
 * @returns {void}
 */
function endPause() {
	unclick();
	game.player.fadeNextLevel = -1;
	game.player.intermissionFade = 0;
	ui.tutoPause = false;
}

/**
 * Place the two portals of the portal level with their sparkles.
 *
 * @returns {void}
 */
function displayPortals() {
	let p, i;
	game.portals[0].direction = Direction.RIGHT;
	game.portals[0].frame = 1;
	game.portals[0].platformIndex = -1;
	game.portals[0].scaleX = 1;
	game.portals[0].scaleY = 1;
	game.portals[0].used = true;
	game.portals[0].vx = 255;
	game.portals[0].vy = -12;
	game.portals[0].x = 144 << 8;
	game.portals[0].y = 225 << 8;

	game.portals[1].direction = Direction.LEFT;
	game.portals[1].frame = 1;
	game.portals[1].platformIndex = -1;
	game.portals[1].scaleX = 1;
	game.portals[1].scaleY = 1;
	game.portals[1].used = true;
	game.portals[1].vx = -255;
	game.portals[1].vy = -12;
	game.portals[1].x = 188 << 8;
	game.portals[1].y = 225 << 8;

	for (p = 0; p < 2; p++) {
		for (i = 0; i < 13; i++) {
			const s = new Sparkle();
			s.x = game.portals[p].x;
			s.y = game.portals[p].y + ((i * 2) << 8);
			s.xOrig = s.x;
			s.yOrig = s.y;
			s.portalNum = p;
			s.type = SparkleType.PORTAL_GLOW;
			if (game.portals[p].direction == Direction.RIGHT) {
				s.vx = -random(128, 384);
				s.xOrig -= 7 << 8;
			} else s.vx = random(128, 384);
			s.vy = 0;
			s.fading = 200;
			s.color = p;

			game.sparkles.push(s);
		}
	}
}
