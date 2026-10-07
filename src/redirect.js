"use strict";
// Blocking webRequest handler: look the CDN resource up in IndexedDB,
// fetch it once on miss, and serve it back as a data: URL.

import { logStyle } from './shared/constants.js';
import { getUID } from './shared/urlkey.js';
import { entryToDataUri } from './cache.js';
import { loadOrFetch } from './fetchcache.js';
import { addStats, addTabStats, isTabDomainBlacklisted } from './stats.js';
import { handleGoogleFontsCss } from './fontcss.js';
import { absolutizeCssUrls } from './htmlfilter.js';

function replaceFontsOtherURLs(url, css)
{
	console.log(`%cJSLibCache: making CSS url()s absolute ${url}`, logStyle);
	return absolutizeCssUrls(url, css);
}

export async function redirectRequestCDN(req, getSettings)
{
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
	addStats(storKey);
	addTabStats(req.tabId, [storKey]);

	let entry;
	try
	{
		entry = await loadOrFetch(storKey, versi, req.url);
	}
	catch (err)
	{
		console.warn(`%cJSLibCache: fetch error for ${req.url}: ${err}`, logStyle);
		return;
	}
	if (!entry)
		return;

	return { redirectUrl: entryToDataUri(entry, entry.contentType && entry.contentType.startsWith("text/css") ? data => replaceFontsOtherURLs(url, data) : null) };
}
