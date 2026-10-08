"use strict";
// Shared fetch-once helper: look a resource up in IndexedDB, fetch it on miss,
// and return the cache entry. Used by the CDN redirect pipeline and the
// Google Fonts CSS embedder (they must not import each other).

import { logStyle } from './shared/constants.js';
import { isNewerPointVersion, canonicalFetchUrl } from './shared/urlkey.js';
import { cacheGet, cachePut, entryFromResponse } from './cache.js';
import { isStaleUnversioned, preferMinSibling } from './shared/perf.js';
import { sha256Hex } from './vendor.js';

export { UNVERSIONED_REVALIDATE_MS } from './shared/perf.js';

const FETCH_TIMEOUT_MS = 6000;
const inflight = new Map();

// Sibling URLs already proven to have no .min twin (session-only): avoids a
// wasted 404 fetch on every miss for min-less libraries.
const knownNoMin = new Set();

export function clearKnownNoMin()
{
	knownNoMin.clear();
}

// Hot in-memory entry cache: skips IndexedDB on repeat hits within the
// session. Entries are immutable unless point-upgraded, so no TTL needed;
// LRU-capped to bound memory.
const hotEntries = new Map();
const HOT_ENTRIES_MAX = 200;

function hotGet(storKey, versi)
{
	const entry = hotEntries.get(storKey);
	if (!entry)
		return null;
	if (isNewerPointVersion(versi, entry.v) || isStaleUnversioned(entry))
	{
		hotEntries.delete(storKey);
		return null;
	}
	// LRU refresh
	hotEntries.delete(storKey);
	hotEntries.set(storKey, entry);
	return entry;
}

function hotSet(storKey, entry)
{
	if (hotEntries.size >= HOT_ENTRIES_MAX)
	{
		const oldest = hotEntries.keys().next();
		if (!oldest.done)
			hotEntries.delete(oldest.value);
	}
	hotEntries.set(storKey, entry);
}

export function clearHotEntries()
{
	hotEntries.clear();
}

// Seed the hot cache (used by vendor preload at startup): top-library hits
// become pure memory lookups — no IndexedDB, no fetch, no encode on repeat.
export function primeHotCache(storKey, entry)
{
	hotSet(storKey, entry);
}

// Fire-and-forget warming: prefetch a URL into cache without blocking the
// current redirect. Failures are swallowed — the follow-on request falls
// through to network as before.
export async function warmCache(storKey, versi, requestUrl)
{
	try
	{
		// Speculation yields to metered links (no-op where unsupported).
		const nav = /** @type {*} */ (typeof navigator !== "undefined" ? navigator : null);
		if (nav && nav.connection && nav.connection.saveData)
			return;
		await loadOrFetch(storKey, versi, requestUrl);
	}
	catch
	{
		// warming must never break the page
	}
}

