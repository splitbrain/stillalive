/**
 * The level editor.
 */

import { ctx } from './canvas.js';
import { BAS, DROITE, GAUCHE, HAUT, LEFT, MIDDLE, NUM_TILES, RIGHT } from './constants.js';
import { alertDialog } from './dialog.js';
import { Caisse } from './entities/Caisse.js';
import { Cake } from './entities/Cake.js';
import { Perso } from './entities/Perso.js';
import { Platform } from './entities/Platform.js';
import { Portal } from './entities/Portal.js';
import { manageSparkles } from './entities/Sparkle.js';
import { Tourelle } from './entities/Tourelle.js';
import { Tunnel } from './entities/Tunnel.js';
import {
	bg,
	body,
	caisse,
	cake,
	crosshair,
	head,
	levelEditorHud,
	mapSelection,
	noLevel,
	platform,
	portalGun,
	tex_leftBG,
	tex_rightBG,
	tileset,
	tourelle,
	tunnel,
	tunnel2,
} from './images.js';
import { mouseInZone, unclick } from './input.js';
import { gestionPorte, loadLevelEditor, loadPreviewMap } from './level.js';
import { exportEditorMap, importEditorMap } from './mapFile.js';
import { finNiveau } from './physics.js';
import { dansUnPortal } from './portals.js';
import {
	animateTiles,
	copyCanvas,
	createBuff,
	drawArrow,
	drawCaisses,
	drawCakes,
	drawCopy,
	drawFrontTiles,
	drawLowQualityPortals,
	drawPerso,
	drawPlasma,
	drawPlatformes,
	drawPortals,
	drawTourelles,
	drawTunnels,
} from './render/game.js';
import { drawText } from './render/hud.js';
import { drawPreviewMap, drawTinyButton } from './render/menus.js';
import { game, input, settings, ui } from './state.js';
import { getEditorMap, saveEditorMap } from './storage.js';
import { getAngle } from './utils.js';

let selectedTile, selectedSprite;
let tilesToDraw;
let redrawTiles;
let tilesBuff;
let undoMap;
let undoIndex;
let oldMouseReleased = 0;
export let isTestingLevel;
let oldBG;
let askLoading, askSaving;

export function startPlayingLevel() {
	let i;
	isTestingLevel = true;
	game.oldMap = new Array();
	for(i in game.map) game.oldMap.push(game.map[i]);
	loadLevelEditor();
	game.perso.fadeNextLevel = -1;
	prepareLvlEditorPlayTxt();
}

export function stopPlayingLevel() {
	let i;
	game.portals = new Array();
	game.portals.push(new Portal());game.portals.push(new Portal());
	unclick();
	isTestingLevel = false;
	game.map = new Array();
	for(i in game.oldMap) game.map.push(game.oldMap[i]);
	redrawTiles = true;
	drawTileMap();
	prepareLvlEditorTxt();
}

function levelEditorTestLevel() {
	game.needRedrawTiles = 0;
	game.TIME++;
	if(!game.perso.mort && game.perso.fadeNextLevel == -1) {
		game.perso.move();
		if(game.needRedrawTiles == 0) game.needRedrawTiles = dansUnPortal(game.perso);
	}
	
	gestionPorte();
	drawTestLevel();
	drawText(70, 38, 11);
}

