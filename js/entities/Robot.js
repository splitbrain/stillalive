/**
 * The Robot object and its helper functions.
 */

export function Robot() {
	this.x = 18 << 8;
	this.y = 30 << 8;
	this.ex = this.x + (29 << 8);
	this.ey = this.y + (26 << 8);
	this.vx = 0;
	this.vy = 0;
	this.doingAction = false;
	this.actionDir = 0;
	this.eye = 0;
	this.eyeDir = 0;
	this.blinking = 0;
	this.movx = 128;
	this.movy = 48;
	
	this.move = function() {
		if(this.vy != 0 || this.vx != 0) {
			this.ex += this.vx;
			this.ey += this.vy;
			
			if(this.ex>>8 > (this.x >> 8) + 29 + 10) {
				this.ex = ((this.x >> 8) + 29 + 10) << 8;
				this.vx = 0;
				this.doingAction = false;
			}else if(this.ex>>8 < (this.x >> 8) + 29 - 8) {
				this.ex = ((this.x >> 8) + 29 - 8) << 8;
				this.vx = 0;
				this.doingAction = false;
			}
			
			if(this.ey>>8 > (this.y >> 8) + 26 + 10) {
				this.ey = ((this.y >> 8) + 26 + 10) << 8;
				this.vy = 0;
				this.doingAction = false;
			}else if(this.ey>>8 < (this.y >> 8) + 26 - 10) {
				this.ey = ((this.y >> 8) + 26 - 10) << 8;
				this.vy = 0;
				this.doingAction = false;
			}
		}
		
		if(this.movx != 0) {
			this.x += this.movx;
			this.ex += this.movx;
			this.ey += this.movy;
			this.y += this.movy;
			
			if(this.y > 32 << 8) {
				this.y = 32 << 8;
				this.movy = -this.movy;
				//this.ey = this.y + (26 << 8);
			}else if(this.y < 30 << 8) {
				this.y = 30 << 8;
				this.movy = -this.movy;
				//this.ey = this.y + (26 << 8);
			}
			
			if(this.x > 35 << 8) {
				this.x = 35 << 8;
				//this.ex = this.x + (29 << 8);
				this.movx = 0;
				this.movy = 0;
			}else if(this.x < 0 << 8) {
				this.x = 0 << 8;
				//this.ex = this.x + (29 << 8);
				this.movx = 0;
				this.movy = 0;
			}
		}
		
		if(this.vx != 0) {
			if(this.ex >> 8 == (this.x + (29 << 8)) >> 8) {
				this.doingAction = false;
				this.vx = 0;
			}
		}
		if(this.vy != 0) {
			if(this.ey >> 8 == (this.y + (26 << 8)) >> 8) {
				this.doingAction = false;
				this.vy = 0;
			}
		}
		
		if(this.blinking > 0) {
			if(--this.blinking == 0) {
				this.eye += this.eyeDir;
				this.blinking = 2;
				if(this.eye == 4) {
					this.eyeDir = -this.eyeDir;
					this.eye = 3;
				}else if(this.eye == 0) {
					this.blinking = 0;
				}
			}
		}
	}
	
	this.lookLeftRight = function(dir) {
		if(!this.doingAction) {
			this.doingAction = true;
			this.vx = 128 * dir;
			this.actionDir = this.vx;
		}
	}
	
	this.lookUpDown = function(dir) {
		if(!this.doingAction) {
			this.doingAction = true;
			this.vy = 128 * dir;
			this.actionDir = this.vy;
		}
	}
	
	this.moveRobot = function(dir) {
		if(!this.doingAction) {
			if((dir < 0 && this.x < 18 << 8) || (dir > 0 && this.x > 18 << 8 )) dir = -dir;
			this.doingAction = true;
			this.vx = 128 * dir;
			this.movx = 128 * dir;
			this.movy = 64;
		}
	}
	
	this.blink = function() {
		if(this.eye == 0) {
			this.eye = 1;
			this.eyeDir = 1;
			this.blinking = 2;
		}
	}
}
