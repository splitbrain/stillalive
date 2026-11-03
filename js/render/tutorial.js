/**
 * Drawing of the messages of the tutorial.
 */

import { ctx } from '../canvas.js';
import { PLAYFIELD_WIDTH, PLAYFIELD_X, TUTORIAL_END_LEVEL } from '../constants.js';
import { keyLabels } from '../keys.js';
import { atExit } from '../physics.js';
import { game, ui } from '../state.js';
import { prepareTxt } from './hud.js';

/** @type {number} The x coordinate of the text in the robot panel. */
const leftPan = PLAYFIELD_X + 40;

/**
 * Draw the messages of the current tutorial level.
 *
 * @returns {void}
 */
export function drawTutorial() {
	if (ui.currentLevel == TUTORIAL_END_LEVEL) {
		drawEndTutorialMessage();
		return;
	}
	if (atExit()) return;
	if (ui.currentLevel == 1) {
		if (game.player.x >> 8 > PLAYFIELD_WIDTH / 2) drawExitMessage();
		if (ui.tutoPause && ui.tutoJump) drawJumpMessage();
		else if (ui.tutoPause && game.player.fadeNextLevel < 1) drawMoveMessage();
	} else if (ui.currentLevel == 2) {
		drawCakeMessage();
	} else if (ui.currentLevel == 3) {
		const sec = 5 - Math.trunc(game.time / 60);
		if (Math.trunc(game.time / 60) == 5) return;
		if (sec >= 0) drawPortalMessage(sec);
		else drawOpenPortalMessage();
	} else if (ui.currentLevel == 4) {
		if (ui.tutoPause && !ui.tutoPortal) {
			if (game.player.fadeNextLevel < 1) drawActivatePortalMessage();
		} else drawActivatePortalMessage2();
	} else if (ui.currentLevel == 5) {
		if (ui.tutoPause) {
			if (game.player.fadeNextLevel < 1) drawMomentumMessage();
		} else drawIndications();
	} else if (ui.currentLevel == 6) {
		drawSwitchMessage();
	} else if (ui.currentLevel == 7) {
		drawTurretsCrateMessage();
	} else if (ui.currentLevel == 8) {
		drawPlasmaMessage();
	}
}

/**
 * Draw the message at the end of the tutorial.
 *
 * @returns {void}
 */
function drawEndTutorialMessage() {
	prepareTxt(32, 152, PLAYFIELD_WIDTH - 32, 72);
	ctx.font = '16px Arial';
	ctx.fillText('Congratulations ! You just learned the basics of StillAliveJS.', leftPan, game.offsetY + 170);
	ctx.fillText('You have now a better understanding of the mechanics of the game.', leftPan, game.offsetY + 170 + 16);
	ctx.fillText('However, there are still a lot more features waiting for you.', leftPan, game.offsetY + 170 + 32);
	ctx.fillText('Click to continue and start an amazing journey !', leftPan, game.offsetY + 170 + 48);
}

/**
 * Draw the message about the plasma balls.
 *
 * @returns {void}
 */
function drawPlasmaMessage() {
	prepareTxt(32, 16, 420, 56);
	ctx.font = '14px Arial';
	ctx.fillText('Plasma balls can open special green walls when guided to their', leftPan, game.offsetY + 30);
	ctx.fillText('red slot. They can also destroy turrets and kill you.', leftPan, game.offsetY + 30 + 12);
	ctx.fillText('Follow instructions on the walls to guide the plasma ball and', leftPan, game.offsetY + 30 + 24);
	ctx.fillText('use that crate to destroy the turret blocking your way.', leftPan, game.offsetY + 30 + 36);

	ctx.fillText('Use to kill', 292, 369);
	ctx.fillText('<= Portal', 500, 410);
	ctx.fillText('Portal =>', 115, 204);
}

/**
 * Draw the message about the turrets and the crates.
 *
 * @returns {void}
 */
function drawTurretsCrateMessage() {
	prepareTxt(32, 32, 420, 68);
	ctx.font = '14px Arial';
	ctx.fillText('Sometimes, your body is not enough to use the switch efficiently.', leftPan, game.offsetY + 46);
	ctx.fillText('Here is a crate you can use in this level. Get close enough and', leftPan, game.offsetY + 46 + 12);
	ctx.fillText('hold left mouse button to carry the crate with your portal gun.', leftPan, game.offsetY + 46 + 24);
	ctx.fillText('Release mouse to shoot the crate on the switch and leave. Pay', leftPan, game.offsetY + 46 + 36);
	ctx.fillText("attention to that turret that can kill you if you're in range.", leftPan, game.offsetY + 46 + 48);

	ctx.fillText('Grab', 125, 367);
	ctx.fillText('Release here', 312, 478);
	ctx.fillText('Be careful', 90, 430);
}

/**
 * Draw the message about the switches.
 *
 * @returns {void}
 */
function drawSwitchMessage() {
	prepareTxtDefault();
	ctx.fillText('This special blue wall can be deactivated thanks to a switch.', leftPan, game.offsetY + 48);
	ctx.fillText('Step on this switch to be able to clear the wall and shoot a', leftPan, game.offsetY + 48 + 16);
	ctx.fillText('portal behind it. Cross the finish line to continue the tutorial.', leftPan, game.offsetY + 48 + 32);
}

/**
 * Draw the step numbers on the playfield of the momentum level.
 *
 * @returns {void}
 */
