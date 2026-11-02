var tutoJump = false;
var tutoPortal = false;
var tutoPause = false;
var portalsDisplayed = false;
var tutoEnded = false;
var leftPan = ECART_X + 40;

function setupTutorial() {
	tutoJump = false;
	tutoPortal = false;
	tutoPause = true;
	portalsDisplayed = false;
	tutoEnded = false;
	
	lvlType = 3;
	currentLevel = 1;
	loadLevel(currentLevel);
}

function manageTutorial() {
	if(currentLevel == 9) {//tutorial finished
		drawEndTutorialMessage();
	}else if(currentLevel == 1 && !finNiveau()) {
		if(!tutoJump && (perso.x >> 8) > 100) {
			tutoJump = true;
			tutoPause = true;
			perso.fadeNextLevel = 0;
			perso.intermissionFade = 1;
		}
		
		if(perso.x >> 8 > 512 - 256) {
			drawExitMessage();
		}
		
		if(tutoPause && tutoJump) {
			drawJumpMessage();
		
			if(mousePressed) {
				unclick();
				perso.fadeNextLevel = -1;
				perso.intermissionFade = 0;
				tutoPause = false;
			}
		}else if(tutoPause) {
			if(perso.fadeNextLevel < 1) {
				perso.fadeNextLevel = 0;
				perso.intermissionFade = 1;
				drawMoveMessage();
				
				if(mousePressed) {
					unclick();
					perso.fadeNextLevel = -1;
					perso.intermissionFade = 0;
					tutoPause = false;
				}
			}
		}
	}else if(currentLevel == 2 && !finNiveau()) {
		drawCakeMessage();
	}else if(currentLevel == 3 && !finNiveau()) {
		var sec = 5 - parseInt(TIME / 60);
		if(parseInt(TIME / 60) == 5) {
			if(!portalsDisplayed) {
				displayPortals();
				portalsDisplayed = true;
			}
		} else if(sec >= 0) {
			drawPortalMessage(sec);
		} else {
			drawOpenPortalMessage(sec);
		}
	}else if(currentLevel == 4 && !finNiveau()) {
		if(tutoPause && !tutoPortal) {
			if(perso.fadeNextLevel < 1) {
				perso.fadeNextLevel = 0;
				perso.intermissionFade = 1;
				drawActivatePortalMessage();
				
				if(mousePressed) {
					perso.fadeNextLevel = -1;
					perso.intermissionFade = 0;
					tutoPause = false;
					tutoPortal = true;
					unclick();
				}
			}
		}else {
			drawActivatePortalMessage2();
		}
	}else if(currentLevel == 5 && !finNiveau()) {
		if(tutoPause) {
			if(perso.fadeNextLevel < 1) {
				perso.fadeNextLevel = 0;
				perso.intermissionFade = 1;
				drawMementum();
				
				if(mousePressed) {
					perso.fadeNextLevel = -1;
					perso.intermissionFade = 0;
					tutoPause = false;
					unclick();
				}
			}
		}else {
			drawIndications();
		}
	}else if(currentLevel == 6 && !finNiveau()) {
		drawInterruptorMessage();
	}else if(currentLevel == 7 && !finNiveau()) {
		drawTurretsCrateMessage();
	}else if(currentLevel == 8 && !finNiveau()) {
		drawPlasmaMessage();
	}
}

function drawEndTutorialMessage() {
	prepareTxt(32, 152, 512 - 32, 72);
	ctx.font = "16px Arial";
	ctx.fillText("Congratulations ! You just learned the basics of StillAliveJS.", leftPan, ECART_Y + 170);
	ctx.fillText("You have now a better understanding of the mechanics of the game.", leftPan, ECART_Y + 170 + 16);
	ctx.fillText("However, there are still a lot more features waiting for you.", leftPan, ECART_Y + 170 + 32);
	ctx.fillText("Click to continue and start an amazing journey !", leftPan, ECART_Y + 170 + 48);
}

