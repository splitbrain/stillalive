var selectedTile, selectedSprite;
var tilesToDraw;
var redrawTiles;
var tilesBuff;
var undoMap;
var undoIndex;

var leftReleased, rightReleased;
var oldMouseReleased = 0;
var isTestingLevel;
var oldMap;
var askLoading, askSaving;

var NBCAISSES = 15;
var NBCAKE = 30;
var NBTOURELLE = 15;

var canBeUploaded = false;

function startPlayingLevel() {
	isTestingLevel = true;
	oldMap = new Array();
	for(i in map) oldMap.push(map[i]);
	loadLevelEditor();
	perso.fadeNextLevel = -1;
	onlineTime = 0;
	prepareLvlEditorPlayTxt();
}

function stopPlayingLevel() {
	portals = new Array();
	portals.push(new Portal());portals.push(new Portal());
	unclick();
	isTestingLevel = false;
	map = new Array();
	for(i in oldMap) map.push(oldMap[i]);
	redrawTiles = true;
	drawTileMap();
	prepareLvlEditorTxt();
}

function levelEditorTestLevel() {
	needRedrawTiles = 0;
	TIME++;
	if(!perso.mort && perso.fadeNextLevel == -1) {
		perso.move();
		if(needRedrawTiles == 0) needRedrawTiles = dansUnPortal(perso);
	}
	
	gestionPorte();
	drawTestLevel();
	drawText(70, 38, 11);
}

function drawTestLevel() {
	if(needLoad) createBuff();
	ctx.putImageData(imgBuff, ECART_X, ECART_Y);
	
	if(quality > 0) animateTiles();
	
	perso.flip = mouseX > (perso.x >> 8) + (perso.pX >> 1) + ECART_X ? perso.flip = 1 : perso.flip = -1;
	
	var a = getAngle((perso.x>>8) + (perso.pX>>1) + ECART_X, (perso.y>>8) + (perso.pY>>1) + ECART_Y, mouseX, mouseY);
	ctx.save();
	ctx.translate((perso.x>>8) + (perso.pX>>1) + ECART_X, (perso.y>>8) + (perso.pY>>1) + ECART_Y);
	ctx.rotate(a);
	ctx.drawImage(portalGun, -5, -5);
	ctx.restore();
	
	drawTunnels();

	var flipDx =  perso.flip < 0 ? 1 : 0;
	// image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
	ctx.drawImage(head[flipDx], perso.animeFrame * 16, 0, 15, 12, ((perso.x>>8) + ECART_X), (perso.y>>8) + ECART_Y, 16, 12); 
	ctx.drawImage(body[flipDx], perso.animeFrame * 16, 0, 16, 27, ((perso.x>>8) + ECART_X), (perso.y>>8) + ECART_Y, 16, 27);
	
	drawCakes();
	drawTourelles();
	drawPlasma();
	
	manageSparkles();

	drawCaisses();
	drawPlatformes();
	
	drawFrontTiles();
	drawPortals();
	drawLowQualityPortals();
	
	if(perso.mort) {
		stopPlayingLevel();
		return;
	}

	ctx.drawImage(levelEditorHud, 0, 0);
	
	drawLeftTiles();
	drawRightSprites();
	
	ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
}

function lvlEditorSetup() {
	BG = 0;
	askLoading = false;
	askSaving = false;
	bossNum = 0;

	map = new Array();
	displayMap = new Array();
	for(i=0; i<768; i++) {
		map.push(0);
		displayMap.push(0);
	}
	
	undoMap = new Array();
	undoIndex = -1;
	addUndo();
	
	tilesToDraw = new Array();
	tilesToDraw.push(0);
	tilesToDraw.push(1);
	for(var i=17; i<24; i++) tilesToDraw.push(i);
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
	
	perso = new Perso();
	perso.x = -(16 << 8);
	perso.y = 0;
	
	prepareLvlEditorTxt();
}

function prepareLvlEditorTxt() {
	timeWriting = 0;
	txtLines = new Array();
	
	txtLines.push("Welcome to the StillAliveJS Level Editor ! Here is a place where you can easily");
	txtLines.push("create and share your creations with the entire world. You can use your mouse to");	
	txtLines.push("select tiles or object and draw them on the screen. Then, try out your map and");
	txtLines.push("if you finish it, you have the possibility to send it to the server. Have Fun !");
}

