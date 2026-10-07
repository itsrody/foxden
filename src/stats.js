"use strict";
// In-memory hit statistics + per-tab/session state, with durable flushes:
//  - globStats  -> IndexedDB `stats` store (debounced, 1 min alarm)
//  - sessStats/tabStats/tabDomains -> storage.session (debounced)

import { logStyle } from './shared/constants.js';
import { statsPutMany, statsDelete, statsLoad, cacheClear } from './cache.js';

const SESSION_KEY = 'sessionState';
const FLUSH_ALARM = 'jslc-flush';
const FLUSH_PERIOD_MIN = 1;

let globStats = {};
let sessStats = {};
let tabStats = {};
let tabDomains = {};
let dirtyStats = new Set();
let sessionDirty = false;

export function getGlobStats() { return globStats; }
export function getSessStats() { return sessStats; }
export function getTabStats(tabId) { return tabStats[tabId]; }
export function getTabDomain(tabId) { return tabDomains[tabId]; }

export async function hydrateStats()
{
	globStats = await statsLoad();
	try
	{
		const session = await browser.storage.session.get(SESSION_KEY);
		const s = session[SESSION_KEY];
		if (s)
		{
			sessStats = s.sessStats || {};
			tabStats = s.tabStats || {};
			tabDomains = s.tabDomains || {};
		}
	}
	catch (err)
	{
		console.warn(`%cJSLibCache: storage.session unavailable: ${err}`, logStyle);
	}
}

function scheduleSessionFlush()
{
	sessionDirty = true;
}

export async function flushSession()
{
	if (!sessionDirty)
		return;
	sessionDirty = false;
	try
	{
		await browser.storage.session.set({ [SESSION_KEY]: { sessStats, tabStats, tabDomains } });
	}
	catch (err)
	{
		console.warn(`%cJSLibCache: storage.session flush failed: ${err}`, logStyle);
	}
}

export async function flushStats()
{
	if (!dirtyStats.size)
		return;
	const keys = [...dirtyStats];
	dirtyStats = new Set();
	const toWrite = {};
	for (const key of keys)
		if (key in globStats)
			toWrite[key] = globStats[key];
	try
	{
		await statsPutMany(toWrite);
	}
	catch (err)
	{
		console.warn(`%cJSLibCache: stats flush failed: ${err}`, logStyle);
		for (const key of Object.keys(toWrite))
			dirtyStats.add(key);
	}
}

export function addStats(storKey, created, size)
{
	const now = Date.now();
	if (!(storKey in globStats))
		globStats[storKey] = { created: created || now - 1, hits: 0 };
	globStats[storKey].hits = globStats[storKey].hits + 1;
	globStats[storKey].last = created || now;
	if (typeof size === "number" && size > 0)
		globStats[storKey].size = size;
	if (!created)
		sessStats[storKey] = (sessStats[storKey] || 0) + 1;
	dirtyStats.add(storKey);
}

export function addTabStats(tabId, storKeys)
{
	if (tabId < 0)
		return;
	if (!tabStats[tabId])
		tabStats[tabId] = {};
	storKeys.forEach(storKey => {
		tabStats[tabId][storKey] = tabStats[tabId][storKey] ? tabStats[tabId][storKey] + 1 : 1;
	});
	//FIXME: the keys are for the entire tab session
	browser.browserAction.setBadgeText({ text: "" + Object.keys(tabStats[tabId]).length, tabId: tabId });
	scheduleSessionFlush();
}

// Record served byte size without bumping hits (called after cache load).
export function setEntrySize(storKey, size)
{
	if (!(storKey in globStats) || typeof size !== "number" || size <= 0)
		return;
	globStats[storKey].size = size;
	dirtyStats.add(storKey);
}

export function onTabBeforeNavigate(details)
{
	//clear tab's stats
	if (details.frameId == 0) //main page, not inner iframe
	{
		tabStats[details.tabId] = {};
		scheduleSessionFlush();
	}
}

export function setTabDomain(tabId, hostname)
{
	tabDomains["" + tabId] = hostname;
	scheduleSessionFlush();
}

export function isTabDomainBlacklisted(tabId, domainBlacklist)
{
	if (!domainBlacklist.length)
		return false;
	const domain = tabDomains["" + tabId];
	if (!domain)
		return false;
	if (domainBlacklist.includes(domain))
		return true;
	// Registrable-domain match (publicSuffix, FF153+): listing evil.com also
	// covers sub.evil.com, which exact matching misses. Hostnames are
	// case-insensitive; comparison runs lowercased on both sides.
	const registrable = registrableDomain(domain.toLowerCase());
	return domainBlacklist.some(entry => registrableDomain(String(entry).toLowerCase()) === registrable);
}

const registrableMemo = new Map();
const REGISTRABLE_MEMO_MAX = 500;

export function registrableDomain(hostname)
{
	const hit = registrableMemo.get(hostname);
	if (hit !== undefined)
		return hit;
	let out = hostname;
	try
	{
		if (typeof browser !== "undefined" && browser.publicSuffix && typeof browser.publicSuffix.getDomain === "function")
			out = browser.publicSuffix.getDomain(hostname) || hostname;
	}
	catch
	{
		out = hostname; // invalid hostnames throw since FF158: treat as opaque
	}
	if (registrableMemo.size >= REGISTRABLE_MEMO_MAX)
		registrableMemo.clear();
	registrableMemo.set(hostname, out);
	return out;
}

export function clearRegistrableMemo()
{
	registrableMemo.clear();
}

export async function dropStatsKeys(keys)
{
	for (const key of keys)
	{
		delete globStats[key];
		delete sessStats[key];
	}
	dirtyStats = new Set([...dirtyStats].filter(k => !(k in globStats)));
	try
	{
		await statsDelete(keys);
	}
	catch (err)
	{
		console.warn(`%cJSLibCache: stats delete failed: ${err}`, logStyle);
	}
	scheduleSessionFlush();
}

export async function resetStats()
{
	globStats = {};
	sessStats = {};
	dirtyStats = new Set();
	try
	{
		await cacheClear();
	}
	catch (err)
	{
		console.warn(`%cJSLibCache: cache clear failed: ${err}`, logStyle);
	}
	scheduleSessionFlush();
}

export function initStatsAlarms()
{
	browser.alarms.onAlarm.addListener(alarm => {
		if (alarm.name === FLUSH_ALARM)
		{
			flushStats();
			flushSession();
		}
	});
	browser.alarms.create(FLUSH_ALARM, { periodInMinutes: FLUSH_PERIOD_MIN });
}

export { FLUSH_ALARM };
