function drawLowQualityPortals() {
	if(quality == 0 && perso.timePosePortal < 5) {
		ctx.lineWidth = 3;
		for(i in portalLines) {
			if(portalLines[i].color == 0) {
				ctx.strokeStyle = "rgb(0, 255, 255)";
			}else if(portalLines[i].color == 1) {
				ctx.strokeStyle = "rgb(255, 0, 0)";
			}
			line(portalLines[i].x1 + ECART_X, portalLines[i].y1 + ECART_Y, portalLines[i].x2 + ECART_X, portalLines[i].y2 + ECART_Y);
		}
	}
}

function drawPortalGun() {
	if(currentMenu != 6 || tutoPortal) {
		var a = getAngle((perso.x>>8) + (perso.pX>>1) + ECART_X, (perso.y>>8) + (perso.pY>>1) + ECART_Y, mouseX, mouseY);
		ctx.save();
		ctx.translate((perso.x>>8) + (perso.pX>>1) + ECART_X, (perso.y>>8) + (perso.pY>>1) + ECART_Y);
		ctx.rotate(a);
		ctx.drawImage(portalGun, -5, -5);
		ctx.restore();
	}
}

function drawRotatedHead(flipDx) {
	var a = getAngle((perso.x>>8) + (perso.pX>>1) + ECART_X, (perso.y>>8) + (perso.pY>>1) + ECART_Y, mouseX, mouseY);
	ctx.save();
	ctx.translate(((perso.x>>8) + ECART_X) + 8, (perso.y>>8) + ECART_Y + 6);
	var ad = radToDeg(a);
	
	if(!flipDx) {
		if(ad > 15) ad = 15;
		else if(ad < -23) ad = -23;
	}else {
		ad -= 180;
		if(ad >= -360 && ad <= -270) {
			if(ad > -334) ad = -334;
		} else if(ad < -15) ad = -15;
	}
	
	a = degToRad(ad);
	ctx.rotate(a);
	ctx.drawImage(head[flipDx], perso.animeFrame * 16, 0, 15, 12, -8, -6, 16, 12);
	ctx.restore();
}

function drawAllGame() {
	if(needLoad) createBuff();
	ctx.putImageData(imgBuff, ECART_X, ECART_Y);
	if(quality > 0) animateTiles();
	
	drawLowQualityPortals();
	
	perso.flip = mouseX > (perso.x >> 8) + (perso.pX >> 1) + ECART_X ? perso.flip = 1 : perso.flip = -1;
	
	drawTunnels();
	
	var flipDx =  perso.flip < 0 ? 1 : 0;
	// image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
	if(!flipDx) drawPortalGun();
	drawRotatedHead(flipDx);
	ctx.drawImage(body[flipDx], perso.animeFrame * 16, 0, 16, 27, ((perso.x>>8) + ECART_X), (perso.y>>8) + ECART_Y, 16, 27);
	if(flipDx) drawPortalGun();
	
	drawCakes();
	drawTourelles();
	drawPlasma();
	
	manageSparkles();

	drawCaisses();
	
	if(bossNum > 0) {
		drawBoss();
		if(bossNum == 1 || bossNum == 3) ctx.drawImage(tube, (tubeX>>8) + ECART_X, (tubeY>>8) + ECART_Y);
		else if(bossNum == 2) {
			drawProjos();
			ctx.drawImage(tube2, (tubeX>>8) + ECART_X, (tubeY>>8) + ECART_Y);
		}else if(bossNum == 4) {
			drawProjos();
			ctx.drawImage(tube, (tubeX>>8) + ECART_X, (tubeY>>8) + ECART_Y);
		}
		
		if(bossLife == 3) {
			rumbleTime++;
			if(!bossIsComing) shakeScreen();
			else if(rumbleTime % 3 == 0) {
				ECART_X = 64 + random(-3, 3);
				ECART_Y = 96 + random(-3, 3);
			}
			if(!bossIsComing && TIME%10==0) {
				if(bossX < 530) {
					createCakeOrSmokeSparkles((bossX + 14)<<8, (bossY + 18)<<8, 9, 3, 300);
					bossX += 1;
				}
			}
		}
	}
	
	drawPlatformes();
	
	drawFrontTiles();

	drawPortals();	
	
	drawCamera();
	if(currentMenu == 6) manageTutorial();
	
	if(perso.mort) {
		var a = -(perso.vie / 256);
		ctx.fillStyle = "rgba(0, 0, 0," + (1 - a) + ")";
		//noStroke();
		ctx.fillRect(ECART_X, ECART_Y, 512, 384);
		//ctx.globalAlpha = 1;
		perso.vie+=6;
		perso.checkMort();
		sfx_flatline.volume = a/2;
	}
	
	if(perso.fadeNextLevel >= 0)  manageTransitionDraw();

	ctx.drawImage(hud, 0, 0);
	
	if(currentMenu == 6) drawText(146, 28, 11);
	
	if(quality == 0) {
		if(hudLight == null) {
			drawText(146, 28, 11);
			hudLight = ctx.getImageData(132, 12, 473, 78);
		}
		ctx.putImageData(hudLight, 132, 12);
	}
	
	drawRobot();
	
	if(perso.fadeNextLevel == -1 && currentMenu == 2 && quality > 0) drawText(146, 28, 11);
	
	ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
}

/**
 * Shake the playfield after the boss died.
 *
 * The offset only depends on the level time, so a replay gets the same offsets as the play. The mouse aim uses the
 * offset, so random offsets would change the result of a replay. The offset changes every third tick.
 */
function shakeScreen() {
	var step = Math.floor(TIME / 3);
	ECART_X = 64 + shakeOffset(step * 2);
	ECART_Y = 96 + shakeOffset(step * 2 + 1);
}

/**
 * Get a pseudo-random shake offset.
 *
 * @param {number} n The index of the offset.
 * @returns {number} An offset from -3 to 2 pixels, the same range as random(-3, 3).
 */
function shakeOffset(n) {
	var h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return ((h >>> 0) % 6) - 3;
}

function drawKeys() {
	ctx.font = "bold 12px Arial";
	ctx.fillStyle = "rgb(0, 0, 0)";

	var z = KEY_Z & keys ? 1 : 0;
	var q = KEY_Q & keys ? 1 : 0;
	var d = KEY_D & keys ? 1 : 0;
	var e = KEY_E & keys ? 1 : 0;
	var s = KEY_S & keys ? 1 : 0;
	var ml = MSE_L & keys ? 1 : 0;
	var mr = MSE_R & keys ? 1 : 0;
	
	ctx.drawImage(key, 0, z * 24, 24, 24, 525, 485, 24, 24);ctx.fillText("Z", 525 + 6, 485 + 16);
	ctx.drawImage(key, 0, e * 24, 24, 24, 525 + 26, 485, 24, 24);ctx.fillText("E", 525 + 26 + 6, 485 + 16);
	ctx.drawImage(key, 0, q * 24, 24, 24, 525 - 26, 485 + 26, 24, 24);ctx.fillText("Q", 525 - 26 + 6, 485 + 26 + 16);
	ctx.drawImage(key, 0, s * 24, 24, 24, 525, 485 + 26, 24, 24);ctx.fillText("S", 525 + 6, 485 + 26 + 16);
	ctx.drawImage(key, 0, d * 24, 24, 24, 525 + 26, 485 + 26, 24, 24);ctx.fillText("D", 525 + 26 + 6, 485 + 26 + 16);
	
	ctx.drawImage(mouseIcon, 0, ml * 40, 24, 40, 525 - 26 - 26 , 485, 24, 40);
	ctx.drawImage(mouseIcon, 0, mr * 40, 24, 40, 525 + 26 + 26, 485, 24, 40);

}

