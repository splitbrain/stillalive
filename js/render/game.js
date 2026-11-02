/**
 * Drawing of a level: tiles, objects, the player and the portals.
 */

import { setSoundVolume, sfx_flatline } from '../audio.js';
import { drawBoss, shakeScreen } from '../boss.js';
import { ctx } from '../canvas.js';
import { BAS, DROITE, GAUCHE, HAUT, NUM_TILES, ORDERED, RANDOM } from '../constants.js';
import { isTestingLevel } from '../editor.js';
import { forceField } from '../entities/ForceField.js';
import { projoTouchePerso } from '../entities/Projectile.js';
import { createCakeOrSmokeSparkles, manageSparkles } from '../entities/Sparkle.js';
import {
	bg,
	bluePortal,
	body,
	caisse,
	cake,
	cameraFollow,
	crosshair,
	head,
	highscore,
	hud,
	plasma,
	platform,
	portalGun,
	redPortal,
	robotEye,
	robotHead,
	tileset,
	tourelle,
	tube,
	tube2,
	tunnel,
	tunnel2,
} from '../images.js';
import { getTileNoCaisse, getTileNoCaisseNoPlate } from '../physics.js';
import { dansUnPortal, pointInPortal, portalLines } from '../portals.js';
import { drawText } from './hud.js';
import { manageTransitionDraw } from './transitions.js';
import { game, input, settings, ui } from '../state.js';
import { manageTutorial } from '../tutorial.js';
import { degToRad, getAngle, radToDeg, random } from '../utils.js';

export function reloadTiles() {
	let i;
	ctx.drawImage(bg[game.BG], game.ECART_X, game.ECART_Y, 512, 384);
	for(i in game.displayMap) {		
		if(game.map[i] < NUM_TILES && game.map[i] > 0 && i < 768) {
			const y = i >> 5;
			const x = i - (y << 5);
			ctx.drawImage(tileset[game.displayMap[i]], x*16 + game.ECART_X, y*16 + game.ECART_Y, 16, 16);
		}
	}
	game.imgBuff = copyCanvas(game.ECART_X, game.ECART_Y, 512, 384);
}

export function Line(x1, y1, x2, y2, color) {
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
	this.color = color;
}

function line(x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1)
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.closePath();
}

function triangle(x1, y1, x2, y2, x3, y3) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.lineTo(x3, y3);
	ctx.lineTo(x1, y1);
	ctx.fill();
	ctx.closePath();
}

export function drawLowQualityPortals() {
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
export function copyCanvas(x, y, w, h) {
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
export function drawCopy(copy, x, y) {
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

export function drawAllGame() {
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

export function drawRobot() {
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

export function animateTiles() {
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

export function createBuff() {
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

export function drawCakes() {
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

export function drawTourelles() {
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

export function drawPlasma() {
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

export function drawCaisses() {
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

export function drawArrow(x1, y1, x2, y2, lineWidth, dir) {
	ctx.lineWidth = lineWidth;
	line(x1, y1, x2, y2);
	const xa = x1 + (Math.abs(x1 - x2)>>1) + dir * 2;
	if(dir == -1) triangle(xa - 6, y1, xa, y1 - 6, xa, y1 + 6);
	else triangle(xa + 6, y1, xa, y1 - 6, xa, y1 + 6);
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

export function drawTunnels() {
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

export function drawPlatformes() {
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

export function drawFrontTiles() {
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

export function drawPortals() {
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

export function drawPerso(x, y, flipX) {
	const flipDx =  flipX < 0 ? 1 : 0;
	ctx.drawImage(body[flipDx], 16, 0, 16, 27, x, y,16, 27);
	ctx.drawImage(head[flipDx], 16, 0, 15, 12, x, y, 16, 12);
}
