/**
 * The Caisse object and its helper functions.
 */

import { manageInTube, manageToucheBoss } from '../boss.js';
import { inForceField } from './ForceField.js';
import { plasmaToucheObjet } from './Plasma.js';
import { onPlateforme } from './Platform.js';
import {
	getTileSimple,
	leftCollision,
	moveObject,
	placeObject,
	rightCollision,
	toucheTileMort,
	touchingGround,
} from '../physics.js';
import { dansUnPortal } from '../portals.js';
import { game } from '../state.js';

export class Caisse {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.pX = 16;
		this.pY = 16;
		this.xOrig = x;
		this.yOrig = y;
		this.angle = 0;
		this.vx = 0;
		this.vy = 0;
		this.porter = 0;
		this.plateforme =-1;
		this.carpet = 0;
		this.type = "caisse";
		this.shrink = 0;
		this.needKill = false;
		this.invincibility = 0;
		this.noRemove = 0;
	}

	midX() {
		return (this.x >> 8) + (this.pX>>1);
	}

	midY() {
		return (this.y >> 8) + (this.pY>>1);
	}

	move() {
		let i;
		if(this.invincibility > 0) this.invincibility--;
		if(this.noRemove > 0) this.noRemove--;
  
		if(this.shrink == 0) {
			if(!this.porter){      
				moveObject(this);
				
				if(game.bossNum > 0) {	//if in boss mode, first level
					if(game.bossNum == 1 || game.bossNum == 4) manageInTube(this);
          
					const t = getTileSimple((this.x >> 8) + this.pX + 1, this.y >> 8);
					if(t>= 58 && t <= 60) {
						for(i in game.map) {
							if(game.map[i] == t) {
								if(t < 60) {
									game.map[i]++;
									game.displayMap[i]++;
								}
								else  {
									game.map[i] = 0;
									game.displayMap[i] = 0;
								}
							}
						}
						game.needLoad = true;
						if(game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) this.needKill = true;
						else if(game.bossNum == 2) {
							this.x = (80) << 8;
							this.y = (-16) << 8;
							this.vx = 0;
							this.vy = 0;
						}
						return;
					}
          
					manageToucheBoss(this);
				}
				
				let plt = onPlateforme(this);
				if(plt){
					plt -= 200;
					this.x += game.platforms[plt].vx;
					this.plateforme = plt;
					if(game.platforms[plt].vx < 0 && leftCollision(this)) this.x -= game.platforms[plt].vx;
					else if(game.platforms[plt].vx > 0 && rightCollision(this)) this.x -= game.platforms[plt].vx;
				}else this.plateforme = -1;

				if(!touchingGround(this)) this.angle += (this.vx>>8)<<1;
				else this.angle = 0;
				if(this.angle >= 360) this.angle -= 360;
				if(caisseSurPerso(this)) {
					//this.vx >>= 1;
					while(caisseSurPerso(this)) this.y -= 256;
					this.vy = 0;
					this.angle = 0;
				}
				const x = this.x>>8;
				const y = this.y>>8;
				if(x<-16 || x>512 || y<-16 || y>384 || toucheTileMort(this) || plasmaToucheObjet(this)){
					if(game.bossNum == 1 || game.bossNum == 3 || game.bossNum == 4) {	//if in boss mode, first, third or fourth level
						this.needKill = true;
						return;
					}
					this.x = this.xOrig;
					this.y = this.yOrig;
					this.vx = 0;
					this.vy = 0;
				}
			}else{
				if(this.carpet > 0) this.carpet = 0;
				placeObject(this);
			}
		} else {
			this.shrink -= 4;
			if(this.shrink == 0) {
				if(game.bossNum == 1 || game.bossNum == 4) {	//if in boss mode, first or fourth level
				  this.needKill = true;
				  return;
				}
				this.x = this.xOrig;
				this.y = this.yOrig;
				this.vx = 0;
				this.vy = 0;
			}
		}
		
		if(this.shrink == 0 && inForceField(this)) {
			this.porter = 0;
			this.shrink = 60;
		}
	}
}

export function collideCaisse(x, y){
	let i;
	for(i in game.caisses){
		const x2 = game.caisses[i].x>>8;
		const y2 = game.caisses[i].y>>8;
		if(!game.caisses[i].porter && !dansUnPortal(game.caisses[i]) && x>x2 && x<x2+15 && y>y2 && y<y2+15){
			const ret = parseInt(i);
			return 300 + ret;
		}
	}
	return 0;
}

export function collideAnyCaisse(x, y) {
	let i;
	for(i in game.caisses){
		const x2 = game.caisses[i].x>>8;
		const y2 = game.caisses[i].y>>8;
		if(x>x2 && x<x2+15 && y>y2 && y<y2+15){
			const ret = parseInt(i);
			return 300 + ret;
		}
	}
	return 0;
}

export function caisseSurPerso(obj){
	if(obj.type == "caisse" && obj.vy > 0 && !dansUnPortal(obj)){	//the object is a crate
		let x = (obj.x>>8) + 3;
		const y = (obj.y>>8) + obj.pY;
		const x2 = game.perso.x>>8;
		const y2 = game.perso.y>>8;
		
		if(x>=x2 && x<x2+16 && y>=y2 && y<y2+4) return 1;
		else{
			x+=9;
			if(x>=x2 && x<x2+16 && y>=y2 && y<y2+4) return 1;
		}
	}
	return 0;
}

export function caisseToucheObjet(obj){
	let i;
	const posx = obj.x>>8;
	const posy = obj.y>>8;
	const px = obj.pX;
	const py = obj.pY;
	
	for(i in game.caisses){
		if(game.caisses[i].porter==0 && (game.caisses[i].vx!=0 || game.caisses[i].vy!=0) && !dansUnPortal(game.caisses[i])){
			const x = game.caisses[i].x>>8;
			const y = game.caisses[i].y>>8;
			if(posx+px>x && x+16>posx && posy+py>y && y+16>posy) return i+1;
		}
	}
	return 0;
}
