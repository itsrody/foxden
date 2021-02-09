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

function getFamiliesFromGoogleFontCSSURL(url)
{
	//https://fonts.googleapis.com/css2?family=Noto+Sans+HK&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap
	//https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,200;0,300;0,400;0,500;0,700;0,900;1,100;1,200;1,300;1,400;1,500;1,700;1,900
	//https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700
	//https://fonts.googleapis.com/css?family=Droid+Sans:700,regular|Droid+Serif:italic,regular&subset=latin
	//https://fonts.googleapis.com/css?family=Lato&text=ABC
	//https://fonts.googleapis.com/icon?family=Material+Icons
	//https://fonts.googleapis.com/icon?family=Material+Icons&ver=5.4.1
	//let url = new URL('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,200;0,300;0,400;0,500;0,700;0,900;1,100;1,200;1,300;1,400;1,500;1,700;1,900');
	let params = new URLSearchParams(url.search);
	let result = [];
	if (url.pathname == "/css2" || url.pathname == "/icon")
	{
		for (let family of params.getAll('family'))
		{
			let i = family.indexOf(':');
			result.push(i == -1 ? family : family.substr(0,i));
		}
	}
	else if (url.pathname == "/css" && params.has('family'))
	{
		for (let family of params.get('family').split('|'))
		{
			let i = family.indexOf(':');
			result.push(i == -1 ? family : family.substr(0,i));
		}
	}
	return result;
}
function getVersionNameExt(hostname, pathname)
{
	let mtch;
	if (hostname == "fonts.gstatic.com")
	{
		// /s/amaticsc/v13/TUZ3zwprpvBS1izr_vOMscGKfLUC_2fi-Q.woff2
		// /s/notosanshk/v5/nKKQ-GM_FYFRJvXzVXaAPe9hMXBxEu-8JKJiwNdTve7W4-fhxjn5P_4rrgJoi8PfTdpQKp8.0.woff2
		if (mtch = pathname.match(/^\/s\/[a-z]+\/v\d+\/([a-z0-9_-]+(?:\.\d+)?)\.(woff2|woff|ttf|eot|svg)$/i))
			return { version: "", name: "fontgstatic/" + mtch[1], ext: mtch[2] };
	}
	else if (hostname == "ajax.googleapis.com" || hostname == "ajax.proxy.ustclug.org" || hostname == "sdn.geekzu.org")
	{
		// /ajax/libs/shaka-player/2.3.8/shaka-player.compiled.js
		// /ajax/libs/d3js/5.15.1/d3.min.js
		// /ajax/libs/jquerymobile/1.4.1/jquery.mobile.min.css
		// /ajax/libs/dojo/1.13.0/dojo/dojo.js
		// /ajax/libs/myanmar-tools/1.0.1/zawgyi_detector.min.js
		// /ajax/libs/shaka-player/2.5.0-beta2/shaka-player.compiled.js
		// /ajax/libs/threejs/r84/three.min.js
		if (mtch = pathname.match(/^\/ajax\/libs\/[^\/]+\/([\d\.-]+(?:beta\d*)?|r\d+)\/(?:dojo\/)?([a-zA-Z0-9_\.-]+?)(\.compiled|\.min)?\.(js|css|map|png|eot|svg)$/i))
			return { version: mtch[1], name: canonicalizeName(mtch[2]), ext: mtch[4] };
		// /ajax/libs/yui/2.9.0/build/yuiloader-dom-event/yuiloader-dom-event.js
		// /ajax/libs/yui/2.8.0r4/build/json/json-min.js
		if (mtch = pathname.match(/^\/ajax\/libs\/([a-zA-Z0-9\.-]+)\/([r\d\.-]+)\/build\/([a-zA-Z0-9_\.-]+?)\/\3(-min|\.min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[5] };
		// /ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css
		if (mtch = pathname.match(/^\/ajax\/libs\/([a-zA-Z0-9\.-]+)\/([r\d\.-]+)\/(.+?)\.(css)$/i))
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
		// /jquery-latest.min.js => 1.11.1
		if (mtch = pathname.match(/^\/(jquery-migrate|jquery)-latest(\.slim)?(\.min|\.pack)?\.(js|css)$/i))
			return { version: "1.11.1", name: canonicalizeName(mtch[1] + (mtch[2]||"")), ext: mtch[4] };
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
		// /ajax/libs/flexslider/2.7.2/jquery.flexslider.min.js
		if (mtch = pathname.match(/^\/ajax\/libs\/([a-zA-Z0-9\.-]+)\/([\d\.-]+)\/(.+?)(?:\.compiled|\.min)?\.(css|js|svg)$/i))
		{
			if (mtch[3].replace(/[_\.-]+/g, '').indexOf(mtch[1]) > -1)
				return { version: mtch[2], name: canonicalizeName(mtch[3]), ext: mtch[4] };
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[4] };
		}
		// /ajax/libs/toastr.js/latest/toastr.min.css => 2.1.3
		if (mtch = pathname.match(/^\/ajax\/libs\/toastr.js\/latest\/toastr(\.min)?\.(js|css)$/i))
			return { version: "2.1.3", name: "toastr", ext: mtch[2] };
	}
	else if (hostname == "ajax.cloudflare.com")
	{
		// /cdn-cgi/scripts/7089c43e/cloudflare-static/rocket-loader.min.js
		if (mtch = pathname.match(/^\/cdn-cgi\/scripts\/([0-9a-f]+)\/cloudflare-static\/(rocket-loader)(?:\.min)?\.(js)$/i))
			return { version: mtch[1], name: canonicalizeName(mtch[2]), ext: mtch[3] };
		// /cdn-cgi/nexp/cloudflare.js
		if (mtch = pathname.match(/^\/cdn-cgi\/([0-9a-z]+)\/([0-9a-z]+)(?:\.min)?\.(js)$/i))
			return { version: "", name: canonicalizeName(mtch[1] + "/" + mtch[2]), ext: mtch[3] };
	}
	else if (hostname == "cdn.ampproject.org")
	{
		/*
		/v0.js
		/v0.js?ver=4.9.9
		/v0/amp-ad-0.1.js
		/v0/amp-auto-ads-0.1.js
		/v0/amp-lightbox-0.1.js
		/v0/amp-sticky-ad-1.0.js
		/v0/amp-timeago-0.1.js
		/rtv/012101212155000/v0/amp-loader-0.1.js
		*/
		if (mtch = pathname.match(/^\/v0\.js(\?ver=([\d\.]*))?$/i))
			return { version: mtch[2]||"1.0.0", name: "amp", ext: "js" };
		if (mtch = pathname.match(/^\/(rtv\/[0-9]+\/)?v0\/(amp-[a-zA-Z-]+)-([0-9\.]+)\.js$/i))
			return { version: mtch[3], name: canonicalizeName(mtch[2]), ext: "js" };
	}
	else if (hostname == "cdn.jsdelivr.net")
	{
		// /npm/chartjs-plugin-zoom@0.7.0
		if (mtch = pathname.match(/^\/npm\/([a-z\._-]+2?)@([0-9\.]+x?)$/i))
			return { version: mtch[2], name: mtch[1], ext: "js" };
		/*
		/npm/jquery@3.2.1/dist/jquery.min.js
		/npm/jquery@3.2/dist/jquery.min.js
			FIXME: change 3.2 to 3.2.x
		/npm/jquery@3/dist/jquery.min.js
		/algoliasearch/3.25.1/algoliasearch.min.js
		/jssor.slider/20.0.0/jssor.slider.mini.js
		*/
		// name before .js$ is equal to name after ^/
		if (mtch = pathname.match(/^\/(?:npm\/)?([a-z\.-]+?)(?:\.js|js|\.css|css)?[@\/]([0-9\.]+)\/(?:dist\/cdn\/|dist\/js\/|dist\/|css\/|js\/)?\1(?:\.mini|\.min|-min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1]), ext: mtch[3] };

		// algoliasearch/3/algoliasearch.angular.js?v=1.2
		// name before .js$ starts with name after ^/
		if (mtch = pathname.match(/^\/(?:npm\/)?([a-z\.-]+?)(?:\.js|js|\.css|css)?[@\/]([0-9\.]+)\/(?:dist\/cdn\/|dist\/js\/|dist\/|css\/|js\/)?\1([a-z\.-]+?)(?:\.mini|\.min|-min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[3]), ext: mtch[4] };

		// bxslider/4.2.12/jquery.bxslider.js
		// name before .js$ ends with name after ^/
		if (mtch = pathname.match(/^\/(?:npm\/)?([a-z\.-]+?)(?:\.js|js|\.css|css)?[@\/]([0-9\.]+)\/(?:dist\/cdn\/|dist\/js\/|dist\/|css\/|js\/)?([a-z\.-]+?)\1(?:\.mini|\.min|-min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[3]), ext: mtch[4] };

		// /npm/fomantic-ui@2.8.6/dist/components/icon.min.css
		// /crypto-js/3.1.2/components/enc-base64-min.js
		// /npm/@unicorn-fail/drupal-bootstrap-styles@0.0.2/dist/3.4.0/8.x-3.x/drupal-bootstrap.css
		// /npm/@elastic/app-search-javascript@7.7.0/dist/elastic_app_search.umd.js
		if (mtch = pathname.match(/^\/(?:npm\/@[a-z-]+\/|npm\/)?([a-z0-9\.-]+?)[@\/]([0-9\.]+(?:-beta\.\d|-beta\d*|-rc\.\d+)?)\/(?:dist\/cdn\/|dist\/components\/|components\/|dist\/)?([a-z0-9\/\._-]+?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json|ttf|woff2|woff|eot|ico|xap|swf)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[4] };

		// /gh/ractoon/jQuery-Text-Counter@0.8.0/textcounter.min.js
		if (mtch = pathname.match(/^\/gh\/([a-z0-9\.@\/_-]*?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json)$/i))
			return { version: "", name: "GitHub/" + mtch[1], ext: mtch[2] };

		// /wp/wp-editormd/tags/10.2.1/assets/Prism.js/plugins/line-numbers/prism-line-numbers.css?ver=1.15.0
		// /wp/wp-slimstat/tags/4.8.8.1/wp-slimstat.min.js
		// /wp/plugins/lightbox-photoswipe/tags/3.1.3/lib/photoswipe.css
		if (mtch = pathname.match(/^\/wp\/(plugins\/|themes\/)?([a-z0-9\.-]+?)\/tags\/([0-9\.]+)\/([a-z0-9\.@\/_-]*?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json)$/i))
			return { version: mtch[3], name: "WordPress/" + mtch[1] + mtch[2] + "/" + mtch[4], ext: mtch[5] };

		//FIXME: ugly catch-alls. Disable this when you are fixing the rules above
		if (mtch = pathname.match(/^\/(g|combine)\/([a-z0-9+(),\.@\/_-]*)$/i))
			return { version: "", name: "Combine/" + mtch[1], ext: "" };
		if (mtch = pathname.match(/^\/(?:npm\/)?([a-z0-9+,\.@\/_-]*?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json|ttf|woff2|woff|eot|ico|xap|swf)$/i))
			return { version: "", name: mtch[1], ext: mtch[2] };
		if (mtch = pathname.match(/^\/(?:npm\/)?([a-z0-9+,\.@\/_-]*)$/i))
			return { version: "", name: mtch[1], ext: "" };
	}
	return { version: null, name: null, ext: null};
}
function getUID(url)
{
	let { version, name, ext } = getVersionNameExt(url.hostname, url.pathname);
	if (name && version != null)
		return { uid: name + " " + ext + " " + canonicalizeVersion(version), version: version };
	return { uid: "//" + url.host + url.pathname, version: "0" };
}
/*
function getFontUrlsFromCSS(css)
{
	let doc = document.implementation.createHTMLDocument(""),
	styleElem = document.createElement("style");
	styleElem.textContent = css;
	doc.body.appendChild(styleElem);

	var urls = [];
	let styles = [...styleElem.sheet.cssRules].filter(r => r.type == 5).map(r => r.style);
};
*/

function isMimeTextual(contentType)
{
	let textuals = ["text/", "application/javascript", "application/atom+xml", "application/rss+xml", "image/svg+xml", "application/json", "application/vnd.google-earth.kml+xml", "application/x-perl", "application/xhtml+xml", "application/xspf+xml", "application/xml", "application/ld+json", "message/"];
	for (let textual of textuals)
		if (contentType.startsWith(textual))
			return true;
	return false;
}
function sizeOf(value)
{
	return typeSizes[typeof value](value);
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
function getDefaultSettings()
{
	return { allowModifyHeaders: true, blockUnknownGoogleFonts: true };
}

function parseCspHeader(policy)
{
	return policy.split(';').reduce((result, directive) => {
		const [directiveKey, ...directiveValue] = directive.trim().split(/\s+/g);
		if (!directiveKey || Object.prototype.hasOwnProperty.call(result, directiveKey))
			return result;
		return Object.assign(Object.assign({}, result), { [directiveKey]: directiveValue });
	}, {});
}
