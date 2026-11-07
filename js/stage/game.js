/**
 * The tick function: the modes of the stage, the level and the end of a level.
 */

import { playSound, sfx_transition } from './audio.js';
import { updateBoss, updateBossRumble } from './boss.js';
import { Transition } from './constants.js';
import { updateLevelEditor } from './editor.js';
import { animateTiles } from './entities/AnimatedTile.js';
import { updateCakes } from './entities/Cake.js';
import { updateCrates } from './entities/Crate.js';
import { rebuildGravPipeFields } from './entities/GravPipeField.js';
import { updatePlasma } from './entities/Plasma.js';
import { updatePlatforms } from './entities/Platform.js';
import { updatePortals } from './entities/Portal.js';
import { updateProjectiles } from './entities/Projectile.js';
import { updateSparkles } from './entities/Sparkle.js';
import { updateTurrets } from './entities/Turret.js';
import { isWaiting, triggerEvents, updateEvents } from './events.js';
import { manageKeys, unclick } from './inputState.js';
import { loadLevel, manageDoors } from './level.js';
import { atExit } from './physics.js';
import { isInPortal } from './portals.js';
import { encodeReplay } from './replay.js';
import { game, input, stageEvents, ui } from './state.js';
import { random } from './utils.js';

/**
 * Run one tick of the stage: process the input and run the logic of the mode. A preview and the idle stage do not
 * change.
 *
 * @returns {void}
 */
export function tick() {
	manageKeys();
	if (ui.mode == 'edit' || ui.mode == 'test') updateLevelEditor();
	else if (ui.mode == 'play' && !ui.paused) updateLevel();
}

/**
 * Run one tick of a level: the level time, the player, the doors, the level end, the objects, the boss and the
 * events. The level time stands still while an event waits and while the boss comes in.
 *
 * @returns {void}
 */
function updateLevel() {
	if (!atExit() && game.player.fadeNextLevel == -1) {
		if (game.time == 0) unclick();
		game.time++;
	}
	game.needRedrawTiles = 0;
	if (!game.player.dead && game.player.fadeNextLevel == -1) {
		game.player.move();
		if (game.needRedrawTiles == 0) game.needRedrawTiles = isInPortal(game.player);
	}

	manageDoors();
	if (atExit()) {
		updateLevelEnd();
	} else {
		if (game.player.fadeNextLevel > 0) {
			game.player.fadeNextLevel -= 4;
		}
		if (game.player.fadeNextLevel <= 0) {
			game.player.fadeNextLevel = -1;
		}
	}

	if ((isWaiting() || (game.bossNum > 0 && game.bossIsComing)) && game.player.fadeNextLevel == -1) {
		game.player.fadeNextLevel = 0;
	}
	updateObjects();
	updateBoss();
	if (!atExit()) updateEvents();
}

/**
 * Run the end of a level: the exit events, the closing transition, and the finished event of the stage when the
 * transition ends. An exit event that waits for a click holds the transition until the click. After the transition,
 * the level waits in the exit freeze until the next command of the stage.
 *
 * @returns {void}
 */
function updateLevelEnd() {
	game.bossNum = 0;
	game.shakeX = 0;
	game.shakeY = 0;

	if (game.player.fadeNextLevel > 0) {
		game.player.fadeNextLevel -= 4;
		if (game.player.fadeNextLevel <= 0) {
			game.player.fadeNextLevel = 0;
			const replay = encodeReplay(game.replay, game.level.campaign, game.level.number);
			stageEvents.push({ type: 'finished', detail: { time: game.time, replay } });
		}
	}
	if (game.player.fadeNextLevel == -1 || isWaiting()) {
		triggerEvents('exit');
		updateEvents();
		if (isWaiting()) return;
		game.player.fadeNextLevel = 120;
		ui.transition = random(Transition.TOP_LEFT, Transition.SQUARE + 1);
		playSound(sfx_transition);
		game.message = null;
		unclick();
		game.replayMode = false;
	}
}

/**
 * Update the objects of a level in the order of the game logic: the tiles, the player direction, the pipe fields,
 * the cakes, the turrets, the plasma balls, the sparkles, the crates, the boss projectiles, the platforms, the
 * portals, the camera and the death fade.
 *
 * @returns {void}
 */
function updateObjects() {
	animateTiles();

	game.player.flip = input.mouseX > (game.player.x >> 8) + (game.player.pX >> 1) ? 1 : -1;

	rebuildGravPipeFields();
	updateCakes();
	updateTurrets();
	updatePlasma();
	updateSparkles();
	updateCrates();

	if (game.bossNum > 0) {
		if (game.bossNum == 2 || game.bossNum == 4) updateProjectiles();
		updateBossRumble();
	}

	updatePlatforms();
	updatePortals();
	game.camera.move();

	if (game.player.dead) {
		game.player.life += 6;
		game.player.checkDeath();
	}
}

/**
 * Start a level, or the playback of a replay of the level.
 *
 * @param {import('./level.js').Level} level The level.
 * @param {import('./replay.js').Replay|null} [replay] The replay to play, or null to let the player play.
 * @param {boolean} [restart] True for a restart of the same level: the waits of the events and the entrance of the
 *     boss are skipped.
 * @returns {void}
 */
export function startLevel(level, replay = null, restart = false) {
	ui.mode = 'play';
	game.shakeX = 0;
	game.shakeY = 0;
	game.replayMode = replay !== null;
	if (replay) game.replay = replay;
	loadLevel(level, restart);
	unclick();
}
