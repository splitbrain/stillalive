/**
 * The PreviewScene object.
 */

import { Scene } from './Scene.js';
import { CakePainter, CratePainter, GravPipePainter, PlatformPainter, TurretPainter } from './painters/bodies.js';
import { BossPainter, TubePainter } from './painters/boss.js';
import { PlayerPainter } from './painters/player.js';
import { AnimatedTilePainter, TileLayerPainter } from './painters/tiles.js';

/**
 * The scene of the still picture of a level.
 *
 * @extends {Scene<import('../world/World.js').World>}
 */
export class PreviewScene extends Scene {
	/**
	 * Create the scene of a preview.
	 */
	constructor() {
		super([
			new TileLayerPainter(),
			new AnimatedTilePainter(),
			new PlayerPainter({ pose: 'still' }),
			new CakePainter(),
			new TurretPainter(),
			new CratePainter(),
			new PlatformPainter({ arrows: false }),
			new GravPipePainter(),
			new TubePainter(),
			new BossPainter(),
		]);
	}
}
