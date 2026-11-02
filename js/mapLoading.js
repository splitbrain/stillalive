function loadLevelEditor() {
	tubeX = tubeY = -1;
	displayMap = new Array();
	for(i in map) {
		displayMap.push(map[i]);
	}
	
	robot = new Robot();
	
	portals = new Array();
	portals.push(new Portal());portals.push(new Portal());
	cakes = new Array();
	sparkles = new Array();
	fsparkles = new Array();
	caisses = new Array();
	tunnels = new Array();
	forceFields = new Array();
	platforms = new Array();
	animatedTiles = new Array();
	plasmaBall = new Array();
	tourelles = new Array();
	txtLines = new Array();
	TIME = 0;
	AVGFPS = 0;
	STEPS = 0;
	PORTALS = 0;
	timeWriting = 0;
	timeShootSound = 0;
	escapeMenu = false;
	place = 0;
	keys = 0;
	oldKeys = 0;
	
	perso = new Perso();
	firstLoadHud = true;
	
	for(i in map) {
		var y = i >> 5;
		var x = i - (y << 5);
		
		if(map[i] == 107) {//right tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, DROITE));
			map[i] = 199;
			map[x+((y+1)<<5)] = 199;
			displayMap[i] = 0;
			displayMap[x+((y+1)<<5)] = 0;
		}else if(map[i] == 108) {//left tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, GAUCHE));
			map[i] = 199;
			map[x+((y+1)<<5)] = 199;
			displayMap[i] = 0;
			displayMap[x+((y+1)<<5)] = 0;
		}else if(map[i] == 109) {//top tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, HAUT));
			map[i] = 199;
			map[x + 1 + (y<<5)] = 199;
			displayMap[i] = 0;
			displayMap[x + 1 + (y<<5)] = 0;
		}else if(map[i] == 110) {//bottom tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, BAS));
			map[i] = 199;
			map[x + 1 + (y<<5)] = 199;
			displayMap[i] = 0;
			displayMap[x + 1 + (y<<5)] = 0;
		}else if(map[i]==22) {//exit
			map[i] = 35;
			displayMap[i] = 35;
			continue;
		}else if(map[i]>=29 && map[i]<=34) { //plasma ball door tile
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 29, 34, RANDOM, i, 6));
			continue;
		}else if(map[i]>=23 && map[i]<=28) { //switch door tile
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 23, 28, RANDOM, i, 6));
			continue;
		}else if(map[i]==36 || map[i]==37) { //rotating wheels
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 36, 37, ORDERED, i, 15));
			continue;
		}else if(map[i]==38 || map[i]==39) { //acid waves
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 38, 39, ORDERED, i, 15));
			continue;
		}else if(map[i]>=40 && map[i]<=45) { //red portal tile
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 40, 45, RANDOM, i, 6));
			continue;
		}else if(map[i]>=48 && map[i]<=53) { //clear portal force field
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 48, 53, ORDERED, i, 6));
			continue;
		}else if(map[i] == 54 || map[i] == 55) { //right conveyor belt
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 54, 55, ORDERED, i, 10));
			continue;
		}else if(map[i] == 56 || map[i] == 57) { //left conveyor belt
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 56, 57, ORDERED, i, 10));
			continue;
		}else if(map[i] == 103) {//cake
			cakes.push(new Cake((x*16) << 8, (y*16) << 8));
			map[i] = 0;
			continue;
		}else if(map[i] == 100) {//left turret
			displayMap[i] = 0;
			map[i] = 0;
			tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, -1));
			continue;
		}else if(map[i] == 101) {//right turret
			displayMap[i] = 0;
			map[i] = 0;
			tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, 1));
			continue;
		}else if(map[i] == 102) {//crate
			displayMap[i] = 0;
			map[i] = 0;
			caisses.push(new Caisse((x*16) << 8, (y*16) << 8));
			continue;
		}else if(map[i] == 104) {//player start
			perso.x = (x * 16) << 8;
			perso.y = (y * 16) << 8;
			map[i] = 0;
			camera = new Camera(perso.x, perso.y);
			continue;
		}else if(map[i] == 105) {//right platform
			var vx = 256;
			platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			map[i] = 0;
			continue;
		}else if(map[i] == 106) {//left platform
			var vx = -256;
			platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			map[i] = 0;
			continue;
		}else if(map[i] == 20) {//plasma start
			var haut,bas,gauche,droite;
			if(x+1<32) droite = map[x+1+(y<<5)];
			else droite = 1;
			if(x-1>=0) gauche = map[x-1+(y<<5)];
			else gauche = 1;
			if(y+1<24) bas = map[x+((y+1)<<5)];
			else bas = 1;
			if(y-1>=0) haut = map[x+((y-1)<<5)];
			else haut = 1;
			
			var x2 = y2 = vx2 = vy2 = 0;
			var push = true;
			
			if(haut&&bas&&gauche){
				vx = 424;
				vy = 0;
				x2 = ((x+1)<<4)<<8;
				y2 = (y<<4)<<8;
			}else if(haut&&bas&&droite){
				vx = -424;
				vy = 0;
				x2 = ((x-1)<<4)<<8;
				y2 = (y<<4)<<8;
			}else if(droite&&bas&&gauche){
				vx = 0;
				vy = -424;
				x2 = (x<<4)<<8;
				y2 = ((y-1)<<4)<<8;
			}else if(gauche&&droite&&haut){
				vx = 0;
				vy = 424;
				x2 = (x<<4)<<8;
				y2 = ((y+1)<<4)<<8;
			}else push = false;
			
			if(push) plasmaBall.push(new Plasma(x2, y2, vx, vy));
		}
	}
	
	CAKELEFT = cakes.length;
	
	needLoad = true;
}