function drawPlasmaMessage() {
	prepareTxt(32, 16, 420, 56);
	ctx.font = "14px Arial";
	ctx.fillText("Plasma balls can open special green walls when guided to their", leftPan, ECART_Y + 30);
	ctx.fillText("red slot. They can also destroy turrets and kill you.", leftPan, ECART_Y + 30 + 12);
	ctx.fillText("Follow instructions on the walls to guide the plasma ball and", leftPan, ECART_Y + 30 + 24);
	ctx.fillText("use that crate to destroy the turret blocking your way.", leftPan, ECART_Y + 30 + 36);
	
	ctx.fillText("Use to kill", 292, 369);
	ctx.fillText("<= Portal", 500, 410);
	ctx.fillText("Portal =>", 115, 204);
}

function drawTurretsCrateMessage() {
	prepareTxt(32, 32, 420, 68);
	ctx.font = "14px Arial";
	ctx.fillText("Sometimes, your body is not enough to use the switch efficiently.", leftPan, ECART_Y + 46);
	ctx.fillText("Here is a crate you can use in this level. Get close enough and", leftPan, ECART_Y + 46 + 12);
	ctx.fillText("hold left mouse button to carry the crate with your portal gun.", leftPan, ECART_Y + 46 + 24);
	ctx.fillText("Release mouse to shoot the crate on the switch and leave. Pay", leftPan, ECART_Y + 46 + 36);
	ctx.fillText("attention to that turret that can kill you if you're in range.", leftPan, ECART_Y + 46 + 48);
	
	ctx.fillText("Grab", 125, 367);
	ctx.fillText("Release here", 312, 478);
	ctx.fillText("Be careful", 90, 430);
}

function drawInterruptorMessage() {
	prepareTxtDefault();
	ctx.fillText("This special blue wall can be deactivated thanks to a switch.", leftPan, ECART_Y + 48);
	ctx.fillText("Step on this switch to be able to clear the wall and shoot a", leftPan, ECART_Y + 48 + 16);
	ctx.fillText("portal behind it. Cross the finish line to continue the tutorial.", leftPan, ECART_Y + 48 + 32);
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
	ctx.fillText("When you enter a portal, you keep your speed while leaving", leftPan, ECART_Y + 46);
	ctx.fillText("the second one. Use this speed to jump higher or further.", leftPan, ECART_Y + 46 + 12);
	ctx.fillText("Shoot portals where indicated to finish this level. Don't forget", leftPan, ECART_Y + 46 + 24);
	ctx.fillText("to grab cakes on your way. Click to continue ...", leftPan, ECART_Y + 46 + 36);
}

function drawActivatePortalMessage2() {
	prepareTxtDefault();
	ctx.font = "14px Arial";
	ctx.fillText("Shoot a portal in the hole on the right and the other one", leftPan, ECART_Y + 48);
	ctx.fillText("under your feet. That way, you will be able to pass through.", leftPan, ECART_Y + 48 + 12);
	ctx.fillText("Then, just finish the level to continue the tutorial.", leftPan, ECART_Y + 48 + 24);
	ctx.fillText("If you want to clear portals, press the E key.", leftPan, ECART_Y + 48 + 36);
	
	ctx.fillText("Portal", 114, 365);
	ctx.fillText("Here", 118, 380);
	
	ctx.fillText("And", 323, 315);
	ctx.fillText("Here", 322, 330);
}

function drawActivatePortalMessage() {
	prepareTxtDefault();
	ctx.font = "14px Arial";
	ctx.fillText("Your portal gun has been activated. You can shoot portals by", leftPan, ECART_Y + 48);
	ctx.fillText("pressing left or right mouse button. They allow you to reach ", leftPan, ECART_Y + 48 + 12);
	ctx.fillText("places where your body can't go and can only be placed on blue", leftPan, ECART_Y + 48 + 24);
	ctx.fillText("walls. Click to continue ...", leftPan, ECART_Y + 48 + 36);
}

