/**
 * The Plasma object and its helper functions.
 */

import { playSound, setSoundVolume, sfx_bounce } from '../audio.js';
import { BAS, DROITE, GAUCHE, HAUT } from '../constants.js';
import { getCollision, getTileSimple } from '../physics.js';
import { dansUnPortal } from '../portals.js';
import { reloadTiles } from '../render/game.js';
import { game, settings } from '../state.js';
import { getDistance } from '../utils.js';

export class Plasma {
	constructor(x, y, vx, vy) {
		this.x = x;
		this.y = y;
		this.xOrig = x;
		this.yOrig = y;
		this.vx = vx;
		this.vy = vy;
		this.origVx = vx;
		this.origVy = vy;
		this.vMax = 424;
		this.pX = 16;
		this.pY = 16;
		this.used = 1;
		this.scale = 1;
		this.scaleDir = -1;
		this.type = "plasma";
		this.animFrame = 0;
		this.needKill = false;
	}

	move() {
		if(game.TIME%10==0) {
			this.scale += 1 * this.scaleDir;
			if(this.scale < -2 || this.scale > 2) this.scaleDir = -this.scaleDir;
		}
	
		this.x+=this.vx;
		this.y+=this.vy;
		
		const vx = this.vx;
		const vy = this.vy;
		
		if(!dansUnPortal(this)){
			this.checkCollision();
			if(game.bossNum == 3 || game.bossNum == 4) {
				if(this.x < game.perso.x) this.vx += 4;
				else if(this.x > game.perso.x) this.vx -= 4;
				if(this.y < game.perso.y) this.vy += 4;
				else if(this.y > game.perso.y) this.vy -= 4;
				
				const vmx = 3;
				
				if(this.vx > (vmx<<8)) this.vx = vmx << 8;
				else if(this.vx < -(vmx<<8)) this.vx = -(vmx << 8);
				if(this.vy > (vmx<<8)) this.vy = vmx << 8;
				else if(this.vy < -(vmx<<8)) this.vy = -(vmx << 8);
				
				if(this.x > game.tubeX) this.needKill = true;
			}
		}
		
		if(game.bossNum == 0) {
			if(vx&&this.vy) this.vx = 0;
			else if(vy&&this.vx) this.vy = 0;
			if(this.vx>this.vMax) this.vx = this.vMax;
			else if(this.vx<-this.vMax) this.vx = -this.vMax;
			if(this.vy>this.vMax) this.vy = this.vMax;
			else if(this.vy<-this.vMax) this.vy = -this.vMax;
		}
		
		if((this.y>>8)>384 || (this.y>>8)<=-16 || (this.x>>8)>512 || (this.x>>8)<-16){
			this.x = this.xOrig;
			this.y = this.yOrig;
			this.vx = this.origVx;
			this.vy = this.origVy;
		}else {
			const t = getTileSimple((this.x>>8) + 8, (this.y>>8) + 8);
			if(t == 38 || t == 39 || t == 47) {
				this.x = this.xOrig;
				this.y = this.yOrig;
				this.vx = this.origVx;
				this.vy = this.origVy;
			}
		}
	}

	ouvrirPorte() {
		let i;
		for(i in game.animatedTiles) {
			if(game.animatedTiles[i].current>=29 && game.animatedTiles[i].current<=34){
				game.animatedTiles[i].used = 0;
				game.map[game.animatedTiles[i].place] = 0;
				if(settings.quality == 0) {
					game.displayMap[game.animatedTiles[i].place] = 0;
					game.needLoad = true;
				}
			}
		}
	}

	encore() {
		let i;
		for(i=0;i<768;i++){
			if(game.map[i]==21) return 1;
		}
		return 0;
	}

