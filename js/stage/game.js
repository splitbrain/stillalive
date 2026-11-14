/**
 * The tick function of the stage.
 */

import { playSound, sfx_transition } from './audio.js';
import { FADE_START, LevelPhase, Transition } from './constants.js';
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
import { manageKeys, unclick } from './inputState.js';
import { loadLevel, manageDoors } from './level.js';
import { isInPortal } from './portals.js';
import { encodeReplay } from './replay.js';
import { game, input, stageEvents, ui } from './state.js';
import { random } from './utils.js';

/**
 * Run one tick of the stage in the current mode.
 *
 * @param {import('./Editor.js').Editor} editor The editor of the stage.
 * @returns {void}
 */
export function tick(editor) {
	manageKeys();
	if (ui.mode == 'edit') editor.update();
	else if ((ui.mode == 'play' || ui.mode == 'test') && !ui.paused) updateLevel(editor);
}

/**
 * Run one tick of a level. The level time stands still while an event waits and while the boss comes in.
 *
 * @param {import('./Editor.js').Editor} editor The editor, which gets the end of a test run.
 * @returns {void}
 */
function updateLevel(editor) {
	if (game.isRunning()) {
		if (game.time == 0) unclick();
		game.time++;
	}
	game.objectInPortal = null;
	if (!game.player.dead && game.isRunning()) {
		game.player.move();
		if (!game.objectInPortal) game.objectInPortal = isInPortal(game.player);
	}

	manageDoors();
	if (game.atExit()) {
		updateLevelEnd(editor);
	} else if (game.isOpening()) {
		game.fade -= 4;
		if (game.fade <= 0) game.phase = LevelPhase.RUNNING;
	} else if (game.isHalted()) {
		game.phase = LevelPhase.RUNNING;
	}

	if ((game.events.isWaiting() || game.boss?.entering) && game.isRunning()) {
		game.phase = LevelPhase.HALTED;
	}
	updateObjects();
	game.boss?.update();
	if (!game.reachedExit()) game.events.update();
}

/**
 * Run the end of a level after the player reaches the exit.
 *
 * An exit event that waits for a click holds the closing transition until the click. After the transition, the stage
 * reports the event "finished" and the level stays in the exit freeze. A test run goes back to the editor.
 *
 * @param {import('./Editor.js').Editor} editor The editor, which gets the end of a test run.
 * @returns {void}
 */
function updateLevelEnd(editor) {
	game.boss = null;
	game.shakeX = 0;
	game.shakeY = 0;

	// the player starts on the open exit: the opening transition continues as the closing transition
	if (game.isOpening()) game.phase = LevelPhase.CLOSING;
	if (game.isClosing()) {
		game.fade -= 4;
		if (game.fade <= 0) {
			game.fade = 0;
			game.phase = LevelPhase.ENDED;
			if (ui.mode == 'test') {
				editor.stopTest();
				return;
			}
			const replay = encodeReplay(game.replay, game.level.campaign, game.level.number);
			stageEvents.push({ type: 'finished', detail: { time: game.time, replay } });
		}
	}
	if (game.isRunning() || game.events.isWaiting()) {
		game.events.trigger('exit');
		game.events.update();
		if (game.events.isWaiting()) {
			game.phase = LevelPhase.EXIT_WAIT;
			return;
		}
		game.phase = LevelPhase.CLOSING;
		game.fade = FADE_START;
		ui.transition = random(Transition.TOP_LEFT, Transition.SQUARE + 1);
		playSound(sfx_transition);
		game.events.message = null;
		unclick();
		game.replayMode = false;
	}
}

/**
 * Update the objects, the camera and the death fade of a level for one tick.
 *
 * @returns {void}
 */
function updateObjects() {
	animateTiles(game);

	game.player.flip = input.mouseX > game.player.midX() ? 1 : -1;

	rebuildGravPipeFields(game);
	updateCakes(game);
	updateTurrets(game);
	updatePlasma(game);
	updateSparkles(game);
	updateCrates(game);

	if (game.boss && game.isRunning()) {
		if (game.boss.shootsWheels()) updateProjectiles(game);
		game.boss.updateRumble();
	}

	updatePlatforms(game);
	updatePortals(game);
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
 * @param {boolean} [restart] True for a restart of the same level. A restart skips the waits of the events and the
 *     entrance of the boss.
 * @returns {void}
 */
export function startLevel(level, replay = null, restart = false) {
	ui.mode = 'play';
	loadLevel(level, restart, replay);
	unclick();
}