function drawTestLevel() {
	if(game.needLoad) createBuff();
	drawCopy(game.imgBuff, game.ECART_X, game.ECART_Y);
	
	if(settings.quality > 0) animateTiles();
	
	game.perso.flip = input.mouseX > (game.perso.x >> 8) + (game.perso.pX >> 1) + game.ECART_X ? game.perso.flip = 1 : game.perso.flip = -1;
	
	const a = getAngle((game.perso.x>>8) + (game.perso.pX>>1) + game.ECART_X, (game.perso.y>>8) + (game.perso.pY>>1) + game.ECART_Y, input.mouseX, input.mouseY);
	ctx.save();
	ctx.translate((game.perso.x>>8) + (game.perso.pX>>1) + game.ECART_X, (game.perso.y>>8) + (game.perso.pY>>1) + game.ECART_Y);
	ctx.rotate(a);
	ctx.drawImage(portalGun, -5, -5);
	ctx.restore();
	
	drawTunnels();

	const flipDx =  game.perso.flip < 0 ? 1 : 0;
	// image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
	ctx.drawImage(head[flipDx], game.perso.animeFrame * 16, 0, 15, 12, ((game.perso.x>>8) + game.ECART_X), (game.perso.y>>8) + game.ECART_Y, 16, 12); 
	ctx.drawImage(body[flipDx], game.perso.animeFrame * 16, 0, 16, 27, ((game.perso.x>>8) + game.ECART_X), (game.perso.y>>8) + game.ECART_Y, 16, 27);
	
	drawCakes();
	drawTourelles();
	drawPlasma();
	
	manageSparkles();

	drawCaisses();
	drawPlatformes();
	
	drawFrontTiles();
	drawPortals();
	drawLowQualityPortals();
	
	if(game.perso.mort) {
		stopPlayingLevel();
		return;
	}

	ctx.drawImage(levelEditorHud, 0, 0);
	
	drawLeftTiles();
	drawRightSprites();
	
	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

export function lvlEditorSetup() {
	let i;
	game.BG = 0;
	askLoading = false;
	askSaving = false;
	game.bossNum = 0;

	game.map = new Array();
	game.displayMap = new Array();
	for(i=0; i<768; i++) {
		game.map.push(0);
		game.displayMap.push(0);
	}
	
	undoMap = new Array();
	undoIndex = -1;
	addUndo();
	
	tilesToDraw = new Array();
	tilesToDraw.push(0);
	tilesToDraw.push(1);
	for(i = 17; i<24; i++) tilesToDraw.push(i);
	tilesToDraw.push(29);
	tilesToDraw.push(36);
	tilesToDraw.push(38);
	tilesToDraw.push(40);
	tilesToDraw.push(46);
	tilesToDraw.push(47);
	tilesToDraw.push(49);
	tilesToDraw.push(55);
	tilesToDraw.push(57);
	
	redrawTiles = true;
	
	unclick();
	selectedTile = 1;
	selectedSprite = 0;
	
	game.perso = new Perso();
	game.perso.x = -(16 << 8);
	game.perso.y = 0;
	
	prepareLvlEditorTxt();
}

function prepareLvlEditorTxt() {
	ui.timeWriting = 0;
	ui.txtLines = new Array();
	
	ui.txtLines.push("Welcome to the StillAliveJS Level Editor ! Here is a place where you can easily");
	ui.txtLines.push("create your own maps. You can use your mouse to select tiles or object and draw");	
	ui.txtLines.push("them on the screen. Then, try out your map. Have Fun !");
}

function prepareLvlEditorPlayTxt() {
	ui.timeWriting = 0;
	ui.txtLines = new Array();
	
	ui.txtLines.push("Press <Enter> or <Escape> key to stop testing.");	
}

export function drawLevelEditor() {
	if(isTestingLevel) {
		levelEditorTestLevel();
		if(finNiveau()) stopPlayingLevel();
	}
	else levelEditorManager();
}

function levelEditorManager() {
	if(askLoading) {
		menuLoadMap();
	}else if(askSaving){
		menuSaveMap();
	}else {
		manageEditor();
	}
}

function menuSaveMap() {
	let i;
	if(ui.previewMap < 1 || getEditorMap(ui.previewMap) == null) ctx.drawImage(noLevel, game.ECART_X, game.ECART_Y);
	else if(ui.previewMap > 0) drawPreviewMap();	
	ctx.drawImage(mapSelection, 0, 0);
	
	if(mouseInZone(529, 117, 90, 29 * 12)) {
		const y = parseInt((input.mouseY - 105)/12);
		if(y <= 28) {
			ctx.fillStyle = "rgb(15, 112, 144)";
			//noStroke();
			ctx.fillRect(529, 105 + (y * 12) + 2, 90, 14);
			
			if(input.mouseNewPress && y != ui.previewMap) {
				unclick();
				ui.previewMap = y;
				showEditorMap(y);
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

		drawTinyButton(515, 495, scale1, "Save");
	}
	
	if(mouseInZone(180, 495, 120, 24)) overMenu = 3;
	drawTinyButton(180, 495, overMenu == 3 ? 0.9 : 1, "Export");
	if(mouseInZone(340, 495, 120, 24)) overMenu = 4;
	drawTinyButton(340, 495, overMenu == 4 ? 0.9 : 1, "Import");
	
	if(input.mouseNewPress && overMenu > 0) {
		unclick();
		if(overMenu == 1) {//save
			saveEditorMap(ui.previewMap, game.oldMap, oldBG);
			
			game.map = new Array();
			for(i in game.oldMap) game.map.push(game.oldMap[i]);
			game.BG = oldBG;
			askSaving = false;
			redrawTiles = true;
			game.ECART_X = 64;
			game.ECART_Y = 96;
			return;
		}else if(overMenu == 2) {//exit
			game.ECART_X = 64;
			game.ECART_Y = 96;
			askSaving = false;
		
			game.map = new Array();
			for(i in game.oldMap) game.map.push(game.oldMap[i]);
			game.BG = oldBG;
			redrawTiles = true;
			return;
		}else if(overMenu == 3) {//export
			exportEditorMap(game.oldMap, oldBG);
		}else if(overMenu == 4) {//import
			startMapImport();
		}
	}
	
	ctx.font = "bold 12px Arial";
	for(i=0; i<28;i++) {
		ctx.strokeStyle = "rgb(0, 0, 0)";
		if(getEditorMap(i + 1) != null) {
			ctx.fillStyle = "rgb(255, 255, 255)";
		}else {
			ctx.fillStyle = "rgb(200, 200, 200)";
		}
		ctx.fillText("Level " + (i + 1),549, 105 + 24 + (i * 12));
	}
	
	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

/**
 * Show a stored editor map in the preview of the save or load screen.
 *
 * @param {number} slot The slot number, starting at 1.
 */
function showEditorMap(slot) {
	const stored = getEditorMap(slot);
	if(stored == null) return;
	game.map = stored.tiles.slice();
	game.BG = stored.bg;
	loadPreviewMap(-1);
}

/**
 * Let the player select a map file and open it in the editor.
 */
function startMapImport() {
	importEditorMap().then(function(data) {
		if(ui.currentMenu != 3 || !(askSaving || askLoading)) return;
		game.map = data.tiles.slice();
		game.BG = data.bg;
		loadPreviewMap(-1);
		askSaving = false;
		askLoading = false;
		game.ECART_X = 64;
		game.ECART_Y = 96;
		redrawTiles = true;
		undoMap = new Array();
		undoIndex = -1;
		addUndo();
	}).catch(function(e) {
		alertDialog(e.message, 'Import map');
	});
}

function menuLoadMap() {
	let i;
	if(ui.previewMap < 1) ctx.drawImage(noLevel, game.ECART_X, game.ECART_Y);
	if(ui.previewMap > 0) drawPreviewMap();			
	ctx.drawImage(mapSelection, 0, 0);
	
	if(mouseInZone(529, 117, 90, 29 * 12)) {
		const y = parseInt((input.mouseY - 105)/12);
		if(y <= 28 && getEditorMap(y) != null) {
			ctx.fillStyle = "rgb(15, 112, 144)";
			//noStroke();
			ctx.fillRect(529, 105 + (y * 12) + 2, 90, 14);
			
			if(input.mouseNewPress && y != ui.previewMap) {
				unclick();
				ui.previewMap = y;
				showEditorMap(y);
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

		drawTinyButton(515, 495, scale1, "Load");
		
		if(mouseInZone(180, 495, 120, 24)) overMenu = 3;
		drawTinyButton(180, 495, overMenu == 3 ? 0.9 : 1, "Export");
	}
	
	if(mouseInZone(340, 495, 120, 24)) overMenu = 4;
	drawTinyButton(340, 495, overMenu == 4 ? 0.9 : 1, "Import");
	
	if(input.mouseNewPress && overMenu > 0) {
		unclick();
		if(overMenu == 1) {//load
			askLoading = false;
			redrawTiles = true;
			game.ECART_X = 64;
			game.ECART_Y = 96;
			
			undoMap = new Array();
			undoIndex = -1;
			addUndo();
			return;
		}else if(overMenu == 2) {//exit
			game.ECART_X = 64;
			game.ECART_Y = 96;
		
			game.map = new Array();
			for(i in game.oldMap) game.map.push(game.oldMap[i]);
			game.BG = oldBG;
			askLoading = false;
			redrawTiles = true;
			return;
		}else if(overMenu == 3) {//export
			exportEditorMap(game.map, game.BG);
		}else if(overMenu == 4) {//import
			startMapImport();
		}
	}
	
	ctx.font = "bold 12px Arial";
	for(i=0; i<28;i++) {
		ctx.strokeStyle = "rgb(0, 0, 0)";
		if(getEditorMap(i + 1) != null) {
			ctx.fillStyle = "rgb(255, 255, 255)";
		}else {
			ctx.fillStyle = "rgb(200, 200, 200)";
		}
		ctx.fillText("Level " + (i + 1),549, 105 + 24 + (i * 12));
	}
	
	ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
}

function manageEditor() {
	let i;
	drawTileMap();
	manageDrawTile();
	manageDrawSprite();
	manageUndoRedo();
	
	ctx.drawImage(levelEditorHud, 0, 0);
	manageTileSelection();
	manageSpriteSelection();
	drawLeftTiles();
	drawRightSprites();
	
	if(oldMouseReleased == 1 && input.mouseReleased == 1) input.mouseReleased = 0;
	oldMouseReleased = input.mouseReleased;
	
	let overMenu = -1;
	if(mouseInZone(game.ECART_X + 512 - 250, game.ECART_Y + 394, 120, 24)) overMenu = 1;
	else if(mouseInZone(game.ECART_X + 512 - 120, game.ECART_Y + 394, 120, 24)) overMenu = 2;
	else if(mouseInZone(game.ECART_X, game.ECART_Y + 394, 120, 24)) overMenu = 3;
	else if(mouseInZone(game.ECART_X + 130, game.ECART_Y + 394, 120, 24)) overMenu = 4;
	else if(mouseInZone(game.ECART_X + 60, game.ECART_Y + 420, 120, 24)) overMenu = 5;
	else if(mouseInZone(game.ECART_X + 60 + 130, game.ECART_Y + 420, 120, 24)) overMenu = 6;
	
	const scale1 = overMenu == 1 ? 0.9 : 1;
	const scale2 = overMenu == 2 ? 0.9 : 1;
	const scale3 = overMenu == 3 ? 0.9 : 1;
	const scale4 = overMenu == 4 ? 0.9 : 1;
	const scale5 = overMenu == 5 ? 0.9 : 1;
	const scale6 = overMenu == 6 ? 0.9 : 1;
	
	drawTinyButton(game.ECART_X, game.ECART_Y + 394, scale3, "Exit");
	drawTinyButton(game.ECART_X + 512 - 250, game.ECART_Y + 394, scale1, "Load");
	drawTinyButton(game.ECART_X + 512 - 120, game.ECART_Y + 394, scale2, "Save");
	drawTinyButton(game.ECART_X + 130, game.ECART_Y + 394, scale4, "Clear");
	drawTinyButton(game.ECART_X + 60, game.ECART_Y + 420, scale5, "Try Map");
	drawTinyButton(game.ECART_X + 60 + 130, game.ECART_Y + 420, scale6, "Help");
	
	drawText(70, 38, 11);
	
	if(!mouseInZone(game.ECART_X, game.ECART_Y, 512, 384)) ctx.drawImage(crosshair, input.mouseX - 8, input.mouseY - 8, 16, 16);
	
	if(overMenu > 0 && input.mouseNewPress) {
		unclick();
		if(overMenu == 5) {//try map
			startPlayingLevel();
		}else if(overMenu == 6) {//help
			alertDialog("Left click : Put tile or object\n" + 
					"Right click : Remove tile or object\n" +
					"Middle click : Fill\n" + 
					"ctrl + z : Undo\n" + 
					"ctrl + y : Redo\n" + 
					"Return : Try Map / Stop trying\n" +
					"Escape : Stop trying"
					,"Level Editor Shortcuts");
		}else if(overMenu == 2) {//save
			askSaving = true;
			ui.previewMap = -1;
			game.ECART_X = 0;
			game.ECART_Y = 96;
			game.oldMap = new Array();
			for(i in game.map) game.oldMap.push(game.map[i]);
			oldBG = game.BG;
		}else if(overMenu == 1) {//load
			askLoading = true;
			ui.previewMap = -1;
			game.ECART_X = 0;
			game.ECART_Y = 96;
			game.oldMap = new Array();
			for(i in game.map) game.oldMap.push(game.map[i]);
			oldBG = game.BG;
		}else if(overMenu == 4) {//clear
			for(i in game.map) game.map[i] = 0;
			/*undoMap = new Array();
			undoIndex = -1;*/
			addUndo();
			redrawTiles = true;
		}else if(overMenu == 3) {//exit
			ui.currentMenu = 1;
			game.sparkles = new Array();
			ui.fadeMenu = 30;
		}
	}
}

function manageUndoRedo() {
	let i;
	if(input.leftReleased && undoIndex > 0) {
		game.map = new Array();
		undoIndex--;
		for(i=0; i<768; i++) game.map.push(undoMap[undoIndex][i]);
		redrawTiles = true;
	}else if(input.rightReleased && undoIndex + 1 < undoMap.length) {
		undoIndex++;
		game.map = new Array();
		for(i=0; i<768; i++) game.map.push(undoMap[undoIndex][i]);
		redrawTiles = true;
	}
	input.leftReleased = 0;
	input.rightReleased = 0;
}

function recreateSprites() {
	let i;
	game.cakes = new Array();
	game.tourelles = new Array();
	game.caisses = new Array();
	game.tunnels = new Array();
	game.forceFields = new Array();
	game.platforms = new Array();
	game.perso = new Perso();
	game.perso.x = -(16 << 8);
	game.perso.fadeNextLevel = 0;
	
	for(i in game.map) {
		const y = i >> 5;
		const x = i - (y << 5);
		
		if(game.map[i] == 109) {//top tunnel
			game.tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, HAUT));
		}else if(game.map[i] == 110) {//bottom tunnel
			game.tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, BAS));
		}else if(game.map[i] == 107) {//right tunnel
			game.tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, DROITE));
		}else if(game.map[i] == 108) {//left tunnel
			game.tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, GAUCHE));
		}else if(game.map[i] == 103) {//cake
			game.cakes.push(new Cake((x*16) << 8, (y*16) << 8));
			continue;
		}else if(game.map[i] == 100) {//left turret
			game.tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, -1));
			continue;
		}else if(game.map[i] == 101) {//right turret
			game.tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, 1));
			continue;
		}else if(game.map[i] == 102) {//crate
			game.caisses.push(new Caisse((x*16) << 8, (y*16) << 8));
			continue;
		}else if(game.map[i] == 104) {//player start
			game.perso.x = (x * 16) << 8;
			game.perso.y = (y * 16) << 8;
			continue;
		}else if(game.map[i] == 105) {//platform
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, 128, 0));
			continue;
		}else if(game.map[i] == 106) {//platform
			game.platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, -128, 0));
			continue;
		}
	}
}

