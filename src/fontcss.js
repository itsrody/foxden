"use strict";
// fonts.googleapis.com/css(2) request pipeline: serve per-family CSS from the
// cache, fetching from Google once (with the original request's axis specs and
// display param), and rewrite fonts.gstatic.com URLs to bundled fonts.

import { logStyle } from './shared/constants.js';
import { getFamiliesFromGoogleFontCSSURL, getFamilyParamsFromGoogleFontCSSURL } from './shared/googlefonts.js';
import { cacheGet, cachePut, entryToDataUri } from './cache.js';
import { getUID } from './shared/urlkey.js';
import { loadOrFetch } from './fetchcache.js';
import { addStats, addTabStats } from './stats.js';
import { replaceFontsGstaticURLs, collectGstaticFontUrls, GSTATIC_FONT_URL_RE } from './fonts.js';
import { addStandardFallbacks, ensureFontDisplaySwap } from './shared/cssfix.js';

const FETCH_TIMEOUT_MS = 8000;
const inflight = new Map();

function familyCacheKey(family)
{
	return 'font/' + family + ' css';
}

async function fetchFamilyCss(familyParam, display)
{
	const params = new URLSearchParams();
	params.set('family', familyParam);
	// subset/text are intentionally not forwarded: the full family CSS is a
	// safe superset of any subset/text-limited stylesheet
	if (display)
		params.set('display', display);
	const url = 'https://fonts.googleapis.com/css2?' + params.toString();
	const init = /** @type {RequestInit & {referer?: string}} */ ({
		"referer": "no-referrer",
		"redirect": "error",
		"credentials": "omit",
		"signal": AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	const resp = await fetch(url, init);
	if (!resp.ok)
		throw new Error("HTTP " + resp.status + " for " + familyParam);
	return resp.text();
}

async function fetchFamilyCssWithFallback(familyParam, display)
{
	try
	{
		return await fetchFamilyCss(familyParam, display);
	}
	catch (err)
	{
		// axis specs can be rejected (e.g. legacy /css values); retry with the default full axis set
		console.warn(`%cFoxDen: faithful fetch failed (${err}), using default axes for ${familyParam}`, logStyle);
		const fallback = familyParam.split(':')[0] +
			':ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900';
		return fetchFamilyCss(fallback, display);
	}
}

async function getFamilyCss(family, familyParam, display)
{
	const storKey = familyCacheKey(family);
	let items = await cacheGet(storKey);
	if (items)
		return items.data;
	if (!inflight.has(storKey))
	{
		inflight.set(storKey, (async () => {
			try
			{
				const text = await fetchFamilyCssWithFallback(familyParam, display);
				await cachePut(storKey, {
					created: Date.now(),
					url: 'family:' + family,
					v: "0",
					contentType: 'text/css; charset=utf-8',
					kind: 'text',
					data: text,
					size: text.length,
					// same shape as entryFromResponse rows (validators unused
					// for font CSS — keeps one hidden class for entry readers)
					etag: null,
					modified: null,
				});
				return text;
			}
			catch (err)
			{
				console.warn(`%cFoxDen: fetching failed for font family ${family}: ${err}`, logStyle);
				return "/* ERRGF001 */"; // not cached: transient failures must not poison the cache
			}
		})().finally(() => inflight.delete(storKey)));
	}
	return inflight.get(storKey);
}

// Fetch the font files still referenced by the CSS (bundled ones were already
// rewritten away) and inline them as data: URIs. A webRequest redirect to data:
// cannot be used for font requests — Firefox's CORS check blocks it (Bugzilla
// 1645683) — so the embedding has to happen in the stylesheet itself. On fetch
// failure the original URL is left in place, which with the 'font' listener
// type disabled means the browser just loads it from Google directly.
async function embedGstaticFonts(css, tabId)
{
	const fontUrls = collectGstaticFontUrls(css);
	if (fontUrls.length === 0)
		return css;
	console.log(`%cFoxDen: embedding ${fontUrls.length} gstatic font file(s) as data: URIs`, logStyle);
	const statsKeys = [];
	for (const fontUrl of fontUrls)
	{
		try { statsKeys.push(getUID(new URL(fontUrl)).uid); }
		catch { /* not cacheable by key: still embedded below */ }
	}
	statsKeys.forEach(storKey => addStats(storKey));
	queueMicrotask(() => addTabStats(tabId, statsKeys));

	const embedded = new Map();
	await Promise.all(fontUrls.map(async (fontUrl) =>
	{
		try
		{
			const { uid: storKey, version: versi } = getUID(new URL(fontUrl));
			const entry = await loadOrFetch(storKey, versi, fontUrl);
			if (entry)
				embedded.set(fontUrl, entryToDataUri(entry, null, `${storKey}|${entry.v}|${entry.size}`));
		}
		catch (err)
		{
			console.warn(`%cFoxDen: font embedding failed for ${fontUrl}: ${err}`, logStyle);
		}
	}));
	if (embedded.size === 0)
		return css;
	return css.replace(GSTATIC_FONT_URL_RE, m => embedded.get(m) || m);
}

export async function handleGoogleFontsCss(url, req, settings)
{
	const families = [...new Set(getFamiliesFromGoogleFontCSSURL(url))];
	const familyParams = getFamilyParamsFromGoogleFontCSSURL(url);
	const display = new URLSearchParams(url.search).get('display');
	if (!families.length)
		return;
	const storKeys = families.map(familyCacheKey);
	storKeys.forEach(storKey => addStats(storKey));
	queueMicrotask(() => addTabStats(req.tabId, storKeys));
	console.log(`%cFoxDen: serving CSS for these font families from googlefonts: ${families.join(", ")}`, logStyle);
	const cssParts = await Promise.all(families.map((family, i) => getFamilyCss(family, familyParams[i] || family, display)));
	const rewritten = replaceFontsGstaticURLs(cssParts.join("\n"), settings.blockUnknownGoogleFonts);
	const css = ensureFontDisplaySwap(addStandardFallbacks(await embedGstaticFonts(rewritten, req.tabId)));
	const dataURI = 'data:text/css;charset=utf-8,' + encodeURIComponent('/*FoxDen*/' + css);
	return { redirectUrl: dataURI };
}
