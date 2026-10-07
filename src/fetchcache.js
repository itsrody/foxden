"use strict";
// Shared fetch-once helper: look a resource up in IndexedDB, fetch it on miss,
// and return the cache entry. Used by the CDN redirect pipeline and the
// Google Fonts CSS embedder (they must not import each other).

import { logStyle } from './shared/constants.js';
import { isNewerPointVersion } from './shared/urlkey.js';
import { cacheGet, cachePut, entryFromResponse } from './cache.js';

const FETCH_TIMEOUT_MS = 6000;
const inflight = new Map();

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
	if (isNewerPointVersion(versi, entry.v))
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

// Fire-and-forget warming: prefetch a URL into cache without blocking the
// current redirect. Failures are swallowed — the follow-on request falls
// through to network as before.
export async function warmCache(storKey, versi, requestUrl)
{
	try
	{
		await loadOrFetch(storKey, versi, requestUrl);
	}
	catch
	{
		// warming must never break the page
	}
}

export async function loadOrFetch(storKey, versi, requestUrl)
{
	const hot = hotGet(storKey, versi);
	if (hot)
	{
		console.log(`%cJSLibCache: ${storKey} retrieved from hot cache`, logStyle);
		return hot;
	}
	let entry = await cacheGet(storKey);
	if (entry && !isNewerPointVersion(versi, entry.v))
	{
		console.log(`%cJSLibCache: ${storKey} retrieved from local storage`, logStyle);
		hotSet(storKey, entry);
		return entry;
	}
	if (entry)
		console.log(`%cJSLibCache: upgrading ${storKey} from ${entry.v} to ${versi}`, logStyle);

	if (!inflight.has(storKey))
	{
		inflight.set(storKey, (async () => {
			console.log(`%cJSLibCache: ${requestUrl} fetching`, logStyle);
			const init = /** @type {RequestInit & {referer?: string}} */ ({
				"referer": "no-referrer", // *client, no-referrer
				"redirect": "follow", // manual, follow, error
				"credentials": "omit", // include, *omit, same-origin
				"signal": AbortSignal.timeout(FETCH_TIMEOUT_MS),
			});
			const resp = await fetch(requestUrl, init);
			if (!resp.ok)
			{
				const contentType = resp.headers.get('content-type');
				console.warn(`%cJSLibCache: fetching failed: ${requestUrl} ${contentType} ${resp.status}`, logStyle);
				inflight.delete(storKey);
				return null; // do not cache failures
			}
			const newEntry = await entryFromResponse(resp, requestUrl, versi);
			await cachePut(storKey, newEntry);
			hotSet(storKey, newEntry);
			return newEntry;
		})().finally(() => inflight.delete(storKey)));
	}
	return inflight.get(storKey);
}