function drawRobot() {
	if(bossNum <= 0) {
		var eye = 0;
		if(lvlType == 4) {
			if(currentLevel <= 7) eye = 0;
			else if(currentLevel <= 14) eye = 1;
			else if(currentLevel <= 21) eye = 2;
			else eye = 3;
		}
	
		ctx.drawImage(robotHead, robot.x >> 8, robot.y >> 8);
		ctx.drawImage(robotEye[eye], 0, 19 * robot.eye, 19, 19, robot.ex >> 8, robot.ey >> 8, 19, 19);
		robot.move();
		
		if(!robot.doingAction) {
			var r = parseInt(random(1, 800));
			if(r == 1) robot.lookLeftRight(-1);
			else if(r == 2) robot.lookLeftRight(1);
			else if(r == 3) robot.lookUpDown(-1);
			else if(r == 4) robot.lookUpDown(1);
			else if(r == 5) robot.moveRobot(-1);
			else if(r == 6) robot.moveRobot(1);
			if(r % 100 == 0) robot.blink();
		}
	}
}

function drawPauseMenu() {
	//noStroke();
	ctx.fillStyle = "rgb(0, 65, 88)";
	//ctx.fillRect(ECART_X - 1, ECART_Y, 512, 384);
	ctx.drawImage(pauseBG, ECART_X, ECART_Y);
	
	ctx.fillStyle = "rgb(255, 255, 255)";
	var overMenu = -1;
	if(mouseInZone(50 + ECART_X, 180 + ECART_Y, 120, 24)) overMenu = 1;//continue
	else if(currentMenu != 6 && mouseInZone(187 + ECART_X, 180 + ECART_Y, 120, 24)) overMenu = 2;//Restart
	else if(mouseInZone(324 + ECART_X, 180 + ECART_Y, 120, 24)) overMenu = 3;//exit
	else if(currentMenu != 6 && mouseInZone(127 + ECART_X, 340 + ECART_Y, 120, 24)) overMenu = 4;//quality
	else if(currentMenu != 6 && mouseInZone(247 + ECART_X, 340 + ECART_Y, 120, 24)) overMenu = 5;//sound
	
	var scale1 = overMenu == 1 ? 0.9 : 1;
	var scale2 = overMenu == 2 ? 0.9 : 1;
	var scale3 = overMenu == 3 ? 0.9 : 1;
	var scale4 = overMenu == 4 ? 0.9 : 1;
	var scale5 = overMenu == 5 ? 0.9 : 1;
	
	drawTinyButton(ECART_X + 50, ECART_Y + 180, scale1, "Resume");
	if(currentMenu != 6) drawTinyButton(ECART_X + 187, ECART_Y + 180, scale2, "Restart");
	drawTinyButton(ECART_X + 324, ECART_Y + 180, scale3, "Exit");
	if(currentMenu != 6) drawTinyButton(127 + ECART_X, 340 + ECART_Y, scale4, "Quality : " + (quality==0?"Low":"High"));
	if(currentMenu != 6 && !noSound) drawTinyButton(247 + ECART_X, 340 + ECART_Y, scale5, "Sounds : " + (sound?"On":"Off"));
	
	
	if(mousePressed && mouseButton == LEFT && overMenu > 0) {
		unclick();
		if(overMenu == 1) {//resume
			escapeMenu = !escapeMenu;
			if(replayMode) {
				rescaleReplay();
			}
		}else if(overMenu == 2) {//restart
			escapeMenu = !escapeMenu;
			if(currentMenu == 2) {
				loadLevel(currentLevel);
				if(bossNum > 0) skipComingBoss();
			}
		}else if(overMenu == 3) {//exit
			escapeMenu = !escapeMenu;
			exitFunc();
		}else if(overMenu == 4) {//quality
			jConfirm("Changing quality will restart the map. Are you sure ?", 'Change quality ?', function(r) {
				if(r) {
					quality = 1 - quality;
					escapeMenu = !escapeMenu;
					if(currentMenu == 2) loadLevel(currentLevel);
				}
			});
		}else if(overMenu == 5) {//sound
			sound = !sound;
		}
	}

	ctx.drawImage(hud, 0, 0);
	if(currentMenu == 2 && quality > 0) {
		drawText(146, 28, 11);
	}else if(currentMenu == 2 && quality == 0 && hudLight) {
		ctx.putImageData(hudLight, 132, 12);
	}
	drawRobot();
	
	drawHudText();
	
	ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
}

var timeSplash = 0;
var timeExit = 0;
var tailsVY = blackosVY = 0;
var tailsY = -100;
var blackosY  = -100;
var titleY = -50;
var titleVY = 0;

function drawSplash() {
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.fillRect(0, 0, 640, 544);
	
	ctx.drawImage(noLevel, 0, 32, 640, 480);
	
	ctx.font = "bold 48px Yikes";
	ctx.fillStyle = "rgb(0, 0, 0)";
	
	ctx.fillText("Welcome To", 160 + 4 + 60, titleY + 4 - 80);
	ctx.fillStyle = "rgb(253, 233, 0)";
	ctx.fillText("Welcome To", 160 + 60, titleY - 80);

	
	ctx.font = "bold 64px Yikes";
	ctx.fillStyle = "rgb(0, 0, 0)";
	
	ctx.fillText("StillAliveJS", 160 + 4, titleY + 4);
	ctx.fillStyle = "rgb(253, 233, 0)";
	ctx.fillText("StillAliveJS", 160, titleY);
	
	titleY += titleVY;
	titleVY += 0.2;
	if(titleVY > 10) titleVY = 10;
	else if(titleVY < -10) titleVY = -10;
	if(titleY > 400 && timeExit < 300) {
		titleY = 400;
		titleVY = -(titleVY>>2);
	}
	
	ctx.font = "bold 24px Yikes";
	ctx.fillStyle = "rgb(0, 65, 88)";
	
	if(timeExit > 100) tailsVY += 0.1;
	if(tailsVY > 10) tailsVY = 10;
	else if(tailsVY < -10) tailsVY = -10;
	
	tailsY += tailsVY;
	if(tailsY > 100 && timeExit < 330) {
		tailsY = 100;
		tailsVY = -(tailsVY>>2);
	}
	
	if(timeExit > 200) blackosVY += 0.1;
	if(blackosVY > 10) blackosVY = 10;
	else if(blackosVY < -10) blackosVY = -10;
	
	blackosY += blackosVY;
	if(blackosY > 130 && timeExit < 360) {
		blackosY = 130;
		blackosVY = -(blackosVY>>2);
	}
	
	timeExit++;
	
	ctx.drawImage(tex_tails, 32, 32 + tailsY);
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.fillText("Created by t4ils", 100 + 2, 64 + 2 + tailsY);
	ctx.fillStyle = "rgb(253, 233, 0)";
	ctx.fillText("Created by t4ils", 100, 64 + tailsY);
	
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.fillText("Gfx by ZeBlackos", 360 + 2, 64 + 2 + blackosY);
	ctx.fillStyle = "rgb(253, 233, 0)";
	ctx.fillText("Gfx by ZeBlackos", 360, 64 + blackosY);
	ctx.drawImage(tex_blackos, 550, 32 + blackosY);
	
	if(tailsY > 580) {
		timeSplash--;
		if(timeSplash == 0) {
			overSplash = true;
			if(loadedImg >= imgToLoad && levelsLoaded >= levelsToLoad && txtLoaded >= txtToLoad && loadedSfx >= sfxToLoad) {
				started = 1;
				goMenu = 0;
				fadeMenu = 30;
				unclick();
				currentMenu = 1;
				sparkles = new Array();
			}
		}
	}else {
		if(++timeSplash>60) timeSplash = 60;
	}
	ctx.fillStyle = "rgba(0, 0, 0, " + (1-(timeSplash/60)) + ")";
	ctx.fillRect(0, 0, 640, 544);
	
	if(mouseNewPress && timeExit < 360) {
		timeSplash = 60;
		timeExit = 360;
	}
}