function drawSprites() {
	drawCakes();
	drawTourelles();
	drawCaisses();
	drawPlatformes();
	drawTunnels();
	drawPerso((game.perso.x >> 8) + game.ECART_X, (game.perso.y >> 8) + game.ECART_Y, 0);
}

function drawTileMap() {
	let y, x, haut, bas, gauche, droite, i;
	if(redrawTiles) {
		ctx.drawImage(bg[game.BG], game.ECART_X, game.ECART_Y, 512, 384);
		ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
		for(i in game.map) {
			if(game.map[i] == 20) {
				y = i >> 5;
				x = i - (y << 5);
				
				haut = isTileHere(x,y-1);
				bas = isTileHere(x,y+1);
				gauche = isTileHere(x-1,y);
				droite = isTileHere(x+1,y);
				
				if(haut + bas + gauche + droite < 3) {
					if(y-1 >= 0) ctx.fillRect(x*16 + game.ECART_X, (y-1)*16 + game.ECART_Y, 16, 16);
					if(y+1 < 24) ctx.fillRect(x*16 + game.ECART_X, (y+1)*16 + game.ECART_Y, 16, 16);
					if(x-1 >= 0) ctx.fillRect((x-1)*16 + game.ECART_X, y*16 + game.ECART_Y, 16, 16);
					if(x+1 < 32) ctx.fillRect((x+1)*16 + game.ECART_X, y*16 + game.ECART_Y, 16, 16);
				}
				
				break;
			}
		}
		
		for(i in game.map) {
			if(game.map[i] < NUM_TILES && game.map[i] > 0) {
				y = i >> 5;
				x = i - (y << 5);
				ctx.drawImage(tileset[game.map[i]], x*16 + game.ECART_X, y*16 + game.ECART_Y);
			}
		}
		recreateSprites();
		drawSprites();
		tilesBuff = copyCanvas(game.ECART_X, game.ECART_Y, 512, 384);
		redrawTiles = false;
	}else {
		drawCopy(tilesBuff, game.ECART_X, game.ECART_Y);
	}
}

