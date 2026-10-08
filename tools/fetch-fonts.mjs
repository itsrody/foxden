#!/usr/bin/env node
// Downloads Google Fonts woff2 files into resources/fonts/<family>/ for the
// bundled families. Regenerate the lookup with: npm run build:fonts
// Re-run to add families or refresh files: npm run build:fonts:fetch
//
// For each family the full static axis set is requested (same superset the
// background fetches at runtime), falling back to upright-only then to
// Google's defaults when a family lacks italic styles.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = path.join(rootDir, 'resources', 'fonts');

// gstatic path family -> css2 family param
const ALL_FAMILIES = [
	'inter:Inter',
	'arimo:Arimo',
	'dmsans:DM Sans',
	'nunitosans:Nunito Sans',
	'merriweather:Merriweather',
	'playfairdisplay:Playfair Display',
	'ubuntu:Ubuntu',
	'worksans:Work Sans',
	'jetbrainsmono:JetBrains Mono',
	'sourcesans3:Source Sans 3',
	// pre-existing bundle (refresh keeps filenames current as Google rotates
	// gstatic version dirs; stale entries safely fall back to fetch+embed)
	'lato:Lato',
	'montserrat:Montserrat',
	'notosans:Noto Sans',
	'opensans:Open Sans',
	'oswald:Oswald',
	'poppins:Poppins',
	'ptsans:PT Sans',
	'ptserif:PT Serif',
	'raleway:Raleway',
	'roboto:Roboto',
	'robotocondensed:Roboto Condensed',
	'robotomono:Roboto Mono',
	'robotoslab:Roboto Slab',
	'slabo27px:Slabo 27px',
	'sourcesanspro:Source Sans Pro',
	'youtubesans:YouTube Sans',
	'ytsans:YT Sans',
];

const only = new Set(process.argv.slice(2).map(a => a.toLowerCase()));
const FAMILIES = only.size
	? ALL_FAMILIES.filter(spec => only.has(spec.split(':')[0]))
	: ALL_FAMILIES;
if (!FAMILIES.length)
	throw new Error(`no families match: ${[...only].join(' ')}`);

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const fullAxes = `ital,wght@${WEIGHTS.map(w => `0,${w}`).join(';')};${WEIGHTS.map(w => `1,${w}`).join(';')}`;
const uprightAxes = `wght@${WEIGHTS.join(';')}`;

const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';

async function fetchCss(familyParam, axes)
{
	const params = new URLSearchParams();
	params.set('family', axes ? `${familyParam}:${axes}` : familyParam);
	params.set('display', 'swap');
	const url = 'https://fonts.googleapis.com/css2?' + params.toString();
	const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
	if (!resp.ok)
		throw new Error(`HTTP ${resp.status} for ${familyParam} (${axes || 'defaults'})`);
	return resp.text();
}

const URL_RE = /https?:\/\/fonts\.gstatic\.com\/s\/[a-z0-9]+\/v\d+\/[A-Za-z0-9_-]+\.(?:woff2|woff|ttf|eot|svg)/g;

let totalFiles = 0;
const failed = [];
for (const spec of FAMILIES)
{
	const [dir, param] = spec.split(':');
	let css = null;
	for (const axes of [fullAxes, uprightAxes, null])
	{
		try
		{
			css = await fetchCss(param, axes);
			console.log(`${dir}: css via ${axes ? axes.split(';').length + ' axes' : 'defaults'}`);
			break;
		}
		catch (err)
		{
			console.warn(`${dir}: ${err.message}, retrying`);
		}
	}
	if (!css)
	{
		console.error(`${dir}: FAILED, keeping existing files`);
		failed.push(dir);
		continue;
	}
	const urls = [...new Set(css.match(URL_RE) || [])];
	// Download everything first, then atomically replace the directory: stale
	// files from rotated gstatic version dirs must not linger, but a failed
	// refresh must never delete the working set.
	try
	{
		const pending = new Map();
		for (const fileUrl of urls)
		{
			const filename = new URL(fileUrl).pathname.split('/').pop();
			const resp = await fetch(fileUrl, { signal: AbortSignal.timeout(30000) });
			if (!resp.ok)
				throw new Error(`HTTP ${resp.status} for ${fileUrl}`);
			pending.set(filename, Buffer.from(await resp.arrayBuffer()));
		}
		const outDir = path.join(fontsDir, dir);
		rmSync(outDir, { recursive: true, force: true });
		mkdirSync(outDir, { recursive: true });
		for (const [filename, buf] of pending)
			writeFileSync(path.join(outDir, filename), buf);
	}
	catch (err)
	{
		console.error(`${dir}: download FAILED (${err.message}), keeping existing files`);
		failed.push(dir);
		continue;
	}
	totalFiles += urls.length;
	console.log(`${dir}: ${urls.length} files`);
}
console.log(`done: ${totalFiles} files in ${FAMILIES.length} families; now run npm run build:fonts`);
if (failed.length)
{
	console.error(`failed families (old files kept): ${failed.join(', ')}`);
	process.exitCode = 1;
}
