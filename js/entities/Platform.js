/**
 * The Platform object and its helper functions.
 */

import { collideCaisse } from './Caisse.js';
import { leftCollision, rightCollision, touchingGround } from '../physics.js';
import { game } from '../state.js';

export class Platform {
	constructor(x, y, vx, vy) {
		this.x = x;
		this.y = y;
		this.pX = 48;
		this.pY = 16;
		this.vx = vx;
		this.vy = vy;
		this.type = "plateforme";
		this.dir = vx > 0 ? 1 : -1;
	}

	move() {
		this.x += this.vx;
		const x = this.x>>8;
		//var y = plateForme[i].y>>8;
		if(x<0 || x>512-48 || (this.vx>0 && rightCollision(this)) || (this.vx<0 && leftCollision(this))){
			//this.x-=this.vx;
			this.vx = -this.vx;
		}
	}
}

export function onCarpet(obj) {
	const toucheSol = touchingGround(obj);
	if(toucheSol == 3 || toucheSol == 4) {
		return toucheSol;
	}else {
		let cai = collideCaisse(obj.x>>8,(obj.y>>8) + obj.pY);
		if(!cai) cai = collideCaisse((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
		if(cai){
			cai-=300;
			if(game.caisses[cai].carpet > 0) return game.caisses[cai].carpet;
		}
	}
	
	return 0;
}

export function onPlateforme(obj){
	let plate = collidePlateforme(obj.x>>8,(obj.y>>8) + obj.pY);
	if(!plate) plate = collidePlateforme((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
	if(!plate){
		let cai = collideCaisse(obj.x>>8,(obj.y>>8) + obj.pY);
		if(!cai) cai = collideCaisse((obj.x>>8)+obj.pX-1,(obj.y>>8) + obj.pY);
		if(cai){
			cai-=300;
			if(game.caisses[cai].plateforme>-1) plate = 200 + game.caisses[cai].plateforme;
		}
	}
	
	return plate;
}

export function collidePlateforme(x, y){
	let plt;
	for(plt in game.platforms){
		const x2 = game.platforms[plt].x>>8;
		const y2 = game.platforms[plt].y>>8;
		if(x>x2 && x<x2+48 && y>=y2 && y<y2+15){
			const ret = parseInt(plt);
			return 200 + ret;
		}
	}
	return 0;
}