function drawLoadingScreen() {
	ctx.strokeStyle = "rgb(0, 0, 0)";
	ctx.fillStyle = "rgb(0, 65, 88)";
	ctx.fillRect(0, 0, 640, 544);
	
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.fillText("Loading gfx ...", 10, 10);
	ctx.fillText("Loading maps ...", 10, 50);
	ctx.fillText("Loading texts ...", 10, 90);
	ctx.fillText("Loading sfx ...", 10, 130);
	
	ctx.fillStyle = "rgb(255, 0, 0)";
	if(TIME%50 < 25) {
		ctx.fillStyle = "rgb(0, 0, 0)";
	}
	
	if(mouseInZone(80, 120, 133, 16)) {
		ctx.fillStyle = "rgb(255, 255, 255)";
		if(mouseNewPress) {
			loadedSfx = sfxToLoad;
			noSound = true;
		}
	}
	
	ctx.fillText("(click here if not loading)", 85, 130);
	ctx.fillStyle = "rgb(255, 255, 255)";
	
	//noFill();
	ctx.strokeStyle = "rgb(255, 255, 255)";
	ctx.strokeRect(10, 20, 202, 14);
	ctx.strokeRect(10, 60, 202, 14);
	ctx.strokeRect(10, 100, 202, 14);
	ctx.strokeRect(10, 140, 202, 14);
	
	ctx.fillText("- Grab cakes and reach the exit of each level.", 10, 170);
	ctx.fillText("- Use your portal gun to teleport through levels.", 10, 180);
	
	ctx.fillStyle = "rgb(255, 0, 0)";
	//noStroke();
	ctx.fillRect(11, 21, parseInt(loadedImg / imgToLoad * 200), 12);
	ctx.fillRect(11, 61, parseInt(levelsLoaded / levelsToLoad * 200), 12);
	ctx.fillRect(11, 101, parseInt(txtLoaded / txtToLoad * 200), 12);
	ctx.fillRect(11, 141, parseInt(loadedSfx / sfxToLoad * 200), 12);
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.fillText((parseInt(loadedImg/imgToLoad * 100)) + "%", 100, 30);
	ctx.fillText((parseInt(levelsLoaded / levelsToLoad * 100)) + "%", 100, 70);
	ctx.fillText((parseInt(txtLoaded / txtToLoad * 100)) + "%", 100, 110);
	ctx.fillText((parseInt(loadedSfx/sfxToLoad * 100)) + "%", 100, 150);
	
	//make sure img in the menu are loaded
	if(canDrawLoading >= 8) {
		var dx = 225;
		var dy = 190;
		ctx.drawImage(controls, dx, dy);
		
		drawPerso(62 + dx, dy, -1);
		drawPerso(124 + dx, 95 + dy, 1);
		drawPerso(dx, 95 + dy, -1);
		ctx.drawImage(bluePortal, 0, 0, 32, 32, 68 + dx, 177 + dy, 32, 32);
		ctx.drawImage(redPortal, 0, 0, 32, 32, 171 + dx, 177 + dy, 32, 32);
	}
	
	TIME++;
	if(loadedImg >= imgToLoad && levelsLoaded >= levelsToLoad && txtLoaded >= txtToLoad && loadedSfx >= sfxToLoad) {
		if(TIME%50 < 25) {
			ctx.fillText("Click to continue ...", 280, 476);
		}
		if(mousePressed) {
			//loadLevel(currentLevel);
			started = 1;
			goMenu = 0;
			fadeMenu = 30;
			unclick();
			currentMenu = 1;
			sparkles = new Array();
			//exitFunc();
		}
	}
	//make sure crosshair image is loaded
	if(canDrawLoading >= 8) ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
}

function drawMapSelection() {
	if(previewMap < 1) ctx.drawImage(noLevel, ECART_X, ECART_Y);
	if(previewMap > 0) drawPreviewMap();			
	ctx.drawImage(mapSelection, 0, 0);
	
	if(mouseX >= 529 && mouseX <= 529 + 90) {
		if(mouseY >= 12 + 105 && mouseY <= 104 + (29 * 12)) {
			var y = parseInt((mouseY - 105)/12);
			if(y <= maxLevel[lvlType]) {
				ctx.fillStyle = "rgb(15, 112, 144)";
				//noStroke();
				ctx.fillRect(529, 105 + (y * 12) + 2, 90, 14);
				
				if(mousePressed && mouseButton == LEFT) {
					if(y != previewMap) {
						unclick();
						previewMap = y;
						currentLevel = y;
						loadPreviewMap(previewMap);
					}
				}
			}
		}
	}
	
	var overMenu = -1;
	if(mouseInZone(20, 495, 120, 24)) overMenu = 2;
	var scale2 = overMenu == 2 ? 0.9 : 1;
	drawTinyButton(20, 495, scale2, "Exit");
	
	if(previewMap > 0) {
		ctx.fillStyle = "rgb(15, 112, 144)";
		//noStroke();
		ctx.fillRect(529, 105 + (previewMap * 12) + 2, 90, 14);
		
		if(mouseInZone(515, 495, 120, 24)) overMenu = 1;
		var scale1 = overMenu == 1 ? 0.9 : 1;

		drawTinyButton(515, 495, scale1, "Play");
	}
	
	if(lvlType == 0 && maxLevel[0]==29) {
		if(mouseInZone(380, 495, 120, 24)) overMenu = 3;
		var scale3 = overMenu == 3 ? 0.9 : 1;
		drawTinyButton(380, 495, scale3, "Hard Mode");
	}else if(lvlType == 1) {
		if(mouseInZone(380, 495, 120, 24)) overMenu = 3;
		var scale3 = overMenu == 3 ? 0.9 : 1;
		drawTinyButton(380, 495, scale3, "Normal Mode");
	}
	
	if(mousePressed && mouseButton == LEFT && overMenu > 0) {
		if(overMenu == 1) {//play
			ECART_X = 64;
			ECART_Y = 96;
			currentMenu = 2;
			currentLevel = previewMap;
			loadLevel(currentLevel);
			//$("#highscores").slideDown("slow");
			//selectMenu = 0;
			finishedLastDraw = true;
			unclick();
			return;
		}else if(overMenu == 2) {//exit
			ECART_X = 64;
			ECART_Y = 96;
			currentMenu = 1;
			selectMenu = 0;
			fadeMenu = 30;
			$("#highscores").slideUp("slow");
			finishedLastDraw = true;
			unclick();
			return;
		}else if(overMenu == 3) {//hard/normal mode
			lvlType = 1 - lvlType;
			previewMap = 0;
		}
		
		unclick();
	}
	
	ctx.font = "bold 12px Arial";
	for(i=0; i<28;i++) {
		ctx.strokeStyle = "rgb(0, 0, 0)";
		if((i+1) <= maxLevel[lvlType]) {
			ctx.fillStyle = "rgb(255, 255, 255)";
		}else {
			ctx.fillStyle = "rgb(200, 200, 200)";
		}
		ctx.fillText("Level " + (i+1),549, 105 + 24 + (i * 12));
	}
	
	ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
}

function drawBigButton(x, y, scale, text) {
	ctx.drawImage(tex_button, x + ((1-scale)*320) / 2, y + ((1-scale)*64) / 2, 320 * scale, 64 * scale);
	
	x += 320 / 2;

	ctx.font = "36px yikes";
	if(scale != 1) ctx.font = "34px yikes";
	
	var metrics = ctx.measureText(text);
	x -= metrics.width / 2;
	y += 45;
	
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.fillText(text, x + 4, y + 4);
	ctx.fillStyle = "rgb(253, 233, 0)";
	
	ctx.fillText(text, x, y);
}

function drawTinyButton(x, y, scale, text) {
	ctx.drawImage(tex_button, x + ((1-scale)*120) / 2, y + ((1-scale)*24) / 2, 120 * scale, 24 * scale);
	
	x += 120 / 2;

	ctx.font = "16px yikes";
	if(scale != 1) ctx.font = "14px yikes";
	var metrics = ctx.measureText(text);
	x -= metrics.width / 2;
	y += 18;
	
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.fillText(text, x + 2, y + 2);
	ctx.fillStyle = "rgb(253, 233, 0)";
	
	ctx.fillText(text, x, y);
}

var fadeMenu;

