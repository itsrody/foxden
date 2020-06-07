{
'use strict';

const cdnDomains = [
//	'ajax.aspnetcdn.com/ajax/',
//	'ajax.cloudflare.com/',
	'ajax.googleapis.com/ajax/libs/',
//	'ajax.microsoft.com/ajax/',
	'ajax.proxy.ustclug.org/ajax/libs/',
//	'akamai-webcdn.kgstatic.net/',
//	'apps.bdimg.com/libs/',
//	'cdn.ampproject.org/',
//	'cdn.bootcss.com/',
//	'cdn.jsdelivr.net/',
//	'cdn.sstatic.net/',
//	'cdn.staticfile.org/',
//	'cdnjs.cloudflare.com/ajax/libs/',
//	'code.createjs.com/',
	'code.jquery.com/',
//	'fonts.googleapis.com/',
//	'fonts.gstatic.com/',
//	'lib.baomitu.com/',
//	'lib.sinaapp.com/js/',
//	'libs.baidu.com/',
//	'mat1.gtimg.com/libs/',
//	'maxcdn.bootstrapcdn.com/',
//	'netdna.bootstrapcdn.com/bootstrap/',
//	'netdna.bootstrapcdn.com/font-awesome/',
//	'pagecdn.io/lib/',
	'sdn.geekzu.org/ajax/ajax/libs/',
//	'stackpath.bootstrapcdn.com/',
//	'unpkg.com/', // alias for 'cdn.jsdelivr.net/npm/
//	'upcdn.b0.upaiyun.com/libs/',
//	'use.fontawesome.com/releases/v',
//	'yandex.st/',
//	'yastatic.net/',
];
const cdnDomainsRE = new RegExp('//(' + cdnDomains.map(m => m.replace(/\W/g, '\\$&')).join('|') + ')');
//const cdnDomainAlias = {'unpkg.com/':'cdn.jsdelivr.net/npm/' };
const abbr = {'script':'js','stylesheet':'css','font':'fnt'};
let stats = {};
let tabStats = {};
let asciiDecoder = new TextDecoder('ASCII');//windows-1252


async function redirectRequestCDN(req)
{
	let url = req.url;
	/*
	for (let alia in cdnDomainAlias)
	{
		if (url.indexOf('//' + alia) > -1)
		{
			console.log("%cJSLibCache: replacing alias " + alia + " with " + cdnDomainAlias[alia], logStyle);
			url = url.replace(alia, cdnDomainAlias[alia]);
		}
	}
	*/
	let { uid: storKey, version: versi } = getUID(new URL(url));
	stats[storKey] = stats[storKey] ? stats[storKey] + 1 : 1;
	tabStats[req.tabId] = tabStats[req.tabId] || 0;
	tabStats[req.tabId]++;
	//chrome.browserAction.setBadgeText({text: "" + Object.values(stats).reduce((a, b) => a + b, 0)});
	chrome.browserAction.setBadgeText({text: "" + tabStats[req.tabId], tabId: req.tabId});
	let item = await browser.storage.local.get(storKey);
	let itemExists = storKey in item;
	if (!itemExists || isNewerPointVersion(versi, item[storKey].version))
	{
		if (itemExists)
			console.log("%cJSLibCache: upgrading " + storKey + " from " + item[storKey].version + " to " + versi, logStyle);
		console.log("%cJSLibCache: " + url + " fetching", logStyle);
		let resp = await fetch(url, {
			//"body": body.join('&'),
			//"cache": "default", // *default, no-cache, reload, force-cache, only-if-cached
			//"method": "GET", // *GET, POST, PUT, DELETE, etc.
			//"headers": { "content-type": "application/x-www-form-urlencoded" },
			"referer": "no-referrer", // *client, no-referrer
			"redirect": "error", // *manual, follow, error
			"credentials": "omit", // include, *omit, same-origin
		}).catch(err => {
			throw new Error("ERRFE000", "Error in request1 to server");
		});
		let contentType = resp.headers.get('content-type');
		if (!resp.ok)
			console.warn('fetching', url, contentType, resp);

		item = {};
		let now = new Date().getTime();
		item[storKey] = { 'created': now, 'axsd': now, 'hits': 0, 'version': versi, 'contentType': contentType, 'data': await resp.text() };
		await browser.storage.local.set(item);//FIXME?
		if (chrome.runtime.lastError)
			console.error("Error on storage.set", chrome.runtime.lastError);
	}
	else
	{
		console.log("%cJSLibCache: " + storKey + " retrieved from local storage", logStyle);
	}
	let dataURI = 'data:' + item[storKey].contentType + ',' + escape(item[storKey].data);
	return { redirectUrl: dataURI };
}


function removeIntegrityCrossoriginHtml(details)
{
	let header = details.responseHeaders.find(h => h.name.toLowerCase() == 'content-type');
	if (header)
	{
		let mimeType = header.value.replace(/;.*/, '').toLowerCase();
		let charset = /charset\s*=/.test(header.value) && header.value.replace(/^.*?charset\s*=\s*/, '').replace(/["']/g, '');

		if (mimeType == 'text/html')
		{
			let filter = browser.webRequest.filterResponseData(details.requestId);
			console.log(`%cJSLibCache: removing integrity|crossorigin from ${details.url} ${mimeType}`, logStyle);
			let isFirstData = true;
			let encoder = new TextEncoder();
			header.value = 'text/html; charset=UTF-8';
			let decoder;

			//Note that this will not work if the '<script crossorigin="anonymous" src="dfgsfgd.com">' string is divided into two chunks, but we want to flush this data asap.
			filter.ondata = evt => {
				if (isFirstData)
				{
					if (!charset) //content-type has no charset declared
					{
						//<meta http-equiv="Content-Type" content="text/html; charset=gb2312">
						//<meta http-equiv="content-type" content="text/html;charset=shift_jis">
						//<meta charset="ISO-8859-1"> 
						let htmlHead = asciiDecoder.decode(evt.data, {stream: false});
						let charsetMatch = htmlHead.match(/<meta\s+charset=["']?([^>"'\/]+)["'>\/]/i);
						if (!charsetMatch)
							charsetMatch = htmlHead.match(/<meta\s+http-equiv=["']?content-type["']?\s+content=["']?text\/html;\s*charset=([^>"'\/]+)["'>\/]/i);
						charset = charsetMatch ? charsetMatch[1] : "UTF-8";
					}
					console.log(`%cJSLibCache: charset ${charset}`, logStyle);
					decoder = new TextDecoder(charset);
				}
				//remove crossorigin and integrity attributes
				let str = decoder.decode(evt.data, {stream: true}).replace(/<(link|script)[^>]+>/ig, m => {
						if (cdnDomainsRE.test(m))
							return m.replace(/\s+(integrity|crossorigin)(="[^"]*"|='[^']*'|=[^"'`=\s]+|)/ig, '');
						return m;
					});
				filter.write(encoder.encode(str));
				isFirstData = false;
			}

			filter.onstop = evt => {
				let str = decoder.decode(); //end-of-stream
				filter.write(encoder.encode(str));
				filter.close();
			}
			return {responseHeaders: details.responseHeaders}; //headers with modified charset in content-type
		}
	}
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "getStats")//from popup.js
	{
		sendResponse({"success": true, "stats": stats});
	}
});

// init
chrome.browserAction.setBadgeBackgroundColor({color:"green"});
getCacheSize();
chrome.webRequest.onHeadersReceived.addListener(redirectRequestCDN, {'types': ['script','stylesheet'], 'urls': cdnDomains.map(host => '*://' + host + '*')}, ['blocking']); //types 'font'
chrome.webRequest.onHeadersReceived.addListener(removeIntegrityCrossoriginHtml, {'types': ['main_frame', 'sub_frame'], 'urls': ['*://*/*']}, ['blocking', 'responseHeaders']);
}
