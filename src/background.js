'use strict';
// JSLibCache background — entry point, wires listeners and lifecycle.

import { logStyle, cdnDomains } from './shared/constants.js';
import { getDefaultSettings, loadSettings } from './shared/settings.js';
import { migrateLegacyStorage, cacheSummary, cacheDelete } from './cache.js';
import {
	hydrateStats, initStatsAlarms, onTabBeforeNavigate, setTabDomain,
	dropStatsKeys, resetStats, getGlobStats, getSessStats, getTabStats, flushSession,
} from './stats.js';
import { loadFontsManifest } from './fonts.js';
import { redirectRequestCDN, shouldCancelSourcemapRequest } from './redirect.js';
import { onHeadersReceived } from './htmlfilter.js';

let settings = getDefaultSettings();
const getSettings = () => settings;

async function reloadSettings()
{
	try
	{
		settings = await loadSettings();
	}
	catch (err)
	{
		console.warn(`%cJSLibCache: error loading settings: ${err}`, logStyle);
	}
}
browser.storage.onChanged.addListener((changes, area) => { if (area == "sync") reloadSettings(); });

function blockRequest(req)
{
	console.log(`%cJSLibCache: blocking CSP report to ${req.url}`, logStyle);
	return { cancel: true };
}

// One-time startup: legacy cache migration → stats hydration → fonts manifest.
// Request handlers await this before touching the cache.
const ready = (async () => {
	await reloadSettings();
	try
	{
		const { migrated, hadLegacy } = await migrateLegacyStorage();
		if (hadLegacy)
			console.log(`%cJSLibCache: migrated ${migrated} legacy entries to IndexedDB`, logStyle);
	}
	catch (err)
	{
		console.error(`%cJSLibCache: legacy migration failed`, logStyle, err);
	}
	await hydrateStats();
	await loadFontsManifest();
	try
	{
		const { count } = await cacheSummary();
		console.log(`%cJSLibCache: cache has ${count} files`, logStyle);
	}
	catch (err)
	{
		console.warn(`%cJSLibCache: cache summary failed: ${err}`, logStyle);
	}
})();

/********* EVENT HANDLERS ***************/

browser.runtime.onMessage.addListener(async (request) => {
	await ready;
	if (request.action === "getStats")//from popup.js
	{
		let tabsResp = await browser.tabs.query({'active': true, 'currentWindow': true});
		let tabId = 0;
		if (tabsResp != null && tabsResp.length)
			tabId = tabsResp[0].id;
		return {
			"success": true,
			"globStats": getGlobStats(),
			"sessStats": getSessStats(),
			"tabStats": getTabStats(tabId),
			"cdnDomains": cdnDomains.map(href => href.replace(/\/.*/, "")),
		};
	}
	else if (request.action === "cleanCache")//from popup.js
	{
		const now = Date.now();
		const weekMs = 7 * 24 * 3600 * 1000;
		const globStats = getGlobStats();
		const deletableStorKeys = Object.keys(globStats).filter(storKey => (now - globStats[storKey].last) / (weekMs * globStats[storKey].hits) > 1);
		console.log(deletableStorKeys);
		try
		{
			await cacheDelete(deletableStorKeys);
			await dropStatsKeys(deletableStorKeys);
			console.log("%cJSLibCache: cache cleaned", logStyle);
			return {"success": true};
		}
		catch (msg)
		{
			console.warn("%cJSLibCache: error cleaning cache: " + msg, logStyle);
			return {"success": false};
		}
	}
	else if (request.action === "clearCache")//from popup.js
	{
		try
		{
			await resetStats();
			await flushSession();
			console.log("%cJSLibCache: cache cleared", logStyle);
			return {"success": true};
		}
		catch (msg)
		{
			console.warn("%cJSLibCache: error clearing cache: " + msg, logStyle);
			return {"success": false};
		}
	}
});

// init
initStatsAlarms();

browser.browserAction.setBadgeBackgroundColor({ color: "green" });

browser.webRequest.onBeforeRequest.addListener(blockRequest, { 'types': ['csp_report'], 'urls': cdnDomains.map(host => '*://' + host + '*') }, ['blocking']);
browser.webRequest.onBeforeRequest.addListener((req) => {
	if (shouldCancelSourcemapRequest(req))
	{
		console.log(`%cJSLibCache: blocking sourcemap ${req.url}`, logStyle);
		return { cancel: true };
	}
}, { 'types': ['xmlhttprequest', 'other'], 'urls': cdnDomains.map(host => '*://' + host + '*') }, ['blocking']);
browser.webRequest.onBeforeRequest.addListener(async (req) => {
	await ready;
	return redirectRequestCDN(req, getSettings);
}, { 'types': ['script', 'stylesheet'], 'urls': cdnDomains.map(host => '*://' + host + '*') }, ['blocking']); // no 'font': Firefox blocks webRequest redirects to data: in font loads (CORS on SEC_REQUIRE_CORS_DATA_INHERITS, Bugzilla 1645683, open since 2020); Google Fonts files are instead embedded as data: URIs inside the CSS by fontcss.js
browser.webRequest.onHeadersReceived.addListener((req) => onHeadersReceived(req, getSettings), { 'types': ['main_frame', 'sub_frame'], 'urls': ['*://*/*'] }, ['blocking', 'responseHeaders']);
browser.webNavigation.onBeforeNavigate.addListener(onTabBeforeNavigate);

function tabUpdated(tabId, changeInfo, tabInfo) {
	if (tabInfo.url)
	{
		try
		{
			setTabDomain(tabId, new URL(tabInfo.url).hostname);
		}
		catch (err)
		{
			// non-URL tabs (about:*, extension pages)
		}
	}
}
browser.tabs.onUpdated.addListener(tabUpdated);
