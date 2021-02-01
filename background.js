{
'use strict';

const cdnDomains = [
	'fonts.googleapis.com/',		// 1000k+ / 362
	'ajax.googleapis.com/ajax/libs/',	// 1000k+ / 637
	'cdnjs.cloudflare.com/ajax/libs/',	// 1000k+ / 670
//	'cdn.jsdelivr.net/',			// 1000k+ / 975
	'code.jquery.com/',			// 1000k+ /1276
//	'maxcdn.bootstrapcdn.com/',		// 1000k+ /1475
//	'maps.googleapis.com/',			// 963k
//	'fonts.gstatic.com/',			// 923k
//	'stackpath.bootstrapcdn.com/',		// 828k
//	'netdna.bootstrapcdn.com/',		// 649k
//	'use.fontawesome.com/releases/v',	// 573k
//	'cdn.bootcss.com/',			// 443k
//	'unpkg.com/',				// 390k	alias for 'cdn.jsdelivr.net/npm/
//	'libs.baidu.com/',			// 280k
//	'apps.bdimg.com/libs/',			// 239k
//	'ajax.aspnetcdn.com/ajax/',		// 203k
//	'cdn.staticfile.org/',			// 179k
	'ajax.cloudflare.com/',			// 150k
//	'yastatic.net/',			// 104k
	'cdn.ampproject.org/',			// 73k
//	'yandex.st/',				// 64k
//	'code.createjs.com/',			// 9k
//	'lib.baomitu.com/',			// 9k
//	'ajax.microsoft.com/ajax/',		// 8k
//	'lib.sinaapp.com/js/',			// 6k
//	'cdn.sstatic.net/',			// 2k
//	'mat1.gtimg.com/libs/',			// 1k
//	'upcdn.b0.upaiyun.com/libs/',		// 0.5k
//	'pagecdn.io/lib/',			// 0.2k	alias for 'cdnjs.cloudflare.com/ajax/libs/'
//	'akamai-webcdn.kgstatic.net/',		// 0
	'ajax.proxy.ustclug.org/ajax/libs/',	// 0
	'sdn.geekzu.org/ajax/ajax/libs/',
];
const cdnDomainsRE = new RegExp('//(' + cdnDomains.map(m => m.replace(/\W/g, '\\$&')).join('|') + ')');
//const cdnDomainAlias = {'unpkg.com/':'cdn.jsdelivr.net/npm/' };
//const abbr = {'script':'js','stylesheet':'css','font':'fnt'};
let stats = {};
let tabStats = {};
let asciiDecoder = new TextDecoder('ASCII');//windows-1252
let settings = getDefaultSettings();
let knownGoogleFonts = [];


function blockRequestCDN(req)
{
	console.log(`%cJSLibCache: blocking CSP report to ${req.url}`, logStyle);
	return { cancel: true };
}
function replaceFontsGstaticURLs(css)
{
	//src: url(https://fonts.gstatic.com/s/roboto/v20/KFOiCnqEu92Fr1Mu51QrEz0dL-vwnYh2eg.woff2) format('woff2');
	//FIXME: check knownGoogleFonts for font name
	return css.replace(/https?:\/\/fonts.gstatic.com\/s\/([a-z0-9]+)\/v\d+/g, chrome.extension.getURL("resources/fonts/") + "$1");
}
async function handleGoogleFontsCss(url, req)
{
	let families = getFamiliesFromGoogleFontCSSURL(url);
	let storKeys = families.map(family => 'font/' + family + ' css');
	storKeys.forEach(storKey => { stats[storKey] = stats[storKey] ? stats[storKey] + 1 : 1});
	addTabStats(req.tabId, storKeys);
	let items = await browser.storage.local.get(storKeys);
	let unknownStorKeys = storKeys.filter(storKey => !(storKey in items));
	let newItems = {};
	if (unknownStorKeys.length)
	{
		let unknownFamilies = unknownStorKeys.map(storKey => storKey.substring(5, storKey.length - 4));
		console.log("%cJSLibCache: fetching CSS for these font families from googlefonts: " + unknownFamilies.join(", "), logStyle);
		let responses = await Promise.all(unknownFamilies.map(family => fetch(
			'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family) + ':ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
			{ "referer": "no-referrer", "redirect": "error", "credentials": "omit" }
		)));
		let responseTexts = await Promise.all(responses.map(resp => resp.text()));
		for (let i = 0; i < unknownStorKeys.length; i++)
		{
			if (!responses[i].ok)
				console.warn("%cfetching failed 2", logStyle, responses[i]);
			let now = new Date().getTime();
			newItems[unknownStorKeys[i]] = { 'created': now, 'data': responseTexts[i] || "/* ERRGF001 */" };
		}
		browser.storage.local.set(newItems).then(
			//Success
			() => console.log("%cJSLibCache: stored " + unknownStorKeys.join(", "), logStyle),
			//Error
			msg => console.warn("%cJSLibCache: error storing " + unknownStorKeys.join(", ") + ": " + msg, logStyle),
		);
	}
	console.log("%cJSLibCache: serving CSS for these font families from googlefonts: " + families.join(", "), logStyle);
	let dataURI = 'data:text/css;charset=utf-8,' + escape('/*JSLC*/' + replaceFontsGstaticURLs(storKeys.map(storKey => items[storKey] ? items[storKey].data : newItems[storKey].data).join("\n")));
	return { redirectUrl: dataURI };
}
function addTabStats(tabId, storKeys)
{
	if (!tabStats[tabId])
		tabStats[tabId] = {};
	storKeys.forEach(storKey => {
		tabStats[tabId][storKey] = tabStats[tabId][storKey] ? tabStats[tabId][storKey] + 1 : 1;
	});
	//FIXME: the keys are for the entire tab sesion
	chrome.browserAction.setBadgeText({text: "" + Object.keys(tabStats[tabId]).length, tabId: tabId});
}
async function redirectRequestCDN(req)
{
	let url = new URL(req.url)
	if (url.hostname == "fonts.googleapis.com")
		return handleGoogleFontsCss(url, req);
	let { uid: storKey, version: versi } = getUID(url);
	stats[storKey] = stats[storKey] ? stats[storKey] + 1 : 1;
	addTabStats(req.tabId, [storKey]);
	let item = await browser.storage.local.get(storKey);
	let itemExists = storKey in item;
	if (!itemExists || isNewerPointVersion(versi, item[storKey].v))
	{
		if (itemExists)
			console.log("%cJSLibCache: upgrading " + storKey + " from " + item[storKey].v + " to " + versi, logStyle);
		console.log("%cJSLibCache: " + req.url + " fetching", logStyle);
		let resp = await fetch(req.url, {
			"referer": "no-referrer", // *client, no-referrer
			"redirect": "error", // *manual, follow, error
			"credentials": "omit", // include, *omit, same-origin
		});
		let contentType = resp.headers.get('content-type');
		if (!resp.ok)
			console.warn("%cfetching failed 1", logStyle, req.url, contentType, resp);

		item = {};
		let now = new Date().getTime();
		let data;
		let isTextual = isMimeTextual(contentType);
		if (isTextual)
			data = await resp.text();
		else
			data = btoa(String.fromCharCode(...new Uint8Array(await resp.arrayBuffer())));
		item[storKey] = { 'created': now, 'url': req.url, 'v': versi, 'contentType': contentType, 'b64': isTextual?0:1, 'data': data };
		browser.storage.local.set(item).then(
			//Success
			() => {},
			//Error
			msg => console.error("%cError on storage.set", logStyle, msg)
		);
	}
	else
	{
		console.log("%cJSLibCache: " + storKey + " retrieved from local storage", logStyle);
	}
	//return { redirectUrl: 'data:' + item[storKey].contentType + (item[storKey].b64 ? ';base64,' + item[storKey].data : ',/*JSLC*/' + escape(item[storKey].data)) };
	return { redirectUrl: 'data:' + item[storKey].contentType + (item[storKey].b64 ? ';base64,' + item[storKey].data : ',' + escape(item[storKey].data)) };
}


function removeIntegrityCrossoriginHtml(req)
{
	let headerIdx = req.responseHeaders.findIndex(h => h.name.toLowerCase() == 'content-security-policy');//TODO FIXME: report-only?
	let hasCspChange = false;
	if (headerIdx > -1)
	{
		let headerCSP = req.responseHeaders[headerIdx];
		let parsedCSP = parseCspHeader(headerCSP.value);
		if (parsedCSP["script-src"] && !parsedCSP["script-src"].includes("data:"))
		{
			hasCspChange = true;
			parsedCSP["script-src"].unshift("data:");
		}
		if (parsedCSP["style-src"] && !parsedCSP["style-src"].includes("data:"))
		{
			hasCspChange = true;
			parsedCSP["style-src"].unshift("data:");
		}
		if (hasCspChange && settings.allowModifyHeaders)
		{
			console.log(`%cJSLibCache: adding data: to CSP header ${req.url}`, logStyle);
			req.responseHeaders.splice(headerIdx, 1);//Remove CSP header, see https://github.com/gorhill/uMatrix/issues/967
			req.responseHeaders.push({ name: 'Content-Security-Policy', value: Object.keys(parsedCSP).map(k => k + " " + parsedCSP[k].join(" ")).join(";") });
		}
	}
	let headerCT = req.responseHeaders.find(h => h.name.toLowerCase() == 'content-type');
	if (headerCT)
	{
		let mimeType = headerCT.value.replace(/;.*/, '').toLowerCase();
		let charset = /charset\s*=/.test(headerCT.value) && headerCT.value.replace(/^.*?charset\s*=\s*/, '').replace(/["']/g, '');

		if (mimeType == 'text/html')
		{
			let filter = browser.webRequest.filterResponseData(req.requestId);
			console.log(`%cJSLibCache: checking integrity|crossorigin attributes in ${req.url} html`, logStyle);
			let isFirstData = true;
			let encoder = new TextEncoder();
			headerCT.value = 'text/html; charset=UTF-8';
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
						{
							console.log(`%cJSLibCache: removing any integrity|crossorigin attributes from ${m}`, logStyle);
							return m.replace(/\s+(integrity|crossorigin)(="[^"]*"|='[^']*'|=[^"'`=\s]+|)/ig, '');
						}
						return m;
					});
				filter.write(encoder.encode(str));
				isFirstData = false;
			}

			filter.onstop = evt => {
				if (encoder)
				{
					let str = decoder.decode(); //end-of-stream
					filter.write(encoder.encode(str));
				}
				filter.close();
			}
		}
	}
	// https://developer.chrome.com/docs/extensions/reference/webRequest/
	// Only return responseHeaders if you really want to modify the headers in order to limit the number of conflicts (only one extension may modify responseHeaders for each request)
	if (hasCspChange)
		return { responseHeaders: req.responseHeaders }; //headers with modified content-security-policy or content-type
}
function onBeforeNavigate(details)
{
	//console.log(`%cJSLibCache: onBeforeNavigate`, logStyle, details);
	//clear tab's stats
	if (details.frameId == 0) //main page, not inner iframe
		tabStats[details.tabId] = {};
}


/********* EVENT HANDLERS ***************/

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "getStats")//from popup.js
	{
		chrome.tabs.query({'active': true, 'currentWindow': true}, tabsResp => {
			let tabId = 0;
			if (tabsResp != null && tabsResp.length)
			{
				tabId = tabsResp[0].id;
			}
			sendResponse({"success": true, "stats": stats, "tabStats": tabStats[tabId], "cdnDomains": cdnDomains.map(href => href.replace(/\/.*/,""))});
		});
		return true; //for async sendResponse
	}
	else if (request.action === "clearCache")//from popup.js
	{
		//FIXME
		browser.storage.local.clear().then(
			//Success
			() => {
				console.log("%cJSLibCache: browser.storage.local cleared", logStyle);
				stats = {};
				sendResponse({"success": true});
			},
			//Error
			msg => console.warn("%cJSLibCache: error clearing browser.storage.local: " + msg, logStyle),
		);
		return true;
	}
});
/* not supported by Fx
browser.runtime.onSuspend.addListener(() => {
	//TODO, FIXME: save stats to storage.local
	console.log(`%cJSLibCache: background suspended`, logStyle);
});
*/


