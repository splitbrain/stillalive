/**
 * The tutorial.
 */

import { ctx } from './canvas.js';
import { CampaignId, Direction } from './constants.js';
import { Sparkle } from './entities/Sparkle.js';
import { unclick } from './input.js';
import { loadLevel } from './level.js';
import { atExit } from './physics.js';
import { game, input, ui } from './state.js';
import { random } from './utils.js';

/** @type {number} The x coordinate of the text in the robot panel. */
const leftPan = game.offsetX + 40;

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
		if (parseInt(game.TIME / 60) == 5 && !ui.portalsDisplayed) {
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
 * Draw the messages of the current tutorial level.
 *
 * @returns {void}
 */
export function drawTutorial() {
	if (ui.currentLevel == 9) {
		drawEndTutorialMessage();
		return;
	}
	if (atExit()) return;
	if (ui.currentLevel == 1) {
		if (game.player.x >> 8 > 512 - 256) drawExitMessage();
		if (ui.tutoPause && ui.tutoJump) drawJumpMessage();
		else if (ui.tutoPause && game.player.fadeNextLevel < 1) drawMoveMessage();
	} else if (ui.currentLevel == 2) {
		drawCakeMessage();
	} else if (ui.currentLevel == 3) {
		const sec = 5 - parseInt(game.TIME / 60);
		if (parseInt(game.TIME / 60) == 5) return;
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
	prepareTxt(32, 152, 512 - 32, 72);
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
	ctx.fillText('If you want to clear portals, press the E key.', leftPan, game.offsetY + 48 + 36);

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
	ctx.fillText('In StillAliveJS, grabing cakes enables the finish line.', leftPan, game.offsetY + 48);
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
	ctx.fillText('First, start moving around the room with Q (A) or D.', leftPan, game.offsetY + 48 + 16);
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
	ctx.fillText('Press Z (W) to perform a jump and hold it to jump higher !', leftPan, game.offsetY + 48 + 16);
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

/**
 * Draw a text box on the playfield and set the font and the color for the text.
 *
 * @param {number} x The left edge in playfield pixels.
 * @param {number} y The top edge in playfield pixels.
 * @param {number} w The width in pixels.
 * @param {number} h The height in pixels.
 * @returns {void}
 */
export function prepareTxt(x, y, w, h) {
	ctx.fillStyle = 'rgb(7, 49, 63)';
	ctx.fillRect(game.offsetX + x, game.offsetY + y, w, h);

	ctx.lineWidth = 4;
	ctx.fillStyle = 'rgb(255, 255, 255)';
	ctx.strokeStyle = 'rgb(255, 255, 255)';
	ctx.strokeRect(game.offsetX + x, game.offsetY + y, w, h);
	ctx.font = '16px Arial';
}

/**
 * Place the two portals of the portal level with their sparkles.
 *
 * @returns {void}
 */
function displayPortals() {
	let p, i;
	game.portals[0].direction = 3;
	game.portals[0].frame = 1;
	game.portals[0].platformIndex = -1;
	game.portals[0].scaleX = 1;
	game.portals[0].scaleY = 1;
	game.portals[0].used = 1;
	game.portals[0].vx = 255;
	game.portals[0].vy = -12;
	game.portals[0].x = 144 << 8;
	game.portals[0].y = 225 << 8;

	game.portals[1].direction = 2;
	game.portals[1].frame = 1;
	game.portals[1].platformIndex = -1;
	game.portals[1].scaleX = 1;
	game.portals[1].scaleY = 1;
	game.portals[1].used = 1;
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
			s.used = 3;
			if (game.portals[p].direction == Direction.RIGHT) {
				s.vx = -parseInt(random(128, 384));
				s.xOrig -= 7 << 8;
			} else s.vx = parseInt(random(128, 384));
			s.vy = 0;
			s.fading = 200;
			s.color = p;

			game.sparkles.push(s);
		}
	}
}