function loadLevel(level) {
	tubeX = tubeY = -1;
	hudLight = null;

	if(level > -1) {
		map = new Array();
		oldMap = new Array();
		displayMap = new Array();
		for(i in campaigns[lvlType].levels[level - 1]) {
			map.push(campaigns[lvlType].levels[level - 1][i]);
			oldMap.push(campaigns[lvlType].levels[level - 1][i]);
			displayMap.push(campaigns[lvlType].levels[level - 1][i]);
		}
	}else {
		displayMap = new Array();
		map = new Array();
		for(i in oldMap) {
			map.push(oldMap[i]);
			displayMap.push(oldMap[i]);
		}
	}
	
	robot = new Robot();
	portals = new Array();
	portals.push(new Portal());portals.push(new Portal());
	cakes = new Array();
	sparkles = new Array();
	fsparkles = new Array();
	tunnels = new Array();
	forceFields = new Array();
	caisses = new Array();
	platforms = new Array();
	animatedTiles = new Array();
	plasmaBall = new Array();
	tourelles = new Array();
	txtLines = new Array();
	
	if(currentMenu == 5 || currentMenu == 4) { // Mode online
		txtLines.push("Map : " + mapsOnline[previewMap-1].name);
		txtLines.push("Author : " + mapsOnline[previewMap-1].author);
		txtLines.push("Author time : " + toTime(mapsOnline[previewMap-1].time));
	}else if(currentMenu == 6) { //Tutorial
		txtLines.push("");
		txtLines.push("");
		txtLines.push("Follow the on-screen instructions to progress through the tutorial.");
	}
	
	TIME = 0;
	AVGFPS = 0;
	STEPS = 0;
	PORTALS = 0;
	timeWriting = 0;
	timeShootSound = 0;
	escapeMenu = false;
	place = 0;
	keys = 0;
	oldKeys = 0;
	if(!replayMode) replay = new Replay();
	
	perso = new Perso();
	firstLoadHud = true;
	
	if(level > -1) {
		if(level == 8 && lvlType <= 1) {
			perso.vy = -2400;
			perso.x = 128 << 8;
			perso.y = 384 << 8;
		}
	}
	
	for(i in map) {
		var y = i >> 5;
		var x = i - (y << 5);
		
		if(map[i] == 107) {//right tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, DROITE));
			map[i] = 199;
			map[x+((y+1)<<5)] = 199;
			displayMap[i] = 0;
			displayMap[x+((y+1)<<5)] = 0;
		}else if(map[i] == 108) {//left tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, GAUCHE));
			map[i] = 199;
			map[x+((y+1)<<5)] = 199;
			displayMap[i] = 0;
			displayMap[x+((y+1)<<5)] = 0;
		}else if(map[i] == 109) {//top tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, HAUT));
			map[i] = 199;
			map[x + 1 + (y<<5)] = 199;
			displayMap[i] = 0;
			displayMap[x + 1 + (y<<5)] = 0;
		}else if(map[i] == 110) {//bottom tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, BAS));
			map[i] = 199;
			map[x + 1 + (y<<5)] = 199;
			displayMap[i] = 0;
			displayMap[x + 1 + (y<<5)] = 0;
		}else if(map[i]==22) {//exit
			map[i] = 35;
			displayMap[i] = 35;
			continue;
		}else if(map[i]>=29 && map[i]<=34) { //plasma ball door tile
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 29, 34, RANDOM, i, 6));
			continue;
		}else if(map[i]>=23 && map[i]<=28) { //switch door tile
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 23, 28, RANDOM, i, 6));
			continue;
		}else if(map[i]==36 || map[i]==37) { //rotating wheels
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 36, 37, ORDERED, i, 15));
			continue;
		}else if(map[i]==38 || map[i]==39) { //acid waves
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 38, 39, ORDERED, i, 15));
			continue;
		}else if(map[i]>=40 && map[i]<=45) { //red portal tile
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 40, 45, RANDOM, i, 6));
			continue;
		}else if(map[i]>=48 && map[i]<=53) { //clear portal force field
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 48, 53, ORDERED, i, 6));
			continue;
		}else if(map[i] == 54 || map[i] == 55) { //right conveyor belt
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 54, 55, ORDERED, i, 10));
			continue;
		}else if(map[i] == 56 || map[i] == 57) { //left conveyor belt
			if(quality > 0) displayMap[i] = 0;
			animatedTiles.push(new AnimatedTile(x, y, 56, 57, ORDERED, i, 10));
			continue;
		}else if(map[i] == 103) {//cake
			cakes.push(new Cake((x*16) << 8, (y*16) << 8));
			map[i] = 0;
			continue;
		}else if(map[i] == 100) {//left turret
			displayMap[i] = 0;
			map[i] = 0;
			tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, -1));
			continue;
		}else if(map[i] == 101) {//right turret
			displayMap[i] = 0;
			map[i] = 0;
			tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, 1));
			continue;
		}else if(map[i] == 102) {//crate
			displayMap[i] = 0;
			map[i] = 0;
			caisses.push(new Caisse((x*16) << 8, (y*16) << 8));
			continue;
		}else if(map[i] == 104) {//player start
			perso.x = (x * 16) << 8;
			perso.y = (y * 16) << 8;
			map[i] = 0;
			camera = new Camera(perso.x, perso.y);
			continue;
		}else if(map[i] == 105) {//right platform
			var vx = 256;
			platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			map[i] = 0;
			continue;
		}else if(map[i] == 106) {//left platform
			var vx = -256;
			platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			map[i] = 0;
			continue;
		}else if(map[i] == 111) {//tube
			tubeX = (x*16) << 8;
			tubeY = (y*16) << 8;
			displayMap[i] = 0;
			map[i] = 0;
			continue;
		}else if(map[i] == 20) {//plasma start
			var haut,bas,gauche,droite;
			if(x+1<32) droite = map[x+1+(y<<5)];
			else droite = 1;
			if(x-1>=0) gauche = map[x-1+(y<<5)];
			else gauche = 1;
			if(y+1<24) bas = map[x+((y+1)<<5)];
			else bas = 1;
			if(y-1>=0) haut = map[x+((y-1)<<5)];
			else haut = 1;
			
			var x2 = y2 = vx2 = vy2 = 0;
			var push = true;
			
			if(haut&&bas&&gauche){
				vx = 424;
				vy = 0;
				x2 = ((x+1)<<4)<<8;
				y2 = (y<<4)<<8;
			}else if(haut&&bas&&droite){
				vx = -424;
				vy = 0;
				x2 = ((x-1)<<4)<<8;
				y2 = (y<<4)<<8;
			}else if(droite&&bas&&gauche){
				vx = 0;
				vy = -424;
				x2 = (x<<4)<<8;
				y2 = ((y-1)<<4)<<8;
			}else if(gauche&&droite&&haut){
				vx = 0;
				vy = 424;
				x2 = (x<<4)<<8;
				y2 = ((y+1)<<4)<<8;
			}else push = false;
			
			if(push && bossNum == 0) plasmaBall.push(new Plasma(x2, y2, vx, vy));
			else if(push && (bossNum == 3 || bossNum == 4) ) {
				plasmaX = x2; 
				plasmaY = y2;
			}
		}
	}
	
	CAKELEFT = cakes.length;
	
	needLoad = true;
	
	if(level > -1) {
		BG = ((level - 1) % 11);
		if(currentMenu == 2) loadHighscores(level);
	} else {
		if(currentMenu == 5) loadOnlineHighscores(mapsOnline[currentLevel].md5);
	}
	nextTime = -1;
	
	if(lvlType == 4) {
		if(level == 7 || level == 14 || level == 21 || level == 28) {
			bossNum = level / 7;
			setupBoss();
		}else bossNum = 0;
	}else bossNum = 0;
}

