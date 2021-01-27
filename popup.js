{
'use strict';

function onClearcacheButtonClick(evt)
{
	let btn = evt.target;
	chrome.runtime.sendMessage({'action': 'clearCache' }, result => {
		if (result && result.success)
		{
			let tbody = document.querySelector('tbody');
			tbody.parentNode.removeChild(tbody);
			btn.textContent += " ✅";
		}
	});
}

function init()
{
	if ("chrome" in window && "runtime" in chrome)
	{
		chrome.runtime.sendMessage({'action': 'getStats' }, result => {
			if (result)
			{
				if (result.stats)
				{
					let tabStats = result.tabStats||{};
					let frag = document.createDocumentFragment();
					let keys = Object.keys(result.stats);
					keys.sort((a, b) => result.stats[a] == result.stats[b] ? a.localeCompare(b) : result.stats[b] - result.stats[a]);
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
						let th1 = document.createElement("th");
						let th2 = document.createElement("th");
						let th3 = document.createElement("th");
						let th4 = document.createElement("th");
						td.appendChild(document.createTextNode(name));
						th1.appendChild(document.createTextNode(version));
						th2.appendChild(document.createTextNode("?"));
						th3.appendChild(document.createTextNode(result.stats[storKey]));
						th4.appendChild(document.createTextNode(tabStats[storKey] || 0));
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
					document.querySelector('#ublock').textContent = result.cdnDomains.map(host => `* ${host} * noop`).join("\n");
				}
			}
		});
		document.querySelector('#clearcache').addEventListener("click", onClearcacheButtonClick);
		document.querySelector('#version').textContent = chrome.runtime.getManifest().version;
	}
}
document.addEventListener("DOMContentLoaded", init);
}
