import { readFileSync } from 'node:fs';
import * as espree from 'espree';
import globals from 'globals';

/** @type {string[]} The classic scripts of the game. They share their top-level declarations. */
const CLASSIC_SCRIPTS = [
	'js/state.js',
	'js/tools.js',
	'js/apps.js',
	'js/drawing.js',
	'js/jqueryFct.js',
	'js/mapLoading.js',
	'js/levelEditor.js',
	'js/tutorial.js',
];

/** @type {string[]} The ES modules of the game. They put their exported functions on window. */
const MODULES = [
	'js/assets.js',
	'js/audio.js',
	'js/dialog.js',
	'js/files.js',
	'js/input.js',
	'js/loop.js',
	'js/mapFile.js',
	'js/panel.js',
	'js/replay.js',
	'js/storage.js',
];

/**
 * Collect the names of the top-level declarations of the classic scripts.
 *
 * @returns {string[]} The declared names.
 */
function classicGlobals() {
	const names = [];
	for (const file of CLASSIC_SCRIPTS) {
		const ast = espree.parse(readFileSync(file, 'utf8'), { ecmaVersion: 'latest', sourceType: 'script' });
		for (const node of ast.body) {
			if (node.type === 'FunctionDeclaration') names.push(node.id.name);
			if (node.type === 'VariableDeclaration') {
				for (const declaration of node.declarations) names.push(declaration.id.name);
			}
		}
	}
	return names;
}

/**
 * Collect the names that the modules put on window with Object.assign(window, { ... }).
 *
 * @returns {string[]} The names.
 */
function moduleGlobals() {
	const names = [];
	for (const file of MODULES) {
		const match = readFileSync(file, 'utf8').match(/Object\.assign\(window, \{([^}]*)\}\)/);
		if (match) names.push(...match[1].split(',').map((name) => name.trim()).filter(Boolean));
	}
	return names;
}

/** @type {Object<string, string>} The globals of the game, all writable. */
const gameGlobals = Object.fromEntries([...classicGlobals(), ...moduleGlobals()].map((name) => [name, 'writable']));

export default [
	{
		files: CLASSIC_SCRIPTS,
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'script',
			parserOptions: { ecmaFeatures: { impliedStrict: true } },
			globals: { ...globals.browser, ...gameGlobals },
		},
		rules: {
			'no-undef': 'error',
			'no-redeclare': ['error', { builtinGlobals: false }],
			'no-var': 'error',
		},
	},
];
