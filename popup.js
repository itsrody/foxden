{
'use strict';


function init()
{
	if ("chrome" in window && "runtime" in chrome)
	{
		chrome.runtime.sendMessage({'action': 'getStats' }, result => {
			if (result && result.stats)
			{
				let frag = document.createDocumentFragment();
				//for (let storKey in result.stats)
				let keys = Object.keys(result.stats);
				keys.sort((a, b) => result.stats[b] - result.stats[a]);
				for (let storKey of keys)
				{
					let li = document.createElement("div");
					let span= document.createElement("span");
					span.appendChild(document.createTextNode(result.stats[storKey]));
					li.appendChild(span);
					li.appendChild(document.createTextNode(storKey));
					frag.appendChild(li);
				}
				document.querySelector('body>main').appendChild(frag);
			}
		});
	}
}
document.addEventListener("DOMContentLoaded", init);
}