function prepareLvlEditorPlayTxt() {
	timeWriting = 0;
	txtLines = new Array();
	
	txtLines.push("Don't forget to reach the finish line if you want to be able to upload your map.");
	txtLines.push('');
	txtLines.push("Press <Enter> or <Escape> key to stop testing.");	
}

function drawLevelEditor() {
	if(isTestingLevel) {
		levelEditorTestLevel();
		if(finNiveau()) {
			stopPlayingLevel();
			canBeUploaded = true;
			onlineTime = TIME;
		}
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
	if(previewMap < 1 || localStorage.getItem('sajs_customLevel' + (previewMap)) == null) ctx.drawImage(noLevel, ECART_X, ECART_Y);
	else if(previewMap > 0) drawPreviewMap();	
	ctx.drawImage(mapSelection, 0, 0);
	
	if(mouseInZone(529, 117, 90, 29 * 12)) {
		var y = parseInt((mouseY - 105)/12);
		if(y <= 28) {
			ctx.fillStyle = "rgb(15, 112, 144)";
			//noStroke();
			ctx.fillRect(529, 105 + (y * 12) + 2, 90, 14);
			
			if(mouseNewPress && y != previewMap) {
				unclick();
				previewMap = y;
				if(localStorage.getItem('sajs_customLevel' + (y)) != null) {
					var msg = localStorage.getItem('sajs_customLevel' + (y));
					map = new Array();
					var tmp = msg.split(',', 768);
					for(j in tmp) map.push(parseInt(tmp[j]));
					loadPreviewMap(-1);
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

		drawTinyButton(515, 495, scale1, "Save");
	}
	
	if(mouseNewPress && overMenu > 0) {
		unclick();
		if(overMenu == 1) {//save
			localStorage.setItem('sajs_customLevel' + previewMap, oldMap);
			
			map = new Array();
			for(i in oldMap) map.push(oldMap[i]);
			askSaving = false;
			redrawTiles = true;
			ECART_X = 64;
			ECART_Y = 96;
			return;
		}else if(overMenu == 2) {//exit
			ECART_X = 64;
			ECART_Y = 96;
			askSaving = false;
		
			map = new Array();
			for(i in oldMap) map.push(oldMap[i]);
			redrawTiles = true;
			return;
		}
	}
	
	ctx.font = "bold 12px Arial";
	for(i=0; i<28;i++) {
		ctx.strokeStyle = "rgb(0, 0, 0)";
		if(localStorage.getItem('sajs_customLevel' + (i+1)) != null) {
			ctx.fillStyle = "rgb(255, 255, 255)";
		}else {
			ctx.fillStyle = "rgb(200, 200, 200)";
		}
		ctx.fillText("Level " + (i + 1),549, 105 + 24 + (i * 12));
	}
	
	ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
}

function menuLoadMap() {
	if(previewMap < 1) ctx.drawImage(noLevel, ECART_X, ECART_Y);
	if(previewMap > 0) drawPreviewMap();			
	ctx.drawImage(mapSelection, 0, 0);
	
	if(mouseInZone(529, 117, 90, 29 * 12)) {
		var y = parseInt((mouseY - 105)/12);
		if(y <= 28 && localStorage.getItem('sajs_customLevel' + (y)) != null) {
			ctx.fillStyle = "rgb(15, 112, 144)";
			//noStroke();
			ctx.fillRect(529, 105 + (y * 12) + 2, 90, 14);
			
			if(mouseNewPress && y != previewMap) {
				unclick();
				previewMap = y;
				var msg = localStorage.getItem('sajs_customLevel' + (y));
				map = new Array();
				var tmp = msg.split(',', 768);
				for(j in tmp) map.push(parseInt(tmp[j]));
				loadPreviewMap(-1);
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

		drawTinyButton(515, 495, scale1, "Load");
	}
	
	if(mouseNewPress && overMenu > 0) {
		unclick();
		if(overMenu == 1) {//load
			askLoading = false;
			redrawTiles = true;
			ECART_X = 64;
			ECART_Y = 96;
			
			undoMap = new Array();
			undoIndex = -1;
			addUndo();
			return;
		}else if(overMenu == 2) {//exit
			ECART_X = 64;
			ECART_Y = 96;
		
			map = new Array();
			for(i in oldMap) map.push(oldMap[i]);
			askLoading = false;
			redrawTiles = true;
			return;
		}
	}
	
	ctx.font = "bold 12px Arial";
	for(i=0; i<28;i++) {
		ctx.strokeStyle = "rgb(0, 0, 0)";
		if(localStorage.getItem('sajs_customLevel' + (i+1)) != null) {
			ctx.fillStyle = "rgb(255, 255, 255)";
		}else {
			ctx.fillStyle = "rgb(200, 200, 200)";
		}
		ctx.fillText("Level " + (i + 1),549, 105 + 24 + (i * 12));
	}
	
	ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
}

var msgTimer = -1;
var lvlEditorMsg = "";
var onlineTime;

function manageEditor() {
	drawTileMap();
	manageDrawTile();
	manageDrawSprite();
	manageUndoRedo();
	
	ctx.drawImage(levelEditorHud, 0, 0);
	manageTileSelection();
	manageSpriteSelection();
	drawLeftTiles();
	drawRightSprites();
	
	if(oldMouseReleased == 1 && mouseReleased == 1) mouseReleased = 0;
	oldMouseReleased = mouseReleased;
	
	var overMenu = -1;
	if(mouseInZone(ECART_X + 512 - 250, ECART_Y + 394, 120, 24)) overMenu = 1;
	else if(mouseInZone(ECART_X + 512 - 120, ECART_Y + 394, 120, 24)) overMenu = 2;
	else if(mouseInZone(ECART_X, ECART_Y + 394, 120, 24)) overMenu = 3;
	else if(mouseInZone(ECART_X + 130, ECART_Y + 394, 120, 24)) overMenu = 4;
	else if(mouseInZone(ECART_X + 60, ECART_Y + 420, 120, 24)) overMenu = 5;
	else if(mouseInZone(ECART_X + 60 + 130, ECART_Y + 420, 120, 24)) overMenu = 6;
	else if(canBeUploaded && mouseInZone(ECART_X + 60 + 260, ECART_Y + 420, 120, 24)) overMenu = 7;
	
	var scale1 = overMenu == 1 ? 0.9 : 1;
	var scale2 = overMenu == 2 ? 0.9 : 1;
	var scale3 = overMenu == 3 ? 0.9 : 1;
	var scale4 = overMenu == 4 ? 0.9 : 1;
	var scale5 = overMenu == 5 ? 0.9 : 1;
	var scale6 = overMenu == 6 ? 0.9 : 1;
	var scale7 = overMenu == 7 ? 0.9 : 1;
	
	drawTinyButton(ECART_X, ECART_Y + 394, scale3, "Exit");
	drawTinyButton(ECART_X + 512 - 250, ECART_Y + 394, scale1, "Load");
	drawTinyButton(ECART_X + 512 - 120, ECART_Y + 394, scale2, "Save");
	drawTinyButton(ECART_X + 130, ECART_Y + 394, scale4, "Clear");
	drawTinyButton(ECART_X + 60, ECART_Y + 420, scale5, "Try Map");
	drawTinyButton(ECART_X + 60 + 130, ECART_Y + 420, scale6, "Help");
		
	if(canBeUploaded) {
		drawTinyButton(ECART_X + 60 + 260, ECART_Y + 420, scale7, "Upload");
	}
	
	drawText(70, 38, 11);
	
	if(!mouseInZone(ECART_X, ECART_Y, 512, 384)) ctx.drawImage(crosshair, mouseX - 8, mouseY - 8, 16, 16);
	
	if(overMenu > 0 && mouseNewPress) {
		unclick();
		if(overMenu == 5) {//try map
			startPlayingLevel();
		}else if(overMenu == 6) {//help
			jAlert("Left click : Put tile or object\r\n" + 
					"Right click : Remove tile or object\r\n" +
					"Middle click : Fill\r\n" + 
					"ctrl + z : Undo\r\n" + 
					"ctrl + y : Redo\r\n" + 
					"Return : Try Map / Stop trying\r\n" +
					"Escape : Stop trying\r\n"
					,"Level Editor Shortcuts");
		}else if(overMenu == 2) {//save
			askSaving = true;
			previewMap = -1;
			ECART_X = 0;
			ECART_Y = 96;
			oldMap = new Array();
			for(i in map) oldMap.push(map[i]);
		}else if(overMenu == 1) {//load
			askLoading = true;
			previewMap = -1;
			ECART_X = 0;
			ECART_Y = 96;
			oldMap = new Array();
			for(i in map) oldMap.push(map[i]);
		}else if(overMenu == 4) {//clear
			for(i in map) map[i] = 0;
			/*undoMap = new Array();
			undoIndex = -1;*/
			addUndo();
			redrawTiles = true;
		}else if(overMenu == 3) {//exit
			currentMenu = 1;
			sparkles = new Array();
			fadeMenu = 30;
		}else if(canBeUploaded && overMenu == 7) {//upload
			jPrompt('Enter Map Name', '', 'StillAliveJS', function(r) {
				if( r ) {
					var mapName = '' + r;
					var reg = new RegExp(/^[\w]{4,15}$/g);
					if(mapName.length < 4 || mapName.length > 15) {
						jAlert('Map name must be between 4 and 15 characters long', 'Error');
						error = true;
						/*lvlEditorMsg = "Error : Map name must be between 4 and 15 characters long";
						msgTimer = -1;*/
					}else if(!reg.test(mapName)){
						jAlert('Wrong map name. Accepted characters : a to z, 0 to 9 and _', 'Error');
						error = true;
						/*lvlEditorMsg = 'Error : Wrong map name. Accepted characters : a to z, 0 to 9 and _';
						msgTimer = -1;*/
					} else {
						$.ajax({
							type: "POST",
							url: AJAX_URL,
							async: false,
							cache: false,
							data: "function=uploadMap&time=" + onlineTime + "&nick=" + USR_NICK + "&pwd=" + USR_PWD + "&mapName=" + mapName + "&map=" + map + "," + BG,
							success: function(shmsg) {
								var message = jQuery.parseJSON(shmsg);
								jAlert(message.msg, 'Server Message');
								/*lvlEditorMsg = message.msg;
								msgTimer = -1;*/
							}
						});
					}
				}
			});
		}
	}
	
	/*if(lvlEditorMsg != "") {
		if(msgTimer == -1) msgTimer = 300;
		else msgTimer--;
		
		if(msgTimer == 0) {
			lvlEditorMsg = "";
		}
		
		var a = parseFloat(msgTimer) / parseFloat(300);
		ctx.globalAlpha = a;
		ctx.fillStyle = "rgb(255, 0, 0)";
		ctx.font = "bold 15px serif";
		ctx.fillText(lvlEditorMsg, 110, 58);
		
		ctx.globalAlpha = 1;
	}*/
}

function manageUndoRedo() {
	if(leftReleased && undoIndex > 0) {
		canBeUploaded = false;
		map = new Array();
		undoIndex--;
		for(i=0; i<768; i++) map.push(undoMap[undoIndex][i]);
		redrawTiles = true;
	}else if(rightReleased && undoIndex + 1 < undoMap.length) {
		canBeUploaded = false;
		undoIndex++;
		map = new Array();
		for(i=0; i<768; i++) map.push(undoMap[undoIndex][i]);
		redrawTiles = true;
	}
	leftReleased = 0;
	rightReleased = 0;
}

function recreateSprites() {
	cakes = new Array();
	tourelles = new Array();
	caisses = new Array();
	tunnels = new Array();
	forceFields = new Array();
	platforms = new Array();
	perso = new Perso();
	perso.x = -(16 << 8);
	perso.fadeNextLevel = 0;
	
	for(i in map) {
		var y = i >> 5;
		var x = i - (y << 5);
		
		if(map[i] == 109) {//tunnel haut
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, HAUT));
		}else if(map[i] == 110) {//tunnel bas
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, BAS));
		}else if(map[i] == 107) {//tunnel droite
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, DROITE));
		}else if(map[i] == 108) {//tunnel gauche
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, GAUCHE));
		}else if(map[i] == 103) {//cake
			cakes.push(new Cake((x*16) << 8, (y*16) << 8));
			continue;
		}else if(map[i] == 100) {//tourelle gauche
			tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, -1));
			continue;
		}else if(map[i] == 101) {//tourelle droite
			tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, 1));
			continue;
		}else if(map[i] == 102) {//caisse
			caisses.push(new Caisse((x*16) << 8, (y*16) << 8));
			continue;
		}else if(map[i] == 104) {//perso start
			perso.x = (x * 16) << 8;
			perso.y = (y * 16) << 8;
			continue;
		}else if(map[i] == 105) {//plateforme
			platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, 128, 0));
			continue;
		}else if(map[i] == 106) {//plateforme
			platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, -128, 0));
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
	drawPerso((perso.x >> 8) + ECART_X, (perso.y >> 8) + ECART_Y, 0);
}

