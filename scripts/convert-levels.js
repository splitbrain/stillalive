/**
 * Convert the level files of the 2011 version into JSON files.
 *
 * Each level of a campaign becomes a level file maps/<campaign>/levelNN.json in the format of the editor map files,
 * with the level text as an additional property. Each campaign gets a file maps/<campaign>/campaign.json with the list
 * of its level files. The credits become credits.json.
 *
 * The input is the .sad map files in maps/<campaign>/ and the .txt text files in txt/<campaign>/ and txt/credits/.
 * Run the script in the folder of the game: node scripts/convert-levels.js
 */

import { readFileSync, writeFileSync } from 'node:fs';

/** @type {{name: string, levels: number}[]} The campaigns and their number of levels. */
const CAMPAIGNS = [
	{ name: 'normal', levels: 28 },
	{ name: 'advanced', levels: 28 },
	{ name: 'community', levels: 28 },
	{ name: 'tutorial', levels: 8 },
	{ name: 'story', levels: 28 },
];

/** @type {number} The number of tiles of a map. The game used only the first 768 values of a .sad file. */
const MAP_SIZE = 768;

/** @type {number} The number of tiles in one row of a map. */
const MAP_WIDTH = 32;

/** @type {number} The number of background images. The 2011 version took the background from the level number. */
const BACKGROUNDS = 11;

/**
 * Create the JSON of a level file. The tiles are written as one row of the map per line.
 *
 * @param {number[]} tiles The tile ids.
 * @param {number} bg The background index.
 * @param {string} text The level text.
 * @returns {string} The JSON.
 */
function levelJson(tiles, bg, text) {
	const rows = [];
	for (let i = 0; i < tiles.length; i += MAP_WIDTH) rows.push('\t\t' + tiles.slice(i, i + MAP_WIDTH).join(','));
	return `{\n\t"format": 1,\n\t"bg": ${bg},\n\t"text": ${JSON.stringify(text)},\n\t"tiles": [\n${rows.join(',\n')}\n\t]\n}\n`;
}

for (const campaign of CAMPAIGNS) {
	const files = [];
	for (let level = 1; level <= campaign.levels; level++) {
		const tiles = readFileSync(`maps/${campaign.name}/level${level}.sad`, 'utf8')
			.split(' ', MAP_SIZE)
			.map((value) => parseInt(value, 10));
		// the advanced campaign shows the text of its first level in all levels
		const textLevel = campaign.name === 'advanced' ? 1 : level;
		const text = readFileSync(`txt/${campaign.name}/level${textLevel}_1.txt`, 'utf8');
		const file = `level${String(level).padStart(2, '0')}.json`;
		writeFileSync(`maps/${campaign.name}/${file}`, levelJson(tiles, (level - 1) % BACKGROUNDS, text));
		files.push(file);
	}
	const data = { format: 1, name: campaign.name, levels: files };
	writeFileSync(`maps/${campaign.name}/campaign.json`, JSON.stringify(data, null, '\t') + '\n');
}

// the canvas draws a line break as a space
const lines = readFileSync('txt/credits/credits.txt', 'utf8')
	.split('|')
	.map((line) => line.replaceAll('\n', ' '));
writeFileSync('credits.json', JSON.stringify({ format: 1, lines }, null, '\t') + '\n');
