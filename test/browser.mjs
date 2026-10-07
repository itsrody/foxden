import * as urlkey from '../src/shared/urlkey.js';
import * as mime from '../src/shared/mime.js';
import * as googlefonts from '../src/shared/googlefonts.js';
import * as csp from '../src/shared/csp.js';
import * as fonts from '../src/fonts.js';

Object.assign(window, urlkey, mime, googlefonts, csp, fonts);
window.urls = {};

mocha.setup('bdd');

const fixtures = [
	'cdn-fontsgstatic', 'cdn-cloudflare', 'cdn-cloudflare-ajax', 'cdn-googleapis',
	'cdn-googleapis-fonts', 'cdn-jquery', 'cdn-ampproject', 'cdn-jsdelivr', 'cdn-unpkg',
];
for (const name of fixtures)
	await import(`./${name}.js`);

await import('./test.js');
mocha.run();
