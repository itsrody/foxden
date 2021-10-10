{
'use strict';
let settings = getDefaultSettings();

function onSettingChange(evt)
{
	evt.preventDefault();
	let input = evt.target;
	settings[input.id] = input.checked;
	browser.storage.sync.set({settings}).then(
		//Success
		() => console.log("JSLibCache.popup: Settings saved", settings, JSON.stringify(settings)),
		//Error
		msg => console.warn("JSLibCache.popup: Error saving settings to browser.storage.sync: " + msg)
	);

}
function onCleancacheButtonClick(evt)
{
	let btn = evt.target;
	chrome.runtime.sendMessage({'action': 'cleanCache' }, result => {
		if (result && result.success)
		{
			let tbody = document.querySelector('tbody');
			tbody.parentNode.replaceChild(document.createElement("tbody"), tbody);
			getStats();
			btn.textContent += " ✅";
		}
	});
}
function onClearcacheButtonClick(evt)
{
	let btn = evt.target;
	chrome.runtime.sendMessage({'action': 'clearCache' }, result => {
		if (result && result.success)
		{
			let tbody = document.querySelector('tbody');
			tbody.parentNode.replaceChild(document.createElement("tbody"), tbody);
			btn.textContent += " ✅";
		}
	});
}

function init()
{
	if ("chrome" in window && "runtime" in chrome)
	{
		browser.storage.sync.get({"settings": getDefaultSettings()}).then(
			//Success
			sett => {
				settings = sett.settings;
				console.log("JSLibCache.popup: settings retrieved", sett);
				for (let id in settings)
				{
					let input = document.getElementById(id);
					if (input)
						input.checked = settings[id];
					else
						console.warn("JSLibCache.popup: unable to find setting with id " + id);
				}
			},
			//Error
			msg => console.warn("JSLibCache.popup: Error getting settings from browser.storage.sync: " + msg)
		);
		getStats();
		document.querySelector('form#settings').addEventListener("change", onSettingChange);
		document.querySelector('button#cleancache').addEventListener("click", onCleancacheButtonClick);
		document.querySelector('button#clearcache').addEventListener("click", onClearcacheButtonClick);
		document.querySelector('#version').textContent = chrome.runtime.getManifest().version;
	}
}
function getStats()
{
	chrome.runtime.sendMessage({'action': 'getStats' }, result => {
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
						result.globStats[b].hits - result.globStats[a].hits
				});
				//keys.unshift(...Object.keys(tabStats));
				for (let storKey of keys)
				{
					//<tr><td>jquery js</th><th>1.10.x</td><th>?</th><th>2</th><th>0</th></tr>
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
document.addEventListener("DOMContentLoaded", init);
}
