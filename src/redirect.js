"use strict";
// Blocking webRequest handler: look the CDN resource up in IndexedDB,
// fetch it once on miss, and serve it back as a data: URL.

import { logStyle, cdnDomainsRE } from './shared/constants.js';
import { getUID } from './shared/urlkey.js';
import { entryToDataUri } from './cache.js';
import { loadOrFetch, loadOrFetchLocal, loadVerifiedFirstParty, warmCache } from './fetchcache.js';
import { addStats, addTabStats, setEntrySize, isTabDomainBlacklisted } from './stats.js';
import { handleGoogleFontsCss } from './fontcss.js';
import { getVendorFile, getVendorByBasename } from './vendor.js';
import { absolutizeCssUrls } from './htmlfilter.js';
import { shouldCancelSourcemap, shouldBypassLargeEntry, extractNestedCdnUrls, findChromeSniff } from './shared/perf.js';
import { isModuleBypassed } from './shared/modulebypass.js';
import { addStandardFallbacks, ensureFontDisplaySwap } from './shared/cssfix.js';
import { timeStage, beginRequest, noteServedBytes, noteFpHit } from './shared/timing.js';

function replaceFontsOtherURLs(url, css)
{
	console.log(`%cFoxDen: making CSS url()s absolute ${url}`, logStyle);
	return absolutizeCssUrls(url, css);
}

// Final CSS shaping for served stylesheets: absolutize, then additive
// firefoxification (standard fallbacks + font-display:swap).
function finalizeCss(baseUrl, css)
{
	return ensureFontDisplaySwap(addStandardFallbacks(replaceFontsOtherURLs(baseUrl, css)));
}

// Compat triage, once per unique entry: flag Chrome-only sniffs in served
// JS so real compat reports name the lib. Never mutates the bytes.
const sniffSeen = new Set();
const SNIFF_SEEN_MAX = 1000;

function maybeNoteChromeSniff(storKey, entry)
{
	if (entry.kind !== 'text')
		return;
	const key = `${storKey}|${entry.v}|${entry.size}`;
	if (sniffSeen.has(key))
		return;
	if (sniffSeen.size >= SNIFF_SEEN_MAX)
		sniffSeen.clear();
	sniffSeen.add(key);
	const sniff = findChromeSniff(entry.data);
	if (sniff)
		console.log(`%cFoxDen: ${storKey} references ${sniff} — possible Chrome-only code path`, logStyle);
}

// Shared by the main CDN listener (script/stylesheet) and the sourcemap
// blocker below (xmlhttprequest/other): .map files are never rendered.
export function shouldCancelSourcemapRequest(req)
{
	return shouldCancelSourcemap(req.url);
}