function drawMainMenu() {
	ctx.strokeStyle = "rgb(0, 0, 0)";
	ctx.fillStyle = "rgb(0, 65, 88)";
	//ctx.fillRect(0, 0, 640, 544);
	ctx.drawImage(menuBG, 0, 0);
	//draw the menu
	
	var yStart = 32;
	var ecart = 18;
	
	var overMenu = -1;
	if(mouseInZone(160, yStart, 320, 64)) overMenu = 1;
	else if(mouseInZone(160, yStart + (1 * (64 + ecart)), 320, 64)) overMenu = 2;
	else if(mouseInZone(160, yStart + (2 * (64 + ecart)), 320, 64)) overMenu = 3;
	else if(mouseInZone(160, yStart + (3 * (64 + ecart)), 320, 64)) overMenu = 4;
	else if(mouseInZone(160, yStart + (4 * (64 + ecart)), 320, 64)) overMenu = 5;
	
	var scale1 = overMenu == 1 ? 0.9 : 1;
	var scale2 = overMenu == 2 ? 0.9 : 1;
	var scale3 = overMenu == 3 ? 0.9 : 1;
	var scale4 = overMenu == 4 ? 0.9 : 1;
	var scale5 = overMenu == 5 ? 0.9 : 1;
	
	if(goMenu) {
		if(lvlType==0) drawBigButton(160, yStart, scale1, "Classic Mode" + (maxLevel[0]>28?" +":""));
		else if(lvlType==1) drawBigButton(160, yStart + (1 * (64 + ecart)), scale2, "Enhanced Mode");
		else if(lvlType==2) drawBigButton(160, yStart + (2 * (64 + ecart)), scale3, "Ultimate Mode");
		else if(lvlType==3) drawBigButton(160, yStart + (3 * (64 + ecart)), scale4, "Level Editor");
		else if(lvlType==4) drawBigButton(160, yStart + (4 * (64 + ecart)), scale5, "Tutorial");
	}else {
		var dy = 0;
		if(maxLevel[0] <= 28) dy = 64;
		drawBigButton(160, yStart, scale1, "Classic Mode" + (maxLevel[0]>28?" +":""));
		drawBigButton(160, yStart + (1 * (64 + ecart)), scale2, "Enhanced Mode");
		drawBigButton(160, yStart + (2 * (64 + ecart)), scale3, "Ultimate Mode");
		drawBigButton(160, yStart + (3 * (64 + ecart)), scale4, "Level Editor");
		drawBigButton(160, yStart + (4 * (64 + ecart)), scale5, "Tutorial");
		
		/*
		if(maxLevel[0] <= 28 && overMenu > 1 && overMenu < 4) {
			ctx.fillStyle = "rgb(255, 255, 255)";
			ctx.font = "bold 16px Arial";
			ctx.fillText("Finish normal mode to unlock this campaign !", 170, 75 + yStart + (overMenu - 1) * 64 + (overMenu - 1) * ecart);
			overMenu = -1;
		}*/
		
		var pX = 130;
		var pY = (yStart + 25 + (overMenu - 1) * 64 + (overMenu - 1) * ecart);
		
		var pX2 = 150 + 320 + 40 - 16;

		drawPortalGunMenu(pX, pY, getAngle(pX, pY, mouseX, mouseY));
		drawPerso(pX, pY, 1);
		
		drawPortalGunMenu(pX2, pY, getAngle(pX2, pY, mouseX, mouseY));
		drawPerso(pX2, pY, -1);
	}
	
	var zoomSound = 1;
	if(!noSound && mouseInZone(20, 300, 29, 48)) {
		zoomSound = 0.9;
		if(mousePressed && mouseButton == LEFT) {
			unclick();
			sound = !sound;
		}
		
		ctx.globalAlpha = 0.8;
		ctx.fillStyle = "rgb(7, 49, 63)";
		ctx.fillRect(20, 300, 300, 48);
		
		ctx.fillStyle = "rgb(255, 255, 255)";
		ctx.font = "bold 12px Arial";
		ctx.fillText("Sound is an experimental feature that might", 55, 312);
		ctx.fillText("not work very well. Turn it off to increase", 55, 328);
		ctx.fillText("performances.", 55, 343);
		
		ctx.globalAlpha = 1;
	}
	
	var zoomQuality = 1;
	if(mouseInZone(20, 385, 30, 36)) {
		zoomQuality = 0.9;
		if(mousePressed && mouseButton == LEFT) {
			unclick();
			quality = !quality;
		}
		
		ctx.globalAlpha = 0.8;
		ctx.fillStyle = "rgb(7, 49, 63)";
		ctx.fillRect(15, 378, 300, 48);
		
		ctx.fillStyle = "rgb(255, 255, 255)";
		ctx.font = "bold 12px Arial";
		ctx.fillText("Some animations might slow down your", 55, 392);
		ctx.fillText("computer. Try to turn them off to increase", 55, 407);
		ctx.fillText("performances.", 55, 422);
		
		ctx.globalAlpha = 1;
		
	}
	
	ctx.font = "36px yikes";
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.fillText("Q", 25, 415); 
	ctx.fillStyle = "rgb(253, 233, 0)";
	ctx.fillText("Q", 23, 412); 
	
	if(!quality) ctx.drawImage(tex_cross, 15 + ((1-zoomQuality)*40) / 2, 385 + ((1-zoomQuality)*40) / 2, 40 * zoomQuality, 34 * zoomQuality);
	
	ctx.font = "18px yikes";
	ctx.fillStyle = "rgb(253, 233, 0)";
	ctx.fillText("Quality", 13, 454);
	ctx.fillText(quality==0?"Low":"High", 20, 438);
	
	if(!noSound) {
		ctx.drawImage(tex_sound, 20 + ((1-zoomSound)*29) / 2, 300 + ((1-zoomSound)*48) / 2, 29 * zoomSound, 48 * zoomSound);
		if(!sound) ctx.drawImage(tex_cross, 15 + ((1-zoomSound)*40) / 2, 305 + ((1-zoomSound)*40) / 2, 40 * zoomSound, 34 * zoomSound);
		ctx.fillText("SFX", 20, 365);
	}
	
	ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
	
	if(mousePressed && mouseButton == LEFT && overMenu > 0 && goMenu == 0) {
		lvlType = overMenu - 1;
		goMenu = 60;
		createSparkles(pX<<8, (pY<<8) + (13<<8), mouseX<<8,mouseY<<8, 1, 8);
		createSparkles(pX<<8, (pY<<8) + (13<<8), mouseX<<8,mouseY<<8, 1, 9);
		createSparkles(pX2<<8, (pY<<8) + (13<<8), mouseX<<8,mouseY<<8, 0, 8);
		createSparkles(pX2<<8, (pY<<8) + (13<<8), mouseX<<8,mouseY<<8, 0, 9);
		unclick();
    
	}else if(goMenu) {
		if(--goMenu == 0) {
			ctx.fillStyle = "rgb(0, 0, 0)";
			//noStroke();
			ctx.fillRect(0, 0, 640, 544);
			if(lvlType < 3) {
				selectMenu = 1;
				previewMap = 0;
				prepareSelectionText();
				$("#highscores").slideDown("slow");
				ECART_X = 0;
				ECART_Y = 96;
				if(lvlType == 2) {
				  lvlType = 4;
				  bossNum = 0;
				  setupBoss();
				}else if(lvlType == 1) {
					lvlType = 2;
				}
			}else {
				if(lvlType == 3) {//go level editor
					currentMenu = 3;
					lvlEditorSetup();
					sparkles = new Array();
				}else if(lvlType == 4) {//go tutorial
					currentMenu = 6;
					setupTutorial();
				}
			}
		}else {
			var a = goMenu / 60;
			ctx.fillStyle = "rgba(0, 0, 0," + (1-a) + ")";
			//noStroke();
			ctx.fillRect(0, 0, 640, 544);
		}
	}
	
	manageSparkles();
	
	if(fadeMenu > 0) {
		fadeMenu--;
		var fa = fadeMenu / 30;
		ctx.fillStyle = "rgba(0, 0, 0, " + fa + ")";
		ctx.fillRect(0, 0, 640, 544);
	}
}

