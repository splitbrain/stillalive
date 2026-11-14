import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import unicorn from 'eslint-plugin-unicorn';

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
		files: [
			'./js/value.js',
			'./js/stage/{assets,audio,canvas,constants,images,InputState,keys,loop,TileMap,tiles,utils}.js',
		],
	},
	{
		name: 'logic',
		files: ['./js/stage/entities/*.js', './js/stage/{level,LevelEvents,mapEdit,mapFile,replay,UndoList,World}.js'],
	},
	{ name: 'drawing', files: ['./js/stage/render/*.js'] },
	{ name: 'flow', files: ['./js/stage/{Editor,GameStage,input,PlaySession,PreviewSession}.js'] },
	{ name: 'page', files: ['./js/[m]ain.js', './js/[l]oader.js', './js/chrome/**/*.js', './js/[r]outer.js'] },
];

/** @type {object[]} The zones of import-x/no-restricted-paths: each layer must not import from a higher layer. */
const LAYER_ZONES = LAYERS.slice(0, -1).map((layer, i) => ({
	target: layer.files,
	from: LAYERS.slice(i + 1).flatMap((higher) => higher.files),
	message: `The ${layer.name} layer must not import from a higher layer.`,
}));

/**
 * The zones of import-x/no-restricted-paths for the page. The page uses the stage through the stage element. From the
 * stage, the page can import only the modules with data and pure functions, and the start code only the element class.
 * The loader also imports the modules that load the images and the sounds.
 *
 * @type {object[]}
 */
const PAGE_ZONES = [
	{
		target: ['./js/chrome/**/*.js', './js/[r]outer.js'],
		from: './js/stage',
		except: ['./constants.js', './keys.js', './mapFile.js', './replay.js', './tiles.js'],
		message: 'The page must use the stage through the stage element.',
	},
	{
		target: './js/[m]ain.js',
		from: './js/stage',
		except: ['./GameStage.js'],
		message: 'The start code only registers the stage element.',
	},
	{
		target: './js/[l]oader.js',
		from: './js/stage',
		except: ['./assets.js', './audio.js', './images.js', './keys.js'],
		message: 'The loader only loads the files of the stage.',
	},
];

/**
 * The zone of import-x/no-restricted-paths for the stage: a module in the stage folder must not import from the page.
 * The zone also covers a module that is in no layer.
 *
 * @type {object[]}
 */
const STAGE_ZONES = [
	{
		target: './js/stage/**/*.js',
		from: LAYERS.at(-1).files,
		message: 'The stage must not import from the page.',
	},
];

/** @type {object[]} The ESLint configuration of the game modules, the tests and the configuration files. */
export default [
	js.configs.recommended,
	{
		plugins: { unicorn },
		rules: {
			curly: ['error', 'multi-line'],
			eqeqeq: ['error', 'always', { null: 'ignore' }],
			'no-else-return': ['error', { allowElseIf: false }],
			'no-nested-ternary': 'error',
			'no-useless-concat': 'error',
			'one-var': ['error', 'never'],
			'prefer-const': 'error',
			'prefer-template': 'error',
			'unicorn/no-for-loop': 'error',
			'unicorn/no-lonely-if': 'error',
			'unicorn/no-negated-condition': 'error',
			'unicorn/no-new-array': 'error',
			'unicorn/prefer-spread': 'error',
			'unicorn/prefer-switch': 'error',
			'unicorn/prefer-ternary': 'error',
		},
	},
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
			'import-x/no-restricted-paths': ['error', { zones: [...LAYER_ZONES, ...PAGE_ZONES, ...STAGE_ZONES] }],
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
