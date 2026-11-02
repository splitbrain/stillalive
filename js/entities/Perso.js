/**
 * The Perso object and its helper functions.
 */

import { playSound, setSoundVolume, sfx_flatline, sfx_jump, sfx_pain } from '../audio.js';
import { skipComingBoss } from '../boss.js';
import { GRAVITY, LEFT, RIGHT } from '../constants.js';
import { toucheCake } from './Cake.js';
import { fieldForceTest, inForceFieldTp } from './ForceField.js';
import { plasmaToucheObjet } from './Plasma.js';
import { onCarpet, onPlateforme } from './Platform.js';
import { Sparkle } from './Sparkle.js';
import { reportBrokenReplay } from '../game.js';
import { loadLevel } from '../level.js';
import {
	checkCollisions,
	downCollision,
	grabObject,
	leftCollision,
	objetPortee,
	rightCollision,
	toucheTileMort,
	touchingGround,
	upCollision,
} from '../physics.js';
import {
	checkTeleportBas,
	checkTeleportDroite,
	checkTeleportGauche,
	checkTeleportHaut,
	clearPortals,
	dansUnPortal,
	launchPortal,
} from '../portals.js';
import { game, input, ui } from '../state.js';
import { random } from '../utils.js';

export class Perso {
	constructor() {
		this.isLeft = 0;
		this.isRight = 0;
		this.oldIsJump = 0;
		this.isJump = 0;
		this.isDown = 0;
		this.x = 0;
		this.y = 0;
		this.vx = 0;
		this.vy = 0;
		this.pX = 15;
		this.pY = 27;
		this.flip = 1;
		this.timePosePortal = 25;
		this.timePassedPortal = 0;
		this.porte = 0;
		this.animeTime = 10;
		this.animeFrame = 0;
		this.vie = 100 << 8;
		this.mort = 0;
		this.timeVie = 0;
		this.type = "perso";
		this.fadeNextLevel = 120;
		this.intermissionFade = 0;
		this.askClear = false;
	}

	midX() {
		return (this.x >> 8) + (this.pX>>1);
	}

	midY() {
		return (this.y >> 8) + (this.pY>>1);
	}

	checkMort() {
		if(this.vie<=0 && !this.mort){
			if(game.replayMode) {
				reportBrokenReplay();
				return;
			}
		
			this.mort = 1;
			this.vie = -256;
			playSound(sfx_pain);
			playSound(sfx_flatline);
			if(game.perso.y>>8 < 384) {
				for(let i=0; i<20; i++) {
					const s = new Sparkle();
					s.x = game.perso.x + (this.pX<<7) + random(-14<<8,8<<8);
					s.y = game.perso.y + (this.pY<<6);
					s.used = 6;
					s.vx = 0;
					s.vy = random(-2<<8,0);
					s.fading = 150;
					s.color = 1;
					s.portalNum = -1;
					game.sparkles.push(s);
				}
			}
		}else if(this.mort) {
			if(this.vie >= 0) {
				setSoundVolume(sfx_flatline, 1);
				if(ui.currentMenu == 2 || ui.currentMenu == 6) {
					loadLevel(ui.currentLevel);
					if(game.bossNum > 0) skipComingBoss();
				}
			}
		}
	}