function animateTiles() {
	for(i in animatedTiles) {
		if(animatedTiles[i].used) {
			if(TIME%animatedTiles[i].speed == 0) {
				if(animatedTiles[i].type == RANDOM) {
					var r;
					do {
						r = parseInt(random(animatedTiles[i].min, animatedTiles[i].max) + 1);
					}while(r == animatedTiles[i].current);
					animatedTiles[i].current = r;
				}else if(animatedTiles[i].type == ORDERED) {
					if(animatedTiles[i].current == animatedTiles[i].max) {
						animatedTiles[i].current = animatedTiles[i].min;
					}else animatedTiles[i].current++;
				}
			}
			ctx.drawImage(tileset[animatedTiles[i].current], (animatedTiles[i].x<<4) + ECART_X, (animatedTiles[i].y<<4) + ECART_Y, 16, 16);
		}
	}
}

function createBuff() {
	ctx.drawImage(bg[BG], ECART_X, ECART_Y, 512, 384);
	for(i in displayMap) {
		var y = i >> 5;
		var x = i - (y << 5);
		if(displayMap[i] < NUM_TILES && displayMap[i] > 0 && i < 768) {
			if(CAKELEFT == 0 && displayMap[i]==35) {
				displayMap[i] = 22;
				map[i] = 22;
			}
			ctx.drawImage(tileset[displayMap[i]], x*16 + ECART_X, y*16 + ECART_Y, 16, 16);
		}
	}
	imgBuff = ctx.getImageData(ECART_X, ECART_Y, 512, 384);
	needLoad = false;
	ctx.fillStyle = "rgb(0, 0, 0)";
	//noStroke();
	ctx.fillRect(ECART_X, ECART_Y, 512, 384);
	if(perso.intermissionFade < 0) ctx.drawImage(highscore, ECART_X, ECART_Y);
}

function drawCakes() {
	for(i in cakes) {
		if(cakes[i].used) {
			if(perso.fadeNextLevel == -1) {
				cakes[i].vy += 32 * cakes[i].mDir;
				if(cakes[i].vy < -3<<8) {
					cakes[i].mDir = -cakes[i].mDir;
				}else if(cakes[i].vy > 3<<8) {
					cakes[i].mDir = -cakes[i].mDir;
				}
				ctx.drawImage(cake, (cakes[i].x>>8) + ECART_X, ((cakes[i].y + cakes[i].vy)>>8) + ECART_Y, 16, 12); 
			}else {
				ctx.drawImage(cake, (cakes[i].x>>8) + ECART_X, ((cakes[i].y)>>8) + ECART_Y, 16, 12);
			}
		}
	}
}

function drawTourelles() {
	for(tour in tourelles) {
		//if(tourelles[tour].animFrame < 10) {
			var side = tourelles[tour].dir < 0 ? 0 : 1;
			
			if(quality > 0) {
				ctx.save();
				ctx.translate((tourelles[tour].x>>8) + (tourelles[tour].pX>>1) + ECART_X, (tourelles[tour].y>>8) + (tourelles[tour].pY>>1) + ECART_Y);
				ctx.rotate(degToRad(tourelles[tour].angle));
				ctx.drawImage(tourelle[side], 0, tourelles[tour].animFrame * 32, 16, 32, -(tourelles[tour].pX>>1), -(tourelles[tour].pY>>1), 16, 32);
				ctx.restore();
			}else {
				ctx.drawImage(tourelle[side], 0, tourelles[tour].animFrame * 32, 16, 32,(tourelles[tour].x>>8) + ECART_X, (tourelles[tour].y>>8) + ECART_Y, 16, 32);
			}
			
			if(tourelles[tour].animFrame == 1 && tourelles[tour].mort == 0) {
				ctx.strokeStyle = "rgb(255, 255, 0)";
				ctx.lineWidth = 3;
				var dx = tourelles[tour].dir < 0 ? 0 : tourelles[tour].pX;
				var dy = parseInt(random(-16, 16));
				line((tourelles[tour].x>>8) + ECART_X + dx, (tourelles[tour].y>>8) + ECART_Y + 13, ((perso.x>>8) + ECART_X), (perso.y>>8) + ECART_Y + (perso.pY >> 1) + dy);
			}else if(tourelles[tour].rotation < 10 && tourelles[tour].mort == 0) {
				ctx.strokeStyle = "rgb(255, 0, 0)";
				ctx.lineWidth = 1;
				var dx = tourelles[tour].dir < 0 ? 0 : tourelles[tour].pX;
				line((tourelles[tour].x>>8) + ECART_X + dx, (tourelles[tour].y>>8) + ECART_Y + 13, ((tourelles[tour].ex>>8) + ECART_X), (perso.y>>8) + ECART_Y + (perso.pY >> 1));
			}
			if(perso.fadeNextLevel == -1) {
				tourelles[tour].move();
				if(needRedrawTiles == 0) needRedrawTiles = dansUnPortal(tourelles[tour]);
			}
		//}
	}
}

function drawPlasma() {
	for(var plasm=0; plasm<plasmaBall.length; plasm++) {
		if(plasmaBall[plasm].used) {
			var vx = vy = 0;
			if(plasmaBall[plasm].vx != 0) vy = plasmaBall[plasm].scale;
			else if(plasmaBall[plasm].vy != 0) vx = plasmaBall[plasm].scale;
			if(TIME % 10 == 0) {
				var r;
				do{
					r = parseInt(random(0, 3));
				}while(plasmaBall[plasm].animFrame == r);
				plasmaBall[plasm].animFrame = r;
			}
			ctx.drawImage(plasma, 0, plasmaBall[plasm].animFrame * 16, 16, 16, 
							(plasmaBall[plasm].x>>8) + ECART_X + vx, (plasmaBall[plasm].y >> 8) + ECART_Y + vy, 16, 16); 
			if(perso.fadeNextLevel == -1) {
				plasmaBall[plasm].move();
				if(needRedrawTiles == 0) needRedrawTiles = dansUnPortal(plasmaBall[plasm]);
				if(plasmaBall[plasm].needKill) {
					plasmaBall.splice(plasm, 1);
					plasm--;
				}
			}
		}
	}
}

function drawProjos() {
	for(pr = 0; pr < projos.length; pr++) {
		projos[pr].move();

		if(quality > 0 && !projos[pr].needKill) {
			ctx.globalAlpha = 0.5;
			ctx.drawImage(tileset[projos[pr].img], ((projos[pr].x - projos[pr].vx * 4) >> 8) + ECART_X, ((projos[pr].y - projos[pr].vy * 4) >> 8) + ECART_Y, 16, 16);
			ctx.globalAlpha = 0.75;
			ctx.drawImage(tileset[projos[pr].img], ((projos[pr].x - projos[pr].vx * 2) >> 8) + ECART_X, ((projos[pr].y - projos[pr].vy * 2) >> 8) + ECART_Y, 16, 16);
			ctx.globalAlpha = 1;
		}
		ctx.drawImage(tileset[projos[pr].img], (projos[pr].x >> 8) + ECART_X, (projos[pr].y >> 8) + ECART_Y, 16, 16);
		
		if(!projos[pr].needKill && projoTouchePerso(projos[pr])) {
			projos.splice(pr, 1);
			pr--;
			perso.vie = -200;
			perso.timeVie = 180;
			return;
		}
		
		if(projos[pr].needKill) {
			if(projos[pr].timer == 0 || quality == 0) {
				projos.splice(pr, 1);
				pr--;
			}
		}
	}
}

