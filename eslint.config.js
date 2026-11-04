import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';

/**
 * The layers of the game modules as glob patterns, from the bottom to the top. A module can import from its own layer
 * and from the layers below it. The stage is the base, the logic, the drawing and the flow layer. The page around the
 * stage is the top layer.
 *
 * @type {{name: string, files: string[]}[]}
 */
const LAYERS = [
	{
		name: 'base',
		files: ['./js/value.js', './js/stage/{assets,audio,canvas,constants,images,keys,loop,state,tiles,utils}.js'],
	},
	{
		name: 'logic',
		files: ['./js/stage/entities/*.js', './js/stage/{boss,events,inputState,level,mapFile,physics,portals,replay}.js'],
	},
	{ name: 'drawing', files: ['./js/stage/render/*.js'] },
	{ name: 'flow', files: ['./js/stage/{editor,game,GameStage,input}.js'] },
	{ name: 'page', files: ['./js/[m]ain.js', './js/chrome/**/*.js', './js/{dialog,files,router,storage}.js'] },
];

/** @type {object[]} The zones of import-x/no-restricted-paths: each layer must not import from a higher layer. */
const LAYER_ZONES = LAYERS.slice(0, -1).map((layer, i) => ({
	target: layer.files,
	from: LAYERS.slice(i + 1).flatMap((higher) => higher.files),
	message: `The ${layer.name} layer must not import from a higher layer.`,
}));

/**
 * The zones of import-x/no-restricted-paths for the page: it uses the stage through the element instance. It can
 * import only the modules of the stage with data and pure functions: the constants, the key labels, the check of the
 * map files and the decoding of the replays. The start code also imports the element class.
 *
 * @type {object[]}
 */
const PAGE_ZONES = [
	{
		target: ['./js/chrome/**/*.js', './js/{dialog,files,router,storage}.js'],
		from: './js/stage',
		except: ['./constants.js', './keys.js', './mapFile.js', './replay.js'],
		message: 'The page must use the stage through the stage element.',
	},
	{
		target: './js/[m]ain.js',
		from: './js/stage',
		except: ['./GameStage.js'],
		message: 'The start code only registers the stage element.',
	},
];

export default [
	js.configs.recommended,
	{
		files: ['js/**/*.js'],
		plugins: { 'import-x': importX },
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.browser,
		},
		rules: {
			'no-var': 'error',
			'guard-for-in': 'error',
			'import-x/no-cycle': 'warn',
			'import-x/no-restricted-paths': ['error', { zones: [...LAYER_ZONES, ...PAGE_ZONES] }],
		},
	},
	{
		files: ['tests/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: { ...globals.node, ...globals.browser },
		},
	},
	{
		files: ['*.config.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.node,
		},
	},
];
