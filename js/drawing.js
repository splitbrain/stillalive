"use strict";

function drawLowQualityPortals() {
	let i;
	if(settings.quality == 0 && game.perso.timePosePortal < 5) {
		ctx.lineWidth = 3;
		for(i in portalLines) {
			if(portalLines[i].color == 0) {
				ctx.strokeStyle = "rgb(0, 255, 255)";
			}else if(portalLines[i].color == 1) {
				ctx.strokeStyle = "rgb(255, 0, 0)";
			}
			line(portalLines[i].x1 + game.ECART_X, portalLines[i].y1 + game.ECART_Y, portalLines[i].x2 + game.ECART_X, portalLines[i].y2 + game.ECART_Y);
		}
	}
}

function drawPortalGun() {
	if(ui.currentMenu != 6 || ui.tutoPortal) {
		const a = getAngle((game.perso.x>>8) + (game.perso.pX>>1) + game.ECART_X, (game.perso.y>>8) + (game.perso.pY>>1) + game.ECART_Y, input.mouseX, input.mouseY);
		ctx.save();
		ctx.translate((game.perso.x>>8) + (game.perso.pX>>1) + game.ECART_X, (game.perso.y>>8) + (game.perso.pY>>1) + game.ECART_Y);
		ctx.rotate(a);
		ctx.drawImage(portalGun, -5, -5);
		ctx.restore();
	}
}

function drawRotatedHead(flipDx) {
	let a = getAngle((game.perso.x>>8) + (game.perso.pX>>1) + game.ECART_X, (game.perso.y>>8) + (game.perso.pY>>1) + game.ECART_Y, input.mouseX, input.mouseY);
	ctx.save();
	ctx.translate(((game.perso.x>>8) + game.ECART_X) + 8, (game.perso.y>>8) + game.ECART_Y + 6);
	let ad = radToDeg(a);
	
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
	ctx.drawImage(head[flipDx], game.perso.animeFrame * 16, 0, 15, 12, -8, -6, 16, 12);
	ctx.restore();
}

/**
 * Copy a part of the canvas into a new offscreen canvas.
 *
 * @param {number} x The left edge of the part.
 * @param {number} y The top edge of the part.
 * @param {number} w The width of the part.
 * @param {number} h The height of the part.
 * @returns {OffscreenCanvas} The copy.
 */
function copyCanvas(x, y, w, h) {
	const copy = new OffscreenCanvas(w, h);
	copy.getContext('2d').drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
	return copy;
}

/**
 * Draw a copy from copyCanvas() onto the canvas. The copy replaces the pixels, as the current transformation,
 * transparency and composition of the canvas do not apply.
 *
 * @param {OffscreenCanvas} copy The copy.
 * @param {number} x The left edge on the canvas.
 * @param {number} y The top edge on the canvas.
 */
function drawCopy(copy, x, y) {
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.beginPath();
	ctx.rect(x, y, copy.width, copy.height);
	ctx.clip();
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'copy';
	ctx.drawImage(copy, x, y);
	ctx.restore();
}

