"use strict";
// Blocking webRequest handler: look the CDN resource up in IndexedDB,
// fetch it once on miss, and serve it back as a data: URL.

import { logStyle, cdnDomainsRE } from './shared/constants.js';
import { getUID } from './shared/urlkey.js';
import { entryToDataUri } from './cache.js';
import { loadOrFetch, loadOrFetchLocal, warmCache } from './fetchcache.js';
import { addStats, addTabStats, setEntrySize, isTabDomainBlacklisted } from './stats.js';
import { handleGoogleFontsCss } from './fontcss.js';
import { getVendorFile } from './vendor.js';
import { absolutizeCssUrls } from './htmlfilter.js';
import { shouldCancelSourcemap, shouldBypassLargeEntry, extractNestedCdnUrls } from './shared/perf.js';
import { timeStage } from './shared/timing.js';

function replaceFontsOtherURLs(url, css)
{
	console.log(`%cJSLibCache: making CSS url()s absolute ${url}`, logStyle);
	return absolutizeCssUrls(url, css);
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
	// 1) Drop sourcemap/debug requests under CDNs: pure overhead, never rendered.
	if (shouldCancelSourcemap(req.url))
	{
		console.log(`%cJSLibCache: blocking sourcemap ${req.url}`, logStyle);
		return { cancel: true };
	}
	const settings = getSettings();
	const url = new URL(req.url);
	if (isTabDomainBlacklisted(req.tabId, settings.domainBlacklist))
	{
		console.log(`%cJSLibCache: stopping because domain is blacklisted`, logStyle);
		return;
	}
	if (url.hostname == "fonts.googleapis.com")
		return handleGoogleFontsCss(url, req, settings);

	const { uid: storKey, version: versi } = getUID(url);
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
			console.log(`%cJSLibCache: ${storKey} served from vendor bundle`, logStyle);
			const isCss = entry.contentType && entry.contentType.startsWith("text/css");
			const base = new URL(vendorUrl);
			return { redirectUrl: entryToDataUri(entry, isCss ? data => absolutizeCssUrls(base, data) : null, `vendor|${storKey}|${entry.v}|${entry.size}`) };
		}
		catch (err)
		{
			console.warn(`%cJSLibCache: vendor bundle failed for ${storKey}: ${err}`, logStyle);
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
		console.warn(`%cJSLibCache: fetch error for ${req.url}: ${err}`, logStyle);
		return;
	}
	timeStage('cache', t1);
	if (!entry)
		return;
	setEntrySize(storKey, entry.size);

	// 2) Skip giant data: URIs (>2MB): fall through to network + browser cache
	// instead of paying base64/encodeURIComponent expansion + CSP churn.
	if (shouldBypassLargeEntry(entry.size))
	{
		console.log(`%cJSLibCache: bypassing large entry ${storKey} (${entry.size}B)`, logStyle);
		return;
	}

	const isCss = entry.contentType && entry.contentType.startsWith("text/css");
	const memoKey = isCss
		? `css|${storKey}|${entry.v}|${entry.size}|${url.href}`
		: `${storKey}|${entry.v}|${entry.size}`;
	const t2 = performance.now();
	const redirectUrl = entryToDataUri(entry, isCss ? data => replaceFontsOtherURLs(url, data) : null, memoKey);
	timeStage('encode', t2);

	// 3) Warm nested CDN deps in background so follow-on requests hit cache.
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
