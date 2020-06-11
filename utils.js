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
	if (hostname == "ajax.googleapis.com" || hostname == "ajax.proxy.ustclug.org" || hostname == "sdn.geekzu.org")
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
	else if (hostname == "code.jquery.com")
	{
		// /jquery-3.5.1.min.js
		// /jquery-3.x-git.slim.min.js 
		if (mtch = pathname.match(/^\/(jquery-migrate|jquery)-([\d\.]+|[\d\.x-]*git)(\.slim)?(\.min|\.pack)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + (mtch[3]||"")), ext: mtch[5] };
		// /ui/1.12.1/jquery-ui.min.js
		// /ui/1.12.1/themes/smoothness/jquery-ui.css
		// /pep/0.4.3/pep.js
		if (mtch = pathname.match(/^\/[a-z]+\/(\d[\d\.abcehlprt-]+)\/([a-z\/-]+?)(\.min|\.pack)?\.(js|css)$/i))
			return { version: mtch[1], name: canonicalizeName(mtch[2]), ext: mtch[4] };
		// /mobile/1.4.5/jquery.mobile-1.4.5.min.js
		// /mobile/1.4.5/jquery.mobile.structure-1.4.5.min.css
		// /mobile/1.0a4/jquery.mobile-1.0a4.min.css 
		// /mobile/1.1.0-rc.1/jquery.mobile.structure-1.1.0-rc.1.min.css
		if (mtch = pathname.match(/^\/[a-z]+\/(\d[\d\.abcehlprt-]+|git)\/([a-z\/\.-]+?)-\1(\.min|\.pack)?\.(js|css)$/i))
			return { version: mtch[1], name: canonicalizeName(mtch[2]), ext: mtch[4] };
		// /color/jquery.color-2.2.0.js
		// /color/jquery.color-2.2.0.min.js
		// /color/jquery.color.svg-names-2.2.0.js
		// /color/jquery.color.plus-names-2.2.0.js
		// /qunit/qunit-2.10.0.js
		if (mtch = pathname.match(/^\/[a-z]+\/([a-z\.-]+?)-([\d\.]+|git)(\.min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1]), ext: mtch[4] };
	}
	else if (hostname == "cdnjs.cloudflare.com")
	{
		// /ajax/libs/1140/2.0/1140.min.css
		// /ajax/libs/jqueryui/1.12.1/jquery-ui.min.js
		// /ajax/libs/Embetty/4.0.0-beta.5/embetty.js
		if (mtch = pathname.match(/^\/ajax\/libs\/[^\/]+\/([\d\.-]+(?:(?:alpha|beta|dev|rc|pre|build|unstable|final|next|release|M|preview)[\.\d-]*)?|r\d+)\/(?:lib\/|js\/|css\/|scripts\/|bootstrap\/|min\/|umd\/)?([a-zA-Z0-9_\.-]+?)(?:\.development|\.production)?(\.compiled|\.min)?\.(js|css|map|png|eot|svg|ttf|woff2|woff)$/i))
			return { version: mtch[1], name: canonicalizeName(mtch[2]), ext: mtch[4] };
		// /ajax/libs/react-dom/16.13.1/umd/react-dom.production.min.js
		// /ajax/libs/angulartics2/9.1.0/adobeanalytics/bundles/angulartics2-adobeanalytics.umd.min.js
		if (mtch = pathname.match(/^\/ajax\/libs\/([a-zA-Z0-9\.-]+)\/([\d\.-]+)\/(.+?)(?:\.compiled|\.min)?\.(css|js|svg)$/i))
		{
			if (mtch[3].replace(/[_\.-]+/g, '').indexOf(mtch[1]) > -1)
				return { version: mtch[2], name: canonicalizeName(mtch[3]), ext: mtch[4] };
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[4] };
		}
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











