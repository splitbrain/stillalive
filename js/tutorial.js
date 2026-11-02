/**
 * The tutorial.
 */

import { ctx } from './canvas.js';
import { DROITE } from './constants.js';
import { Sparkle } from './entities/Sparkle.js';
import { unclick } from './input.js';
import { loadLevel } from './level.js';
import { finNiveau } from './physics.js';
import { game, input, ui } from './state.js';
import { random } from './utils.js';

const leftPan = game.ECART_X + 40;

export function setupTutorial() {
	ui.tutoJump = false;
	ui.tutoPortal = false;
	ui.tutoPause = true;
	ui.portalsDisplayed = false;
	ui.tutoEnded = false;
	
	ui.lvlType = 3;
	ui.currentLevel = 1;
	loadLevel(ui.currentLevel);
}

export function manageTutorial() {
	if(ui.currentLevel == 9) {//tutorial finished
		drawEndTutorialMessage();
	}else if(ui.currentLevel == 1 && !finNiveau()) {
		if(!ui.tutoJump && (game.perso.x >> 8) > 100) {
			ui.tutoJump = true;
			ui.tutoPause = true;
			game.perso.fadeNextLevel = 0;
			game.perso.intermissionFade = 1;
		}
		
		if(game.perso.x >> 8 > 512 - 256) {
			drawExitMessage();
		}
		
		if(ui.tutoPause && ui.tutoJump) {
			drawJumpMessage();
		
			if(input.mousePressed) {
				unclick();
				game.perso.fadeNextLevel = -1;
				game.perso.intermissionFade = 0;
				ui.tutoPause = false;
			}
		}else if(ui.tutoPause) {
			if(game.perso.fadeNextLevel < 1) {
				game.perso.fadeNextLevel = 0;
				game.perso.intermissionFade = 1;
				drawMoveMessage();
				
				if(input.mousePressed) {
					unclick();
					game.perso.fadeNextLevel = -1;
					game.perso.intermissionFade = 0;
					ui.tutoPause = false;
				}
			}
		}
	}else if(ui.currentLevel == 2 && !finNiveau()) {
		drawCakeMessage();
	}else if(ui.currentLevel == 3 && !finNiveau()) {
		const sec = 5 - parseInt(game.TIME / 60);
		if(parseInt(game.TIME / 60) == 5) {
			if(!ui.portalsDisplayed) {
				displayPortals();
				ui.portalsDisplayed = true;
			}
		} else if(sec >= 0) {
			drawPortalMessage(sec);
		} else {
			drawOpenPortalMessage(sec);
		}
	}else if(ui.currentLevel == 4 && !finNiveau()) {
		if(ui.tutoPause && !ui.tutoPortal) {
			if(game.perso.fadeNextLevel < 1) {
				game.perso.fadeNextLevel = 0;
				game.perso.intermissionFade = 1;
				drawActivatePortalMessage();
				
				if(input.mousePressed) {
					game.perso.fadeNextLevel = -1;
					game.perso.intermissionFade = 0;
					ui.tutoPause = false;
					ui.tutoPortal = true;
					unclick();
				}
			}
		}else {
			drawActivatePortalMessage2();
		}
	}else if(ui.currentLevel == 5 && !finNiveau()) {
		if(ui.tutoPause) {
			if(game.perso.fadeNextLevel < 1) {
				game.perso.fadeNextLevel = 0;
				game.perso.intermissionFade = 1;
				drawMementum();
				
				if(input.mousePressed) {
					game.perso.fadeNextLevel = -1;
					game.perso.intermissionFade = 0;
					ui.tutoPause = false;
					unclick();
				}
			}
		}else {
			drawIndications();
		}
	}else if(ui.currentLevel == 6 && !finNiveau()) {
		drawInterruptorMessage();
	}else if(ui.currentLevel == 7 && !finNiveau()) {
		drawTurretsCrateMessage();
	}else if(ui.currentLevel == 8 && !finNiveau()) {
		drawPlasmaMessage();
	}
}

function drawEndTutorialMessage() {
	prepareTxt(32, 152, 512 - 32, 72);
	ctx.font = "16px Arial";
	ctx.fillText("Congratulations ! You just learned the basics of StillAliveJS.", leftPan, game.ECART_Y + 170);
	ctx.fillText("You have now a better understanding of the mechanics of the game.", leftPan, game.ECART_Y + 170 + 16);
	ctx.fillText("However, there are still a lot more features waiting for you.", leftPan, game.ECART_Y + 170 + 32);
	ctx.fillText("Click to continue and start an amazing journey !", leftPan, game.ECART_Y + 170 + 48);
}