function drawCaisses() {
	for(cai = 0; cai < caisses.length; cai++) {
		var sc = 1;
		var dxy = 0;
		if(caisses[cai].shrink > 0) {
			caisses[cai].x += caisses[cai].vx >> 1;
			caisses[cai].y += caisses[cai].vy >> 1;
			sc = caisses[cai].shrink / 60;
			dxy = (16 - parseInt(16 * sc)) / 2;
		}
		
		if(quality > 0) {
			ctx.save();
			ctx.translate((caisses[cai].x>>8) + (caisses[cai].pX>>1) + ECART_X, (caisses[cai].y>>8) + (caisses[cai].pY>>1) + ECART_Y);
			ctx.rotate(degToRad(caisses[cai].angle));
			ctx.drawImage(caisse, 0, 0, 16, 16, -(caisses[cai].pX>>1), -(caisses[cai].pY>>1), 16 * sc, 16 * sc);
			ctx.restore();
		}else {
			ctx.drawImage(caisse, 0, 0, 16, 16, (caisses[cai].x>>8) + ECART_X + dxy, (caisses[cai].y>>8) + ECART_Y + dxy, 16 * sc, 16 * sc);
		}
		
		if(perso.fadeNextLevel == -1) {
			caisses[cai].move();
			if(caisses[cai].needKill) {
				caisses.splice(cai, 1);
				cai--;
				continue;
			}
			if(needRedrawTiles == 0) needRedrawTiles = dansUnPortal(caisses[cai]);
		}
	}
}

function drawArrow(x1, y1, x2, y2, lineWidth, dir) {
	ctx.lineWidth = lineWidth;
	line(x1, y1, x2, y2);
	var xa = x1 + (Math.abs(x1 - x2)>>1) + dir * 2;
	if(dir == -1) triangle(xa - 6, y1, xa, y1 - 6, xa, y1 + 6);
	else triangle(xa + 6, y1, xa, y1 - 6, xa, y1 + 6);
}

function inForceFieldTp(obj) {
	var posx = obj.x>>8;
	var posy = (obj.y>>8);
	var pX = obj.pX;
	var pY = obj.pY;
	
	var fields = new Array();
	
	for(i in forceFields) {
		var x = forceFields[i].x;
		var y = forceFields[i].y;
		var w = forceFields[i].w;
		var h = forceFields[i].h;
		
		if(w < 0) {
			w = -w;
			x -= w;
		}else if(h < 0) {
			h = -h;
			y -= h;
		}
		
		if(posx+pX>x && x+w>posx && posy+pY>y && y+h>posy){
			fields.push(i);
		}
	}
	
	return fields;
}

function drawOneField(sx, sy, nx, ny, vx, vy) {
	var x = nx;
	var y = ny;
	if(vx < 0) {
		ctx.fillRect(sx + ECART_X, sy + ECART_Y, - (sx - x - 16), 32);
		forceFields.push(new forceField(sx, sy, - (sx - x - 16), 32, -1, 0));
		
	}
	else if(vx > 0) {
		ctx.fillRect(sx + ECART_X, sy + ECART_Y, x - sx, 32);
		forceFields.push(new forceField(sx, sy, x - sx, 32, 1, 0));
	}
	else if(vy < 0) {
		ctx.fillRect(sx + ECART_X, sy + ECART_Y, 32, - (sy - y - 16));
		forceFields.push(new forceField(sx, sy, 32, - (sy - y - 16), 0, -1));
	}
	else if(vy > 0) {
		ctx.fillRect(sx + ECART_X, sy + ECART_Y, 32, y - sy);
		forceFields.push(new forceField(sx, sy, 32, y - sy, 0, 1));
	}
}

function pointInPortal(x, y) {
	for(i in portals) {
		var xp = portals[i].x >> 8;
		var yp = portals[i].y >> 8;
		
		if(portals[i].direction == GAUCHE || portals[i].direction == DROITE) {
			if(x >= xp && x <= xp + 3 && y >= yp && y <= yp + 32) {
				return 1 - i;
			}
		}else if(portals[i].direction == HAUT || portals[i].direction == BAS) {
			if(x >= xp && x <= xp + 32 && y >= yp && y <= yp + 3) {
				return 1 - i;
			}
		}
	}
	return -1;
}

function drawTunnelField(sx, sy, vx, vy) {
	
	ctx.globalAlpha = 0.5;
	
	var y = sy;
	var x = sx;
	
	x += vx * 16;
	y += vy * 16;
	
	while(x >= 0 && x < 512 && y >= 0 && y < 384) {
		var tile;
		if(vx != 0) {
			tile = getTileNoCaisseNoPlate(x,y);
			if(tile == 0) tile = getTileNoCaisseNoPlate(x,y + 8);
			if(tile == 0) tile = getTileNoCaisseNoPlate(x,y + 16);
			if(tile == 0) tile = getTileNoCaisseNoPlate(x,y + 31);
		}else if(vy != 0) {
			tile = getTileNoCaisse(x,y);
			if(tile == 0) tile = getTileNoCaisse(x + 8,y);
			if(tile == 0) tile = getTileNoCaisse(x + 16,y);
			if(tile == 0) tile = getTileNoCaisse(x + 31,y);
		}
		
		if(tile != 0 && (tile < NUM_TILES || tile == 199 || tile >= 200)) {
			x = (x >> 4) << 4;
			y = (y >> 4) << 4;
			
			drawOneField(sx, sy, x, y, vx, vy);
			if(vx < 0) x += 13;
			
			if(portals && portals[0].used && portals[1].used) {
				var p1, p2;
				if(vx != 0) {
					p1 = pointInPortal(x, y + 4);
					p2 = pointInPortal(x, y + 28);
				}else if(vy != 0) {
					var dy = vy < 0 ? 14 : 0;
				
					p1 = pointInPortal(x + 4, y + dy);
					p2 = pointInPortal(x + 28, y + dy);
				}
				if(p1 == p2 && p1 > -1) {
					var p = p1;
					if(portals[p].direction == DROITE) {
						sx = portals[p].x >> 8;
						sy = portals[p].y >> 8;
						vx = -1;
						vy = 0;
						y = sy;
						x = sx;
					}else if(portals[p].direction == GAUCHE) {
						sx = (portals[p].x >> 8) + 3;
						sy = portals[p].y >> 8;
						vx = 1;
						vy = 0;
						y = sy;
						x = sx;
					}else if(portals[p].direction == HAUT) {
						sx = (portals[p].x >> 8);
						sy = portals[p].y >> 8;
						vx = 0;
						vy = 1;
						y = sy + 3;
						x = sx;
					}else if(portals[p].direction == BAS) {
						sx = (portals[p].x >> 8);
						sy = portals[p].y >> 8;
						vx = 0;
						vy = -1;
						y = sy;
						x = sx;
					}
				}else {
					ctx.globalAlpha = 1;
					return;
				}
			}else {
				ctx.globalAlpha = 1;
				return;
			}
			
			
		}
		x += vx * 16;
		y += vy * 16;
	}
	drawOneField(sx, sy, x, y, vx, vy);
	ctx.globalAlpha = 1;
}

function drawTunnels() {
	if(tunnels.length > 0) {
		forceFields = new Array();
		ctx.fillStyle = "rgb(151, 206, 233)";
	}
	for(tu in tunnels) {
		var x = (tunnels[tu].x >> 8);
		var y = (tunnels[tu].y >> 8);
		
		var vx = 0;
		var vy = 0;
		if(tunnels[tu].dir == DROITE) {
			vx = 1;
		} else if(tunnels[tu].dir == GAUCHE) {
			vx = -1;
		} else if(tunnels[tu].dir == HAUT) {
			vy = -1;
		} else if(tunnels[tu].dir == BAS) {
			vy = 1;
		}
		
		drawTunnelField(x, y, vx, vy);
		
		if(tunnels[tu].dir == DROITE) {
			ctx.drawImage(tunnel, 0, 0, 16, 32, (tunnels[tu].x >> 8) + ECART_X, (tunnels[tu].y >> 8) + ECART_Y, 16, 32);
		}else if(tunnels[tu].dir == GAUCHE) {
			ctx.drawImage(tunnel, 0, 32, 16, 32, (tunnels[tu].x >> 8) + ECART_X, (tunnels[tu].y >> 8) + ECART_Y, 16, 32);
		}else if(tunnels[tu].dir == HAUT) {
			ctx.drawImage(tunnel2, 0, 0, 32, 16, (tunnels[tu].x >> 8) + ECART_X, (tunnels[tu].y >> 8) + ECART_Y, 32, 16);
		}else if(tunnels[tu].dir == BAS) {
			ctx.drawImage(tunnel2, 32, 0, 32, 16, (tunnels[tu].x >> 8) + ECART_X, (tunnels[tu].y >> 8) + ECART_Y, 32, 16);
		}
	}
}