function drawTileMap() {
	if(redrawTiles) {
		ctx.drawImage(bg[BG], ECART_X, ECART_Y, 512, 384);
		ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
		for(i in map) {
			if(map[i] == 20) {
				var y = i >> 5;
				var x = i - (y << 5);
				
				var haut,bas,gauche,droite;
				haut = isTileHere(x,y-1);
				bas = isTileHere(x,y+1);
				gauche = isTileHere(x-1,y);
				droite = isTileHere(x+1,y);
				
				if(haut + bas + gauche + droite < 3) {
					if(y-1 >= 0) ctx.fillRect(x*16 + ECART_X, (y-1)*16 + ECART_Y, 16, 16);
					if(y+1 < 24) ctx.fillRect(x*16 + ECART_X, (y+1)*16 + ECART_Y, 16, 16);
					if(x-1 >= 0) ctx.fillRect((x-1)*16 + ECART_X, y*16 + ECART_Y, 16, 16);
					if(x+1 < 32) ctx.fillRect((x+1)*16 + ECART_X, y*16 + ECART_Y, 16, 16);
				}
				
				break;
			}
		}
		
		for(i in map) {
			if(map[i] < NUM_TILES && map[i] > 0) {
				var y = i >> 5;
				var x = i - (y << 5);
				ctx.drawImage(tileset[map[i]], x*16 + ECART_X, y*16 + ECART_Y);
			}
		}
		recreateSprites();
		drawSprites();
		tilesBuff = ctx.getImageData(ECART_X, ECART_Y, 512, 384);
		redrawTiles = false;
	}else {
		ctx.putImageData(tilesBuff, ECART_X, ECART_Y);
	}
}