function drawOpenPortalMessage(sec) {
	prepareTxtDefault();
	ctx.fillText("Fully loaded ! Technology is beautiful.", leftPan, ECART_Y + 48);
	ctx.fillText("When you enter a portal, you're teleported in the other one.", leftPan, ECART_Y + 48 + 16);
	ctx.fillText("Enter the blue portal to pass through the wall.", leftPan, ECART_Y + 48 + 32);
}

function drawPortalMessage(sec) {
	prepareTxtDefault();
	ctx.fillText("Let's get familiar with portals now. Please wait " + sec + " seconds", leftPan, ECART_Y + 56);
	ctx.fillText("while we are gathering energy to activate them ...", leftPan, ECART_Y + 56 + 16);
}

function drawCakeMessage() {
	prepareTxtDefault();
	ctx.fillText("In StillAliveJS, grabing cakes enables the finish line.", leftPan, ECART_Y + 48);
	ctx.fillText("When no cakes are left in a level, finish line turns white.", leftPan, ECART_Y + 48 + 16);
	ctx.fillText("Take that cake on the left and leave this room.", leftPan, ECART_Y + 48 + 32);
}

function drawExitMessage() {
	prepareTxtDefault();
	ctx.fillText("See this checkered flag on the right ?", leftPan, ECART_Y + 56);
	ctx.fillText("Just touch it to finish the level.", leftPan, ECART_Y + 56 + 16);
	//ctx.fillText("Jump to make this message disappear ...", leftPan, ECART_Y + 48 + 32);
}

function drawMoveMessage() {
	prepareTxtDefault();
	ctx.fillText("Welcome to the tutorial.", leftPan, ECART_Y + 48);
	ctx.fillText("First, start moving around the room with Q (A) or D.", leftPan, ECART_Y + 48 + 16);
	ctx.fillText("Click to continue ...", leftPan, ECART_Y + 48 + 32);
}


function drawJumpMessage() {
	prepareTxtDefault();
	ctx.fillText("You can't pass these obstacles unless you jump over them.", leftPan, ECART_Y + 48);
	ctx.fillText("Press Z (W) to perform a jump and hold it to jump higher !", leftPan, ECART_Y + 48 + 16);
	ctx.fillText("Click to continue ...", leftPan, ECART_Y + 48 + 32);
}

function prepareTxtDefault() {
	prepareTxt(32, 32, 420, 56);
}

function prepareTxt(x, y, w, h) {
	ctx.fillStyle = "rgb(7, 49, 63)";
	ctx.fillRect(ECART_X + x, ECART_Y + y, w, h);
	
	ctx.lineWidth = 4;
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.strokeStyle = "rgb(255, 255, 255)";
	ctx.strokeRect(ECART_X + x, ECART_Y + y, w, h);
	ctx.font = "16px Arial";
}

function displayPortals() {
	portals[0].direction = 3;
	portals[0].frame = 1;
	portals[0].plateforme = -1;
	portals[0].portalNum = -1;
	portals[0].scaleX = 1;
	portals[0].scaleY = 1;
	portals[0].used = 1;
	portals[0].vx = 255;
	portals[0].vy = -12;
	portals[0].x = 144 << 8;
	portals[0].y = 225 << 8;
	
	portals[1].direction = 2;
	portals[1].frame = 1;
	portals[1].plateforme = -1;
	portals[1].portalNum = -1;
	portals[1].scaleX = 1;
	portals[1].scaleY = 1;
	portals[1].used = 1;
	portals[1].vx = -255;
	portals[1].vy = -12;
	portals[1].x = 188 << 8;
	portals[1].y = 225 << 8;
	
	for(p=0; p<2; p++) {
		for(i=0;i<13;i++){
			var s = new Sparkle();
			s.x = portals[p].x;
			s.y = portals[p].y + ((i*2)<<8);
			s.xOrig = s.x;
			s.yOrig = s.y;
			s.portalNum = p;
			s.used = 3;
			if(portals[p].direction==DROITE) {
				s.vx = -parseInt(random(128, 384));
				s.xOrig -= 7 << 8;
			}else s.vx = parseInt(random(128, 384));
			s.vy = 0;
			s.fading = 200;
			s.color = p;
			
			sparkles.push(s);
		}
	}
}
