/**
 * The PreviewScene object.
 */

import { Scene } from './Scene.js';
import { CakePainter, CratePainter, GravPipePainter, PlatformPainter, TurretPainter } from './painters/bodies.js';
import { BossPainter, TubePainter } from './painters/boss.js';
import { CrosshairPainter } from './painters/cursors.js';
import { PlayerPainter } from './painters/player.js';
import { TileLayerPainter } from './painters/tiles.js';

/**
 * The scene of the still picture of a level or of a map.
 */
export class PreviewScene extends Scene {
	/**
	 * Create the scene of a preview.
	 *
	 * @param {import('../browser/InputState.js').InputState} input The mouse, for the crosshair.
	 */
	constructor(input) {
		super([
			new TileLayerPainter(),
			new PlayerPainter({ pose: 'still' }),
			new CakePainter(),
			new TurretPainter(),
			new CratePainter(),
			new PlatformPainter({ arrows: false }),
			new GravPipePainter(),
			new TubePainter(),
			new BossPainter(),
			new CrosshairPainter(input),
		]);
	}
}
