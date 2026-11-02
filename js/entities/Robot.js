/**
 * The Robot object and its helper functions.
 */

/**
 * The robot head in the panel at the top of the screen. It looks around and blinks at random.
 */
export class Robot {
	/**
	 * Create the robot at its place in the panel.
	 */
	constructor() {
		/** @type {number} The x position of the head in 1/256 pixels. */
		this.x = 18 << 8;
		/** @type {number} The y position of the head in 1/256 pixels. */
		this.y = 30 << 8;
		/** @type {number} The x position of the eye in 1/256 pixels. */
		this.ex = this.x + (29 << 8);
		/** @type {number} The y position of the eye in 1/256 pixels. */
		this.ey = this.y + (26 << 8);
		/** @type {number} The horizontal speed of the current action in 1/256 pixels per tick. */
		this.vx = 0;
		/** @type {number} The vertical speed of the current action in 1/256 pixels per tick. */
		this.vy = 0;
		/** @type {boolean} True while the robot looks or moves. */
		this.doingAction = false;
		/** @type {number} The frame of the eye image; 0 is the open eye. */
		this.eye = 0;
		/** @type {number} The direction of the blink animation, 1 closing or -1 opening. */
		this.eyeDir = 0;
		/** @type {number} Ticks until the next frame of the blink animation. */
		this.blinking = 0;
		/** @type {number} The horizontal speed of the move action in 1/256 pixels per tick. */
		this.movx = 128;
		/** @type {number} The vertical speed of the move action in 1/256 pixels per tick. */
		this.movy = 48;
	}

	/**
	 * Run the current action for one tick and end it at its limit.
	 *
	 * @returns {void}
	 */
	move() {
		if (this.vy != 0 || this.vx != 0) {
			this.ex += this.vx;
			this.ey += this.vy;

			if (this.ex >> 8 > (this.x >> 8) + 29 + 10) {
				this.ex = ((this.x >> 8) + 29 + 10) << 8;
				this.vx = 0;
				this.doingAction = false;
			} else if (this.ex >> 8 < (this.x >> 8) + 29 - 8) {
				this.ex = ((this.x >> 8) + 29 - 8) << 8;
				this.vx = 0;
				this.doingAction = false;
			}

			if (this.ey >> 8 > (this.y >> 8) + 26 + 10) {
				this.ey = ((this.y >> 8) + 26 + 10) << 8;
				this.vy = 0;
				this.doingAction = false;
			} else if (this.ey >> 8 < (this.y >> 8) + 26 - 10) {
				this.ey = ((this.y >> 8) + 26 - 10) << 8;
				this.vy = 0;
				this.doingAction = false;
			}
		}

		if (this.movx != 0) {
			this.x += this.movx;
			this.ex += this.movx;
			this.ey += this.movy;
			this.y += this.movy;

			if (this.y > 32 << 8) {
				this.y = 32 << 8;
				this.movy = -this.movy;
				//this.ey = this.y + (26 << 8);
			} else if (this.y < 30 << 8) {
				this.y = 30 << 8;
				this.movy = -this.movy;
				//this.ey = this.y + (26 << 8);
			}

			if (this.x > 35 << 8) {
				this.x = 35 << 8;
				//this.ex = this.x + (29 << 8);
				this.movx = 0;
				this.movy = 0;
			} else if (this.x < 0 << 8) {
				this.x = 0 << 8;
				//this.ex = this.x + (29 << 8);
				this.movx = 0;
				this.movy = 0;
			}
		}

		if (this.vx != 0) {
			if (this.ex >> 8 == (this.x + (29 << 8)) >> 8) {
				this.doingAction = false;
				this.vx = 0;
			}
		}
		if (this.vy != 0) {
			if (this.ey >> 8 == (this.y + (26 << 8)) >> 8) {
				this.doingAction = false;
				this.vy = 0;
			}
		}

		if (this.blinking > 0) {
			if (--this.blinking == 0) {
				this.eye += this.eyeDir;
				this.blinking = 2;
				if (this.eye == 4) {
					this.eyeDir = -this.eyeDir;
					this.eye = 3;
				} else if (this.eye == 0) {
					this.blinking = 0;
				}
			}
		}
	}

	/**
	 * Let the eye look to the side, if no action runs.
	 *
	 * @param {number} dir The direction, -1 left or 1 right.
	 * @returns {void}
	 */
	lookLeftRight(dir) {
		if (!this.doingAction) {
			this.doingAction = true;
			this.vx = 128 * dir;
		}
	}

	/**
	 * Let the eye look up or down, if no action runs.
	 *
	 * @param {number} dir The direction, -1 up or 1 down.
	 * @returns {void}
	 */
	lookUpDown(dir) {
		if (!this.doingAction) {
			this.doingAction = true;
			this.vy = 128 * dir;
		}
	}

	/**
	 * Move the head to the side and back, if no action runs.
	 *
	 * @param {number} dir The direction, -1 left or 1 right.
	 * @returns {void}
	 */
	moveRobot(dir) {
		if (!this.doingAction) {
			if ((dir < 0 && this.x < 18 << 8) || (dir > 0 && this.x > 18 << 8)) dir = -dir;
			this.doingAction = true;
			this.vx = 128 * dir;
			this.movx = 128 * dir;
			this.movy = 64;
		}
	}

	/**
	 * Close and open the eye, if the eye is open.
	 *
	 * @returns {void}
	 */
	blink() {
		if (this.eye == 0) {
			this.eye = 1;
			this.eyeDir = 1;
			this.blinking = 2;
		}
	}
}