function manageDrawSprite() {
	if(mouseInZone(ECART_X, ECART_Y, 512, 384) && selectedSprite > 0) {
		var x = (mouseX >> 4) << 4;
		var y = (mouseY >> 4) << 4;
		if(selectedSprite == 1) ctx.drawImage(cake, x, y);
		else if(selectedSprite == 2) ctx.drawImage(caisse, x, y);
		else if(selectedSprite == 3) ctx.drawImage(tourelle[0], 0, 0, 16, 32, x, y, 16, 32);
		else if(selectedSprite == 4) ctx.drawImage(tourelle[1], 0, 0, 16, 32, x, y, 16, 32);
		else if(selectedSprite == 5) {//platforme droite
			ctx.drawImage(platform, x, y);
			ctx.fillStyle = "rgb(255, 0, 0)";
			ctx.strokeStyle = "rgb(255, 0, 0)";
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, 1);
		}
		else if(selectedSprite == 6) {//platforme gauche
			ctx.drawImage(platform, x, y);
			ctx.fillStyle = "rgb(255, 0, 0)";
			ctx.strokeStyle = "rgb(255, 0, 0)";
			drawArrow(x + 5, y + 8, x + 15, y + 8, 3, -1);
		}
		else if(selectedSprite == 7) drawPerso(x, y, 0);
		else if(selectedSprite == 8) {//tunnel droite
			ctx.drawImage(tunnel, 0, 0, 16, 32, x, y, 16, 32);
		}
		else if(selectedSprite == 9) {//tunnel gauche
			ctx.drawImage(tunnel, 0, 32, 16, 32, x, y, 16, 32);
		}else if(selectedSprite == 10) {//tunnel haut
			ctx.drawImage(tunnel2, 0, 0, 32, 16, x, y, 32, 16);
		}else if(selectedSprite == 11) {//tunnel bas
			ctx.drawImage(tunnel2, 32, 0, 32, 16, x, y, 32, 16);
		}
		
		if(mousePressed) {
			var arrEquiv = new Array();
			
			arrEquiv.push(103); // cake
			arrEquiv.push(102); // caisse
			arrEquiv.push(100); // tourelle
			arrEquiv.push(101); // tourelle
			arrEquiv.push(105); // platforme
			arrEquiv.push(106); // platforme
			arrEquiv.push(104); // perso
			arrEquiv.push(107); // tunnel
			arrEquiv.push(108); // tunnel
			arrEquiv.push(109); // tunnel
			arrEquiv.push(110); // tunnel
			
			x -= ECART_X; 
			y -= ECART_Y;
			var xt = x >> 4;
			var yt = y >> 4;
			
			var tile = ((y>>4)*32) + (x>>4);
			if(mouseButton == LEFT) {
				if(arrEquiv[selectedSprite - 1] == 104) {
					for(i in map) {
						if(map[i] == 104) map[i] = 0;
					}
				}
				
				eraseSprites(arrEquiv[selectedSprite - 1], xt, yt);
				
				
				if(allowTile(arrEquiv[selectedSprite - 1])) {
					map[tile] = arrEquiv[selectedSprite - 1];
				}
			}
			else if(mouseButton == RIGHT) {
				map[tile] = 0;
				eraseSprites(arrEquiv[selectedSprite - 1], xt, yt);
			}
			build();
			redrawTiles = true;
		} else if(mouseReleased) {
			mouseReleased = 0;
			addUndo();
			redrawTiles = true;
		}
	}
}

