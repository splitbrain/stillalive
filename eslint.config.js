import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import unicorn from 'eslint-plugin-unicorn';

/**
 * The layers of the game modules as glob patterns, from the bottom to the top. A module can import from its own layer
 * and from the layers below it. The stage is the base, the logic, the drawing and the flow layer. The data layer holds
 * the player data and the level data. The UI around the stage is the top layer.
 *
 * @type {{name: string, files: string[]}[]}
 */
const LAYERS = [
	{
		name: 'base',
		files: [
			'./js/value.js',
			'./js/stage/{constants,utils}.js',
			'./js/stage/browser/{assets,audio,canvas,images,InputState,keys,loop}.js',
			'./js/stage/world/{LevelPhase,TileMap}.js',
			'./js/stage/map/[t]iles.js',
		],
	},
	{
		name: 'logic',
		files: [
			'./js/stage/{bodies,effects,portals}/*.js',
			'./js/stage/world/{AnimatedTile,level,LevelEvents,mapObjects,SwitchDoors,World}.js',
			'./js/stage/editor/{mapEdit,UndoList}.js',
			'./js/stage/map/[m]apFile.js',
			'./js/stage/sessions/[r]eplay.js',
		],
	},
	{ name: 'drawing', files: ['./js/stage/render/*.js'] },
	{
		name: 'flow',
		files: [
			'./js/stage/[G]ameStage.js',
			'./js/stage/editor/[E]ditor.js',
			'./js/stage/browser/[i]nput.js',
			'./js/stage/sessions/{PlaySession,PreviewSession}.js',
		],
	},
	{ name: 'data', files: ['./js/data/*.js'] },
	{ name: 'ui', files: ['./js/[m]ain.js', './js/[l]oader.js', './js/ui/**/*.js', './js/[r]outer.js'] },
];

/** @type {object[]} The zones of import-x/no-restricted-paths: each layer must not import from a higher layer. */
const LAYER_ZONES = LAYERS.slice(0, -1).map((layer, i) => ({
	target: layer.files,
	from: LAYERS.slice(i + 1).flatMap((higher) => higher.files),
	message: `The ${layer.name} layer must not import from a higher layer.`,
}));

/** @type {string[]} The modules of the stage with data and pure functions, relative to the stage folder. */
const STAGE_DATA_MODULES = [
	'./constants.js',
	'./browser/keys.js',
	'./map/mapFile.js',
	'./sessions/replay.js',
	'./map/tiles.js',
];

/**
 * The zone of import-x/no-restricted-paths for the data layer. From the stage, the data layer can import only the
 * modules with data and pure functions.
 *
 * @type {object[]}
 */
const DATA_ZONES = [
	{
		target: './js/data/*.js',
		from: './js/stage',
		except: STAGE_DATA_MODULES,
		message: 'The data layer can import only the data and the pure functions of the stage.',
	},
];

/**
 * The zones of import-x/no-restricted-paths for the UI. The UI uses the stage through the stage element. From the
 * stage, the UI can import only the modules with data and pure functions, and the start code only the element class.
 * The loader also imports the modules that load the images and the sounds.
 *
 * @type {object[]}
 */
const UI_ZONES = [
	{
		target: ['./js/ui/**/*.js', './js/[r]outer.js'],
		from: './js/stage',
		except: STAGE_DATA_MODULES,
		message: 'The UI must use the stage through the stage element.',
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
		except: ['./browser/assets.js', './browser/audio.js', './browser/images.js', './browser/keys.js'],
		message: 'The loader only loads the files of the stage.',
	},
];

/**
 * The zone of import-x/no-restricted-paths for the stage: a module in the stage folder must not import from the data
 * layer or the UI. The zone also covers a module that is in no layer.
 *
 * @type {object[]}
 */
const STAGE_ZONES = [
	{
		target: './js/stage/**/*.js',
		from: LAYERS.slice(-2).flatMap((layer) => layer.files),
		message: 'The stage must not import from the data layer or the UI.',
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
			'id-length': ['error', { min: 2, exceptions: ['x', 'y', 'i', 'j', '_'] }],
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
			'import-x/no-restricted-paths': [
				'error',
				{ zones: [...LAYER_ZONES, ...DATA_ZONES, ...UI_ZONES, ...STAGE_ZONES] },
			],
		},
	},
	{
		files: ['tests/**/*.js'],
		ignores: ['tests/unit/**'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: { ...globals.node, ...globals.browser },
		},
	},
	{
		files: ['tests/unit/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.node,
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
