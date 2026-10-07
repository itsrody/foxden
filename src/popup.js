'use strict';
import { getDefaultSettings, loadSettings, saveSettings } from './shared/settings.js';

let settings = getDefaultSettings();

function onSettingChange(evt)
{
	evt.preventDefault();
	console.log("JSLibCache.popup: onSettingChange");
	let input = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (evt.target);
	if (input.tagName == "INPUT")
		settings[input.id] = /** @type {HTMLInputElement} */ (input).checked;
	else if (input.tagName == "TEXTAREA")
		settings[input.id] = /** @type {HTMLTextAreaElement} */ (input).value.split(/\s*\n\s*/).filter(Boolean);
	saveSettings(settings).then(
		//Success
		() => console.log("JSLibCache.popup: Settings saved", settings, JSON.stringify(settings)),
		//Error
		msg => console.warn("JSLibCache.popup: Error saving settings to browser.storage.sync: " + msg)
	);
}
function clearStatsTable()
{
	let tbody = document.querySelector('tbody');
	tbody.parentNode.replaceChild(document.createElement("tbody"), tbody);
}
function onCleancacheButtonClick(evt)
{
	let btn = evt.target;
	browser.runtime.sendMessage({'action': 'cleanCache' }).then(result => {
		if (result && result.success)
		{
			clearStatsTable();
			getStats();
			btn.textContent += " ✅";
		}
	});
}
function onClearcacheButtonClick(evt)
{
	let btn = evt.target;
	browser.runtime.sendMessage({'action': 'clearCache' }).then(result => {
		if (result && result.success)
		{
			clearStatsTable();
			btn.textContent += " ✅";
		}
	});
}

async function initSettings()
{
	try
	{
		settings = await loadSettings();
		console.log("JSLibCache.popup: settings retrieved", settings);
		for (let id in settings)
		{
			let input = document.getElementById(id);
			if (input)
			{
				if (input.tagName == "INPUT")
					/** @type {HTMLInputElement} */ (input).checked = settings[id];
				else if (input.tagName == "TEXTAREA")
					/** @type {HTMLTextAreaElement} */ (input).value = settings[id].join("\n");
			}
			else
				console.warn("JSLibCache.popup: unable to find setting with id " + id);
		}
	}
	catch (msg)
	{
		console.warn("JSLibCache.popup: Error getting settings from browser.storage.sync: " + msg);
	}
}

function init()
{
	initSettings();
	getStats();
	document.querySelector('form#settings').addEventListener("change", onSettingChange);
	document.querySelector('button#cleancache').addEventListener("click", onCleancacheButtonClick);
	document.querySelector('button#clearcache').addEventListener("click", onClearcacheButtonClick);

	document.querySelector('#version').textContent = browser.runtime.getManifest().version;
	// Firefox version: getBrowserInfo() is the browser's own version —
	// runtime.getVersion() returns the extension version, not this.
	browser.runtime.getBrowserInfo().then(
		info => document.querySelector('#firefoxversion').textContent = info.version,
		() => {});
}
function getStats()
{
	browser.runtime.sendMessage({'action': 'getStats' }).then(result => {
		if (result)
		{
			if (result.globStats) //created, hits, last
			{
				let tabStats = result.tabStats||{};
				let frag = document.createDocumentFragment();
				let keys = Object.keys(result.globStats);
				keys.sort((a, b) => {
					if (tabStats[a])
					{
						if (!tabStats[b])
							return -1;
					}
					else if (tabStats[b])
						return 1;
					return result.globStats[a].hits == result.globStats[b].hits ?
						a.localeCompare(b) :
						result.globStats[b].hits - result.globStats[a].hits;
				});
				for (let storKey of keys)
				{
					//<tr><td>jquery js</th><th>1.10.x</th><th>?</th><th>2</th><th>0</th></tr>
					let name = storKey, version = "";
					let m = storKey.match(/^(.* (js|css)) ([0-9a-zA-Z\.-]+)$/);
					if (m)
					{
						name = m[1];
						version = m[3];
					}
					let tr = document.createElement("tr");
					let td = document.createElement("td");
					let th1 = document.createElement("td");
					let th2 = document.createElement("th");
					let th3 = document.createElement("th");
					let th4 = document.createElement("th");
					td.appendChild(document.createTextNode(name));
					th1.appendChild(document.createTextNode(version));
					th2.appendChild(document.createTextNode(result.globStats[storKey].hits || ""));
					th3.appendChild(document.createTextNode(result.sessStats[storKey] || ""));
					th4.appendChild(document.createTextNode(tabStats[storKey] || ""));
					tr.appendChild(td);
					tr.appendChild(th1);
					tr.appendChild(th2);
					tr.appendChild(th3);
					tr.appendChild(th4);
					frag.appendChild(tr);
				}
				document.querySelector('tbody').appendChild(frag);
			}
			if (result.cdnDomains)
			{
				document.querySelector('#ublockrules').textContent = result.cdnDomains.map(host => `* ${host} * noop`).join("\n");
			}
		}
	});
}
if(/^(interactive|complete|loaded)$/.test(document.readyState))init();else document.addEventListener("DOMContentLoaded",init,false);