function allowTile(tile) {
	if(tile == 104) return true;

	if(tile == 103) { // cake
		return countTile(tile) < 30;
	}else if(tile == 102) { // caisse
		return countTile(tile) < 15;
	}else if(tile == 100 || tile == 101) { // tourelle
		return countTile(100) + countTile(101) < 15;
	}else if(tile == 105 || tile == 106) { // platforme
		return countTile(105) + countTile(106) < 8;
	}else if(tile >= 107 && tile <= 110) { // platforme
		return countTile(107) + countTile(108) +  countTile(109) +  countTile(110) < 8;
	}
	
	return false;
}

function countTile(tile) {
	var c = 0;
	for(i in map) {
		if(map[i] == tile) c++;
	}
	
	return c;
}

function eraseSprites(til, xt, yt) {
	if(til == 105 || til == 106 || til == 109 || til == 110) { // sprite horizontal
		for(var h = 1; h<3; h++) {
			if(h == 2 && til >= 109) continue;
			if(xt + h < 32) {
				map[yt*32 + xt + h] = 0;
				if(yt - 1 >= 0) {
					var t = map[(yt-1)*32 + xt + h];
					if(t == 104 || t == 100 || t == 101 || (t >= 107 && t <= 110)) map[(yt-1)*32 + xt + h] = 0;
				}
			}
		}
	}
	if(til == 104 || til == 100 || til == 101 || til == 107 || til == 108) { // sprite verical
		if(yt + 1 < 24) {
			map[(yt+1)*32 + xt] = 0;
			for(var h = 1; h<3; h++) {
				if(xt - h >= 0) {
					var t = map[(yt+1)*32 + xt - h];
					if(t == 105 || t == 106 || t == 109 || t == 110) map[(yt+1)*32 + xt - h] = 0;
				}
			}
		}
	}
	
	if(yt - 1 >= 0) {
		var t = map[(yt-1)*32 + xt];
		if(t == 104 || t == 100 || t == 101 || (t >= 107 && t <= 110)) map[(yt-1)*32 + xt] = 0;
	}
	for(var h = 1; h<3; h++) {
		if(xt - h >= 0) {
			var t = map[yt*32 + xt - h];
			if(t == 105 || t == 106) map[yt*32 + xt - h] = 0;
			else if((t == 109 || t == 110) && h < 2) map[yt*32 + xt - h] = 0;
		}
	}
}

