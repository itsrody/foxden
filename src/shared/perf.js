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