function drawIndications() {
	ctx.font = '14px Arial';
	ctx.fillText('First', 277, 136);
	ctx.fillText('Second', 274, 465);
	ctx.fillText('First again (while falling)', 359, 465);
}

/**
 * Draw the message about the momentum through portals.
 *
 * @returns {void}
 */
function drawMomentumMessage() {
	prepareTxtDefault();
	ctx.font = '14px Arial';
	ctx.fillText('When you enter a portal, you keep your speed while leaving', leftPan, game.offsetY + 46);
	ctx.fillText('the second one. Use this speed to jump higher or further.', leftPan, game.offsetY + 46 + 12);
	ctx.fillText("Shoot portals where indicated to finish this level. Don't forget", leftPan, game.offsetY + 46 + 24);
	ctx.fillText('to grab cakes on your way. Click to continue ...', leftPan, game.offsetY + 46 + 36);
}

/**
 * Draw the hints for the portal level after the player continued.
 *
 * @returns {void}
 */
function drawActivatePortalMessage2() {
	prepareTxtDefault();
	ctx.font = '14px Arial';
	ctx.fillText('Shoot a portal in the hole on the right and the other one', leftPan, game.offsetY + 48);
	ctx.fillText('under your feet. That way, you will be able to pass through.', leftPan, game.offsetY + 48 + 12);
	ctx.fillText('Then, just finish the level to continue the tutorial.', leftPan, game.offsetY + 48 + 24);
	ctx.fillText('If you want to clear portals, press the ' + keyLabels.KeyE + ' key.', leftPan, game.offsetY + 48 + 36);

	ctx.fillText('Portal', 114, 365);
	ctx.fillText('Here', 118, 380);

	ctx.fillText('And', 323, 315);
	ctx.fillText('Here', 322, 330);
}

/**
 * Draw the message that the portal gun is active now.
 *
 * @returns {void}
 */
function drawActivatePortalMessage() {
	prepareTxtDefault();
	ctx.font = '14px Arial';
	ctx.fillText('Your portal gun has been activated. You can shoot portals by', leftPan, game.offsetY + 48);
	ctx.fillText('pressing left or right mouse button. They allow you to reach ', leftPan, game.offsetY + 48 + 12);
	ctx.fillText("places where your body can't go and can only be placed on blue", leftPan, game.offsetY + 48 + 24);
	ctx.fillText('walls. Click to continue ...', leftPan, game.offsetY + 48 + 36);
}

/**
 * Draw the message after the portals appeared.
 *
 * @returns {void}
 */
function drawOpenPortalMessage() {
	prepareTxtDefault();
	ctx.fillText('Fully loaded ! Technology is beautiful.', leftPan, game.offsetY + 48);
	ctx.fillText("When you enter a portal, you're teleported in the other one.", leftPan, game.offsetY + 48 + 16);
	ctx.fillText('Enter the blue portal to pass through the wall.', leftPan, game.offsetY + 48 + 32);
}

/**
 * Draw the message that asks the player to wait for the portals.
 *
 * @param {number} sec The seconds left of the wait.
 * @returns {void}
 */
function drawPortalMessage(sec) {
	prepareTxtDefault();
	ctx.fillText("Let's get familiar with portals now. Please wait " + sec + ' seconds', leftPan, game.offsetY + 56);
	ctx.fillText('while we are gathering energy to activate them ...', leftPan, game.offsetY + 56 + 16);
}

/**
 * Draw the message about the cakes.
 *
 * @returns {void}
 */
function drawCakeMessage() {
	prepareTxtDefault();
	ctx.fillText('In StillAliveJS, grabbing cakes enables the finish line.', leftPan, game.offsetY + 48);
	ctx.fillText('When no cakes are left in a level, finish line turns white.', leftPan, game.offsetY + 48 + 16);
	ctx.fillText('Take that cake on the left and leave this room.', leftPan, game.offsetY + 48 + 32);
}

/**
 * Draw the message about the exit.
 *
 * @returns {void}
 */
function drawExitMessage() {
	prepareTxtDefault();
	ctx.fillText('See this checkered flag on the right ?', leftPan, game.offsetY + 56);
	ctx.fillText('Just touch it to finish the level.', leftPan, game.offsetY + 56 + 16);
}

/**
 * Draw the welcome message with the movement keys.
 *
 * @returns {void}
 */
function drawMoveMessage() {
	prepareTxtDefault();
	ctx.fillText('Welcome to the tutorial.', leftPan, game.offsetY + 48);
	ctx.fillText(
		'First, start moving around the room with ' + keyLabels.KeyA + ' or ' + keyLabels.KeyD + '.',
		leftPan,
		game.offsetY + 48 + 16,
	);
	ctx.fillText('Click to continue ...', leftPan, game.offsetY + 48 + 32);
}

/**
 * Draw the message about the jump.
 *
 * @returns {void}
 */
function drawJumpMessage() {
	prepareTxtDefault();
	ctx.fillText("You can't pass these obstacles unless you jump over them.", leftPan, game.offsetY + 48);
	ctx.fillText(
		'Press ' + keyLabels.KeyW + ' to perform a jump and hold it to jump higher !',
		leftPan,
		game.offsetY + 48 + 16,
	);
	ctx.fillText('Click to continue ...', leftPan, game.offsetY + 48 + 32);
}

/**
 * Draw the text box of the robot panel at its default position.
 *
 * @returns {void}
 */
function prepareTxtDefault() {
	prepareTxt(32, 32, 420, 56);
}
