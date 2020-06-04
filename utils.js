"use strict";

const logStyle = 'color:#3F3';
const typeSizes = {
	"undefined": () => 0,
	"boolean": () => 4,
	"number": () => 8,
	"string": item => 2 * item.length,
	"object": item => !item ? 0 : Object.keys(item).reduce((total, key) => sizeOf(key) + sizeOf(item[key]) + total, 0)
};
const versionRE = /^(\d+\.\d+\.)(\d+)$/;

function sizeOf(value)
{
	return typeSizes[typeof value](value);
}
async function getCacheSize()
{
	let strg = await browser.storage.local.get(null);
	let size = Math.round(sizeOf(strg) / 1024).toLocaleString() + 'kB';
	console.log("%cJSLibCache: cache has " + Object.keys(strg).length + " files, total size is " + size, logStyle);
}

function canonicalizeName(name)
{
	return name.replace(/[_\.-]+/g, '/');
}
function canonicalizeVersion(versi)
{
	return versi.replace(versionRE, '$1x');
}
function isNewerPointVersion(v1, v2)
{
	let m1 = v1.match(versionRE);
	if (m1)
	{
		let m2 = v2.match(versionRE);
		if (m2 && m1[1] == m2[1])
			return parseInt(m1[2]) > parseInt(m2[2]);
	}
	return false;
}
function getVersionNameExt(hostname, pathname)
{
	let mtch;
	if (hostname == "ajax.googleapis.com")
	{
		// /ajax/libs/shaka-player/2.3.8/shaka-player.compiled.js
		// /ajax/libs/d3js/5.15.1/d3.min.js
		// /ajax/libs/jquerymobile/1.4.1/jquery.mobile.min.css
		// /ajax/libs/dojo/1.13.0/dojo/dojo.js
		// /ajax/libs/myanmar-tools/1.0.1/zawgyi_detector.min.js
		// /ajax/libs/shaka-player/2.5.0-beta2/shaka-player.compiled.js
		// /ajax/libs/threejs/r84/three.min.js
		if (mtch = pathname.match(/^\/ajax\/libs\/[^\/]+\/([\d\.-]+(?:beta\d*)?|r\d+)\/(?:dojo\/)?([a-zA-Z0-9_\.-]+?)(\.compiled|\.min)?\.(js|css|map|png|eot|svg|ttf|woff2|woff)$/i))
			return { version: mtch[1], name: canonicalizeName(mtch[2]), ext: mtch[4] };
		// /ajax/libs/yui/2.9.0/build/yuiloader-dom-event/yuiloader-dom-event.js
		if (mtch = pathname.match(/^\/ajax\/libs\/([a-zA-Z0-9\.-]+)\/([\d\.-]+)\/build\/([a-zA-Z0-9_\.-]+?)\/\3(-min|\.min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[5] };
		// /ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css
		if (mtch = pathname.match(/^\/ajax\/libs\/([a-zA-Z0-9\.-]+)\/([\d\.-]+)\/(.+?)\.(css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[3]), ext: mtch[4] };
	}
	return { version: null, name: null, ext: null};
}
function getUID(url)
{
	let { version, name, ext } = getVersionNameExt(url.hostname, url.pathname);
	if (name && version)
		return { uid: name + " " + ext + " " + canonicalizeVersion(version), version: version };
	return { uid: "//" + url.host + url.pathname, version: "0" };
}