function manageDrawSprite() {
	let i;
	if(mouseInZone(game.ECART_X, game.ECART_Y, 512, 384) && selectedSprite > 0) {
		let x = (input.mouseX >> 4) << 4;
		let y = (input.mouseY >> 4) << 4;
		if(selectedSprite == 1) ctx.drawImage(cake, x, y);
		else if(selectedSprite == 2) ctx.drawImage(caisse, x, y);
		else if(selectedSprite == 3) ctx.drawImage(tourelle[0], 0, 0, 16, 32, x, y, 16, 32);
		else if(selectedSprite == 4) ctx.drawImage(tourelle[1], 0, 0, 16, 32, x, y, 16, 32);
		else if(selectedSprite == 5) {//right platform
			ctx.drawImage(platform, x, y);
			ctx.fillStyle = "rgb(255, 0, 0)";
			ctx.strokeStyle = "rgb(255, 0, 0)";
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, 1);
		}
		else if(selectedSprite == 6) {//left platform
			ctx.drawImage(platform, x, y);
			ctx.fillStyle = "rgb(255, 0, 0)";
			ctx.strokeStyle = "rgb(255, 0, 0)";
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, -1);
		}
		else if(selectedSprite == 7) drawPerso(x, y, 0);
		else if(selectedSprite == 8) {//right tunnel
			ctx.drawImage(tunnel, 0, 0, 16, 32, x, y, 16, 32);
		}
		else if(selectedSprite == 9) {//left tunnel
			ctx.drawImage(tunnel, 0, 32, 16, 32, x, y, 16, 32);
		}else if(selectedSprite == 10) {//top tunnel
			ctx.drawImage(tunnel2, 0, 0, 32, 16, x, y, 32, 16);
		}else if(selectedSprite == 11) {//bottom tunnel
			ctx.drawImage(tunnel2, 32, 0, 32, 16, x, y, 32, 16);
		}
		
		if(input.mousePressed) {
			const arrEquiv = new Array();
			
			arrEquiv.push(103); // cake
			arrEquiv.push(102); // crate
			arrEquiv.push(100); // turret
			arrEquiv.push(101); // turret
			arrEquiv.push(105); // platform
			arrEquiv.push(106); // platform
			arrEquiv.push(104); // player
			arrEquiv.push(107); // tunnel
			arrEquiv.push(108); // tunnel
			arrEquiv.push(109); // tunnel
			arrEquiv.push(110); // tunnel
			
			x -= game.ECART_X; 
			y -= game.ECART_Y;
			const xt = x >> 4;
			const yt = y >> 4;
			
			const tile = ((y>>4)*32) + (x>>4);
			if(input.mouseButton == LEFT) {
				if(arrEquiv[selectedSprite - 1] == 104) {
					for(i in game.map) {
						if(game.map[i] == 104) game.map[i] = 0;
					}
				}
				
				eraseSprites(arrEquiv[selectedSprite - 1], xt, yt);
				
				
				if(allowTile(arrEquiv[selectedSprite - 1])) {
					game.map[tile] = arrEquiv[selectedSprite - 1];
				}
			}
			else if(input.mouseButton == RIGHT) {
				game.map[tile] = 0;
				eraseSprites(arrEquiv[selectedSprite - 1], xt, yt);
			}
			build();
			redrawTiles = true;
		} else if(input.mouseReleased) {
			input.mouseReleased = 0;
			addUndo();
			redrawTiles = true;
		}
	}
}

