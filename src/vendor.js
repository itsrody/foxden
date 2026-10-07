"use strict";
// Bundled top-N libraries: zero-network fallback for the heaviest-used
// library versions. Keys are cache UIDs (host-independent, so one entry
// covers cdnjs/jsdelivr/unpkg/googleapis alike). Served through the normal
// IndexedDB + data: pipeline — the packaged file only seeds the cache, so no
// new serve path, CSP or SRI handling is needed.

import { logStyle } from './shared/constants.js';
import { isNewerPointVersion } from './shared/urlkey.js';

// storKey -> { file, version }
let vendorLibs = new Map();

export async function loadVendorManifest()
{
	try
	{
		const resp = await fetch(browser.runtime.getURL("resources/vendor/manifest.json"));
		if (!resp.ok)
			throw new Error("HTTP " + resp.status);
		const manifest = await resp.json();
		vendorLibs = new Map(Object.entries(manifest.libs || {}));
		console.log(`%cJSLibCache: ${vendorLibs.size} bundled vendor libraries`, logStyle);
	}
	catch (err)
	{
		vendorLibs = new Map();
		console.warn(`%cJSLibCache: vendor manifest unavailable (${err}), bundled libs disabled`, logStyle);
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