	move() {
		//particles around the character
		let cpt, s, ffi, i;
		if(this.timePassedPortal < 0) {
			if(++this.timePassedPortal<0 && this.timePassedPortal%6==0){
				for(cpt = 0;cpt<3;cpt++){
					s = new Sparkle();
					s.x = this.x + (this.pX<<7) + random(-8<<8,8<<8);
					s.y = this.y + (this.pY<<7) + random(-16<<8,16<<8);
					s.used = 4;
					s.vx = parseInt(random(32, 64));
					s.vy = parseInt(random(32, 64));
					s.fading = 200;
					s.color = 0;
					s.portalNum = -1;
					if(parseInt(random(2))==0) s.vx = -s.vx;
					if(parseInt(random(0, 2))==0) s.vy = -s.vy;
					game.sparkles.push(s);
				}
			}
		}else if(this.timePassedPortal > 0) {
			if(--this.timePassedPortal>0 && this.timePassedPortal%6==0){
				for(cpt = 0;cpt<5;cpt++){
					s = new Sparkle();
					s.x = this.x + (this.pX<<7) + random(-8<<8,8<<8);
					s.y = this.y + (this.pY<<7) + random(-16<<8,16<<8);
					s.used = 4;
					s.vx = parseInt(random(32, 64));
					s.vy = parseInt(random(32, 64));
					s.fading = 255;
					s.color = 1;
					s.portalNum = -1;
					if(parseInt(random(2))==0) s.vx = -s.vx;
					if(parseInt(random(0, 2))==0) s.vy = -s.vy;
					game.sparkles.push(s);
				}
			}
		}
		
		if(this.askClear) {
			clearPortals();
			this.askClear = false;
		}
		
		const ffield = inForceFieldTp(this);
		if(ffield.length > 0) {
			game.perso.vx = 0;
			game.perso.vy = 0;
		}
		for(i in ffield) {
			const f = ffield[i];
			if(ffield.length == 1) {
				if(game.forceFields[f].vx != 0) {
					if(checkTeleportHaut(this) || checkTeleportBas(this)) {
						if((game.perso.y >> 8) < game.forceFields[f].y) game.perso.y += 768;
						else if((game.perso.y >> 8) + game.perso.pY > game.forceFields[f].y + 32) game.perso.y -= 768;
					}
					else if((game.perso.y >> 8) < game.forceFields[f].y) game.perso.y += 512;
					else if((game.perso.y >> 8) + game.perso.pY > game.forceFields[f].y + 32) game.perso.y -= 512;
				}else if(game.forceFields[f].vy != 0) {
					if(game.perso.x >> 8 < game.forceFields[f].x + (16 - (game.perso.pY>>1))) game.perso.x += 256;
					else if((game.perso.x >> 8) + game.perso.pX > game.forceFields[f].x + 32 - (16 - (game.perso.pY>>1))) game.perso.x -= 256;
				}
			}
			
			game.perso.vx += game.forceFields[f].vx * 384;
			game.perso.vy += game.forceFields[f].vy * 384;
			
			if(game.forceFields[f].vx != 0) {
				if(this.isJump) {
					game.perso.y -= 3<<8;
					ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						game.perso.vy = -800;
						game.perso.vx = game.forceFields[f].vx << 9;
					}
				}
				if(this.isDown) game.perso.y += 3<<8;
			}
			
			if(game.forceFields[f].vy != 0) {
				if(this.isLeft) {
					game.perso.x -= 3<<8;
					ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						game.perso.vx = -384;
					}
				}
				if(this.isRight) {
					game.perso.x += 3<<8;
					ffi = inForceFieldTp(this);
					if(ffi.length == 0) {
						game.perso.vx = 384;
					}
				}
			}
		}
		
		let toucheSol = touchingGround(this);
		const carp = onCarpet(this);
		this.x += carp == 3 ? 384 : carp == 4 ? -384 : 0;
	
		this.animeTime -= 1 + 2 * (1 - (toucheSol == 2 ? 1 : 0));
		if(this.animeTime <= 0) {
			this.animeTime = 10;
			if(++this.animeFrame == 4) this.animeFrame = 1;
		}
		
		if(++this.timePosePortal>25) this.timePosePortal = 25;
		
		if(this.timeVie > 0) {
			this.timeVie--;
		}
		
		if(this.timeVie == 0 && this.vie < 100<<8) {
			if((this.vie+=256)>(100<<8)) this.vie = 100<<8;
		}
		
		if(this.vie <= (50<<8)) {
			const h = this.vie >> 8;
			const r = game.TIME%h;
			
			for(i = 0; r==0 && i<3; i++) {
				s = new Sparkle();
				s.x = game.perso.x + (this.pX<<5) + random(-5<<8,5<<8);;
				s.y = game.perso.y + (this.pY<<6) + random(-5<<8,5<<8);
				s.used = 7;
				s.vx = 0;
				s.vy = 0;
				s.fading = 100;
				s.color = 1;
				s.portalNum = -1;
				game.sparkles.push(s);
			}	
		}
		
		//console.log(this.timeVie);
		
		let dir = (this.isRight - this.isLeft) * 128;
		
		//jump handling
		if(this.isJump && toucheSol && !checkTeleportBas(this) && ffield.length == 0){
			this.vy = -1300;
			playSound(sfx_jump);
		}else if(!this.isJump && this.oldIsJump && this.vy<-200){
			this.vy = -200;
		}
		//end of jump handling
		
		if(this.vx>0){
			if(toucheSol==1 && !checkTeleportGauche(this)){
				game.STEPS+=(game.perso.vx)>>4;
				this.vx-=64;
			}else {
				this.vx-=toucheSol == 2 ? 14 : 28;
			}
			if(this.vx<0) this.vx = 0;
		}else if(this.vx<0){
			if(toucheSol==1 && !checkTeleportDroite(this)){
				game.STEPS-=(game.perso.vx)>>4;
				this.vx+=64;
			}else {
				this.vx+=toucheSol == 2 ? 14 : 28;
			}
			if(this.vx>0) this.vx = 0;
		}
		
		if(dir == 0 && toucheSol) this.animeFrame = 0;
		
		if(ffield.length == 0) {
			if(this.vx>448 && toucheSol==1 && !checkTeleportGauche(this) && !checkTeleportDroite(this)) this.vx = 448;
			else if(this.vx<-448 && toucheSol==1 && !checkTeleportGauche(this) && !checkTeleportDroite(this)) this.vx = -448;
			if(this.vx>672 && toucheSol>1 && !checkTeleportGauche(this) && !checkTeleportDroite(this)) this.vx = 672;
			else if(this.vx<-672 && toucheSol>1 && !checkTeleportGauche(this) && !checkTeleportDroite(this)) this.vx = -672;
		}
		
		if(!toucheSol || checkTeleportBas(this)) {
			if(ffield.length == 0) this.vy+=GRAVITY;
			dir = parseInt((dir*0.28));
			if(this.vy>(10<<8)+128) this.vy = (10<<8)+128;
		}
		
		if(ffield.length == 0) {
			if(toucheSol != 2) this.vx+=dir;
			else if(toucheSol==2) this.vx += dir>>2;
		}
		
		for(i=0;i<8;i++){
			if(!checkTeleportBas(this)&&!checkTeleportHaut(this)) this.x += this.vx>>3;
			if(!checkTeleportGauche(this)&&!checkTeleportDroite(this)) this.y += this.vy>>3;
		}
		
		let plate = onPlateforme(this);
		if(plate){
			plate-=200;
			this.x += game.platforms[plate].vx;
		}
		
		toucheSol = touchingGround(this);
		
		let col = 1;		
		while(col && !dansUnPortal(this)){
			col = checkCollisions(this);
		}
		
		if(checkTeleportHaut(this) && this.vy>0){
			if(downCollision(this)) this.vy = -this.vy;
		}else if(checkTeleportBas(this) && this.vy<0){
			if(upCollision(this)) this.vy = -this.vy;
		}
		
		toucheCake();
		grabObject();
		fieldForceTest();
		
		if(ui.currentMenu != 6 || ui.tutoPortal) {
			if(input.mousePressed && this.timePosePortal == 25 && !dansUnPortal(this) && !objetPortee() ) {
				if (input.mouseButton == LEFT) {
					launchPortal(0);
				}else if (input.mouseButton == RIGHT) {
					launchPortal(1);
				}
			}
		}
		
		
		const colLeft = leftCollision(this);
		const colRight = rightCollision(this);
		if(colLeft && colRight && !dansUnPortal(this)){
			if((colLeft>=200 && colLeft<=210) || (colRight>=200 && colRight<=210)){
				this.vie = 0;
			}
		}
		
		if(plasmaToucheObjet(this) || toucheTileMort(this)){
			this.vie = 0;
		}
		
		if(this.y>(384+40)<<8) this.vie = 0;
		this.oldIsJump = this.isJump;
		this.checkMort();
	}
}
