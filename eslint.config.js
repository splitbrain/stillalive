import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';

/**
 * The layers of the game modules as glob patterns, from the bottom to the top. A module can import from its own layer
 * and from the layers below it.
 *
 * @type {{name: string, files: string[]}[]}
 */
const LAYERS = [
	{
		name: 'base',
		files: ['./js/{assets,audio,canvas,constants,dialog,files,images,keys,loop,state,storage,tiles,utils}.js'],
	},
	{ name: 'logic', files: ['./js/entities/*.js', './js/{boss,level,mapFile,physics,portals,replay}.js'] },
	{ name: 'drawing', files: ['./js/render/*.js'] },
	{ name: 'flow', files: ['./js/{editor,game,input,main,panel,tutorial}.js'] },
];

/** @type {object[]} The zones of import-x/no-restricted-paths: each layer must not import from a higher layer. */
const LAYER_ZONES = LAYERS.slice(0, -1).map((layer, i) => ({
	target: layer.files,
	from: LAYERS.slice(i + 1).flatMap((higher) => higher.files),
	message: `The ${layer.name} layer must not import from a higher layer.`,
}));

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
			'import-x/no-restricted-paths': ['warn', { zones: LAYER_ZONES }],
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