function drawPlasmaMessage() {
	prepareTxt(32, 16, 420, 56);
	ctx.font = "14px Arial";
	ctx.fillText("Plasma balls can open special green walls when guided to their", leftPan, game.ECART_Y + 30);
	ctx.fillText("red slot. They can also destroy turrets and kill you.", leftPan, game.ECART_Y + 30 + 12);
	ctx.fillText("Follow instructions on the walls to guide the plasma ball and", leftPan, game.ECART_Y + 30 + 24);
	ctx.fillText("use that crate to destroy the turret blocking your way.", leftPan, game.ECART_Y + 30 + 36);
	
	ctx.fillText("Use to kill", 292, 369);
	ctx.fillText("<= Portal", 500, 410);
	ctx.fillText("Portal =>", 115, 204);
}

function drawTurretsCrateMessage() {
	prepareTxt(32, 32, 420, 68);
	ctx.font = "14px Arial";
	ctx.fillText("Sometimes, your body is not enough to use the switch efficiently.", leftPan, game.ECART_Y + 46);
	ctx.fillText("Here is a crate you can use in this level. Get close enough and", leftPan, game.ECART_Y + 46 + 12);
	ctx.fillText("hold left mouse button to carry the crate with your portal gun.", leftPan, game.ECART_Y + 46 + 24);
	ctx.fillText("Release mouse to shoot the crate on the switch and leave. Pay", leftPan, game.ECART_Y + 46 + 36);
	ctx.fillText("attention to that turret that can kill you if you're in range.", leftPan, game.ECART_Y + 46 + 48);
	
	ctx.fillText("Grab", 125, 367);
	ctx.fillText("Release here", 312, 478);
	ctx.fillText("Be careful", 90, 430);
}

function drawInterruptorMessage() {
	prepareTxtDefault();
	ctx.fillText("This special blue wall can be deactivated thanks to a switch.", leftPan, game.ECART_Y + 48);
	ctx.fillText("Step on this switch to be able to clear the wall and shoot a", leftPan, game.ECART_Y + 48 + 16);
	ctx.fillText("portal behind it. Cross the finish line to continue the tutorial.", leftPan, game.ECART_Y + 48 + 32);
}

function drawIndications() {
	ctx.font = "14px Arial";
	ctx.fillText("First", 277, 136);
	ctx.fillText("Second", 274, 465);
	ctx.fillText("First again (while falling)", 359, 465);
}

function drawMementum() {
	prepareTxtDefault();
	ctx.font = "14px Arial";
	ctx.fillText("When you enter a portal, you keep your speed while leaving", leftPan, game.ECART_Y + 46);
	ctx.fillText("the second one. Use this speed to jump higher or further.", leftPan, game.ECART_Y + 46 + 12);
	ctx.fillText("Shoot portals where indicated to finish this level. Don't forget", leftPan, game.ECART_Y + 46 + 24);
	ctx.fillText("to grab cakes on your way. Click to continue ...", leftPan, game.ECART_Y + 46 + 36);
}

function drawActivatePortalMessage2() {
	prepareTxtDefault();
	ctx.font = "14px Arial";
	ctx.fillText("Shoot a portal in the hole on the right and the other one", leftPan, game.ECART_Y + 48);
	ctx.fillText("under your feet. That way, you will be able to pass through.", leftPan, game.ECART_Y + 48 + 12);
	ctx.fillText("Then, just finish the level to continue the tutorial.", leftPan, game.ECART_Y + 48 + 24);
	ctx.fillText("If you want to clear portals, press the E key.", leftPan, game.ECART_Y + 48 + 36);
	
	ctx.fillText("Portal", 114, 365);
	ctx.fillText("Here", 118, 380);
	
	ctx.fillText("And", 323, 315);
	ctx.fillText("Here", 322, 330);
}

function drawActivatePortalMessage() {
	prepareTxtDefault();
	ctx.font = "14px Arial";
	ctx.fillText("Your portal gun has been activated. You can shoot portals by", leftPan, game.ECART_Y + 48);
	ctx.fillText("pressing left or right mouse button. They allow you to reach ", leftPan, game.ECART_Y + 48 + 12);
	ctx.fillText("places where your body can't go and can only be placed on blue", leftPan, game.ECART_Y + 48 + 24);
	ctx.fillText("walls. Click to continue ...", leftPan, game.ECART_Y + 48 + 36);
}