function manageDrawTile() {
	if(mouseInZone(ECART_X, ECART_Y, 512, 384) && selectedTile > -1) {
		var x = (mouseX >> 4) << 4;
		var y = (mouseY >> 4) << 4;
		ctx.drawImage(tileset[tilesToDraw[selectedTile]], x, y);
		ctx.strokeStyle = "rgb(255, 0, 0)";
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, 16, 16);
		
		if(mousePressed) {
			x -= ECART_X;
			y -= ECART_Y; 
			var tile = ((y>>4)*32) + (x>>4);
			if(mouseButton == LEFT) {
				if(tilesToDraw[selectedTile] == 20) {
					for(i in map) {	
						if(map[i] == 20) {
							map[i] = 0;
							break;
						}
					}
				}
				map[tile] = tilesToDraw[selectedTile];
			}
			else if(mouseButton == RIGHT) map[tile] = 0;
			else if(mouseButton == MIDDLE) fill(tilesToDraw[selectedTile], map[tile], x >> 4, y >> 4);
			
			var xt = x >> 4;
			var yt = y >> 4;
			
			if(yt - 1 >= 0) {
				var t = map[(yt-1)*32 + xt];
				if(t == 104 || t == 100 || t == 101 || (t >= 107 && t <= 110)) map[(yt-1)*32 + xt] = 0;
			}
			
			build();
			redrawTiles = true;
			canBeUploaded = false;
		}else if(mouseReleased) {
			mouseReleased = 0;
			addUndo();
		}
	}
}