function drawAllGame() {
	if(game.needLoad) createBuff();
	drawCopy(game.imgBuff, game.ECART_X, game.ECART_Y);
	if(settings.quality > 0) animateTiles();
	
	drawLowQualityPortals();
	
	game.perso.flip = input.mouseX > (game.perso.x >> 8) + (game.perso.pX >> 1) + game.ECART_X ? game.perso.flip = 1 : game.perso.flip = -1;
	
	drawTunnels();
	
	const flipDx =  game.perso.flip < 0 ? 1 : 0;
	// image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
	if(!flipDx) drawPortalGun();
	drawRotatedHead(flipDx);
	ctx.drawImage(body[flipDx], game.perso.animeFrame * 16, 0, 16, 27, ((game.perso.x>>8) + game.ECART_X), (game.perso.y>>8) + game.ECART_Y, 16, 27);
	if(flipDx) drawPortalGun();
	
	drawCakes();
	drawTourelles();
	drawPlasma();
	
	manageSparkles();

	drawCaisses();
	
	if(game.bossNum > 0) {
		drawBoss();
		if(game.bossNum == 1 || game.bossNum == 3) ctx.drawImage(tube, (game.tubeX>>8) + game.ECART_X, (game.tubeY>>8) + game.ECART_Y);
		else if(game.bossNum == 2) {
			drawProjos();
			ctx.drawImage(tube2, (game.tubeX>>8) + game.ECART_X, (game.tubeY>>8) + game.ECART_Y);
		}else if(game.bossNum == 4) {
			drawProjos();
			ctx.drawImage(tube, (game.tubeX>>8) + game.ECART_X, (game.tubeY>>8) + game.ECART_Y);
		}
		
		if(game.bossLife == 3) {
			game.rumbleTime++;
			if(!game.bossIsComing) shakeScreen();
			else if(game.rumbleTime % 3 == 0) {
				game.ECART_X = 64 + random(-3, 3);
				game.ECART_Y = 96 + random(-3, 3);
			}
			if(!game.bossIsComing && game.TIME%10==0) {
				if(game.bossX < 530) {
					createCakeOrSmokeSparkles((game.bossX + 14)<<8, (game.bossY + 18)<<8, 9, 3, 300);
					game.bossX += 1;
				}
			}
		}
	}
	
	drawPlatformes();
	
	drawFrontTiles();

	drawPortals();	
	
	drawCamera();
	if(ui.currentMenu == 6) manageTutorial();
	
	if(game.perso.mort) {
		const a = -(game.perso.vie / 256);
		ctx.fillStyle = "rgba(0, 0, 0," + (1 - a) + ")";
		//noStroke();
		ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		//ctx.globalAlpha = 1;
		game.perso.vie+=6;
		game.perso.checkMort();
		setSoundVolume(sfx_flatline, a/2);
	}
	
	if(game.perso.fadeNextLevel >= 0)  manageTransitionDraw();

	ctx.drawImage(hud, 0, 0);
	
	if(ui.currentMenu == 6) drawText(146, 28, 11);
	
	if(settings.quality == 0) {
		if(game.hudLight == null) {
			drawText(146, 28, 11);
			game.hudLight = copyCanvas(132, 12, 473, 78);
		}
		drawCopy(game.hudLight, 132, 12);
	}
	
	drawRobot();
	
	if(game.perso.fadeNextLevel == -1 && ui.currentMenu == 2 && settings.quality > 0) drawText(146, 28, 11);
	
	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Shake the playfield after the boss died.
 *
 * The offset only depends on the level time, so a replay gets the same offsets as the play. The mouse aim uses the
 * offset, so random offsets would change the result of a replay. The offset changes every third tick.
 */
function shakeScreen() {
	const step = Math.floor(game.TIME / 3);
	game.ECART_X = 64 + shakeOffset(step * 2);
	game.ECART_Y = 96 + shakeOffset(step * 2 + 1);
}

/**
 * Get a pseudo-random shake offset.
 *
 * @param {number} n The index of the offset.
 * @returns {number} An offset from -3 to 2 pixels, the same range as random(-3, 3).
 */
function shakeOffset(n) {
	let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
	h ^= h >>> 13;
	h = Math.imul(h, 0xc2b2ae35);
	h ^= h >>> 16;
	return ((h >>> 0) % 6) - 3;
}

function drawKeys() {
	ctx.font = "bold 12px Arial";
	ctx.fillStyle = "rgb(0, 0, 0)";

	const z = KEY_Z & input.keys ? 1 : 0;
	const q = KEY_Q & input.keys ? 1 : 0;
	const d = KEY_D & input.keys ? 1 : 0;
	const e = KEY_E & input.keys ? 1 : 0;
	const s = KEY_S & input.keys ? 1 : 0;
	const ml = MSE_L & input.keys ? 1 : 0;
	const mr = MSE_R & input.keys ? 1 : 0;
	
	ctx.drawImage(key, 0, z * 24, 24, 24, 525, 485, 24, 24);ctx.fillText("Z", 525 + 6, 485 + 16);
	ctx.drawImage(key, 0, e * 24, 24, 24, 525 + 26, 485, 24, 24);ctx.fillText("E", 525 + 26 + 6, 485 + 16);
	ctx.drawImage(key, 0, q * 24, 24, 24, 525 - 26, 485 + 26, 24, 24);ctx.fillText("Q", 525 - 26 + 6, 485 + 26 + 16);
	ctx.drawImage(key, 0, s * 24, 24, 24, 525, 485 + 26, 24, 24);ctx.fillText("S", 525 + 6, 485 + 26 + 16);
	ctx.drawImage(key, 0, d * 24, 24, 24, 525 + 26, 485 + 26, 24, 24);ctx.fillText("D", 525 + 26 + 6, 485 + 26 + 16);
	
	ctx.drawImage(mouseIcon, 0, ml * 40, 24, 40, 525 - 26 - 26 , 485, 24, 40);
	ctx.drawImage(mouseIcon, 0, mr * 40, 24, 40, 525 + 26 + 26, 485, 24, 40);

}

function drawRobot() {
	if(game.bossNum <= 0) {
		let eye = 0;
		if(ui.lvlType == 4) {
			if(ui.currentLevel <= 7) eye = 0;
			else if(ui.currentLevel <= 14) eye = 1;
			else if(ui.currentLevel <= 21) eye = 2;
			else eye = 3;
		}
	
		ctx.drawImage(robotHead, game.robot.x >> 8, game.robot.y >> 8);
		ctx.drawImage(robotEye[eye], 0, 19 * game.robot.eye, 19, 19, game.robot.ex >> 8, game.robot.ey >> 8, 19, 19);
		game.robot.move();
		
		if(!game.robot.doingAction) {
			const r = parseInt(random(1, 800));
			if(r == 1) game.robot.lookLeftRight(-1);
			else if(r == 2) game.robot.lookLeftRight(1);
			else if(r == 3) game.robot.lookUpDown(-1);
			else if(r == 4) game.robot.lookUpDown(1);
			else if(r == 5) game.robot.moveRobot(-1);
			else if(r == 6) game.robot.moveRobot(1);
			if(r % 100 == 0) game.robot.blink();
		}
	}
}

function drawPauseMenu() {
	//noStroke();
	ctx.fillStyle = "rgb(0, 65, 88)";
	//ctx.fillRect(ECART_X - 1, ECART_Y, 512, 384);
	ctx.drawImage(pauseBG, game.ECART_X, game.ECART_Y);
	
	ctx.fillStyle = "rgb(255, 255, 255)";
	let overMenu = -1;
	if(mouseInZone(50 + game.ECART_X, 180 + game.ECART_Y, 120, 24)) overMenu = 1;//continue
	else if(ui.currentMenu != 6 && mouseInZone(187 + game.ECART_X, 180 + game.ECART_Y, 120, 24)) overMenu = 2;//Restart
	else if(mouseInZone(324 + game.ECART_X, 180 + game.ECART_Y, 120, 24)) overMenu = 3;//exit
	else if(ui.currentMenu != 6 && mouseInZone(127 + game.ECART_X, 340 + game.ECART_Y, 120, 24)) overMenu = 4;//quality
	else if(ui.currentMenu != 6 && mouseInZone(247 + game.ECART_X, 340 + game.ECART_Y, 120, 24)) overMenu = 5;//sound
	
	const scale1 = overMenu == 1 ? 0.9 : 1;
	const scale2 = overMenu == 2 ? 0.9 : 1;
	const scale3 = overMenu == 3 ? 0.9 : 1;
	const scale4 = overMenu == 4 ? 0.9 : 1;
	const scale5 = overMenu == 5 ? 0.9 : 1;
	
	drawTinyButton(game.ECART_X + 50, game.ECART_Y + 180, scale1, "Resume");
	if(ui.currentMenu != 6) drawTinyButton(game.ECART_X + 187, game.ECART_Y + 180, scale2, "Restart");
	drawTinyButton(game.ECART_X + 324, game.ECART_Y + 180, scale3, "Exit");
	if(ui.currentMenu != 6) drawTinyButton(127 + game.ECART_X, 340 + game.ECART_Y, scale4, "Quality : " + (settings.quality==0?"Low":"High"));
	if(ui.currentMenu != 6 && isSoundAvailable()) drawTinyButton(247 + game.ECART_X, 340 + game.ECART_Y, scale5, "Sounds : " + (isSoundOn()?"On":"Off"));
	
	
	if(input.mousePressed && input.mouseButton == LEFT && overMenu > 0) {
		unclick();
		if(overMenu == 1) {//resume
			ui.escapeMenu = !ui.escapeMenu;
			if(game.replayMode) {
				rescaleReplay();
			}
		}else if(overMenu == 2) {//restart
			ui.escapeMenu = !ui.escapeMenu;
			if(ui.currentMenu == 2) {
				loadLevel(ui.currentLevel);
				if(game.bossNum > 0) skipComingBoss();
			}
		}else if(overMenu == 3) {//exit
			ui.escapeMenu = !ui.escapeMenu;
			exitFunc();
		}else if(overMenu == 4) {//quality
			confirmDialog("Changing quality will restart the map. Are you sure ?", 'Change quality ?').then(function(r) {
				if(r) {
					settings.quality = 1 - settings.quality;
					ui.escapeMenu = !ui.escapeMenu;
					if(ui.currentMenu == 2) loadLevel(ui.currentLevel);
				}
			});
		}else if(overMenu == 5) {//sound
			toggleSound();
		}
	}

	ctx.drawImage(hud, 0, 0);
	if(ui.currentMenu == 2 && settings.quality > 0) {
		drawText(146, 28, 11);
	}else if(ui.currentMenu == 2 && settings.quality == 0 && game.hudLight) {
		drawCopy(game.hudLight, 132, 12);
	}
	drawRobot();
	
	drawHudText();
	
	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

let timeSplash = 0;
let timeExit = 0;
let tailsVY = 0, blackosVY = 0;
let tailsY = -100;
let blackosY  = -100;
let titleY = -50;
let titleVY = 0;

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
			if(allImagesLoaded() && levelsLoaded >= levelsToLoad && allSoundsLoaded()) {
				started = 1;
				ui.goMenu = 0;
				ui.fadeMenu = 30;
				unclick();
				ui.currentMenu = 1;
				game.sparkles = new Array();
			}
		}
	}else {
		if(++timeSplash>60) timeSplash = 60;
	}
	ctx.fillStyle = "rgba(0, 0, 0, " + (1-(timeSplash/60)) + ")";
	ctx.fillRect(0, 0, 640, 544);
	
	if(input.mouseNewPress && timeExit < 360) {
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
	ctx.fillText("Loading sfx ...", 10, 90);
	
	ctx.fillStyle = "rgb(255, 0, 0)";
	if(game.TIME%50 < 25) {
		ctx.fillStyle = "rgb(0, 0, 0)";
	}
	
	if(mouseInZone(80, 80, 133, 16)) {
		ctx.fillStyle = "rgb(255, 255, 255)";
		if(input.mouseNewPress) {
			disableSound();
		}
	}
	
	ctx.fillText("(click here if not loading)", 85, 90);
	ctx.fillStyle = "rgb(255, 255, 255)";
	
	//noFill();
	ctx.strokeStyle = "rgb(255, 255, 255)";
	ctx.strokeRect(10, 20, 202, 14);
	ctx.strokeRect(10, 60, 202, 14);
	ctx.strokeRect(10, 100, 202, 14);
	
	ctx.fillText("- Grab cakes and reach the exit of each level.", 10, 130);
	ctx.fillText("- Use your portal gun to teleport through levels.", 10, 140);
	
	ctx.fillStyle = "rgb(255, 0, 0)";
	//noStroke();
	ctx.fillRect(11, 21, parseInt(imageProgress() * 200), 12);
	ctx.fillRect(11, 61, parseInt(levelsLoaded / levelsToLoad * 200), 12);
	ctx.fillRect(11, 101, parseInt(soundProgress() * 200), 12);
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.fillText((parseInt(imageProgress() * 100)) + "%", 100, 30);
	ctx.fillText((parseInt(levelsLoaded / levelsToLoad * 100)) + "%", 100, 70);
	ctx.fillText((parseInt(soundProgress() * 100)) + "%", 100, 110);
	
	const missing = missingImages();
	if(missing.length > 0) {
		ctx.fillStyle = "rgb(255, 0, 0)";
		ctx.fillText("Some images could not be loaded: " + missing.join(", "), 10, 160);
		ctx.fillStyle = "rgb(255, 255, 255)";
	}
	
	//make sure img in the menu are loaded
	const imagesReady = areImagesLoaded([body[0], body[1], head[0], head[1], controls, crosshair, bluePortal, redPortal]);
	if(imagesReady) {
		const dx = 225;
		const dy = 190;
		ctx.drawImage(controls, dx, dy);
		
		drawPerso(62 + dx, dy, -1);
		drawPerso(124 + dx, 95 + dy, 1);
		drawPerso(dx, 95 + dy, -1);
		ctx.drawImage(bluePortal, 0, 0, 32, 32, 68 + dx, 177 + dy, 32, 32);
		ctx.drawImage(redPortal, 0, 0, 32, 32, 171 + dx, 177 + dy, 32, 32);
	}
	
	game.TIME++;
	if(allImagesLoaded() && levelsLoaded >= levelsToLoad && allSoundsLoaded()) {
		if(game.TIME%50 < 25) {
			ctx.fillText("Click to continue ...", 280, 476);
		}
		if(input.mousePressed) {
			//loadLevel(currentLevel);
			started = 1;
			ui.goMenu = 0;
			ui.fadeMenu = 30;
			unclick();
			ui.currentMenu = 1;
			game.sparkles = new Array();
			//exitFunc();
		}
	}
	//make sure crosshair image is loaded
	if(imagesReady) ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

function drawMapSelection() {
	let scale3, i;
	if(ui.previewMap < 1) ctx.drawImage(noLevel, game.ECART_X, game.ECART_Y);
	if(ui.previewMap > 0) drawPreviewMap();			
	ctx.drawImage(mapSelection, 0, 0);
	
	if(input.mouseX >= 529 && input.mouseX <= 529 + 90) {
		if(input.mouseY >= 12 + 105 && input.mouseY <= 104 + (29 * 12)) {
			const y = parseInt((input.mouseY - 105)/12);
			if(y <= maxLevel[ui.lvlType]) {
				ctx.fillStyle = "rgb(15, 112, 144)";
				//noStroke();
				ctx.fillRect(529, 105 + (y * 12) + 2, 90, 14);
				
				if(input.mousePressed && input.mouseButton == LEFT) {
					if(y != ui.previewMap) {
						unclick();
						ui.previewMap = y;
						ui.currentLevel = y;
						loadPreviewMap(ui.previewMap);
					}
				}
			}
		}
	}
	
	let overMenu = -1;
	if(mouseInZone(20, 495, 120, 24)) overMenu = 2;
	const scale2 = overMenu == 2 ? 0.9 : 1;
	drawTinyButton(20, 495, scale2, "Exit");
	
	if(ui.previewMap > 0) {
		ctx.fillStyle = "rgb(15, 112, 144)";
		//noStroke();
		ctx.fillRect(529, 105 + (ui.previewMap * 12) + 2, 90, 14);
		
		if(mouseInZone(515, 495, 120, 24)) overMenu = 1;
		const scale1 = overMenu == 1 ? 0.9 : 1;

		drawTinyButton(515, 495, scale1, "Play");
	}
	
	if(ui.lvlType == 0 && maxLevel[0]==29) {
		if(mouseInZone(380, 495, 120, 24)) overMenu = 3;
		scale3 = overMenu == 3 ? 0.9 : 1;
		drawTinyButton(380, 495, scale3, "Hard Mode");
	}else if(ui.lvlType == 1) {
		if(mouseInZone(380, 495, 120, 24)) overMenu = 3;
		scale3 = overMenu == 3 ? 0.9 : 1;
		drawTinyButton(380, 495, scale3, "Normal Mode");
	}
	
	if(input.mousePressed && input.mouseButton == LEFT && overMenu > 0) {
		if(overMenu == 1) {//play
			game.ECART_X = 64;
			game.ECART_Y = 96;
			ui.currentMenu = 2;
			ui.currentLevel = ui.previewMap;
			loadLevel(ui.currentLevel);
			//selectMenu = 0;
			unclick();
			return;
		}else if(overMenu == 2) {//exit
			game.ECART_X = 64;
			game.ECART_Y = 96;
			ui.currentMenu = 1;
			ui.selectMenu = 0;
			ui.fadeMenu = 30;
			document.getElementById('highscores').classList.remove('open');
			unclick();
			return;
		}else if(overMenu == 3) {//hard/normal mode
			ui.lvlType = 1 - ui.lvlType;
			ui.previewMap = 0;
		}
		
		unclick();
	}
	
	ctx.font = "bold 12px Arial";
	for(i=0; i<28;i++) {
		ctx.strokeStyle = "rgb(0, 0, 0)";
		if((i+1) <= maxLevel[ui.lvlType]) {
			ctx.fillStyle = "rgb(255, 255, 255)";
		}else {
			ctx.fillStyle = "rgb(200, 200, 200)";
		}
		ctx.fillText("Level " + (i+1),549, 105 + 24 + (i * 12));
	}
	
	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

function drawBigButton(x, y, scale, text) {
	ctx.drawImage(tex_button, x + ((1-scale)*320) / 2, y + ((1-scale)*64) / 2, 320 * scale, 64 * scale);
	
	x += 320 / 2;

	ctx.font = "36px yikes";
	if(scale != 1) ctx.font = "34px yikes";
	
	const metrics = ctx.measureText(text);
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
	const metrics = ctx.measureText(text);
	x -= metrics.width / 2;
	y += 18;
	
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.fillText(text, x + 2, y + 2);
	ctx.fillStyle = "rgb(253, 233, 0)";
	
	ctx.fillText(text, x, y);
}


function drawMainMenu() {
	let pX, pY, pX2;
	ctx.strokeStyle = "rgb(0, 0, 0)";
	ctx.fillStyle = "rgb(0, 65, 88)";
	//ctx.fillRect(0, 0, 640, 544);
	ctx.drawImage(menuBG, 0, 0);
	//draw the menu
	
	const yStart = 32;
	const ecart = 18;
	
	let overMenu = -1;
	if(mouseInZone(160, yStart, 320, 64)) overMenu = 1;
	else if(mouseInZone(160, yStart + (1 * (64 + ecart)), 320, 64)) overMenu = 2;
	else if(mouseInZone(160, yStart + (2 * (64 + ecart)), 320, 64)) overMenu = 3;
	else if(mouseInZone(160, yStart + (3 * (64 + ecart)), 320, 64)) overMenu = 4;
	else if(mouseInZone(160, yStart + (4 * (64 + ecart)), 320, 64)) overMenu = 5;
	
	const scale1 = overMenu == 1 ? 0.9 : 1;
	const scale2 = overMenu == 2 ? 0.9 : 1;
	const scale3 = overMenu == 3 ? 0.9 : 1;
	const scale4 = overMenu == 4 ? 0.9 : 1;
	const scale5 = overMenu == 5 ? 0.9 : 1;
	
	if(ui.goMenu) {
		if(ui.lvlType==0) drawBigButton(160, yStart, scale1, "Classic Mode" + (maxLevel[0]>28?" +":""));
		else if(ui.lvlType==1) drawBigButton(160, yStart + (1 * (64 + ecart)), scale2, "Enhanced Mode");
		else if(ui.lvlType==2) drawBigButton(160, yStart + (2 * (64 + ecart)), scale3, "Ultimate Mode");
		else if(ui.lvlType==3) drawBigButton(160, yStart + (3 * (64 + ecart)), scale4, "Level Editor");
		else if(ui.lvlType==4) drawBigButton(160, yStart + (4 * (64 + ecart)), scale5, "Tutorial");
	}else {
		let dy = 0;
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
		
		pX = 130;
		pY = yStart + 25 + (overMenu - 1) * 64 + (overMenu - 1) * ecart;
		
		pX2 = 150 + 320 + 40 - 16;

		drawPortalGunMenu(pX, pY, getAngle(pX, pY, input.mouseX, input.mouseY));
		drawPerso(pX, pY, 1);
		
		drawPortalGunMenu(pX2, pY, getAngle(pX2, pY, input.mouseX, input.mouseY));
		drawPerso(pX2, pY, -1);
	}
	
	let zoomSound = 1;
	if(isSoundAvailable() && mouseInZone(20, 300, 29, 48)) {
		zoomSound = 0.9;
		if(input.mousePressed && input.mouseButton == LEFT) {
			unclick();
			toggleSound();
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
	
	let zoomQuality = 1;
	if(mouseInZone(20, 385, 30, 36)) {
		zoomQuality = 0.9;
		if(input.mousePressed && input.mouseButton == LEFT) {
			unclick();
			settings.quality = !settings.quality;
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
	
	if(!settings.quality) ctx.drawImage(tex_cross, 15 + ((1-zoomQuality)*40) / 2, 385 + ((1-zoomQuality)*40) / 2, 40 * zoomQuality, 34 * zoomQuality);
	
	ctx.font = "18px yikes";
	ctx.fillStyle = "rgb(253, 233, 0)";
	ctx.fillText("Quality", 13, 454);
	ctx.fillText(settings.quality==0?"Low":"High", 20, 438);
	
	if(isSoundAvailable()) {
		ctx.drawImage(tex_sound, 20 + ((1-zoomSound)*29) / 2, 300 + ((1-zoomSound)*48) / 2, 29 * zoomSound, 48 * zoomSound);
		if(!isSoundOn()) ctx.drawImage(tex_cross, 15 + ((1-zoomSound)*40) / 2, 305 + ((1-zoomSound)*40) / 2, 40 * zoomSound, 34 * zoomSound);
		ctx.fillText("SFX", 20, 365);
	}
	
	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
	
	if(input.mousePressed && input.mouseButton == LEFT && overMenu > 0 && ui.goMenu == 0) {
		ui.lvlType = overMenu - 1;
		ui.goMenu = 60;
		createSparkles(pX<<8, (pY<<8) + (13<<8), input.mouseX<<8,input.mouseY<<8, 1, 8);
		createSparkles(pX<<8, (pY<<8) + (13<<8), input.mouseX<<8,input.mouseY<<8, 1, 9);
		createSparkles(pX2<<8, (pY<<8) + (13<<8), input.mouseX<<8,input.mouseY<<8, 0, 8);
		createSparkles(pX2<<8, (pY<<8) + (13<<8), input.mouseX<<8,input.mouseY<<8, 0, 9);
		unclick();
    
	}else if(ui.goMenu) {
		if(--ui.goMenu == 0) {
			ctx.fillStyle = "rgb(0, 0, 0)";
			//noStroke();
			ctx.fillRect(0, 0, 640, 544);
			if(ui.lvlType < 3) {
				ui.selectMenu = 1;
				ui.previewMap = 0;
				prepareSelectionText();
				document.getElementById('highscores').classList.add('open');
				game.ECART_X = 0;
				game.ECART_Y = 96;
				if(ui.lvlType == 2) {
				  ui.lvlType = 4;
				  game.bossNum = 0;
				  setupBoss();
				}else if(ui.lvlType == 1) {
					ui.lvlType = 2;
				}
			}else {
				if(ui.lvlType == 3) {//go level editor
					ui.currentMenu = 3;
					lvlEditorSetup();
					game.sparkles = new Array();
				}else if(ui.lvlType == 4) {//go tutorial
					ui.currentMenu = 6;
					setupTutorial();
				}
			}
		}else {
			const a = ui.goMenu / 60;
			ctx.fillStyle = "rgba(0, 0, 0," + (1-a) + ")";
			//noStroke();
			ctx.fillRect(0, 0, 640, 544);
		}
	}
	
	manageSparkles();
	
	if(ui.fadeMenu > 0) {
		ui.fadeMenu--;
		const fa = ui.fadeMenu / 30;
		ctx.fillStyle = "rgba(0, 0, 0, " + fa + ")";
		ctx.fillRect(0, 0, 640, 544);
	}
}

function animateTiles() {
	let r, i;
	for(i in game.animatedTiles) {
		if(game.animatedTiles[i].used) {
			if(game.TIME%game.animatedTiles[i].speed == 0) {
				if(game.animatedTiles[i].type == RANDOM) {
					do {
						r = parseInt(random(game.animatedTiles[i].min, game.animatedTiles[i].max) + 1);
					}while(r == game.animatedTiles[i].current);
					game.animatedTiles[i].current = r;
				}else if(game.animatedTiles[i].type == ORDERED) {
					if(game.animatedTiles[i].current == game.animatedTiles[i].max) {
						game.animatedTiles[i].current = game.animatedTiles[i].min;
					}else game.animatedTiles[i].current++;
				}
			}
			ctx.drawImage(tileset[game.animatedTiles[i].current], (game.animatedTiles[i].x<<4) + game.ECART_X, (game.animatedTiles[i].y<<4) + game.ECART_Y, 16, 16);
		}
	}
}

function createBuff() {
	let i;
	ctx.drawImage(bg[game.BG], game.ECART_X, game.ECART_Y, 512, 384);
	for(i in game.displayMap) {
		const y = i >> 5;
		const x = i - (y << 5);
		if(game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < 768) {
			if(game.CAKELEFT == 0 && game.displayMap[i]==35) {
				game.displayMap[i] = 22;
				game.map[i] = 22;
			}
			ctx.drawImage(tileset[game.displayMap[i]], x*16 + game.ECART_X, y*16 + game.ECART_Y, 16, 16);
		}
	}
	game.imgBuff = copyCanvas(game.ECART_X, game.ECART_Y, 512, 384);
	game.needLoad = false;
	ctx.fillStyle = "rgb(0, 0, 0)";
	//noStroke();
	ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
	if(game.perso.intermissionFade < 0) ctx.drawImage(highscore, game.ECART_X, game.ECART_Y);
}

function drawCakes() {
	let i;
	for(i in game.cakes) {
		if(game.cakes[i].used) {
			if(game.perso.fadeNextLevel == -1) {
				game.cakes[i].vy += 32 * game.cakes[i].mDir;
				if(game.cakes[i].vy < -3<<8) {
					game.cakes[i].mDir = -game.cakes[i].mDir;
				}else if(game.cakes[i].vy > 3<<8) {
					game.cakes[i].mDir = -game.cakes[i].mDir;
				}
				ctx.drawImage(cake, (game.cakes[i].x>>8) + game.ECART_X, ((game.cakes[i].y + game.cakes[i].vy)>>8) + game.ECART_Y, 16, 12); 
			}else {
				ctx.drawImage(cake, (game.cakes[i].x>>8) + game.ECART_X, ((game.cakes[i].y)>>8) + game.ECART_Y, 16, 12);
			}
		}
	}
}

function drawTourelles() {
	let dx, tour;
	for(tour in game.tourelles) {
		//if(tourelles[tour].animFrame < 10) {
			const side = game.tourelles[tour].dir < 0 ? 0 : 1;
			
			if(settings.quality > 0) {
				ctx.save();
				ctx.translate((game.tourelles[tour].x>>8) + (game.tourelles[tour].pX>>1) + game.ECART_X, (game.tourelles[tour].y>>8) + (game.tourelles[tour].pY>>1) + game.ECART_Y);
				ctx.rotate(degToRad(game.tourelles[tour].angle));
				ctx.drawImage(tourelle[side], 0, game.tourelles[tour].animFrame * 32, 16, 32, -(game.tourelles[tour].pX>>1), -(game.tourelles[tour].pY>>1), 16, 32);
				ctx.restore();
			}else {
				ctx.drawImage(tourelle[side], 0, game.tourelles[tour].animFrame * 32, 16, 32,(game.tourelles[tour].x>>8) + game.ECART_X, (game.tourelles[tour].y>>8) + game.ECART_Y, 16, 32);
			}
			
			if(game.tourelles[tour].animFrame == 1 && game.tourelles[tour].mort == 0) {
				ctx.strokeStyle = "rgb(255, 255, 0)";
				ctx.lineWidth = 3;
				dx = game.tourelles[tour].dir < 0 ? 0 : game.tourelles[tour].pX;
				const dy = parseInt(random(-16, 16));
				line((game.tourelles[tour].x>>8) + game.ECART_X + dx, (game.tourelles[tour].y>>8) + game.ECART_Y + 13, ((game.perso.x>>8) + game.ECART_X), (game.perso.y>>8) + game.ECART_Y + (game.perso.pY >> 1) + dy);
			}else if(game.tourelles[tour].rotation < 10 && game.tourelles[tour].mort == 0) {
				ctx.strokeStyle = "rgb(255, 0, 0)";
				ctx.lineWidth = 1;
				dx = game.tourelles[tour].dir < 0 ? 0 : game.tourelles[tour].pX;
				line((game.tourelles[tour].x>>8) + game.ECART_X + dx, (game.tourelles[tour].y>>8) + game.ECART_Y + 13, ((game.tourelles[tour].ex>>8) + game.ECART_X), (game.perso.y>>8) + game.ECART_Y + (game.perso.pY >> 1));
			}
			if(game.perso.fadeNextLevel == -1) {
				game.tourelles[tour].move();
				if(game.needRedrawTiles == 0) game.needRedrawTiles = dansUnPortal(game.tourelles[tour]);
			}
		//}
	}
}

function drawPlasma() {
	let r, vy;
	for(let plasm=0; plasm<game.plasmaBall.length; plasm++) {
		if(game.plasmaBall[plasm].used) {
			let vx = vy = 0;
			if(game.plasmaBall[plasm].vx != 0) vy = game.plasmaBall[plasm].scale;
			else if(game.plasmaBall[plasm].vy != 0) vx = game.plasmaBall[plasm].scale;
			if(game.TIME % 10 == 0) {
				do{
					r = parseInt(random(0, 3));
				}while(game.plasmaBall[plasm].animFrame == r);
				game.plasmaBall[plasm].animFrame = r;
			}
			ctx.drawImage(plasma, 0, game.plasmaBall[plasm].animFrame * 16, 16, 16, 
							(game.plasmaBall[plasm].x>>8) + game.ECART_X + vx, (game.plasmaBall[plasm].y >> 8) + game.ECART_Y + vy, 16, 16); 
			if(game.perso.fadeNextLevel == -1) {
				game.plasmaBall[plasm].move();
				if(game.needRedrawTiles == 0) game.needRedrawTiles = dansUnPortal(game.plasmaBall[plasm]);
				if(game.plasmaBall[plasm].needKill) {
					game.plasmaBall.splice(plasm, 1);
					plasm--;
				}
			}
		}
	}
}

function drawProjos() {
	let pr;
	for(pr = 0; pr < game.projos.length; pr++) {
		game.projos[pr].move();

		if(settings.quality > 0 && !game.projos[pr].needKill) {
			ctx.globalAlpha = 0.5;
			ctx.drawImage(tileset[game.projos[pr].img], ((game.projos[pr].x - game.projos[pr].vx * 4) >> 8) + game.ECART_X, ((game.projos[pr].y - game.projos[pr].vy * 4) >> 8) + game.ECART_Y, 16, 16);
			ctx.globalAlpha = 0.75;
			ctx.drawImage(tileset[game.projos[pr].img], ((game.projos[pr].x - game.projos[pr].vx * 2) >> 8) + game.ECART_X, ((game.projos[pr].y - game.projos[pr].vy * 2) >> 8) + game.ECART_Y, 16, 16);
			ctx.globalAlpha = 1;
		}
		ctx.drawImage(tileset[game.projos[pr].img], (game.projos[pr].x >> 8) + game.ECART_X, (game.projos[pr].y >> 8) + game.ECART_Y, 16, 16);
		
		if(!game.projos[pr].needKill && projoTouchePerso(game.projos[pr])) {
			game.projos.splice(pr, 1);
			pr--;
			game.perso.vie = -200;
			game.perso.timeVie = 180;
			return;
		}
		
		if(game.projos[pr].needKill) {
			if(game.projos[pr].timer == 0 || settings.quality == 0) {
				game.projos.splice(pr, 1);
				pr--;
			}
		}
	}
}

function drawCaisses() {
	let cai;
	for(cai = 0; cai < game.caisses.length; cai++) {
		let sc = 1;
		let dxy = 0;
		if(game.caisses[cai].shrink > 0) {
			game.caisses[cai].x += game.caisses[cai].vx >> 1;
			game.caisses[cai].y += game.caisses[cai].vy >> 1;
			sc = game.caisses[cai].shrink / 60;
			dxy = (16 - parseInt(16 * sc)) / 2;
		}
		
		if(settings.quality > 0) {
			ctx.save();
			ctx.translate((game.caisses[cai].x>>8) + (game.caisses[cai].pX>>1) + game.ECART_X, (game.caisses[cai].y>>8) + (game.caisses[cai].pY>>1) + game.ECART_Y);
			ctx.rotate(degToRad(game.caisses[cai].angle));
			ctx.drawImage(caisse, 0, 0, 16, 16, -(game.caisses[cai].pX>>1), -(game.caisses[cai].pY>>1), 16 * sc, 16 * sc);
			ctx.restore();
		}else {
			ctx.drawImage(caisse, 0, 0, 16, 16, (game.caisses[cai].x>>8) + game.ECART_X + dxy, (game.caisses[cai].y>>8) + game.ECART_Y + dxy, 16 * sc, 16 * sc);
		}
		
		if(game.perso.fadeNextLevel == -1) {
			game.caisses[cai].move();
			if(game.caisses[cai].needKill) {
				game.caisses.splice(cai, 1);
				cai--;
				continue;
			}
			if(game.needRedrawTiles == 0) game.needRedrawTiles = dansUnPortal(game.caisses[cai]);
		}
	}
}

function drawArrow(x1, y1, x2, y2, lineWidth, dir) {
	ctx.lineWidth = lineWidth;
	line(x1, y1, x2, y2);
	const xa = x1 + (Math.abs(x1 - x2)>>1) + dir * 2;
	if(dir == -1) triangle(xa - 6, y1, xa, y1 - 6, xa, y1 + 6);
	else triangle(xa + 6, y1, xa, y1 - 6, xa, y1 + 6);
}

function inForceFieldTp(obj) {
	let i;
	const posx = obj.x>>8;
	const posy = (obj.y>>8);
	const pX = obj.pX;
	const pY = obj.pY;
	
	const fields = new Array();
	
	for(i in game.forceFields) {
		let x = game.forceFields[i].x;
		let y = game.forceFields[i].y;
		let w = game.forceFields[i].w;
		let h = game.forceFields[i].h;
		
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
	const x = nx;
	const y = ny;
	if(vx < 0) {
		ctx.fillRect(sx + game.ECART_X, sy + game.ECART_Y, - (sx - x - 16), 32);
		game.forceFields.push(new forceField(sx, sy, - (sx - x - 16), 32, -1, 0));
		
	}
	else if(vx > 0) {
		ctx.fillRect(sx + game.ECART_X, sy + game.ECART_Y, x - sx, 32);
		game.forceFields.push(new forceField(sx, sy, x - sx, 32, 1, 0));
	}
	else if(vy < 0) {
		ctx.fillRect(sx + game.ECART_X, sy + game.ECART_Y, 32, - (sy - y - 16));
		game.forceFields.push(new forceField(sx, sy, 32, - (sy - y - 16), 0, -1));
	}
	else if(vy > 0) {
		ctx.fillRect(sx + game.ECART_X, sy + game.ECART_Y, 32, y - sy);
		game.forceFields.push(new forceField(sx, sy, 32, y - sy, 0, 1));
	}
}

function pointInPortal(x, y) {
	let i;
	for(i in game.portals) {
		const xp = game.portals[i].x >> 8;
		const yp = game.portals[i].y >> 8;
		
		if(game.portals[i].direction == GAUCHE || game.portals[i].direction == DROITE) {
			if(x >= xp && x <= xp + 3 && y >= yp && y <= yp + 32) {
				return 1 - i;
			}
		}else if(game.portals[i].direction == HAUT || game.portals[i].direction == BAS) {
			if(x >= xp && x <= xp + 32 && y >= yp && y <= yp + 3) {
				return 1 - i;
			}
		}
	}
	return -1;
}

function drawTunnelField(sx, sy, vx, vy) {
	
	let tile, p1, p2;
	ctx.globalAlpha = 0.5;
	
	let y = sy;
	let x = sx;
	
	x += vx * 16;
	y += vy * 16;
	
	while(x >= 0 && x < 512 && y >= 0 && y < 384) {
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
			
			if(game.portals && game.portals[0].used && game.portals[1].used) {
				if(vx != 0) {
					p1 = pointInPortal(x, y + 4);
					p2 = pointInPortal(x, y + 28);
				}else if(vy != 0) {
					const dy = vy < 0 ? 14 : 0;
				
					p1 = pointInPortal(x + 4, y + dy);
					p2 = pointInPortal(x + 28, y + dy);
				}
				if(p1 == p2 && p1 > -1) {
					const p = p1;
					if(game.portals[p].direction == DROITE) {
						sx = game.portals[p].x >> 8;
						sy = game.portals[p].y >> 8;
						vx = -1;
						vy = 0;
						y = sy;
						x = sx;
					}else if(game.portals[p].direction == GAUCHE) {
						sx = (game.portals[p].x >> 8) + 3;
						sy = game.portals[p].y >> 8;
						vx = 1;
						vy = 0;
						y = sy;
						x = sx;
					}else if(game.portals[p].direction == HAUT) {
						sx = (game.portals[p].x >> 8);
						sy = game.portals[p].y >> 8;
						vx = 0;
						vy = 1;
						y = sy + 3;
						x = sx;
					}else if(game.portals[p].direction == BAS) {
						sx = (game.portals[p].x >> 8);
						sy = game.portals[p].y >> 8;
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
	let tu;
	if(game.tunnels.length > 0) {
		game.forceFields = new Array();
		ctx.fillStyle = "rgb(151, 206, 233)";
	}
	for(tu in game.tunnels) {
		const x = (game.tunnels[tu].x >> 8);
		const y = (game.tunnels[tu].y >> 8);
		
		let vx = 0;
		let vy = 0;
		if(game.tunnels[tu].dir == DROITE) {
			vx = 1;
		} else if(game.tunnels[tu].dir == GAUCHE) {
			vx = -1;
		} else if(game.tunnels[tu].dir == HAUT) {
			vy = -1;
		} else if(game.tunnels[tu].dir == BAS) {
			vy = 1;
		}
		
		drawTunnelField(x, y, vx, vy);
		
		if(game.tunnels[tu].dir == DROITE) {
			ctx.drawImage(tunnel, 0, 0, 16, 32, (game.tunnels[tu].x >> 8) + game.ECART_X, (game.tunnels[tu].y >> 8) + game.ECART_Y, 16, 32);
		}else if(game.tunnels[tu].dir == GAUCHE) {
			ctx.drawImage(tunnel, 0, 32, 16, 32, (game.tunnels[tu].x >> 8) + game.ECART_X, (game.tunnels[tu].y >> 8) + game.ECART_Y, 16, 32);
		}else if(game.tunnels[tu].dir == HAUT) {
			ctx.drawImage(tunnel2, 0, 0, 32, 16, (game.tunnels[tu].x >> 8) + game.ECART_X, (game.tunnels[tu].y >> 8) + game.ECART_Y, 32, 16);
		}else if(game.tunnels[tu].dir == BAS) {
			ctx.drawImage(tunnel2, 32, 0, 32, 16, (game.tunnels[tu].x >> 8) + game.ECART_X, (game.tunnels[tu].y >> 8) + game.ECART_Y, 32, 16);
		}
	}
}

function drawPlatformes() {
	let pla;
	for(pla in game.platforms) {
		const x = (game.platforms[pla].x >> 8) + game.ECART_X;
		const y = (game.platforms[pla].y >> 8) + game.ECART_Y;
		
		ctx.drawImage(platform, x, y);
		if(ui.currentMenu == 3 && !isTestingLevel) {
			ctx.fillStyle = "rgb(255, 0, 0)";
			ctx.strokeStyle = "rgb(255, 0, 0)";
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, game.platforms[pla].dir);
		}
		if(game.perso.fadeNextLevel == -1) {
			game.platforms[pla].move();
		}
	}
}

function drawFrontTiles() {
	let tx, ty, t, p, i;
	if(game.needRedrawTiles > 0) {
		for(p in game.portals) {
			if(game.portals[p].plateforme == -1) {
				const x = game.portals[p].x >> 8;
				const y = game.portals[p].y >> 8;
				if(game.portals[p].direction == HAUT || game.portals[p].direction == BAS) {
					tx = x >> 4;
					ty = y >> 4;
					for(i=0; i<4; i++) {
						if(tx + i < 32 && tx + i >= 0) {
							t = tx + i + (ty << 5);
							if(tileset[game.displayMap[t]]) {
								ctx.drawImage(tileset[game.displayMap[t]], (tx+i)*16 + game.ECART_X, ty*16 + game.ECART_Y, 16, 16);
							}
						}
					}
				}else if(game.portals[p].direction == GAUCHE || game.portals[p].direction == DROITE) {
					tx = x >> 4;
					ty = y >> 4;
					for(i=0; i<4; i++) {
						if(ty + i < 24 && ty + i >= 0) {
							t = tx + ((ty + i) << 5);
							if(game.displayMap[t] < tileset.length) {
								ctx.drawImage(tileset[game.displayMap[t]], tx*16 + game.ECART_X, (ty+i)*16 + game.ECART_Y, 16, 16);
							}
						}
					}
				}
			}
		}
	}
}

function drawCamera() {
	game.camera.move();
	
	const a = getAngle((game.perso.x>>8) + (game.perso.pX>>1), (game.perso.y>>8) + (8), (game.camera.x >> 8) + 8, (game.camera.y >> 8) + 8);
	ctx.save();
	ctx.translate((game.camera.x>>8) + 8 + game.ECART_X, (game.camera.y>>8) + 8 + game.ECART_Y);
	ctx.rotate(a);
	ctx.drawImage(cameraFollow, 0, 0);
	ctx.restore();
}

function drawPortals() {
	let prt, dy;
	for(prt in game.portals) {
		if(game.portals[prt].used) {
			if(game.portals[prt].scaleX < 1) game.portals[prt].scaleX += 0.1;
			else if(game.portals[prt].scaleY < 1) game.portals[prt].scaleY += 0.1;
			
			let dx = dy = 0;
			if(game.portals[prt].direction == GAUCHE || game.portals[prt].direction == DROITE) dy = 16 - (game.portals[prt].scaleY * 16);
			else if(game.portals[prt].direction == HAUT || game.portals[prt].direction == HAUT) dx = 16 - (game.portals[prt].scaleX * 16);
			
			game.portals[prt].move();
			
			ctx.drawImage(prt==0 ? bluePortal : redPortal, 0, 32*game.portals[prt].frame, 32, 32, (game.portals[prt].x>>8) + dx + game.ECART_X, (game.portals[prt].y>>8) + dy + game.ECART_Y, 32*game.portals[prt].scaleX, 32*game.portals[prt].scaleY); 
		}
	}
}

function manageTransitionDraw() {
	if(finNiveau()) {//if a level is finished, closing transition
		if(game.perso.fadeNextLevel > 0) {
			drawTransitionIn();
		}
		else {
			if(ui.drawIntermission) {
				doDrawIntermission();
			}
		}
		
	} else {//else it is an opening transition
		if(game.perso.intermissionFade < 0) {
			ctx.fillStyle = "rgb(0, 0, 0)";
			//noStroke();
			ctx.fillRect(game.ECART_X - 1, game.ECART_Y, 512, 384);
			const a = -(game.perso.intermissionFade / 20);
			game.perso.intermissionFade++;
			ctx.globalAlpha = a;
			ctx.drawImage(highscore, game.ECART_X, game.ECART_Y);
			ctx.globalAlpha = 1;
		}else drawTransitionOut();
	}
}

let creditsTime = 0;
let creditsAlpha = 0;
let creditsTxt = new Array();

let speedScr = 0.4;

function doDrawCredits() {
	if(input.mouseNewPress && creditsTime > 150) speedScr = 5;
	creditsTime += speedScr;
	
	
	if(creditsTime > 1800) {
		if(creditsAlpha > 0) creditsAlpha -= 0.01;
		if(creditsAlpha < 0) {
			ui.drawCredits = false;
		}
	}else {
		if(creditsAlpha < 1) creditsAlpha += 0.01;
		if(creditsAlpha > 1) creditsAlpha = 1;
	}
	
	ctx.drawImage(noLevel, 0, 32, 640, 480);
	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fillRect(0, 0, 640, 544);
	
	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);

	ctx.fillStyle = "rgba(0, 0, 0," + (1-creditsAlpha) + ")";
	ctx.fillRect(0, 0, 640, 544);
	
	ctx.font = "24px yikes";	
	for(const t in creditsTxt) {
		const txt = creditsTxt[t];
		const metrics = ctx.measureText(txt);
		const x = 320 - (metrics.width >> 1);
		
		const yLow = creditsTxt.length * 15;
		
		const y = t * 32 + (yLow - creditsTime);
		
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
	if(game.perso.intermissionFade > 0) {
		ctx.fillStyle = "rgb(0, 0, 0)";
		//noStroke();
		ctx.fillRect(game.ECART_X - 1, game.ECART_Y, 512, 384);
		game.perso.intermissionFade--;
		const a = game.perso.intermissionFade / 20;
		ctx.globalAlpha = 1 - a;
	}
	ctx.drawImage(highscore, game.ECART_X, game.ECART_Y);
	if(game.perso.intermissionFade > 0) ctx.globalAlpha = 1;
	
	manageDownMenu();
	
	if(game.perso.intermissionFade == 0) {
		ctx.fillStyle = "rgb(255, 255, 255)";
		ctx.font = "bold 12px Arial";
		ctx.fillText("Your time : " + toTime(game.TIME), game.ECART_X + 35, game.ECART_Y + 260);
		ctx.fillText(ui.highscoreMessage, game.ECART_X + 35, game.ECART_Y + 278);
	}
}

function drawText(x, y, size) {
	let i;
	ctx.fillStyle = "rgb(255, 255, 255)";
	ctx.font = "13px Arial";
	if(ui.txtLines.length == 0 && ui.currentMenu != 6) {
		const txt = campaigns[ui.lvlType].texts[ui.currentLevel-1];
		let l = 0;
		let line = "";
		while(l < txt.length) {
			let word = "";
			while(txt[l] != " " && l < txt.length) {
				word += txt[l];
				l++;
			}
			const metrics = ctx.measureText(line + " " + word);
			if(metrics.width < 447) {
				line += word + " ";
			}else {
				ui.txtLines.push(line);
				line = word + " ";
			}
			l++;
		}
		ui.txtLines.push(line);
	}
	
	let toWrite = parseInt(ui.timeWriting);
	
	for(i in ui.txtLines) {
		if(toWrite >= 0 && settings.quality > 0) {
			if(ui.txtLines[i].length < toWrite) {
				ctx.fillText(ui.txtLines[i], x, y + i*size);
				toWrite -= ui.txtLines[i].length;
				if(i == ui.txtLines.length - 1) {
					ui.timeWriting = -1;
				}
			}else if(toWrite != 0){
				ctx.fillText(ui.txtLines[i].substring(0, toWrite), x, y + i*size);
				toWrite = 0;
			}
		}else {
			ctx.fillText(ui.txtLines[i], x, y + i*size);
		}
	}
	
	if(ui.timeWriting >= 0 && !ui.escapeMenu) ui.timeWriting += 0.75;
}

function drawHudText() {
	ctx.font = "bold 14px Arial";
	ctx.fillStyle = "rgb(255, 255, 255)";
		
	ctx.fillText(((game.perso.vie>>8) > 0 ? (game.perso.vie>>8)  : 0 )+ "", 20, 150);
	ctx.fillText(game.CAKELEFT + "", 26, 215);
	ctx.fillText((game.STEPS >> 8) + "", 26, 275);
	ctx.fillText(game.PORTALS + "", 26, 335);
}

function drawPreviewMap() {
	let i, tour, cai, pla;
	if(game.needLoad) {
		ctx.drawImage(bg[game.BG], game.ECART_X, game.ECART_Y, 512, 384);
		for(i in game.displayMap) {
			const y = i >> 5;
			const x = i - (y << 5);
			if(game.displayMap[i] < NUM_TILES && game.displayMap[i] > 0 && i < 768) {
				if(game.CAKELEFT == 0 && game.displayMap[i]==35) {
					game.displayMap[i] = 22;
					game.map[i] = 22;
				}
				ctx.drawImage(tileset[game.displayMap[i]], x*16 + game.ECART_X, y*16 + game.ECART_Y, 16, 16);
			}
		}
		game.imgBuff = copyCanvas(game.ECART_X, game.ECART_Y, 512, 384);
		game.needLoad = false;
		ctx.fillStyle = "rgb(0, 0, 0)";;
		//noStroke();
		ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
	}
	else 
	{
		drawCopy(game.imgBuff, game.ECART_X, game.ECART_Y);
		
		game.perso.flip = 1;
		
		ctx.save();
		ctx.translate((game.perso.x>>8) + (game.perso.pX>>1) + game.ECART_X, (game.perso.y>>8) + (game.perso.pY>>1) + game.ECART_Y);
		ctx.drawImage(portalGun, -5, -5);
		ctx.restore();

		const flipDx =  game.perso.flip < 0 ? 1 : 0;
		ctx.drawImage(head[flipDx], game.perso.animeFrame * 16, 0, 15, 12, ((game.perso.x>>8) + game.ECART_X), (game.perso.y>>8) + game.ECART_Y, 16, 12); 
		ctx.drawImage(body[flipDx], game.perso.animeFrame * 16, 0, 16, 27, ((game.perso.x>>8) + game.ECART_X), (game.perso.y>>8) + game.ECART_Y, 16, 27);
		
		for(i in game.cakes) {
			if(game.cakes[i].used) {
				ctx.drawImage(cake, (game.cakes[i].x>>8) + game.ECART_X, ((game.cakes[i].y + game.cakes[i].vy)>>8) + game.ECART_Y, 16, 12); 
			}
		}
		
		for(tour in game.tourelles) {
			const side = game.tourelles[tour].dir < 0 ? 0 : 1;
			ctx.drawImage(tourelle[side], 0, game.tourelles[tour].animFrame * 32, 16, 32,(game.tourelles[tour].x>>8) + game.ECART_X, (game.tourelles[tour].y>>8) + game.ECART_Y, 16, 32);
		}

		for(cai in game.caisses) {
			ctx.drawImage(caisse, (game.caisses[cai].x>>8) + game.ECART_X, (game.caisses[cai].y>>8) + game.ECART_Y);
		}
		
		for(pla in game.platforms) {
			ctx.drawImage(platform, (game.platforms[pla].x >> 8) + game.ECART_X, (game.platforms[pla].y >> 8) + game.ECART_Y);
		}
		
		drawTunnels();
		
		if(game.bossNum > 0) {
			if(game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) ctx.drawImage(tube, (game.tubeX>>8) + game.ECART_X, (game.tubeY>>8) + game.ECART_Y);
			else if(game.bossNum == 2) ctx.drawImage(tube2, (game.tubeX>>8) + game.ECART_X, (game.tubeY>>8) + game.ECART_Y);
			drawBoss();
		}
		
		ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
		//noFill();
		ctx.strokeStyle = "rgb(0, 0, 0)";
		ctx.lineWidth = 1;
		/*ctx.strokeRect(0, 0, 640, 544);*/
	}
}

function drawBoss() {
	ctx.drawImage(robotHead, (game.bossX) + game.ECART_X, (game.bossY) + game.ECART_Y, 74, 58);
	
	let eye = 0;
	if(ui.currentLevel <= 7) eye = 0;
	else if(ui.currentLevel <= 14) eye = 1;
	else if(ui.currentLevel <= 21) eye = 2;
	else eye = 3;
		
	ctx.drawImage(robotEye[eye], 0, 19 * game.bossLife, 19, 19, (game.bossX) + game.ECART_X + 15, (game.bossY) + game.ECART_Y + 22, 19, 19);
}

function drawTransitionIn() {
	let nb, i;
	ctx.fillStyle = "rgb(0, 0, 0)";;
	//noStroke();
	const scale = 1 - (game.perso.fadeNextLevel / 120);
	if(TRANS == 1) {//top left corner
		ctx.fillRect(game.ECART_X, game.ECART_Y, parseInt(512 * scale), parseInt(384 * scale));
	}else if(TRANS == 2) {//left to right
		ctx.fillRect(game.ECART_X, game.ECART_Y, parseInt(512 * scale), 384);
	}else if(TRANS == 3) {//top to bottom
		ctx.fillRect(game.ECART_X, game.ECART_Y, 512, parseInt(384 * scale));
	}else if(TRANS == 4) {//successive horizontal lines
		nb = 120 - game.perso.fadeNextLevel;
		if(nb < linesHoriz.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X, game.ECART_Y + (linesHoriz[i] * 3), 512, 3);
			}
		}else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	}else if(TRANS == 5) {//successive vertical lines
		nb = 120 - game.perso.fadeNextLevel;
		if(nb < linesVerti.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X + (linesVerti[i] * 4), game.ECART_Y, 6, 384);
			}
		}else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	}else if(TRANS == 6) {//square to center
		const x = 512 - parseInt(512 * scale);
		const y = 384 - parseInt(384 * scale);
		ctx.fillRect(game.ECART_X + (x>>1), game.ECART_Y + (y>>1), parseInt(512 * scale), parseInt(384 * scale));
	}
}

function drawTransitionOut() {
	let nb, i;
	ctx.fillStyle = "rgb(0, 0, 0)";
	ctx.strokeStyle = "rgb(0, 0, 0)";
	const scale = game.perso.fadeNextLevel / 120;
	const x = 512 - parseInt(512 * scale);
	const y = 384 - parseInt(384 * scale);
	
	if(TRANS == 1) {//top left corner
		ctx.fillRect(game.ECART_X + x, game.ECART_Y + y, parseInt(512 * scale), parseInt(384 * scale));
	}else if(TRANS == 2) {//left to right
		ctx.fillRect(game.ECART_X + x, game.ECART_Y, parseInt(512 * scale), 384);
	}else if(TRANS == 3) {//top to bottom
		ctx.fillRect(game.ECART_X, game.ECART_Y + y, 512, parseInt(384 * scale));
	}else if(TRANS == 4) {//successive lines
		nb = game.perso.fadeNextLevel;
		if(nb < linesHoriz.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X, game.ECART_Y + (linesHoriz[i] * 3), 512, 5);
			}
		}else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	}else if(TRANS == 5) {//successive vertical lines
		nb = game.perso.fadeNextLevel;
		if(nb < linesVerti.length) {
			for(i = 0; i < nb; i++) {
				ctx.fillRect(game.ECART_X + (linesVerti[i] * 4), game.ECART_Y, 6, 384);
			}
		}else {
			ctx.fillRect(game.ECART_X, game.ECART_Y, 512, 384);
		}
	}else if(TRANS == 6) {//square to center
		ctx.strokeStyle = "rgb(0, 0, 0)";
		ctx.lineWidth = 384 * scale;
		//noFill();
		ctx.strokeRect(game.ECART_X, game.ECART_Y, 512, 384);
	}
}


function drawPerso(x, y, flipX) {
	const flipDx =  flipX < 0 ? 1 : 0;
	ctx.drawImage(body[flipDx], 16, 0, 16, 27, x, y,16, 27);
	ctx.drawImage(head[flipDx], 16, 0, 15, 12, x, y, 16, 12);
}