function drawOpenPortalMessage(sec) {
	prepareTxtDefault();
	ctx.fillText("Fully loaded ! Technology is beautiful.", leftPan, game.ECART_Y + 48);
	ctx.fillText("When you enter a portal, you're teleported in the other one.", leftPan, game.ECART_Y + 48 + 16);
	ctx.fillText("Enter the blue portal to pass through the wall.", leftPan, game.ECART_Y + 48 + 32);
}

function drawPortalMessage(sec) {
	prepareTxtDefault();
	ctx.fillText("Let's get familiar with portals now. Please wait " + sec + " seconds", leftPan, game.ECART_Y + 56);
	ctx.fillText("while we are gathering energy to activate them ...", leftPan, game.ECART_Y + 56 + 16);
}

function drawCakeMessage() {
	prepareTxtDefault();
	ctx.fillText("In StillAliveJS, grabing cakes enables the finish line.", leftPan, game.ECART_Y + 48);
	ctx.fillText("When no cakes are left in a level, finish line turns white.", leftPan, game.ECART_Y + 48 + 16);
	ctx.fillText("Take that cake on the left and leave this room.", leftPan, game.ECART_Y + 48 + 32);
}

function drawExitMessage() {
	prepareTxtDefault();
	ctx.fillText("See this checkered flag on the right ?", leftPan, game.ECART_Y + 56);
	ctx.fillText("Just touch it to finish the level.", leftPan, game.ECART_Y + 56 + 16);
	//ctx.fillText("Jump to make this message disappear ...", leftPan, ECART_Y + 48 + 32);
}

function drawMoveMessage() {
	prepareTxtDefault();
	ctx.fillText("Welcome to the tutorial.", leftPan, game.ECART_Y + 48);
	ctx.fillText("First, start moving around the room with Q (A) or D.", leftPan, game.ECART_Y + 48 + 16);
	ctx.fillText("Click to continue ...", leftPan, game.ECART_Y + 48 + 32);
}

function drawJumpMessage() {
	prepareTxtDefault();
	ctx.fillText("You can't pass these obstacles unless you jump over them.", leftPan, game.ECART_Y + 48);
	ctx.fillText("Press Z (W) to perform a jump and hold it to jump higher !", leftPan, game.ECART_Y + 48 + 16);
	ctx.fillText("Click to continue ...", leftPan, game.ECART_Y + 48 + 32);
}

function prepareTxtDefault() {
	prepareTxt(32, 32, 420, 56);
}

export function prepareTxt(x, y, w, h) {
	ctx.fillStyle = "rgb(7, 49, 63)";
	ctx.fillRect(game.ECART_X + x, game.ECART_Y + y, w, h);
	
	ctx.lineWidth = 4;
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.strokeStyle = "rgb(255, 255, 255)";
	ctx.strokeRect(game.ECART_X + x, game.ECART_Y + y, w, h);
	ctx.font = "16px Arial";
}

function displayPortals() {
	let p, i;
	game.portals[0].direction = 3;
	game.portals[0].frame = 1;
	game.portals[0].plateforme = -1;
	game.portals[0].portalNum = -1;
	game.portals[0].scaleX = 1;
	game.portals[0].scaleY = 1;
	game.portals[0].used = 1;
	game.portals[0].vx = 255;
	game.portals[0].vy = -12;
	game.portals[0].x = 144 << 8;
	game.portals[0].y = 225 << 8;
	
	game.portals[1].direction = 2;
	game.portals[1].frame = 1;
	game.portals[1].plateforme = -1;
	game.portals[1].portalNum = -1;
	game.portals[1].scaleX = 1;
	game.portals[1].scaleY = 1;
	game.portals[1].used = 1;
	game.portals[1].vx = -255;
	game.portals[1].vy = -12;
	game.portals[1].x = 188 << 8;
	game.portals[1].y = 225 << 8;
	
	for(p=0; p<2; p++) {
		for(i=0;i<13;i++){
			const s = new Sparkle();
			s.x = game.portals[p].x;
			s.y = game.portals[p].y + ((i*2)<<8);
			s.xOrig = s.x;
			s.yOrig = s.y;
			s.portalNum = p;
			s.used = 3;
			if(game.portals[p].direction==DROITE) {
				s.vx = -parseInt(random(128, 384));
				s.xOrig -= 7 << 8;
			}else s.vx = parseInt(random(128, 384));
			s.vy = 0;
			s.fading = 200;
			s.color = p;
			
			game.sparkles.push(s);
		}
	}
}