function addUndo() {
	canBeUploaded = false;
	if(undoIndex == 10) {
		undoMap.splice(0, 1);
		undoIndex--;
	}
	undoIndex++;
	undoMap[undoIndex] = new Array();
	for(i=0; i<768; i++) undoMap[undoIndex].push(map[i]);
	
	if(undoIndex < undoMap.length - 1) {
		var r = undoMap.length - 1 - undoIndex;
		for(i=0; i<r; i++) undoMap.pop();
	}
}

function manageSpriteSelection() {
	if(mouseInZone(580, 140, 56, 216)) {
		var x = 584;
		var y = 142;
		var inZone = 0;
		ctx.fillStyle = "rgb(255, 0, 0)";
		if(mouseInZone(x, y, 16, 16)) {//cake
			inZone = 1;
			ctx.fillRect(x - 2, y - 2, 20, 20);
		}else if(mouseInZone(x + 24, y, 16, 16)) {//caisse
			inZone = 2;
			ctx.fillRect(x + 24 - 2, y - 2, 20, 20);
		}else if(mouseInZone(x, y + 24, 16, 32)) {//tourelle gauche
			inZone = 3;
			ctx.fillRect(x - 2, y + 24 - 2, 20, 36);
		}else if(mouseInZone(x + 24, y + 24, 16, 32)) {//tourelle droite
			inZone = 4;
			ctx.fillRect(x + 24 - 2, y + 24 - 2, 20, 36);
		}else if(mouseInZone(x, y + 24 + 40, 48, 16)) {//platforme gauche
			inZone = 5;
			ctx.fillRect(x - 2, y + 24 + 40 - 2, 52, 20);
		}else if(mouseInZone(x, y + 24 + 40 + 24, 48, 16)) {//platforme droite
			inZone = 6;
			ctx.fillRect(x - 2, y + 24 + 40 + 24 - 2, 52, 20);
		}else if(mouseInZone(x, y + 24 + 40 + 24 + 24, 16, 26)) {//perso
			inZone = 7;
			ctx.fillRect(x - 2, y + 24 + 40 + 24 + 24 - 2, 20, 30);
		}else if(mouseInZone(x, y + 144, 16, 32)) {//tunnel droite
			inZone = 8;
			ctx.fillRect(x - 2, y + 142, 20, 36);
		}else if(mouseInZone(x + 24, y + 144, 16, 32)) {//tunnel droite
			inZone = 9;
			ctx.fillRect(x + 22, y + 142, 20, 36);
		}else if(mouseInZone(x, y + 180, 32, 16)) {//tunnel haut
			inZone = 10;
			ctx.fillRect(x - 2, y + 178, 36, 20);
		}else if(mouseInZone(x, y + 200, 32, 16)) {//tunnel bas
			inZone = 11;
			ctx.fillRect(x - 2, y + 198, 36, 20);
		}
		
		if(mouseNewPress) {
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
		
		if(mouseNewPress) {
			unclick();
			if(inZone == 100) {
				BG--;
				redrawTiles = true;
				if(BG < 0) BG = bg.length - 1;
			} else if(inZone == 101) {
				BG++;
				redrawTiles++;
				if(BG == bg.length) BG = 0;
			}
		}
	}
	
	if(selectedSprite > 0) {
		var x = 584;
		var y = 142;
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
	
	if(mouseInZone(4, 140, 56, 118)) {
		var x = mouseX;
		var y = mouseY;
		
		x = (parseInt(x / 20) * 20) + 2;
		y = (parseInt(y / 20) * 20) - 4;
		ctx.fillStyle = "rgb(255, 0, 0)";
		ctx.fillRect(x, y, 20, 20);
		
		if(mouseNewPress) {
			unclick();
			selectedSprite = -1;
			var xt = parseInt(x / 20);
			var yt = parseInt((y - 136) / 20);
			selectedTile =  xt + yt * 3;
		}
	}
	
	if(selectedTile > -1) {
		ctx.fillStyle = "rgb(0, 255, 0)";
		
		var x = (selectedTile%3) * 20 + 2;
		var y = parseInt(selectedTile/3) * 20 + 136;
		
		ctx.fillRect(x, y, 20, 20);
	}
}

function drawRightSprites() {
	var x = 584;
	var y = 142;
	
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
	var x = 4;
	var y = 138;
	
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
	var i;
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
			var y = i >> 5;
			var x = i - (y<<5);
			var haut,bas,gauche,droite;
			
			haut = isTileHere(x,y-1);
			bas = isTileHere(x,y+1);
			gauche = isTileHere(x-1,y);
			droite = isTileHere(x+1,y);
			
			if(haut && bas && gauche && !droite){
				map[x+y*32] = 4;
			}else if(haut && bas && !gauche && droite){
				map[x+y*32] = 2;
			}else if(haut && !bas && droite && gauche){
				map[x+y*32] = 5;
			}else if(!haut && bas && droite && gauche){
				map[x+y*32] = 3;
			}else if(!haut && bas && droite && !gauche){
				map[x+y*32] = 8;
			}else if(!haut && bas && !droite && gauche){
				map[x+y*32] = 9;
			}else if(haut && !bas && !droite && gauche){
				map[x+y*32] = 6;
			}else if(haut && !bas && droite && !gauche){
				map[x+y*32] = 7;
			}else if(haut && bas && droite && gauche){
				map[x+y*32] = 1;
			}else if(haut && bas && !droite && !gauche){
				map[x+y*32] = 11;
			}else if(!haut && !bas && droite && gauche){
				map[x+y*32] = 10;
			}else if(haut && !bas && !droite && !gauche){
				map[x+y*32] = 12;
			}else if(!haut && bas && !droite && !gauche){
				map[x+y*32] = 13;
			}else if(!haut && !bas && !droite && gauche){
				map[x+y*32] = 14;
			}else if(!haut && !bas && droite && !gauche){
				map[x+y*32] = 15;
			}else if(!haut && !bas && !droite && !gauche){
				map[x+y*32] = 16;
			}
		}
	}
}

