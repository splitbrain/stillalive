/**
 * The LevelScene object.
 */

import { Scene } from './Scene.js';
import {
	CakePainter,
	CratePainter,
	GravPipePainter,
	PlasmaPainter,
	PlatformPainter,
	TurretPainter,
} from './painters/bodies.js';
import { BossPainter, RazorWheelPainter, TubePainter } from './painters/boss.js';
import { CrosshairPainter } from './painters/cursors.js';
import { CameraPainter, DeathFadePainter, SparklePainter } from './painters/effects.js';
import { LabelPainter } from './painters/labels.js';
import { PlayerPainter } from './painters/player.js';
import { FrontTilePainter, PortalPainter } from './painters/portals.js';
import { AnimatedTilePainter, TileLayerPainter } from './painters/tiles.js';
import { TransitionPainter } from './painters/transitions.js';

/**
 * The scene of a level during play, a test run or a replay.
 *
 * @extends {Scene<import('../world/World.js').World>}
 */
export class LevelScene extends Scene {
	/**
	 * Create the scene of a level.
	 */
	constructor() {
		super([
			new TileLayerPainter(),
			new AnimatedTilePainter(),
			new GravPipePainter(),
			new PlayerPainter({ pose: 'aim' }),
			new CakePainter(),
			new TurretPainter(),
			new PlasmaPainter(),
			new SparklePainter(),
			new CratePainter(),
			new BossPainter(),
			new RazorWheelPainter(),
			new TubePainter(),
			new PlatformPainter({ arrows: false }),
			new FrontTilePainter(),
			new PortalPainter(),
			new CameraPainter(),
			new LabelPainter(),
			new DeathFadePainter(),
			new TransitionPainter(),
			new CrosshairPainter(),
		]);
	}
}
