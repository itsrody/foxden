"use strict";
// Shared fetch-once helper: look a resource up in IndexedDB, fetch it on miss,
// and return the cache entry. Used by the CDN redirect pipeline and the
// Google Fonts CSS embedder (they must not import each other).

import { logStyle } from './shared/constants.js';
import { isNewerPointVersion } from './shared/urlkey.js';
import { cacheGet, cachePut, entryFromResponse } from './cache.js';

const FETCH_TIMEOUT_MS = 20000;
const inflight = new Map();

export async function loadOrFetch(storKey, versi, requestUrl)
{
	let entry = await cacheGet(storKey);
	if (entry && !isNewerPointVersion(versi, entry.v))
	{
		console.log(`%cJSLibCache: ${storKey} retrieved from local storage`, logStyle);
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
			return newEntry;
		})().finally(() => inflight.delete(storKey)));
	}
	return inflight.get(storKey);
}