function allowTile(tile) {
	if(tile == 104) return true;

	if(tile == 103) { // cake
		return countTile(tile) < 30;
	}else if(tile == 102) { // crate
		return countTile(tile) < 15;
	}else if(tile == 100 || tile == 101) { // turret
		return countTile(100) + countTile(101) < 15;
	}else if(tile == 105 || tile == 106) { // platform
		return countTile(105) + countTile(106) < 8;
	}else if(tile >= 107 && tile <= 110) { // tunnel
		return countTile(107) + countTile(108) +  countTile(109) +  countTile(110) < 8;
	}
	
	return false;
}

function countTile(tile) {
	let i;
	let c = 0;
	for(i in game.map) {
		if(game.map[i] == tile) c++;
	}
	
	return c;
}

function eraseSprites(til, xt, yt) {
	let h, t;
	if(til == 105 || til == 106 || til == 109 || til == 110) { // sprite horizontal
		for(h = 1; h<3; h++) {
			if(h == 2 && til >= 109) continue;
			if(xt + h < 32) {
				game.map[yt*32 + xt + h] = 0;
				if(yt - 1 >= 0) {
					t = game.map[(yt-1)*32 + xt + h];
					if(t == 104 || t == 100 || t == 101 || (t >= 107 && t <= 110)) game.map[(yt-1)*32 + xt + h] = 0;
				}
			}
		}
	}
	if(til == 104 || til == 100 || til == 101 || til == 107 || til == 108) { // vertical sprite
		if(yt + 1 < 24) {
			game.map[(yt+1)*32 + xt] = 0;
			for(h = 1; h<3; h++) {
				if(xt - h >= 0) {
					t = game.map[(yt+1)*32 + xt - h];
					if(t == 105 || t == 106 || t == 109 || t == 110) game.map[(yt+1)*32 + xt - h] = 0;
				}
			}
		}
	}
	
	if(yt - 1 >= 0) {
		t = game.map[(yt-1)*32 + xt];
		if(t == 104 || t == 100 || t == 101 || (t >= 107 && t <= 110)) game.map[(yt-1)*32 + xt] = 0;
	}
	for(h = 1; h<3; h++) {
		if(xt - h >= 0) {
			t = game.map[yt*32 + xt - h];
			if(t == 105 || t == 106) game.map[yt*32 + xt - h] = 0;
			else if((t == 109 || t == 110) && h < 2) game.map[yt*32 + xt - h] = 0;
		}
	}
}

