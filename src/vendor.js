"use strict";
// Bundled top-N libraries: zero-network fallback for the heaviest-used
// library versions. Keys are cache UIDs (host-independent, so one entry
// covers cdnjs/jsdelivr/unpkg/googleapis alike). Served through the normal
// IndexedDB + data: pipeline — the packaged file only seeds the cache, so no
// new serve path, CSP or SRI handling is needed.

import { logStyle } from './shared/constants.js';
import { isNewerPointVersion } from './shared/urlkey.js';
import { entryFromResponse } from './cache.js';
import { primeHotCache } from './fetchcache.js';

// storKey -> { file, version }
let vendorLibs = new Map();
// normalized basename -> { uid, file, version }: first-party self-hosted
// copies (any host/path) resolve to the pinned file for hash verification.
let vendorBasenames = new Map();

export function normalizeVendorBasename(filename)
{
	return filename.toLowerCase().replace(/(?:\.min|-min|minified)(?=\.[a-z0-9]+$)/, "");
}

export function buildBasenameMap(libs, onCollision)
{
	const notify = onCollision || ((base, kept, dropped) =>
		console.warn(`%cFoxDen: vendor basename collision on ${base}, keeping ${kept} over ${dropped}`, logStyle));
	const map = new Map();
	for (const [uid, entry] of libs)
	{
		const { file, version } = entry;
		const base = normalizeVendorBasename(file.split("/").pop());
		const prev = map.get(base);
		if (prev)
		{
			// Alias UID keys for one file share the entry silently; only
			// genuinely different files collide (first wins).
			if (prev.file !== file)
				notify(base, prev.file, file);
			continue;
		}
		map.set(base, { uid, file, version });
	}
	return map;
}

export async function loadVendorManifest()
{
	try
	{
		const resp = await fetch(browser.runtime.getURL("resources/vendor/manifest.json"));
		if (!resp.ok)
			throw new Error("HTTP " + resp.status);
		const manifest = await resp.json();
		vendorLibs = new Map(Object.entries(manifest.libs || {}));
		vendorBasenames = buildBasenameMap(vendorLibs);
		console.log(`%cFoxDen: ${vendorLibs.size} bundled vendor libraries`, logStyle);
	}
	catch (err)
	{
		vendorLibs = new Map();
		console.warn(`%cFoxDen: vendor manifest unavailable (${err}), bundled libs disabled`, logStyle);
	}
}

// Pure lookup: packaged file for a cache key, or null. Never downgrades — a
// request for a NEWER patch than bundled falls through to the network cache.
export function vendorFileForKey(storKey, requestVersion, libs)
{
	const entry = (libs instanceof Map ? libs : new Map(Object.entries(libs || {}))).get(storKey);
	if (!entry)
		return null;
	if (requestVersion && entry.version && isNewerPointVersion(requestVersion, entry.version))
		return null;
	return entry.file;
}

export function getVendorFile(storKey, requestVersion)
{
	const file = vendorFileForKey(storKey, requestVersion, vendorLibs);
	return file ? browser.runtime.getURL("resources/vendor/" + file) : null;
}

// First-party lookup: any URL whose normalized basename matches a pinned
// file is a candidate for hash-verified serving (version comes along).
export function vendorKeyForBasename(basename, libs)
{
	const map = libs instanceof Map ? libs : vendorBasenames;
	const hit = map.get(normalizeVendorBasename(basename));
	return hit || null;
}

export function getVendorByBasename(reqUrl)
{
	let basename;
	try
	{
		basename = new URL(reqUrl).pathname.split("/").pop();
	}
	catch
	{
		return null;
	}
	if (!basename)
		return null;
	const hit = vendorKeyForBasename(basename);
	if (!hit)
		return null;
	return { ...hit, fileUrl: browser.runtime.getURL("resources/vendor/" + hit.file) };
}

export async function sha256Hex(buf)
{
	const digest = await crypto.subtle.digest("SHA-256", buf);
	return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Best-effort startup preload: read packaged files into the hot cache so
// top-library hits skip IndexedDB and fetch entirely. Never blocks startup;
// individual failures just fall back to the normal vendor path per request.
export async function preloadVendor()
{
	let n = 0;
	await Promise.all([...vendorLibs].map(async ([storKey, { file, version }]) =>
	{
		try
		{
			const url = browser.runtime.getURL("resources/vendor/" + file);
			const resp = await fetch(url);
			if (!resp.ok)
				return;
			primeHotCache(storKey, await entryFromResponse(resp, url, version));
			n++;
		}
		catch
		{
			// best-effort: per-request path covers misses
		}
	}));
	console.log(`%cFoxDen: preloaded ${n} vendor libraries into hot cache`, logStyle);
}