function drawPlatformes() {
	for(pla in platforms) {
		var x = (platforms[pla].x >> 8) + ECART_X;
		var y = (platforms[pla].y >> 8) + ECART_Y;
		
		ctx.drawImage(platform, x, y);
		if(currentMenu == 3 && !isTestingLevel) {
			ctx.fillStyle = "rgb(255, 0, 0)";
			ctx.strokeStyle = "rgb(255, 0, 0)";
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, platforms[pla].dir);
		}
		if(perso.fadeNextLevel == -1) {
			platforms[pla].move();
		}
	}
}

function drawFrontTiles() {
	if(needRedrawTiles > 0) {
		for(p in portals) {
			if(portals[p].plateforme == -1) {
				var x = portals[p].x >> 8;
				var y = portals[p].y >> 8;
				if(portals[p].direction == HAUT || portals[p].direction == BAS) {
					var tx = x >> 4;
					var ty = y >> 4;
					for(i=0; i<4; i++) {
						if(tx + i < 32 && tx + i >= 0) {
							var t = tx + i + (ty << 5);
							if(tileset[displayMap[t]]) {
								ctx.drawImage(tileset[displayMap[t]], (tx+i)*16 + ECART_X, ty*16 + ECART_Y, 16, 16);
							}
						}
					}
				}else if(portals[p].direction == GAUCHE || portals[p].direction == DROITE) {
					var tx = x >> 4;
					var ty = y >> 4;
					for(i=0; i<4; i++) {
						if(ty + i < 24 && ty + i >= 0) {
							var t = tx + ((ty + i) << 5);
							if(displayMap[t] < tileset.length) {
								ctx.drawImage(tileset[displayMap[t]], tx*16 + ECART_X, (ty+i)*16 + ECART_Y, 16, 16);
							}
						}
					}
				}
			}
		}
	}
}

function drawCamera() {
	camera.move();
	
	var a = getAngle((perso.x>>8) + (perso.pX>>1), (perso.y>>8) + (8), (camera.x >> 8) + 8, (camera.y >> 8) + 8);
	ctx.save();
	ctx.translate((camera.x>>8) + 8 + ECART_X, (camera.y>>8) + 8 + ECART_Y);
	ctx.rotate(a);
	ctx.drawImage(cameraFollow, 0, 0);
	ctx.restore();
}

function drawPortals() {
	for(prt in portals) {
		if(portals[prt].used) {
			if(portals[prt].scaleX < 1) portals[prt].scaleX += 0.1;
			else if(portals[prt].scaleY < 1) portals[prt].scaleY += 0.1;
			
			var dx = dy = 0;
			if(portals[prt].direction == GAUCHE || portals[prt].direction == DROITE) dy = 16 - (portals[prt].scaleY * 16);
			else if(portals[prt].direction == HAUT || portals[prt].direction == HAUT) dx = 16 - (portals[prt].scaleX * 16);
			
			portals[prt].move();
			
			ctx.drawImage(prt==0 ? bluePortal : redPortal, 0, 32*portals[prt].frame, 32, 32, (portals[prt].x>>8) + dx + ECART_X, (portals[prt].y>>8) + dy + ECART_Y, 32*portals[prt].scaleX, 32*portals[prt].scaleY); 
		}
	}
}

function manageTransitionDraw() {
	if(finNiveau()) {//if a level is finished, closing transition
		if(perso.fadeNextLevel > 0) {
			drawTransitionIn();
		}
		else {
			if(drawIntermission) {
				doDrawIntermission();
			}
		}
		
	} else {//else it is an opening transition
		if(perso.intermissionFade < 0) {
			ctx.fillStyle = "rgb(0, 0, 0)";
			//noStroke();
			ctx.fillRect(ECART_X - 1, ECART_Y, 512, 384);
			var a = -(perso.intermissionFade / 20);
			perso.intermissionFade++;
			ctx.globalAlpha = a;
			ctx.drawImage(highscore, ECART_X, ECART_Y);
			ctx.globalAlpha = 1;
		}else drawTransitionOut();
	}
}

var creditsTime = 0;
var creditsAlpha = 0;
var creditsTxt = new Array();

var speedScr = 0.4;

function doDrawCredits() {
	if(mouseNewPress && creditsTime > 150) speedScr = 5;
	creditsTime += speedScr;
	
	
	if(creditsTime > 1800) {
		if(creditsAlpha > 0) creditsAlpha -= 0.01;
		if(creditsAlpha < 0) {
			drawCredits = false;
		}
	}else {
		if(creditsAlpha < 1) creditsAlpha += 0.01;
		if(creditsAlpha > 1) creditsAlpha = 1;
	}
	
	ctx.drawImage(noLevel, 0, 32, 640, 480);
	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fillRect(0, 0, 640, 544);
	
	ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);

	ctx.fillStyle = "rgba(0, 0, 0," + (1-creditsAlpha) + ")";
	ctx.fillRect(0, 0, 640, 544);
	
	ctx.font = "24px yikes";	
	for(var t in creditsTxt) {
		var txt = creditsTxt[t];
		var metrics = ctx.measureText(txt);
		var x = 320 - (metrics.width >> 1);
		
		var yLow = creditsTxt.length * 15;
		
		var y = t * 32 + (yLow - creditsTime);
		
		if(y <= 544) {
		ctx.fillStyle = "rgb(0, 0, 0)";
		ctx.fillText(txt, x + 2, y + 2);
		ctx.fillStyle = "rgb(253, 233, 0)";
		ctx.fillText(txt, x, y);
		}
	}
	
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.fillRect(0, 0, 640, 32);
	ctx.fillRect(0, 544 - 32, 640, 32);
}

function doDrawIntermission() {
	if(perso.intermissionFade > 0) {
		ctx.fillStyle = "rgb(0, 0, 0)";
		//noStroke();
		ctx.fillRect(ECART_X - 1, ECART_Y, 512, 384);
		perso.intermissionFade--;
		var a = perso.intermissionFade / 20;
		ctx.globalAlpha = 1 - a;
	}
	ctx.drawImage(highscore, ECART_X, ECART_Y);
	if(perso.intermissionFade > 0) ctx.globalAlpha = 1;
	
	manageDownMenu();
	
	if(perso.intermissionFade == 0) {
		ctx.fillStyle = "rgb(255, 255, 255)";
		ctx.font = "bold 12px Arial";
		ctx.fillText("Your time : " + toTime(TIME), ECART_X + 35, ECART_Y + 260);
		ctx.fillText(highscoreMessage, ECART_X + 35, ECART_Y + 278);
	}
}

function drawText(x, y, size) {
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.font = "13px Arial";
	if(txtLines.length == 0 && currentMenu != 6) {
		var txt = campaigns[lvlType].texts[currentLevel-1];
		var l = 0;
		var line = "";
		while(l < txt.length) {
			var word = "";
			while(txt[l] != " " && l < txt.length) {
				word += txt[l];
				l++;
			}
			var metrics = ctx.measureText(line + " " + word);
			if(metrics.width < 447) {
				line += word + " ";
			}else {
				txtLines.push(line);
				line = word + " ";
			}
			l++;
		}
		txtLines.push(line);
	}
	
	var toWrite = parseInt(timeWriting);
	
	for(i in txtLines) {
		if(toWrite >= 0 && quality > 0) {
			if(txtLines[i].length < toWrite) {
				ctx.fillText(txtLines[i], x, y + i*size);
				toWrite -= txtLines[i].length;
				if(i == txtLines.length - 1) {
					timeWriting = -1;
				}
			}else if(toWrite != 0){
				ctx.fillText(txtLines[i].substring(0, toWrite), x, y + i*size);
				toWrite = 0;
			}
		}else {
			ctx.fillText(txtLines[i], x, y + i*size);
		}
	}
	
	if(timeWriting >= 0 && !escapeMenu) timeWriting += 0.75;
}