function manageDrawTile() {
	let i;
	if(mouseInZone(game.ECART_X, game.ECART_Y, 512, 384) && selectedTile > -1) {
		let x = (input.mouseX >> 4) << 4;
		let y = (input.mouseY >> 4) << 4;
		ctx.drawImage(tileset[tilesToDraw[selectedTile]], x, y);
		ctx.strokeStyle = "rgb(255, 0, 0)";
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, 16, 16);
		
		if(input.mousePressed) {
			x -= game.ECART_X;
			y -= game.ECART_Y; 
			const tile = ((y>>4)*32) + (x>>4);
			if(input.mouseButton == LEFT) {
				if(tilesToDraw[selectedTile] == 20) {
					for(i in game.map) {	
						if(game.map[i] == 20) {
							game.map[i] = 0;
							break;
						}
					}
				}
				game.map[tile] = tilesToDraw[selectedTile];
			}
			else if(input.mouseButton == RIGHT) game.map[tile] = 0;
			else if(input.mouseButton == MIDDLE) fill(tilesToDraw[selectedTile], game.map[tile], x >> 4, y >> 4);
			
			const xt = x >> 4;
			const yt = y >> 4;
			
			if(yt - 1 >= 0) {
				const t = game.map[(yt-1)*32 + xt];
				if(t == 104 || t == 100 || t == 101 || (t >= 107 && t <= 110)) game.map[(yt-1)*32 + xt] = 0;
			}
			
			build();
			redrawTiles = true;
		}else if(input.mouseReleased) {
			input.mouseReleased = 0;
			addUndo();
		}
	}
}

function addUndo() {
	let i;
	if(undoIndex == 10) {
		undoMap.splice(0, 1);
		undoIndex--;
	}
	undoIndex++;
	undoMap[undoIndex] = new Array();
	for(i=0; i<768; i++) undoMap[undoIndex].push(game.map[i]);
	
	if(undoIndex < undoMap.length - 1) {
		const r = undoMap.length - 1 - undoIndex;
		for(i=0; i<r; i++) undoMap.pop();
	}
}