function loadPreviewMap(level) {
	tubeX = tubeY = -1;

	if(level > 0) {
		map = new Array();
		displayMap = new Array();
		for(i in campaigns[lvlType].levels[level - 1]) {
			map.push(campaigns[lvlType].levels[level - 1][i]);
			displayMap.push(campaigns[lvlType].levels[level - 1][i]);
		}
	}else {
		displayMap = new Array();
		for(i in map) {
			displayMap.push(map[i]);
		}
	}
	//clear arrays
	portals = new Array();
	portals.push(new Portal());portals.push(new Portal());
	cakes = new Array();
	tunnels = new Array();
	forceFields = new Array();
	sparkles = new Array();
	fsparkles = new Array();
	caisses = new Array();
	platforms = new Array();
	animatedTiles = new Array();
	plasmaBall = new Array();
	tourelles = new Array();
	
	perso = new Perso();
	firstLoadHud = true;
	
	for(i in map) {
		var y = i >> 5;
		var x = i - (y << 5);
		
		if(map[i] == 107) {//right tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, DROITE));
		}else if(map[i] == 108) {//left tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, GAUCHE));
		}else if(map[i] == 109) {//top tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, HAUT));
		}else if(map[i] == 110) {//bottom tunnel
			tunnels.push(new Tunnel((x*16) << 8, (y*16) << 8, BAS));
		}else if(map[i] == 111) {//tube
			tubeX = (x*16) << 8;
			tubeY = (y*16) << 8;
		}else if(map[i]==22) {
			map[i] = 35;
			displayMap[i] = 35;
			continue;
		}else if(map[i] == 103) {//cake
			cakes.push(new Cake((x*16) << 8, (y*16) << 8));
			continue;
		}else if(map[i] == 100) {//left turret
			tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, -1));
			continue;
		}else if(map[i] == 101) {//right turret
			tourelles.push(new Tourelle((x*16) << 8, (y*16) << 8, 1));
			continue;
		}else if(map[i] == 102) {//crate
			caisses.push(new Caisse((x*16) << 8, (y*16) << 8));
			continue;
		}else if(map[i] == 104) {//player start
			perso.x = (x * 16) << 8;
			perso.y = (y * 16) << 8;
			continue;
		}else if(map[i] == 105) {//right platform
			var vx = 256;
			platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			continue;
		}else if(map[i] == 106) {//left platform
			var vx = -256;
			platforms.push(new Platform((x * 16) << 8, (y * 16) << 8, vx, 0));
			continue;
		}
	}
	
	if(level == 8 && lvlType <= 1) {
		perso.vy = -2400;
		perso.x = 128 << 8;
		perso.y = 384 << 8;
	}
	
	if(lvlType == 4) {
		if(level == 7 || level == 14 || level == 21 || level == 28) {
			bossNum = level / 7;
			setupBoss();
		}else bossNum = 0;
	}else bossNum = 0;
	
	needLoad = true;
	
	if(level > 0) BG = ((level - 1) % 11);
	
	//loadHighscores(level);
}