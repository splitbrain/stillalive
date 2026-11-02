import globals from 'globals';

export default [
	{
		files: ['js/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.browser,
		},
		rules: {
			'no-undef': 'error',
			'no-redeclare': 'error',
			'no-var': 'error',
		},
	},
];
