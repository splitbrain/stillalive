/**
 * The LabelPainter object.
 */

import { ctx } from '../../browser/canvas.js';
import { TILE_SIZE } from '../../constants.js';
import { degToRad } from '../../utils.js';

/** @type {string} The font of the labels. */
const LABEL_FONT = '13px mynerve';

/** @type {number} The distance between the lines of a label in canvas pixels. */
const LABEL_LINE_HEIGHT = 14;

/** @type {number} The largest tilt of a label in degrees. */
const LABEL_MAX_TILT = 3;

/** @type {number} The largest distance in canvas pixels that the tilt moves the ends of a label up or down. */
const LABEL_MAX_RISE = 1;

/**
 * The lines of a label, their metrics in the label font and the tilt in radians.
 *
 * @typedef {{lines: string[], metrics: TextMetrics[], tilt: number}} LabelLayout
 */

/**
 * Calculate a hash of a text with the FNV-1a algorithm.
 *
 * @param {string} text The text.
 * @returns {number} The hash, an unsigned 32 bit integer.
 */
function hashText(text) {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

/**
 * The painter of the labels of a level.
 */
export class LabelPainter {
	/**
	 * @type {WeakMap<import('../../map/mapFile.js').MapLabel, LabelLayout>} The layouts of the labels that were
	 *     measured with the label font.
	 */
	#layouts = new WeakMap();

	/**
	 * Create the painter of the labels and start to load the label font.
	 */
	constructor() {
		// the canvas does not load a font by itself before the first label needs it
		document.fonts.load(LABEL_FONT);
	}

	/**
	 * Draw the labels of the level at their positions in the playfield while the level runs or halts.
	 *
	 * @param {import('../../world/World.js').World} world The World.
	 * @returns {void}
	 */
	draw(world) {
		if (!world.phase.isRunning() && !world.phase.isHalted()) return;
		ctx.save();
		ctx.font = LABEL_FONT;
		ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
		ctx.textAlign = 'center';
		for (const label of world.labels) this.#drawLabel(label);
		ctx.restore();
	}

	/**
	 * Draw a label centered on its tile, with its tilt.
	 *
	 * Each line is centered on its letters, so a line without descenders does not look too high.
	 *
	 * @param {import('../../map/mapFile.js').MapLabel} label The label.
	 * @returns {void}
	 */
	#drawLabel(label) {
		const { lines, metrics, tilt } = this.#layouts.get(label) ?? this.#layoutLabel(label);

		ctx.save();
		ctx.translate(label.x * TILE_SIZE + TILE_SIZE / 2, label.y * TILE_SIZE + TILE_SIZE / 2);
		ctx.rotate(tilt);
		for (const [i, metric] of metrics.entries()) {
			const lineY = (i - (lines.length - 1) / 2) * LABEL_LINE_HEIGHT;
			ctx.fillText(lines[i], 0, lineY + (metric.actualBoundingBoxAscent - metric.actualBoundingBoxDescent) / 2);
		}
		ctx.restore();
	}

	/**
	 * Measure the lines of a label and calculate its tilt. The layout is kept for the next frames once the label font is
	 * loaded.
	 *
	 * The hash of the text sets the tilt, so a label always has the same tilt. The tilt of a wide label is smaller, so
	 * its ends stay in the tile row.
	 *
	 * @param {import('../../map/mapFile.js').MapLabel} label The label.
	 * @returns {LabelLayout} The layout of the label.
	 */
	#layoutLabel(label) {
		const lines = label.text.split('\n');
		const metrics = lines.map((line) => ctx.measureText(line));
		const width = Math.max(...metrics.map((metric) => metric.width));
		const maxTilt = Math.min(degToRad(LABEL_MAX_TILT), Math.atan(LABEL_MAX_RISE / (width / 2)));
		const tilt = ((hashText(label.text) / 0xffffffff) * 2 - 1) * maxTilt;
		const layout = { lines, metrics, tilt };
		if (document.fonts.check(LABEL_FONT)) this.#layouts.set(label, layout);
		return layout;
	}
}