function drawHudText() {
	ctx.font = "bold 14px Arial";
	ctx.fillStyle = "rgb(255, 255, 255)";
		
	ctx.fillText(((perso.vie>>8) > 0 ? (perso.vie>>8)  : 0 )+ "", 20, 150);
	ctx.fillText(CAKELEFT + "", 26, 215);
	ctx.fillText((STEPS >> 8) + "", 26, 275);
	ctx.fillText(PORTALS + "", 26, 335);
}

function drawPreviewMap() {
	if(needLoad) {
		ctx.drawImage(bg[BG], ECART_X, ECART_Y, 512, 384);
		for(i in displayMap) {
			var y = i >> 5;
			var x = i - (y << 5);
			if(displayMap[i] < NUM_TILES && displayMap[i] > 0 && i < 768) {
				if(CAKELEFT == 0 && displayMap[i]==35) {
					displayMap[i] = 22;
					map[i] = 22;
				}
				ctx.drawImage(tileset[displayMap[i]], x*16 + ECART_X, y*16 + ECART_Y, 16, 16);
			}
		}
		imgBuff = ctx.getImageData(ECART_X, ECART_Y, 512, 384);
		needLoad = false;
		ctx.fillStyle = "rgb(0, 0, 0)";;
		//noStroke();
		ctx.fillRect(ECART_X, ECART_Y, 512, 384);
	}
	else 
	{
		ctx.putImageData(imgBuff, ECART_X, ECART_Y);
		
		perso.flip = 1;
		
		ctx.save();
		ctx.translate((perso.x>>8) + (perso.pX>>1) + ECART_X, (perso.y>>8) + (perso.pY>>1) + ECART_Y);
		ctx.drawImage(portalGun, -5, -5);
		ctx.restore();

		var flipDx =  perso.flip < 0 ? 1 : 0;
		ctx.drawImage(head[flipDx], perso.animeFrame * 16, 0, 15, 12, ((perso.x>>8) + ECART_X), (perso.y>>8) + ECART_Y, 16, 12); 
		ctx.drawImage(body[flipDx], perso.animeFrame * 16, 0, 16, 27, ((perso.x>>8) + ECART_X), (perso.y>>8) + ECART_Y, 16, 27);
		
		for(i in cakes) {
			if(cakes[i].used) {
				ctx.drawImage(cake, (cakes[i].x>>8) + ECART_X, ((cakes[i].y + cakes[i].vy)>>8) + ECART_Y, 16, 12); 
			}
		}
		
		for(tour in tourelles) {
			var side = tourelles[tour].dir < 0 ? 0 : 1;
			ctx.drawImage(tourelle[side], 0, tourelles[tour].animFrame * 32, 16, 32,(tourelles[tour].x>>8) + ECART_X, (tourelles[tour].y>>8) + ECART_Y, 16, 32);
		}

		for(cai in caisses) {
			ctx.drawImage(caisse, (caisses[cai].x>>8) + ECART_X, (caisses[cai].y>>8) + ECART_Y);
		}
		
		for(pla in platforms) {
			ctx.drawImage(platform, (platforms[pla].x >> 8) + ECART_X, (platforms[pla].y >> 8) + ECART_Y);
		}
		
		drawTunnels();
		
		if(bossNum > 0) {
			if(bossNum == 1 || bossNum == 3 || bossNum == 4) ctx.drawImage(tube, (tubeX>>8) + ECART_X, (tubeY>>8) + ECART_Y);
			else if(bossNum == 2) ctx.drawImage(tube2, (tubeX>>8) + ECART_X, (tubeY>>8) + ECART_Y);
			drawBoss();
		}
		
		ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
		//noFill();
		ctx.strokeStyle = "rgb(0, 0, 0)";
		ctx.lineWidth = 1;
		/*ctx.strokeRect(0, 0, 640, 544);*/
	}
}

function drawBoss() {
	ctx.drawImage(robotHead, (bossX) + ECART_X, (bossY) + ECART_Y, 74, 58);
	
	var eye = 0;
	if(currentLevel <= 7) eye = 0;
	else if(currentLevel <= 14) eye = 1;
	else if(currentLevel <= 21) eye = 2;
	else eye = 3;
		
	ctx.drawImage(robotEye[eye], 0, 19 * bossLife, 19, 19, (bossX) + ECART_X + 15, (bossY) + ECART_Y + 22, 19, 19);
}

function drawTransitionIn() {
	ctx.fillStyle = "rgb(0, 0, 0)";;
	//noStroke();
	var scale = 1 - (perso.fadeNextLevel / 120);
	if(TRANS == 1) {//top left corner
		ctx.fillRect(ECART_X, ECART_Y, parseInt(512 * scale), parseInt(384 * scale));
	}else if(TRANS == 2) {//left to right
		ctx.fillRect(ECART_X, ECART_Y, parseInt(512 * scale), 384);
	}else if(TRANS == 3) {//top to bottom
		ctx.fillRect(ECART_X, ECART_Y, 512, parseInt(384 * scale));
	}else if(TRANS == 4) {//successive horizontal lines
		var nb = 120 - perso.fadeNextLevel;
		if(nb < linesHoriz.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(ECART_X, ECART_Y + (linesHoriz[i] * 3), 512, 3);
			}
		}else {
			ctx.fillRect(ECART_X, ECART_Y, 512, 384);
		}
	}else if(TRANS == 5) {//successive vertical lines
		var nb = 120 - perso.fadeNextLevel;
		if(nb < linesVerti.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(ECART_X + (linesVerti[i] * 4), ECART_Y, 6, 384);
			}
		}else {
			ctx.fillRect(ECART_X, ECART_Y, 512, 384);
		}
	}else if(TRANS == 6) {//square to center
		var x = 512 - parseInt(512 * scale);
		var y = 384 - parseInt(384 * scale);
		ctx.fillRect(ECART_X + (x>>1), ECART_Y + (y>>1), parseInt(512 * scale), parseInt(384 * scale));
	}
}

function drawTransitionOut() {
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.strokeStyle = "rgb(0, 0, 0)";
	var scale = perso.fadeNextLevel / 120;
	var x = 512 - parseInt(512 * scale);
	var y = 384 - parseInt(384 * scale);
	
	if(TRANS == 1) {//top left corner
		ctx.fillRect(ECART_X + x, ECART_Y + y, parseInt(512 * scale), parseInt(384 * scale));
	}else if(TRANS == 2) {//left to right
		ctx.fillRect(ECART_X + x, ECART_Y, parseInt(512 * scale), 384);
	}else if(TRANS == 3) {//top to bottom
		ctx.fillRect(ECART_X, ECART_Y + y, 512, parseInt(384 * scale));
	}else if(TRANS == 4) {//successive lines
		var nb = perso.fadeNextLevel;
		if(nb < linesHoriz.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(ECART_X, ECART_Y + (linesHoriz[i] * 3), 512, 5);
			}
		}else {
			ctx.fillRect(ECART_X, ECART_Y, 512, 384);
		}
	}else if(TRANS == 5) {//successive vertical lines
		var nb = perso.fadeNextLevel;
		if(nb < linesVerti.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(ECART_X + (linesVerti[i] * 4), ECART_Y, 6, 384);
			}
		}else {
			ctx.fillRect(ECART_X, ECART_Y, 512, 384);
		}
	}else if(TRANS == 6) {//square to center
		ctx.strokeStyle = "rgb(0, 0, 0)";
		ctx.lineWidth = 384 * scale;
		//noFill();
		ctx.strokeRect(ECART_X, ECART_Y, 512, 384);
	}
}


function drawPerso(x, y, flipX) {
	var flipDx =  flipX < 0 ? 1 : 0;
	ctx.drawImage(body[flipDx], 16, 0, 16, 27, x, y,16, 27);
	ctx.drawImage(head[flipDx], 16, 0, 15, 12, x, y, 16, 12);
}