export async function redirectRequestCDN(req, getSettings)
{
	const t0 = performance.now();
	beginRequest(req.requestId, req.timeStamp);
	// 1) Drop sourcemap/debug requests under CDNs (first-party maps belong to
	// site developers' devtools — never touch those).
	if (shouldCancelSourcemap(req.url) && cdnDomainsRE.test(req.url))
	{
		console.log(`%cFoxDen: blocking sourcemap ${req.url}`, logStyle);
		return { cancel: true };
	}
	const settings = getSettings();
	const url = new URL(req.url);
	if (isTabDomainBlacklisted(req.tabId, settings.domainBlacklist))
	{
		console.log(`%cFoxDen: stopping because domain is blacklisted`, logStyle);
		return;
	}
	if (url.hostname == "fonts.googleapis.com")
		return handleGoogleFontsCss(url, req, settings);

	// Same-origin (or off-list) hosts: only versioned vendor-basename matches
	// qualify, and only after hash verification. Everything else is a µs miss.
	if (!cdnDomainsRE.test(req.url))
		return redirectFirstParty(req, url);

	const { uid: storKey, version: versi } = getUID(url);
	// Module scripts recorded by the HTML scan load from the network so
	// their relative imports keep resolving; integrity was left intact.
	if (isModuleBypassed(req.tabId, storKey))
	{
		console.log(`%cFoxDen: passing module through to network ${req.url}`, logStyle);
		return;
	}
	timeStage('lookup', t0);
	addStats(storKey);
	// Badge IPC stays off the blocking path: microtasks run before any later
	// event (including navigations that reset tab stats), so no count is lost.
	const tabKeys = [storKey];
	const tabId = req.tabId;
	queueMicrotask(() => addTabStats(tabId, tabKeys));

	// Bundled top-N libs seed the cache with zero CDN contact. Falls through
	// to the normal fetch-once path when unbundled or on any local failure.
	const vendorUrl = getVendorFile(storKey, versi);
	if (vendorUrl)
	{
		try
		{
			const entry = await loadOrFetchLocal(storKey, versi, vendorUrl);
			setEntrySize(storKey, entry.size);
			noteServedBytes(entry.size);
			console.log(`%cFoxDen: ${storKey} served from vendor bundle`, logStyle);
			const isCss = entry.contentType && entry.contentType.startsWith("text/css");
			const base = new URL(vendorUrl);
			return { redirectUrl: entryToDataUri(entry, isCss ? data => finalizeCss(base, data) : null, `vendor|${storKey}|${entry.v}|${entry.size}`) };
		}
		catch (err)
		{
			console.warn(`%cFoxDen: vendor bundle failed for ${storKey}: ${err}`, logStyle);
		}
	}

	let entry;
	const t1 = performance.now();
	try
	{
		entry = await loadOrFetch(storKey, versi, req.url);
	}
	catch (err)
	{
		console.warn(`%cFoxDen: fetch error for ${req.url}: ${err}`, logStyle);
		return;
	}
	timeStage('cache', t1);
	if (!entry)
		return;
	setEntrySize(storKey, entry.size);
	noteServedBytes(entry.size);

	// 2) Skip giant data: URIs (>2MB): fall through to network + browser cache
	// instead of paying base64/encodeURIComponent expansion + CSP churn.
	if (shouldBypassLargeEntry(entry.size))
	{
		console.log(`%cFoxDen: bypassing large entry ${storKey} (${entry.size}B)`, logStyle);
		return;
	}

	const isCss = entry.contentType && entry.contentType.startsWith("text/css");
	if (!isCss)
		maybeNoteChromeSniff(storKey, entry);
	const memoKey = isCss
		? `css|${storKey}|${entry.v}|${entry.size}|${url.href}`
		: `${storKey}|${entry.v}|${entry.size}`;
	const t2 = performance.now();
	const redirectUrl = entryToDataUri(entry, isCss ? data => finalizeCss(url, data) : null, memoKey);
	timeStage('encode', t2);

	// 3) Warm nested CDN deps in background so follow-on requests hit cache.
	if (isCss && typeof entry.data === "string")
		warmNestedCss(entry.data, req.url);

	return { redirectUrl };
}

// First-party path: self-hosted copies of bundled top-N libs, served from
// the shared cache entry only after SHA-256 verification against the pinned
// file. Customized builds fail closed into a per-URL pass-through.
async function redirectFirstParty(req, url)
{
	const t0 = performance.now();
	const hit = getVendorByBasename(req.url);
	if (!hit)
		return;
	if (isModuleBypassed(req.tabId, hit.uid))
	{
		console.log(`%cFoxDen: passing first-party module through to network ${req.url}`, logStyle);
		return;
	}
	timeStage('lookup', t0);
	addStats(hit.uid);
	const tabId = req.tabId;
	const tabKeys = [hit.uid];
	queueMicrotask(() => addTabStats(tabId, tabKeys));

	let entry;
	const t1 = performance.now();
	try
	{
		entry = await loadVerifiedFirstParty(hit.uid, hit.version, req.url, hit.fileUrl);
	}
	catch (err)
	{
		console.warn(`%cFoxDen: first-party verify error for ${req.url}: ${err}`, logStyle);
		return;
	}
	timeStage('cache', t1);
	if (!entry)
		return;
	setEntrySize(hit.uid, entry.size);
	noteServedBytes(entry.size);
	noteFpHit();
	console.log(`%cFoxDen: first-party ${req.url} served from shared cache (${hit.uid})`, logStyle);

	if (shouldBypassLargeEntry(entry.size))
		return;

	const isCss = entry.contentType && entry.contentType.startsWith("text/css");
	if (!isCss)
		maybeNoteChromeSniff(hit.uid, entry);
	const memoKey = isCss
		? `fp|${hit.uid}|${entry.v}|${entry.size}|${url.href}`
		: `${hit.uid}|${entry.v}|${entry.size}`;
	const t2 = performance.now();
	const redirectUrl = entryToDataUri(entry, isCss ? data => finalizeCss(url, data) : null, memoKey);
	timeStage('encode', t2);

	if (isCss && typeof entry.data === "string")
		warmNestedCss(entry.data, req.url);

	return { redirectUrl };
}

function warmNestedCss(cssText, baseUrl)
{
	let nested;
	try
	{
		nested = extractNestedCdnUrls(cssText, baseUrl);
	}
	catch
	{
		return;
	}
	for (const abs of nested)
	{
		if (!cdnDomainsRE.test(abs))
			continue;
		let uid, version;
		try
		{
			({ uid, version } = getUID(new URL(abs)));
		}
		catch
		{
			continue;
		}
		void warmCache(uid, version, abs);
	}
}
