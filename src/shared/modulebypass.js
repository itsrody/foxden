"use strict";
// Module-script bypass registry: <script type="module" src=CDN> tags must
// load from the network, because a data: redirect leaves relative imports
// inside the module unresolvable. The HTML transformer records bypassed UIDs
// per tab (in document order, before the browser fires the requests); the
// redirect consults the set and passes those requests through untouched —
// with integrity attributes preserved so SRI still validates.
// Pure and browser-free: fully unit-testable.

const bypassed = new Map(); // tabId -> Set<uid>

export function isModuleTag(tag)
{
	const name = (tag.match(/^<(\w+)/) || [])[1];
	if (!name || name.toLowerCase() !== "script")
		return false;
	const type = tag.match(/\btype\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
	if (!type)
		return false;
	return type[1].replace(/^["']|["']$/g, "").toLowerCase() === "module";
}

export function noteModuleBypass(tabId, uid)
{
	if (tabId < 0 || !uid)
		return;
	let set = bypassed.get(tabId);
	if (!set)
	{
		set = new Set();
		bypassed.set(tabId, set);
	}
	set.add(uid);
}

export function isModuleBypassed(tabId, uid)
{
	const set = bypassed.get(tabId);
	return !!set && set.has(uid);
}

export function clearModuleBypass(tabId)
{
	bypassed.delete(tabId);
}