	checkCollision() {
		let x, y, i;
		let dist = getDistance(this.x>>8, this.x>>8, game.perso.x>>8, game.perso.y>>8);
		if(dist > 384) dist = 384;
		setSoundVolume(sfx_bounce, 1 - (dist / 384));

		if(getCollision(this)==GAUCHE){
			playSound(sfx_bounce);
			do{
				this.x+=128;
			}while(getCollision(this)==GAUCHE);
			this.vx = -this.vx;
			
			x = (this.x>>8) - 1;
			y = this.y>>8;
			for(i=2;i<=14 && game.bossNum == 0;i++){
				if(getTileSimple(x,y+i)==21){
					y+=i;
					x>>=4;
					y>>=4;
					game.map[x+(y<<5)] = 1;
					game.displayMap[x+(y<<5)] = 1;
					reloadTiles();
					if(!this.encore()){
						this.used = 0;
						this.ouvrirPorte();
					}else{
						this.x = this.xOrig;
						this.y = this.yOrig;
						this.vx = this.origVx;
						this.vy = this.origVy;
					}
				}
			}
		}else if(getCollision(this)==DROITE){
			playSound(sfx_bounce);
			do{
				this.x-=128;
			}while(getCollision(this)==DROITE);
			this.vx = -this.vx;
			
			x = (this.x>>8) + 16;
			y = this.y>>8;
			for(i=2;i<=14 && game.bossNum == 0;i++){
				if(getTileSimple(x,y+i)==21){
					y+=i;
					x>>=4;
					y>>=4;
					game.map[x+(y<<5)] = 1;
					game.displayMap[x+(y<<5)] = 1;
					reloadTiles();
					if(!this.encore()){
						this.used = 0;
						this.ouvrirPorte();
					}else{
						this.x = this.xOrig;
						this.y = this.yOrig;
						this.vx = this.origVx;
						this.vy = this.origVy;
					}
				}
			}
		}else if(getCollision(this)==HAUT){
			playSound(sfx_bounce);
			do{
				this.y+=128;
			}while(getCollision(this)==HAUT);
			this.vy = -this.vy;
			
			x = this.x>>8;
			y = (this.y>>8) - 1;
			for(i=4;i<=12 && game.bossNum == 0;i++){
				if(getTileSimple(x+i,y)==21){
					x+=i;
					x>>=4;
					y>>=4;
					game.map[x+(y<<5)] = 1;
					game.displayMap[x+(y<<5)] = 1;
					reloadTiles();
					if(!this.encore()){
						this.used = 0;
						this.ouvrirPorte();
					}else{
						this.x = this.xOrig;
						this.y = this.yOrig;
						this.vx = this.origVx;
						this.vy = this.origVy;
					}
				}
			}
		}else if(getCollision(this)==BAS){
			playSound(sfx_bounce);
			do{
				this.y-=128;
			}while(getCollision(this)==BAS);
			this.vy = -this.vy;

			x = this.x>>8;
			y = (this.y>>8) + 16;
			for(i=4;i<=12 && game.bossNum == 0;i++){
				if(getTileSimple(x+i,y)==21){
					x+=i;
					x>>=4;
					y>>=4;
					game.map[x+(y<<5)] = 1;
					game.displayMap[x+(y<<5)] = 1;
					reloadTiles();
					if(!this.encore()){
						this.used = 0;
						this.ouvrirPorte();
					}else{
						this.x = this.xOrig;
						this.y = this.yOrig;
						this.vx = this.origVx;
						this.vy = this.origVy;
					}
				}
			}
		}
	}
}

export function plasmaToucheObjet(obj){
	let i;
	for(i in game.plasmaBall) {
		if(game.plasmaBall[i].used) {
			const posx = obj.x>>8;
			const posy = obj.y>>8;
			const px = obj.pX;
			const py = obj.pY;
			
			const x = game.plasmaBall[i].x>>8;
			const y = game.plasmaBall[i].y>>8;
			if(posx+px>x && x+16>posx && posy+py>y && y+16>posy) return 1;
		}
	}
	
	return 0;
}