// Packaged-file seeding: fetch a moz-extension:// vendor/fallback file into
// the cache. Zero CDN contact — failures fall through to the normal pipeline.
export async function loadOrFetchLocal(storKey, versi, fileUrl)
{
	const hot = hotGet(storKey, versi);
	if (hot)
		return hot;
	let entry = await cacheGet(storKey);
	if (entry && !isNewerPointVersion(versi, entry.v) && !isStaleUnversioned(entry))
	{
		hotSet(storKey, entry);
		return entry;
	}
	const resp = await fetch(fileUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	if (!resp.ok)
		throw new Error("HTTP " + resp.status + " for " + fileUrl);
	const newEntry = await entryFromResponse(resp, fileUrl, versi);
	await cachePut(storKey, newEntry);
	hotSet(storKey, newEntry);
	return newEntry;
}

// First-party hash verification: a self-hosted copy is served from the shared
// cache entry only when its bytes equal the pinned vendor file (SHA-256).
// Customized builds fail closed into a permanent per-URL pass-through.
// Versioned filenames are web-cache immutable by convention, so a verified
// entry is treated like any other versioned entry afterwards.
const fpNegative = new Set();
const FP_NEG_MAX = 1000;

export function clearFpNegative()
{
	fpNegative.clear();
}

export async function loadVerifiedFirstParty(storKey, versi, requestUrl, vendorFileUrl)
{
	if (fpNegative.has(requestUrl))
		return null;
	const hot = hotGet(storKey, versi);
	if (hot)
		return hot;
	const known = await cacheGet(storKey);
	if (known && !isNewerPointVersion(versi, known.v) && !isStaleUnversioned(known))
	{
		hotSet(storKey, known);
		return known;
	}
	const init = /** @type {RequestInit & {referer?: string}} */ ({
		"referer": "no-referrer",
		"redirect": "follow",
		"credentials": "omit",
		"signal": AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	const [siteResp, pkgResp] = await Promise.all([
		fetch(requestUrl, init),
		fetch(vendorFileUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
	]);
	if (!siteResp.ok || !pkgResp.ok)
		return null; // transient: retry next time, never memoize failures
	const [siteBuf, pkgBuf] = await Promise.all([siteResp.arrayBuffer(), pkgResp.arrayBuffer()]);
	if (await sha256Hex(siteBuf) !== await sha256Hex(pkgBuf))
	{
		console.log(`%cFoxDen: first-party ${requestUrl} differs from vendor bundle, passing through`, logStyle);
		if (fpNegative.size >= FP_NEG_MAX)
			fpNegative.clear();
		fpNegative.add(requestUrl);
		return null;
	}
	const entry = await entryFromResponse(new Response(pkgBuf, { headers: pkgResp.headers }), requestUrl, versi);
	await cachePut(storKey, entry);
	hotSet(storKey, entry);
	return entry;
}

export async function loadOrFetch(storKey, versi, requestUrl)
{
	const hot = hotGet(storKey, versi);
	if (hot)
	{
		console.log(`%cFoxDen: ${storKey} retrieved from hot cache`, logStyle);
		return hot;
	}
	let entry = await cacheGet(storKey);
	if (entry && !isNewerPointVersion(versi, entry.v) && !isStaleUnversioned(entry))
	{
		console.log(`%cFoxDen: ${storKey} retrieved from local storage`, logStyle);
		hotSet(storKey, entry);
		return entry;
	}
	if (entry && isStaleUnversioned(entry))
		console.log(`%cFoxDen: revalidating stale unversioned ${storKey}`, logStyle);
	if (entry)
		console.log(`%cFoxDen: upgrading ${storKey} from ${entry.v} to ${versi}`, logStyle);

	if (!inflight.has(storKey))
	{
		inflight.set(storKey, (async () => {
			// Fetch from the canonical mirror host (same bytes, shared TLS +
			// keep-alive pool); the UID already abstracts the page's host away.
			const fetchUrl = canonicalFetchUrl(requestUrl);
			if (fetchUrl !== requestUrl)
				console.log(`%cFoxDen: canonicalizing fetch ${requestUrl} → ${fetchUrl}`, logStyle);
			console.log(`%cFoxDen: ${fetchUrl} fetching`, logStyle);
			const init = /** @type {RequestInit & {referer?: string}} */ ({
				"referer": "no-referrer", // *client, no-referrer
				"redirect": "follow", // manual, follow, error
				"credentials": "omit", // include, *omit, same-origin
				"signal": AbortSignal.timeout(FETCH_TIMEOUT_MS),
			});
			// Conditional revalidation: unchanged bytes come back as 304 with
			// no body — touch the date, keep serving the stored entry.
			if (entry && (entry.etag || entry.modified))
			{
				init.headers = {};
				if (entry.etag)
					init.headers["If-None-Match"] = entry.etag;
				if (entry.modified)
					init.headers["If-Modified-Since"] = entry.modified;
			}
			// Prefer the minified sibling on a miss: same release, smaller
			// bytes for every later hit (min and full share one UID).
			const minUrl = preferMinSibling(fetchUrl);
			if (minUrl && !knownNoMin.has(minUrl))
			{
				try
				{
					const minResp = await fetch(minUrl, init);
					if (minResp.ok)
					{
						console.log(`%cFoxDen: storing minified bytes for ${storKey}`, logStyle);
						const minEntry = await entryFromResponse(minResp, minUrl, versi);
						await cachePut(storKey, minEntry);
						hotSet(storKey, minEntry);
						return minEntry;
					}
					knownNoMin.add(minUrl);
				}
				catch
				{
					// fall through to the requested URL
				}
			}
			const resp = await fetch(fetchUrl, init);
			if (resp.status === 304 && entry)
			{
				console.log(`%cFoxDen: ${storKey} revalidated (304), keeping ${entry.size}B`, logStyle);
				entry.created = Date.now();
				await cachePut(storKey, entry);
				hotSet(storKey, entry);
				return entry;
			}
			if (!resp.ok)
			{
				const contentType = resp.headers.get('content-type');
				console.warn(`%cFoxDen: fetching failed: ${fetchUrl} ${contentType} ${resp.status}`, logStyle);
				inflight.delete(storKey);
				return null; // do not cache failures
			}
			const newEntry = await entryFromResponse(resp, fetchUrl, versi);
			await cachePut(storKey, newEntry);
			hotSet(storKey, newEntry);
			return newEntry;
		})().finally(() => inflight.delete(storKey)));
	}
	return inflight.get(storKey);
}
