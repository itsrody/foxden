import js from '@eslint/js';
import globals from 'globals';

const webextGlobals = {
	browser: 'readonly',
	chrome: 'readonly',
	indexedDB: 'readonly',
};

export default [
	{
		ignores: [
			'node_modules/**',
			'web-ext-artifacts/**',
			'resources/**',
			'test/mocha.js',
			'test/chai.js',
			'test/cdn-*.js',
		],
	},
	js.configs.recommended,
	{
		rules: {
			'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
			'no-undef': 'error',
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-useless-escape': 'off',
		},
	},
	{
		files: ['src/**/*.js'],
		languageOptions: {
			sourceType: 'module',
			globals: { ...globals.browser, ...webextGlobals },
		},
	},
	{
		files: ['src/shared/urlkey.js'],
		rules: {
			// ported legacy parser: assignment-in-condition + regex escape style are intentional
			'no-cond-assign': 'off',
		},
	},
	{
		files: ['test/*.mjs', 'tools/*.mjs', 'eslint.config.js'],
		languageOptions: {
			sourceType: 'module',
			globals: { ...globals.node, ...webextGlobals, mocha: 'readonly', window: 'readonly', document: 'readonly' },
		},
	},
	{
		files: ['test/test.js'],
		languageOptions: {
			sourceType: 'script',
			globals: {
				...globals.browser, ...webextGlobals,
				chai: 'readonly', mocha: 'readonly', urls: 'writable',
				describe: 'readonly', it: 'readonly', expect: 'readonly',
				getVersionNameExt: 'readonly', getUID: 'readonly', isMimeTextual: 'readonly',
				canonicalizeVersion: 'readonly', canonicalizeName: 'readonly', isNewerPointVersion: 'readonly',
				getFamiliesFromGoogleFontCSSURL: 'readonly', versionsMatch: 'readonly',
				allowDataUriInCsp: 'readonly', rewriteGstaticCss: 'readonly',
				collectGstaticFontUrls: 'readonly',
				shouldCancelSourcemap: 'readonly', shouldBypassLargeEntry: 'readonly',
				extractNestedCdnUrls: 'readonly', extractTagSrc: 'readonly',
				isStaleUnversioned: 'readonly', UNVERSIONED_REVALIDATE_MS: 'readonly',
				vendorFileForKey: 'readonly',
			},
		},
		rules: {
			'no-unused-vars': 'off',
			'no-redeclare': 'off',
		},
	},
];