// init
function getSyncSettings()
{
	browser.storage.sync.get({"settings": getDefaultSettings()}).then(sett => { settings = sett.settings; });
}
browser.storage.onChanged.addListener((changes, area) => { if (area == "sync") { getSyncSettings(); } });
getSyncSettings();

fetch(chrome.extension.getURL("resources/fonts/")).then(resp => resp.text()).then(txt => {
	knownGoogleFonts = txt.split(/\n/).filter(line => line.startsWith("201: ") && line.endsWith(" DIRECTORY")).map(line => line.replace(/^201: (\w+)\/ .*$/, "$1"));
	console.log("%cJSLibCache: knownGoogleFonts", logStyle, knownGoogleFonts);
});

chrome.browserAction.setBadgeBackgroundColor({color:"green"});

chrome.webRequest.onHeadersReceived.addListener(blockRequestCDN, {'types': ['csp_report'], 'urls': cdnDomains.map(host => '*://' + host + '*')}, ['blocking']);
chrome.webRequest.onHeadersReceived.addListener(redirectRequestCDN, {'types': ['script','stylesheet'], 'urls': cdnDomains.map(host => '*://' + host + '*')}, ['blocking']); //types 'font', 'image', 'other' (for svg?)
chrome.webRequest.onHeadersReceived.addListener(removeIntegrityCrossoriginHtml, {'types': ['main_frame', 'sub_frame'], 'urls': ['*://*/*']}, ['blocking', 'responseHeaders']);
chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);


browser.storage.local.get(null).then(stor => {
	let size = Math.round(sizeOf(stor) / 1024).toLocaleString() + 'kB';
	console.log("%cJSLibCache: cache has " + Object.keys(stor).length + " files, total size is " + size, logStyle);
	Object.keys(stor).forEach(storKey => { stats[storKey] = 0; });
});

}
