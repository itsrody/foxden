import * as urlkey from '../src/shared/urlkey.js';
import * as mime from '../src/shared/mime.js';
import * as googlefonts from '../src/shared/googlefonts.js';
import * as csp from '../src/shared/csp.js';
import * as fonts from '../src/fonts.js';
import * as perf from '../src/shared/perf.js';
import * as vendor from '../src/vendor.js';
import * as cache from '../src/cache.js';
import * as stats from '../src/stats.js';
import * as timing from '../src/shared/timing.js';
import * as cssfix from '../src/shared/cssfix.js';

Object.assign(window, urlkey, mime, googlefonts, csp, fonts, perf, vendor, cache, stats, timing, cssfix);
window.urls = {};

mocha.setup('bdd');

const fixtures = [
	'cdn-fontsgstatic', 'cdn-cloudflare', 'cdn-cloudflare-ajax', 'cdn-googleapis',
	'cdn-googleapis-fonts', 'cdn-jquery', 'cdn-ampproject', 'cdn-jsdelivr', 'cdn-unpkg',
	'cdn-aspnetcdn', 'cdn-microsoft', 'cdn-staticfile', 'cdn-esm', 'cdn-fastly',
	'cdn-bootstrapcdn', 'cdn-fontawesome',
];
for (const name of fixtures)
	await import(`./${name}.js`);

await import('./test.js');
mocha.run();
