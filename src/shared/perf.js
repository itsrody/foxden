"use strict";
// Pure helpers for dynamic local-CDN savings (request count / data / latency).
// Kept dependency-free so they run in both the background page and node tests.

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