function manageSpriteSelection() {
	let x, y, inZone;
	if(mouseInZone(580, 140, 56, 216)) {
		x = 584;
		y = 142;
		inZone = 0;
		ctx.fillStyle = "rgb(255, 0, 0)";
		if(mouseInZone(x, y, 16, 16)) {//cake
			inZone = 1;
			ctx.fillRect(x - 2, y - 2, 20, 20);
		}else if(mouseInZone(x + 24, y, 16, 16)) {//crate
			inZone = 2;
			ctx.fillRect(x + 24 - 2, y - 2, 20, 20);
		}else if(mouseInZone(x, y + 24, 16, 32)) {//left turret
			inZone = 3;
			ctx.fillRect(x - 2, y + 24 - 2, 20, 36);
		}else if(mouseInZone(x + 24, y + 24, 16, 32)) {//right turret
			inZone = 4;
			ctx.fillRect(x + 24 - 2, y + 24 - 2, 20, 36);
		}else if(mouseInZone(x, y + 24 + 40, 48, 16)) {//left platform
			inZone = 5;
			ctx.fillRect(x - 2, y + 24 + 40 - 2, 52, 20);
		}else if(mouseInZone(x, y + 24 + 40 + 24, 48, 16)) {//right platform
			inZone = 6;
			ctx.fillRect(x - 2, y + 24 + 40 + 24 - 2, 52, 20);
		}else if(mouseInZone(x, y + 24 + 40 + 24 + 24, 16, 26)) {//player
			inZone = 7;
			ctx.fillRect(x - 2, y + 24 + 40 + 24 + 24 - 2, 20, 30);
		}else if(mouseInZone(x, y + 144, 16, 32)) {//right tunnel
			inZone = 8;
			ctx.fillRect(x - 2, y + 142, 20, 36);
		}else if(mouseInZone(x + 24, y + 144, 16, 32)) {//right tunnel
			inZone = 9;
			ctx.fillRect(x + 22, y + 142, 20, 36);
		}else if(mouseInZone(x, y + 180, 32, 16)) {//top tunnel
			inZone = 10;
			ctx.fillRect(x - 2, y + 178, 36, 20);
		}else if(mouseInZone(x, y + 200, 32, 16)) {//bottom tunnel
			inZone = 11;
			ctx.fillRect(x - 2, y + 198, 36, 20);
		}
		
		if(input.mouseNewPress) {
			unclick();
			selectedSprite =  inZone;
			selectedTile = -1;
		}
	}else if(mouseInZone(0, 400, 62, 48)) {
		ctx.fillStyle = "rgb(3, 108, 134)";
		if(mouseInZone(3, 412, 27, 47)) {
			inZone = 100;
			ctx.fillRect(3, 412, 27, 47);
		}else if(mouseInZone(32, 412, 27, 47)) {
			inZone = 101;
			ctx.fillRect(32, 412, 27, 47);
		}
		
		if(input.mouseNewPress) {
			unclick();
			if(inZone == 100) {
				game.BG--;
				redrawTiles = true;
				if(game.BG < 0) game.BG = bg.length - 1;
			} else if(inZone == 101) {
				game.BG++;
				redrawTiles++;
				if(game.BG == bg.length) game.BG = 0;
			}
		}
	}
	
	if(selectedSprite > 0) {
		x = 584;
		y = 142;
		ctx.fillStyle = "rgb(0, 255, 0)";
		if(selectedSprite == 1) ctx.fillRect(x - 2, y - 2, 20, 20);
		else if(selectedSprite == 2) ctx.fillRect(x + 24 - 2, y - 2, 20, 20);
		else if(selectedSprite == 3) ctx.fillRect(x - 2, y + 24 - 2, 20, 36);
		else if(selectedSprite == 4) ctx.fillRect(x + 24 - 2, y + 24 - 2, 20, 36);
		else if(selectedSprite == 5) ctx.fillRect(x - 2, y + 24 + 40 - 2, 52, 20);
		else if(selectedSprite == 6) ctx.fillRect(x - 2, y + 24 + 40 + 24 - 2, 52, 20);
		else if(selectedSprite == 7) ctx.fillRect(x - 2, y + 24 + 40 + 24 + 24 - 2, 20, 30);
		else if(selectedSprite == 8) ctx.fillRect(x - 2, y + 142, 20, 36);
		else if(selectedSprite == 9) ctx.fillRect(x + 22, y + 142, 20, 36);
		else if(selectedSprite == 10) ctx.fillRect(x - 2, y + 178, 36, 20);
		else if(selectedSprite == 11) ctx.fillRect(x - 2, y + 198, 36, 20);
	}
}

function manageTileSelection() {
	
	let x, y;
	if(mouseInZone(4, 140, 56, 118)) {
		x = input.mouseX;
		y = input.mouseY;
		
		x = (parseInt(x / 20) * 20) + 2;
		y = (parseInt(y / 20) * 20) - 4;
		ctx.fillStyle = "rgb(255, 0, 0)";
		ctx.fillRect(x, y, 20, 20);
		
		if(input.mouseNewPress) {
			unclick();
			selectedSprite = -1;
			const xt = parseInt(x / 20);
			const yt = parseInt((y - 136) / 20);
			selectedTile =  xt + yt * 3;
		}
	}
	
	if(selectedTile > -1) {
		ctx.fillStyle = "rgb(0, 255, 0)";
		
		x = (selectedTile%3) * 20 + 2;
		y = parseInt(selectedTile/3) * 20 + 136;
		
		ctx.fillRect(x, y, 20, 20);
	}
}

function drawRightSprites() {
	const x = 584;
	const y = 142;
	
	ctx.drawImage(cake, x, y);
	ctx.drawImage(caisse, x + 24, y);
	ctx.drawImage(tourelle[0], 0, 0, 16, 32,x, y + 24, 16, 32);
	ctx.drawImage(tourelle[1], 0, 0, 16, 32,x + 24, y + 24, 16, 32);
	
	ctx.fillStyle = "rgb(255, 0, 0)";
	ctx.strokeStyle = "rgb(255, 0, 0)";
	
	ctx.drawImage(platform, x, y + 24 + 40);
	drawArrow(x + 5, y + 72, x + 15, y + 72, 3, 1);
	ctx.drawImage(platform, x, y + 88);
	drawArrow(x + 5, y + 96, x + 14, y + 96, 3, -1);
	
	drawPerso(x, y + 112, 0);
	
	ctx.drawImage(tunnel, 0, 0, 16, 32, x, y + 144, 16, 32);
	ctx.drawImage(tunnel, 0, 32, 16, 32, x + 24, y + 144, 16, 32);
	
	ctx.drawImage(tunnel2, 0, 0, 32, 16, x, y + 180, 32, 16);
	ctx.drawImage(tunnel2, 32, 0, 32, 16, x, y + 200, 32, 16);
}