function fill(tile, toFill, x, y){
	var tmpMap = new Array();
	for(i=0;i<768;i++){
		tmpMap.push(-1);
	}

	var tileCourant = 0;
	var tTile = 1;
	tmpMap[tileCourant] = x+(y<<5);

	while(tileCourant<768 && tmpMap[tileCourant]!=-1){
		var t = tmpMap[tileCourant];
		y = (t>>5);
		x = t - (y<<5);
		map[x+(y<<5)] = tile;
		if(x<31 && map[x+1+(y<<5)] == toFill){
			var j = true;
			var k;
			for(k=0;k<tTile;k++){
				if(tmpMap[k]==x+1+(y<<5)) j = false;
			}
			if(j) tmpMap[tTile++] = x+1+(y<<5);
		}
		if(x>0 && map[x-1+(y<<5)] == toFill){
			var j = true;
			var k;
			for(k=0;k<tTile;k++){
				if(tmpMap[k]==x-1+(y<<5)) j = false;
			}
			if(j) tmpMap[tTile++] = x-1+(y<<5);
		}
		if(y<23 && map[x+((y+1)<<5)] == toFill){
			var j = true;
			var k;
			for(k=0;k<tTile;k++){
				if(tmpMap[k]==x+((y+1)<<5)) j = false;
			}
			if(j) tmpMap[tTile++] = x+((y+1)<<5);
		}
		if(y>0 && map[x+((y-1)<<5)] == toFill){
			var j = true;
			var k;
			for(k=0;k<tTile;k++){
				if(tmpMap[k]==x+((y-1)<<5)) j = false;
			}
			if(j) tmpMap[tTile++] = x+((y-1)<<5);
		}
		tileCourant++;
	}
}

function isTileMurBleu(index){
	var i;
	for(i=1;i<17;i++){
		if(map[index]==i) return true;
	}
	return false;
}

function isTileHere(x, y){
	if(x<0||x>31||y<0||y>23) return 1;
	if(map[x+y*32] >= 54 && map[x+y*32] <= 57) return 1;
	var i;
	for(i=1;i<19;i++){
		if(map[x+y*32]==i) return 1
	}
	return 0;
}