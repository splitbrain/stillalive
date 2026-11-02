/**
 * The Tourelle object and its helper functions.
 */

import { playSound, playSoundIfFinished, sfx_explode, sfx_shoot } from '../audio.js';
import { caisseToucheObjet, collideAnyCaisse } from './Caisse.js';
import { inForceFieldTp } from './ForceField.js';
import { plasmaToucheObjet } from './Plasma.js';
import { onPlateforme } from './Platform.js';
import { Sparkle, createCakeOrSmokeSparkles } from './Sparkle.js';
import {
	getTile,
	leftCollision,
	moveObject,
	placeObject,
	rightCollision,
	toucheTileMort,
	touchingGround,
} from '../physics.js';
import { game } from '../state.js';
import { Tile, isPlatformCode } from '../tiles.js';
import { random } from '../utils.js';

export class Tourelle {
	constructor(x, y, dir) {
		this.x = x;
		this.y = y;
		this.vx = 0;
		this.vy = 0;
		this.angle = 0;
		this.dir = dir;
		this.coolTime = 0;
		this.startCool = 3;
		this.rotation = 10;
		this.mort = 0;
		this.used = 1;
		this.porter = 0;
		this.inSight = 0;
		this.pX = 16;
		this.pY = 32;
		this.animFrame = 0;
		this.canExplode = 0;
		this.type = "tourelle";
		this.ex = 0;
	}

	move() {
		if(this.used){
			if(!this.porter){
				if(!touchingGround(this)) this.angle += (this.vx>>8)<<1;
				else this.angle = 0;
				if(this.angle >= 360) this.angle -= 360;
				
				const oldVx = this.vx;
				const oldVy = this.vy;
				
				moveObject(this);
				
				if(!this.mort) {
					if(this.vx == 0 && Math.abs(oldVx) > (3<<8) && this.canExplode && inForceFieldTp(this).length == 0) this.mort = 1;
					else if(this.vy == 0 && Math.abs(oldVy) > (4<<8) && this.canExplode && inForceFieldTp(this).length == 0) this.mort = 1;
					else if(toucheTileMort(this) || caisseToucheObjet(this) || plasmaToucheObjet(this)) {
						this.mort = 1;
					}
					if(this.mort) {
						this.animeFrame = 2;
						playSound(sfx_explode);
						createCakeOrSmokeSparkles(this.x, this.y, 9, 4, 255);
						//_synth.play();
					}
				}else if(this.animFrame<10){
					if(game.TIME%4==0) this.animFrame++;
				}
				
				let plt = onPlateforme(this);
				if(plt){
					plt -= 200;
					this.x += game.platforms[plt].vx;
					
				}
				
				const colLeft = leftCollision(this);
				const colRight = rightCollision(this);
				if(!this.mort && (isPlatformCode(colLeft) || isPlatformCode(colRight))){
					this.mort = 1;
					this.animeFrame = 2;
					playSound(sfx_explode);
					createCakeOrSmokeSparkles(this.x, this.y, 9, 4, 255);
				}
			}else{
				placeObject(this);
			}
			if(!this.mort) this.shoot();
		}
	}

	shoot() {
		let j;
		let testShoot = false;
		if(this.dir == -1 && this.x > game.perso.x) testShoot = true;
		else if(this.dir == 1 && this.x < game.perso.x) testShoot = true;
		
		if(testShoot) {
			const y = (this.y >> 8) + 13;
			const y2 = (game.perso.y >> 8) + 16;
			
			if(Math.abs(y - y2) > 32) testShoot = false; 
			
		}
		
		if(this.mort==0 && testShoot && !game.perso.mort) {
			this.coolTime--;
			if(this.coolTime<0) this.coolTime = 0;
			if(this.coolTime==0){
				if(this.dir==1) j = (this.x>>8)+16;
				else j = (this.x>>8);
				const ySent = (this.y>>8) + 12;
				let dansLeChamp = 0;
				let exitt = 0;
				const oldJ = j;
				//var freeze = 0;
				while(j>=0&&j<512&&!dansLeChamp&&!exitt){
					const tile = getTile(j,ySent);
					if(tile!=Tile.EMPTY) {
						exitt = 1;
						break;
					}
					else {
						if(collideAnyCaisse(j,ySent)) {
							exitt = 2;
							break;
						}
						else {
							const t = toucheJoueur(j,ySent);
							if(t) {
								dansLeChamp = t;
								break;
							}
						}
					}
					j+=this.dir*14;
					if(oldJ==j) exitt = 1;
				}
				if(exitt == 2) {
					this.rotation--;
					if(this.rotation<0) this.rotation = 0;
					this.ex = j<<8;
				}else if(dansLeChamp){
					this.ex = j<<8;
					this.rotation--;
					this.inSight = dansLeChamp;
					dansLeChamp--;
					if(this.rotation<0) this.rotation = 0;
					if(!this.rotation){
						this.animFrame = 1 - this.animFrame;
						game.perso.vie -= 640;//2.5
						game.perso.timeVie = 300;
						game.perso.vx+=this.dir<<8;
						this.coolTime = this.startCool;
						playSoundIfFinished(sfx_shoot);
						
						for(let i=0; i<5; i++) {
							const s = new Sparkle();
							s.x = game.perso.x + (this.pX<<7) + random(-8<<8,8<<8);
							s.y = game.perso.y + (this.pY<<6);
							s.used = 5;
							s.vx = parseInt(random(512, 1024) * this.dir);
							s.vy = random(-3<<8,0);
							s.fading = 50;
							s.color = 1;
							s.portalNum = -1;
							game.sparkles.push(s);
						}
						
						/*ECART_SHAKE_X = 64 + randMinMax(-5,5);
						ECART_SHAKE_Y = 96 + randMinMax(-5,5);*/
					}
				}else{
					this.inSight = 0;
					if(++this.rotation>10) this.rotation = 10;
				}
			}else this.animFrame = 0;
		}else {
			if(this.mort==0) {
				this.animFrame = 0;
				this.rotation = 10;
			}
		}
	}
}

function toucheJoueur(j, ySent){
	const x = game.perso.x>>8;
	const y = game.perso.y>>8;
	if(j>=x && j<x+15 && ySent>=y && ySent<y+31) return 1;
	return 0;
}