function drawLeftTiles() {
	let i;
	let x = 4;
	let y = 138;
	
	for(i in tilesToDraw) {
		ctx.drawImage(tileset[tilesToDraw[i]], x, y);
		x += 20;
		if(x > 44) {
			x = 4;
			y += 20;
		}
		if(i == selectedTile) ctx.drawImage(tileset[tilesToDraw[i]], 14, 315, 36, 36);
	}
	
	ctx.drawImage(tex_leftBG, 3, 412);
	ctx.drawImage(tex_rightBG, 32, 412);
}

function build() {
	let haut, bas, gauche, droite, i;
	for(i=0;i<768;i++){
		/*if(map[i]==13){
			var y = (i/32);
			var x = i - y*32;
			if(y<23){
				var j;
				for(j=y+1;j<24;j++){
					if(mapColl[j*32+x]==0||mapColl[j*32+x]==13){
						mapColl[j*32+x] = 18;
						map[j*32+x] = 47;
					}else j = 24;
				}
			}
		}*/
		
		if(isTileMurBleu(i)){
			const y = i >> 5;
			const x = i - (y<<5);
			
			haut = isTileHere(x,y-1);
			bas = isTileHere(x,y+1);
			gauche = isTileHere(x-1,y);
			droite = isTileHere(x+1,y);
			
			if(haut && bas && gauche && !droite){
				game.map[x+y*32] = 4;
			}else if(haut && bas && !gauche && droite){
				game.map[x+y*32] = 2;
			}else if(haut && !bas && droite && gauche){
				game.map[x+y*32] = 5;
			}else if(!haut && bas && droite && gauche){
				game.map[x+y*32] = 3;
			}else if(!haut && bas && droite && !gauche){
				game.map[x+y*32] = 8;
			}else if(!haut && bas && !droite && gauche){
				game.map[x+y*32] = 9;
			}else if(haut && !bas && !droite && gauche){
				game.map[x+y*32] = 6;
			}else if(haut && !bas && droite && !gauche){
				game.map[x+y*32] = 7;
			}else if(haut && bas && droite && gauche){
				game.map[x+y*32] = 1;
			}else if(haut && bas && !droite && !gauche){
				game.map[x+y*32] = 11;
			}else if(!haut && !bas && droite && gauche){
				game.map[x+y*32] = 10;
			}else if(haut && !bas && !droite && !gauche){
				game.map[x+y*32] = 12;
			}else if(!haut && bas && !droite && !gauche){
				game.map[x+y*32] = 13;
			}else if(!haut && !bas && !droite && gauche){
				game.map[x+y*32] = 14;
			}else if(!haut && !bas && droite && !gauche){
				game.map[x+y*32] = 15;
			}else if(!haut && !bas && !droite && !gauche){
				game.map[x+y*32] = 16;
			}
		}
	}
}

function fill(tile, toFill, x, y){
	let j, k, i;
	const tmpMap = new Array();
	for(i=0;i<768;i++){
		tmpMap.push(-1);
	}

	let tileCourant = 0;
	let tTile = 1;
	tmpMap[tileCourant] = x+(y<<5);

	while(tileCourant<768 && tmpMap[tileCourant]!=-1){
		const t = tmpMap[tileCourant];
		y = (t>>5);
		x = t - (y<<5);
		game.map[x+(y<<5)] = tile;
		if(x<31 && game.map[x+1+(y<<5)] == toFill){
			j = true;
			for(k=0;k<tTile;k++){
				if(tmpMap[k]==x+1+(y<<5)) j = false;
			}
			if(j) tmpMap[tTile++] = x+1+(y<<5);
		}
		if(x>0 && game.map[x-1+(y<<5)] == toFill){
			j = true;
			for(k=0;k<tTile;k++){
				if(tmpMap[k]==x-1+(y<<5)) j = false;
			}
			if(j) tmpMap[tTile++] = x-1+(y<<5);
		}
		if(y<23 && game.map[x+((y+1)<<5)] == toFill){
			j = true;
			for(k=0;k<tTile;k++){
				if(tmpMap[k]==x+((y+1)<<5)) j = false;
			}
			if(j) tmpMap[tTile++] = x+((y+1)<<5);
		}
		if(y>0 && game.map[x+((y-1)<<5)] == toFill){
			j = true;
			for(k=0;k<tTile;k++){
				if(tmpMap[k]==x+((y-1)<<5)) j = false;
			}
			if(j) tmpMap[tTile++] = x+((y-1)<<5);
		}
		tileCourant++;
	}
}

function isTileMurBleu(index){
	let i;
	for(i=1;i<17;i++){
		if(game.map[index]==i) return true;
	}
	return false;
}

function isTileHere(x, y){
	if(x<0||x>31||y<0||y>23) return 1;
	if(game.map[x+y*32] >= 54 && game.map[x+y*32] <= 57) return 1;
	let i;
	for(i=1;i<19;i++){
		if(game.map[x+y*32]==i) return 1
	}
	return 0;
}
