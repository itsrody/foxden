"use strict";
// Pure helpers for dynamic local-CDN savings (request count / data / latency).
// Kept browser-free so they run in both the background page and node tests.

import { cdnDomains } from './constants.js';

// Host-level matcher: resource hints point at bare origins
// (https://cdnjs.cloudflare.com), while interception is path-scoped
// (cdnjs.cloudflare.com/ajax/libs/). Hints need the looser match.
const cdnHostsRE = new RegExp('//(' + [...new Set(cdnDomains.map(m => m.split('/')[0]))].map(h => h.replace(/\W/g, '\\$&')).join('|') + ')(?=[/"\'\\s>])');

// Fast-path gate for the HTML transformer: chunks without any CDN marker
// skip the tag walks entirely (the common case on non-CDN pages).
export function hasCdnMarker(str)
{
	return cdnHostsRE.test(str);
}

export const MAX_DATA_URI_BYTES = 2_000_000;
export const LARGE_ENTRY_WARN_BYTES = 500_000;

export function shouldCancelSourcemap(urlString)
{
	try
	{
		const url = new URL(urlString);
		return url.pathname.endsWith(".map");
	}
	catch
	{
		return urlString.includes(".map?");
	}
}

export function shouldBypassLargeEntry(size)
{
	return typeof size === "number" && size > MAX_DATA_URI_BYTES;
}

// Unversioned entries (bare /latest / branch pins) have no version to compare,
// so without revalidation the first-seen bytes would be served forever.
// Entries older than this are refetched on next hit.
export const UNVERSIONED_REVALIDATE_MS = 24 * 3600 * 1000;

export function isStaleUnversioned(entry)
{
	return !!entry && entry.v === "" && (Date.now() - entry.created) > UNVERSIONED_REVALIDATE_MS;
}

// Sibling .min URL for a non-minified JS/CSS file, or null when the URL is
// already minified, not JS/CSS, or unparseable. Lets a miss store the smaller
// bytes so every later hit (min or full) serves minified content.
export function preferMinSibling(urlString)
{
	let u;
	try
	{
		u = new URL(urlString);
	}
	catch
	{
		return null;
	}
	const i = u.pathname.lastIndexOf("/");
	const file = u.pathname.slice(i + 1);
	if (!/\.(js|css)$/i.test(file))
		return null;
	if (/(?:\.min|-min|minified)\.(js|css)$/i.test(file))
		return null;
	u.pathname = u.pathname.replace(/\.(js|css)$/i, ".min.$1");
	u.hash = "";
	return u.href;
}

// Drop <link> resource hints (preconnect/dns-prefetch/preload/…) pointing at
// intercepted CDNs: the resources are served locally, so the DNS+TCP+TLS
// setups and speculative fetches are pure waste — preloaded gstatic fonts
// would even double-fetch next to our CSS-embedded copies. Stylesheet/icon
// links and first-party hints are never touched.
export function stripResourceHints(html)
{
	return html.replace(/<link[^>]+>/gi, m => {
		if (!cdnHostsRE.test(m))
			return m;
		const rel = m.match(/\brel\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
		if (!rel)
			return m;
		const rv = rel[1].toLowerCase();
		if (/stylesheet|icon/.test(rv))
			return m;
		if (!/(preconnect|dns-prefetch|preload|prefetch|modulepreload)/.test(rv))
			return m;
		return "<!--FoxDen hint-->";
	});
}

// Add decoding="async" to <img> tags lacking a decoding attribute: moves
// image decode off the main thread. No load-event or layout impact.
// (Runs on raw chunks, so an <img> string inside inline <script> text gets it
// too — equivalent to the author having written it.)
export function addAsyncDecoding(html)
{
	return html.replace(/<img\b[^>]*>/gi, m => {
		if (/\bdecoding\s*=/i.test(m))
			return m;
		return m.replace(/\/?>$/, ' decoding="async"$&');
	});
}

// Narrow Chrome-sniff detector for served JS (triage aid only — never
// mutates): window.chrome / chrome.webstore / HeadlessChrome references.
// Skips giant files to bound scan cost.
const CHROME_SNIFF_RE = /window\.chrome\b|chrome\.webstore\b|HeadlessChrome/;
export function findChromeSniff(text)
{
	if (typeof text !== "string" || text.length > 2000000)
		return null;
	const m = text.match(CHROME_SNIFF_RE);
	return m ? m[0] : null;
}

// Extract the src/href URL from a <script>/<link> tag. Returns null when the
// tag has no external reference (inline script, preload without href, ...).
export function extractTagSrc(tag)
{
	const m = tag.match(/\b(?:src|href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
	if (!m)
		return null;
	return m[1].replace(/^["']|["']$/g, "");
}

// Extract absolute nested CDN URLs from CSS text (@import + url()).
// Returns deduped absolute URLs; callers filter/prefetch them in background.
export function extractNestedCdnUrls(cssText, baseUrlString)
{
	if (!cssText || !baseUrlString)
		return [];
	let base;
	try
	{
		base = new URL(baseUrlString);
	}
	catch
	{
		return [];
	}
	const found = new Set();
	// @import "url" / @import url(...)
	const importRe = /@import\s+(?:url\()?["']?([^"'\)\s]+)["']?\)?/g;
	// url(...) — skip data:, moz-extension:, blob:
	const urlRe = /url\(\s*["']?([^"'\)\s]+)["']?\s*\)/g;
	let m;
	while ((m = importRe.exec(cssText)))
		addIfHttp(m[1]);
	while ((m = urlRe.exec(cssText)))
		addIfHttp(m[1]);
	function addIfHttp(raw)
	{
		if (!raw || raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("moz-extension:") || raw.startsWith("#"))
			return;
		try
		{
			found.add(new URL(raw, base).href);
		}
		catch
		{
			// ignore unresolvable relative URLs
		}
	}
	return [...found];
}
