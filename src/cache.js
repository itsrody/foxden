"use strict";
// IndexedDB-backed resource cache + stats store.
// entries: storKey -> { created, url, v, contentType, kind: "text"|"bytes", data, size }
// stats:   storKey -> { created, hits, last, size? }

import { logStyle } from './shared/constants.js';
import { isMimeTextual, bytesToBase64, base64ToBytes } from './shared/mime.js';

const DB_NAME = 'jslibcache';
const DB_VERSION = 1;
const ENTRIES = 'entries';
const STATS = 'stats';
const SCHEMA_KEY = '_jslcSchema';
const SCHEMA_VERSION = 2;
const LEGACY_META_KEYS = new Set(['_stats', SCHEMA_KEY]);

let dbPromise = null;

function openDB()
{
	if (dbPromise)
		return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(ENTRIES))
				db.createObjectStore(ENTRIES);
			if (!db.objectStoreNames.contains(STATS))
			{
				const store = db.createObjectStore(STATS);
				store.createIndex('byLast', 'last');
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

function txDone(tx)
{
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve(undefined);
		tx.onabort = () => reject(tx.error);
		tx.onerror = () => reject(tx.error);
	});
}

function reqResult(req)
{
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function cacheGet(key)
{
	const db = await openDB();
	const tx = db.transaction(ENTRIES, 'readonly');
	return reqResult(tx.objectStore(ENTRIES).get(key));
}

export async function cachePut(key, entry)
{
	const db = await openDB();
	const tx = db.transaction(ENTRIES, 'readwrite');
	tx.objectStore(ENTRIES).put(entry, key);
	return txDone(tx);
}

export async function cacheDelete(keys)
{
	if (!keys.length)
		return;
	const db = await openDB();
	const tx = db.transaction(ENTRIES, 'readwrite');
	const store = tx.objectStore(ENTRIES);
	for (const key of keys)
		store.delete(key);
	return txDone(tx);
}

export async function cacheClear()
{
	const db = await openDB();
	const tx = db.transaction([ENTRIES, STATS], 'readwrite');
	tx.objectStore(ENTRIES).clear();
	tx.objectStore(STATS).clear();
	return txDone(tx);
}

export async function cacheSummary()
{
	const db = await openDB();
	const tx = db.transaction(ENTRIES, 'readonly');
	const count = await reqResult(tx.objectStore(ENTRIES).count());
	return { count };
}

export async function statsLoad()
{
	const db = await openDB();
	const tx = db.transaction(STATS, 'readonly');
	const store = /** @type {*} */ (tx.objectStore(STATS));
	// getAllRecords() (FF153+) fetches keys+values in one trip; fall back to
	// the two-request form where unavailable.
	if (typeof store.getAllRecords === 'function')
	{
		const records = await reqResult(store.getAllRecords());
		const result = {};
		for (const rec of records)
			result[rec.key] = rec.value;
		return result;
	}
	const keys = await reqResult(store.getAllKeys());
	const values = await reqResult(store.getAll());
	const result = {};
	keys.forEach((key, i) => result[key] = values[i]);
	return result;
}

export async function statsPutMany(map)
{
	const keys = Object.keys(map);
	if (!keys.length)
		return;
	const db = await openDB();
	const tx = db.transaction(STATS, 'readwrite');
	const store = tx.objectStore(STATS);
	for (const key of keys)
		store.put(map[key], key);
	return txDone(tx);
}

export async function statsDelete(keys)
{
	if (!keys.length)
		return;
	const db = await openDB();
	const tx = db.transaction(STATS, 'readwrite');
	const store = tx.objectStore(STATS);
	for (const key of keys)
		store.delete(key);
	return txDone(tx);
}

// One-time import of the legacy storage.local cache (schema 1) into IndexedDB.
export async function migrateLegacyStorage()
{
	const marker = await browser.storage.local.get(SCHEMA_KEY);
	if (marker[SCHEMA_KEY] === SCHEMA_VERSION)
		return { migrated: 0, hadLegacy: false };

	const all = await browser.storage.local.get(null);
	const legacyKeys = Object.keys(all).filter(k => !LEGACY_META_KEYS.has(k) && all[k] && typeof all[k] === 'object' && 'data' in all[k]);
	const hadLegacy = legacyKeys.length > 0 || '_stats' in all;

	if (legacyKeys.length)
	{
		console.log(`%cFoxDen: migrating ${legacyKeys.length} legacy cache entries to IndexedDB`, logStyle);
		const db = await openDB();
		const tx = db.transaction(ENTRIES, 'readwrite');
		const store = tx.objectStore(ENTRIES);
		for (const key of legacyKeys)
		{
			const old = all[key];
			if (!old.b64)
			{
				// legacy text was stored raw (escape() only happened at serve time)
				const text = String(old.data);
				store.put({
					created: old.created,
					url: old.url,
					v: old.v,
					contentType: old.contentType,
					kind: 'text',
					data: text,
					size: text.length,
				}, key);
			}
			else
			{
				const buf = base64ToBytes(old.data).buffer;
				store.put({
					created: old.created,
					url: old.url,
					v: old.v,
					contentType: old.contentType,
					kind: 'bytes',
					data: buf,
					size: buf.byteLength,
				}, key);
			}
		}
		await txDone(tx);
	}

	if ('_stats' in all)
		await statsPutMany(all._stats);

	// synthesize stats for cached files that never got a _stats row
	const existingStats = all._stats || {};
	const synthesized = {};
	for (const key of legacyKeys)
		if (!(key in existingStats) && all[key].created)
			synthesized[key] = { created: all[key].created, hits: 0, last: all[key].created };
	await statsPutMany(synthesized);

	await browser.storage.local.remove([...legacyKeys, '_stats']);
	await browser.storage.local.set({ [SCHEMA_KEY]: SCHEMA_VERSION });
	return { migrated: legacyKeys.length, hadLegacy };
}

// sourceMappingURL comments are devtools-only: the .map follow-on is already
// blocked, so the comment is dead weight in every served copy.
export function stripSourceMapComment(text)
{
	return text
		.replace(/^[ \t]*\/\/#\s*sourceMappingURL=\S+.*$/gmi, "")
		.replace(/\/\*#\s*sourceMappingURL=\S+.*?\*\//gs, "");
}

// Build a cache entry from a fetch Response.
export async function entryFromResponse(resp, url, versi)
{
	const contentType = resp.headers.get('content-type') || 'application/octet-stream';
	const textual = isMimeTextual(contentType);
	const now = Date.now();
	// Validators for conditional revalidation (304 keeps bytes, touches date).
	const etag = resp.headers.get('etag');
	const modified = resp.headers.get('last-modified');
	if (textual)
	{
		const data = stripSourceMapComment(await resp.text());
		return { created: now, url, v: versi, contentType, kind: 'text', data, size: data.length, etag, modified };
	}
	const buf = await resp.arrayBuffer();
	return { created: now, url, v: versi, contentType, kind: 'bytes', data: buf, size: buf.byteLength, etag, modified };
}

// data: URL for a cache entry; CSS gets relative url()s absolutized.
// Encodings are memoized by caller-supplied content key: the same IndexedDB
// entry is served on every hit and re-encoding base64/encodeURIComponent each
// time is pure main-thread overhead. CSS callers fold the absolutizer base URL
// into the key (css|…|baseHref) since output depends on it.
const dataUriMemo = new Map();
const DATA_URI_MEMO_MAX = 200;
export function entryToDataUri(entry, cssAbsolutizer, memoKey)
{
	if (memoKey)
	{
		const hit = dataUriMemo.get(memoKey);
		if (hit)
			return hit;
	}
	let data = entry.data;
	let out;
	if (entry.kind === 'bytes')
		out = 'data:' + entry.contentType + ';base64,' + bytesToBase64(new Uint8Array(data));
	else
	{
		if (entry.contentType && entry.contentType.startsWith('text/css') && cssAbsolutizer)
			data = cssAbsolutizer(data);
		const mime = (entry.contentType || 'text/plain').replace(/;.*$/, '');
		out = 'data:' + mime + ';charset=utf-8,' + encodeURIComponent('/*FoxDen*/' + data);
	}
	if (memoKey)
	{
		if (dataUriMemo.size >= DATA_URI_MEMO_MAX)
			dataUriMemo.clear();
		dataUriMemo.set(memoKey, out);
	}
	return out;
}

export function clearDataUriMemo()
{
	dataUriMemo.clear();
}
