"use strict";

export function getVersionNameExt(hostname, pathname)
{
	let mtch;
	if (hostname == "fastly.jsdelivr.net")
	{
		// Fastly mirror of jsdelivr: identical paths, shared cache keys
		hostname = "cdn.jsdelivr.net";
	}
	if (hostname == "cdn.jsdelivr.net" && pathname.startsWith("/npm/"))
	{
		hostname = "unpkg.com";
		pathname = pathname.substr(4);
	}

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
		if (mtch = pathname.match(/^\/ajax\/libs\/[^\/]+\/([\d\.-]+(?:(?:alpha|beta|dev|rc|pre|build|unstable|final|next|release|M|preview)[\.\d-]*)?|r\d+)\/(?:lib\/|js\/|css\/|scripts\/|bootstrap\/|min\/|umd\/)?([a-zA-Z0-9_\.-]+?)(?:\.development|\.production|\.bundle)?(\.compiled|\.min)?\.(js|css|map|png|eot|svg|ttf|woff2|woff)$/i))
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
		if (mtch = pathname.match(/^\/ajax\/libs\/toastr\.js\/latest\/toastr(\.min)?\.(js|css)$/i))
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
		// /algoliasearch/3.25.1/algoliasearch.min.js
		// /jssor.slider/20.0.0/jssor.slider.mini.js
		// name before .js$ is equal to name after ^/
		if (mtch = pathname.match(/^\/([a-z\.-]+?)(?:\.js|js|\.css|css)?[@\/]([0-9\.]+)\/(?:dist\/cdn\/|dist\/js\/|dist\/|css\/|js\/)?\1(?:\.mini|\.min|-min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1]), ext: mtch[3] };

		// algoliasearch/3/algoliasearch.angular.js?v=1.2
		// name before .js$ starts with name after ^/
		if (mtch = pathname.match(/^\/(?:npm\/)?([a-z\.-]+?)(?:\.js|js|\.css|css)?[@\/]([0-9\.]+)\/(?:dist\/cdn\/|dist\/js\/|dist\/|css\/|js\/)?\1([a-z\.-]+?)(?:\.mini|\.min|-min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[3]), ext: mtch[4] };

		// bxslider/4.2.12/jquery.bxslider.js
		// name before .js$ ends with name after ^/
		if (mtch = pathname.match(/^\/([a-z\.-]+?)(?:\.js|js|\.css|css)?[@\/]([0-9\.]+)\/(?:dist\/cdn\/|dist\/js\/|dist\/|css\/|js\/)?([a-z\.-]+?)\1(?:\.mini|\.min|-min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[3]), ext: mtch[4] };

		// /crypto-js/3.1.2/components/enc-base64-min.js
		if (mtch = pathname.match(/^\/(?:@[a-z-]+\/)?([a-z0-9\.-]+?)[@\/]([0-9\.]+(?:-beta\.\d|-beta\d*|-rc\.\d+)?)\/(?:dist\/cdn\/|dist\/components\/|components\/|dist\/)?([a-z0-9\/\._-]+?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json|ttf|woff2|woff|eot|ico|xap|swf)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[4] };

		// /gh/<user>/<repo>@<numeric-ref>/<file> → versioned so point-upgrades
		// work (branch refs like @gh-pages fall through to the unversioned
		// catch-all below, which revalidates every 24h)
		// /gh/cutestat/bootstrap2@2/css/bootstrap.min.css
		// /gh/namamax/jqui-crcstm@1.0.0/js/bootstrap.min.js
		if (mtch = pathname.match(/^\/gh\/([^\/@]+)\/([^\/@]+)@([~^]?[0-9][0-9a-z\.\-]*)\/(.+?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json)$/i))
			return { version: mtch[3], name: canonicalizeName("GitHub/" + mtch[1] + "/" + mtch[2] + "/" + mtch[4]), ext: mtch[5] };
		// /gh/ractoon/jQuery-Text-Counter@0.8.0/textcounter.min.js
		if (mtch = pathname.match(/^\/gh\/([a-z0-9\.@\/_-]*?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json)$/i))
			return { version: "", name: "GitHub/" + mtch[1], ext: mtch[2] };

		// /wp/wp-editormd/tags/10.2.1/assets/Prism.js/plugins/line-numbers/prism-line-numbers.css?ver=1.15.0
		// /wp/wp-slimstat/tags/4.8.8.1/wp-slimstat.min.js
		// /wp/plugins/lightbox-photoswipe/tags/3.1.3/lib/photoswipe.css
		if (mtch = pathname.match(/^\/wp\/(plugins\/|themes\/)?([a-z0-9\.-]+?)\/tags\/([0-9\.]+)\/([a-z0-9\.@\/_-]*?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json)$/i))
			return { version: mtch[3], name: "WordPress/" + mtch[1] + mtch[2] + "/" + mtch[4], ext: mtch[5] };

		//FIXME: ugly catch-alls. Disable this when you are fixing the rules above
		// /g and /combine bundle MANY files in one response: the full path
		// selects the content, so different bundles must not share one UID.
		if (mtch = pathname.match(/^\/(g|combine)\/([a-z0-9+(),\.@\/_-]*)$/i))
			return { version: "", name: "Combine/" + mtch[1] + "/" + shortHash(pathname), ext: "" };
		if (mtch = pathname.match(/^\/([a-z0-9+,\.@\/_-]*?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json|ttf|woff2|woff|eot|ico|xap|swf)$/i))
			return { version: "", name: mtch[1], ext: mtch[2] };
	}
	else if (hostname == "unpkg.com")
	{
		//unescape %5E to ^
		pathname = pathname.replace(/%5E/g, '^');

		// /@gobistories/gobi-web-integration@^6.7.15
		if (mtch = pathname.match(/^\/@[a-z-]+\/([a-z\._-]+2?)@([~\^]?[0-9][0-9x\.]*)$/i))
			return { version: mtch[2], name: mtch[1], ext: "js" };

		// /chartjs-plugin-zoom@0.7.0
		if (mtch = pathname.match(/^\/([a-z\._-]+2?)@([~\^]?[0-9][0-9x\.]*)$/i))
			return { version: mtch[2], name: mtch[1], ext: "js" };

		// /jquery@3.2.1/dist/jquery.min.js
		// /jquery@3.2/dist/jquery.min.js
		//	FIXME: change 3.2 to 3.2.x
		// /jquery@3/dist/jquery.min.js
		// name before .js$ is equal to name after ^/
		if (mtch = pathname.match(/^\/([a-z\.-]+?)(?:\.js|js|\.css|css)?[@\/]([~\^]?[0-9][0-9x\.]*)\/(?:dist\/cdn\/|dist\/js\/|dist\/|css\/|js\/)?\1(?:\.pkgd\.min|\.pkgd|\.mini|\.min|-min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1]), ext: mtch[3] };

		// name before .js$ starts with name after ^/
		if (mtch = pathname.match(/^\/([a-z\.-]+?)(?:-core|\.js|js|\.css|css)?[@\/]([~\^]?[0-9][0-9x\.]*)\/(?:dist\/cdn\/|dist\/js\/|dist\/|css\/|js\/)?(\1[a-z\.-]+?)(?:\.pkgd\.min|\.pkgd|\.mini|\.min|-min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[3]), ext: mtch[4] };

		// /fomantic-ui@2.8.6/dist/components/icon.min.css
		// /@unicorn-fail/drupal-bootstrap-styles@0.0.2/dist/3.4.0/8.x-3.x/drupal-bootstrap.css
		// /@elastic/app-search-javascript@7.7.0/dist/elastic_app_search.umd.js
		// /@damplus/indexed-cloudinary@^3.2.0/dist/indexed-cloudinary.js
		if (mtch = pathname.match(/^\/(?:@[a-z-]+\/)?([a-z0-9\.-]+?)[@\/]([~\^]?[0-9][0-9x\.]*(?:-beta\.\d|-beta\d*|-rc\.\d+)?)\/(?:dist\/cdn\/|dist\/components\/|components\/|dist\/)?([a-z0-9\/\._-]+?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json|ttf|woff2|woff|eot|ico|xap|swf)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[4] };

		//FIXME: ugly catch-alls. Disable this when you are fixing the rules above
		if (mtch = pathname.match(/^\/([a-z0-9+,\.@\/_-]*?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json|ttf|woff2|woff|eot|ico|xap|swf)$/i))
			return { version: "", name: mtch[1], ext: mtch[2] };
		if (mtch = pathname.match(/^\/([a-z0-9+,\.@\/_-]*)$/i))
			return { version: "", name: mtch[1], ext: "" };
	}
	else if (hostname == "ajax.aspnetcdn.com" || hostname == "ajax.microsoft.com")
	{
		// /ajax/4.5.2/1/MicrosoftAjax.js (versioned framework bundle — check before generic)
		// /ajax/jquery.ui/1.11.3/jquery-ui.min.js
		// /ajax/jquery.ui/1.11.3/themes/blitzer/jquery-ui.css
		// /ajax/jQuery/jquery-1.8.0.js (old format, version in filename)
		if (mtch = pathname.match(/^\/ajax\/([\d][\d\.]*)\/\d+\/(.+?)(?:\.debug)?\.(js)$/i))
			return { version: mtch[1], name: canonicalizeName(mtch[2]), ext: mtch[3] };
		if (mtch = pathname.match(/^\/ajax\/([^\/]+)\/([\d][\d\.a-z-]*)\/(.+?)(?:\.min|\.pack)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[4] };
		if (mtch = pathname.match(/^\/ajax\/[a-z\.]+\/([a-z\.-]+?)-([\d\.]+)(\.min)?\.(js|css)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1]), ext: mtch[4] };
	}
	else if (hostname == "cdn.staticfile.org")
	{
		// /jquery/3.7.1/jquery.min.js
		// /vue/3.3.4/vue.global.min.js
		if (mtch = pathname.match(/^\/([^\/]+)\/([0-9][0-9a-z\.\-]+)\/(.+?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json|ttf|woff2|woff|eot|ico)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[4] };
	}
	else if (hostname == "maxcdn.bootstrapcdn.com" || hostname == "stackpath.bootstrapcdn.com" || hostname == "netdna.bootstrapcdn.com")
	{
		// /bootstrap/3.3.7/css/bootstrap.min.css
		// /font-awesome/4.7.0/css/font-awesome.min.css
		// /jquery/3.7.1/jquery.min.js
		if (mtch = pathname.match(/^\/([^\/]+)\/([0-9][0-9a-z\.\-]+)\/(.+?)(?:\.min|-min)?\.(js|css|gif|png|jpg|svg|json|ttf|woff2|woff|eot|ico)$/i))
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + mtch[3]), ext: mtch[4] };
	}
	else if (hostname == "use.fontawesome.com")
	{
		// /releases/v5.15.4/css/all.css
		// /releases/v6.5.2/js/all.min.js
		if (mtch = pathname.match(/^\/releases\/v([0-9][0-9a-z\.\-]*)\/(.+?)(?:\.min)?\.(js|css)$/i))
			return { version: mtch[1], name: canonicalizeName("fontawesome/" + mtch[2]), ext: mtch[3] };
	}
	else if (hostname == "esm.sh")
	{
		// /react@19.2.4
		// /react@19.2.4/dist/react.js
		// /@scope/pkg@1.2.3/file.js
		// /@scope/pkg@^1.2.0?dev
		if (mtch = pathname.match(/^\/@([^\/]+)\/([^\/@]+)@([~\^]?[0-9][0-9a-z\.\-]+)(?:\/(.*))?$/i))
		{
			const file = mtch[4] || "index";
			const extm = file.match(/\.([a-z0-9]+)$/i);
			return { version: mtch[3], name: canonicalizeName("@" + mtch[1] + "/" + mtch[2] + "/" + file.replace(/\.[a-z0-9]+$/i, "")), ext: extm ? extm[1].toLowerCase() : "js" };
		}
		if (mtch = pathname.match(/^\/([^\/@]+)@([~\^]?[0-9][0-9a-z\.\-]+)(?:\/(.*))?$/i))
		{
			const file = mtch[3] || "index";
			const extm = file.match(/\.([a-z0-9]+)$/i);
			return { version: mtch[2], name: canonicalizeName(mtch[1] + "/" + file.replace(/\.[a-z0-9]+$/i, "")), ext: extm ? extm[1].toLowerCase() : "js" };
		}
	}
	return { version: null, name: null, ext: null};
}

const uidMemo = new Map();
const UID_MEMO_MAX = 5000;

export function clearUidMemo()
{
	uidMemo.clear();
}

// FNV-1a 32-bit, hex. For cache-key namespacing only, not security.
export function shortHash(str)
{
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++)
	{
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return ("0000000" + (h >>> 0).toString(16)).slice(-8);
}

// Query params that change response bytes (build flags), not cache-busters.
// ?ver= / ?_= are deliberately ignored so busting aids dedupe.
const ESM_VARIANT_PARAMS = ["bundle", "conditions", "css", "deps", "dev", "external", "module", "raw", "target"];

function variantSuffix(searchParams, allow)
{
	const parts = [];
	for (const k of allow)
	{
		if (!searchParams.has(k))
			continue;
		const v = searchParams.get(k);
		parts.push(v ? k + "-" + v : k);
	}
	if (!parts.length)
		return "";
	parts.sort();
	let s = parts.join(",").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	if (s.length > 48)
		s = "q" + shortHash(parts.join(","));
	return s;
}

// Build flavors that change bytes beyond minification. Folded into the UID
// so development/production/bundle builds never share cache entries.
// (.min alone stays shared — pure minification, prefer-min fetch biases the
// stored bytes toward the smaller file.)
const FLAVOR_TOKENS = ["development", "production", "bundle", "compiled", "pack", "slim"];

function flavorSuffix(pathname, name)
{
	const file = pathname.split("/").pop().toLowerCase();
	const norm = (name || "").toLowerCase();
	const out = [];
	for (const t of FLAVOR_TOKENS)
	{
		if (!new RegExp("(?:[.-])" + t + "(?=[.-])").test(file))
			continue;
		if (norm.split("/").includes(t) || norm.includes(t))
			continue; // parser already namespaced it (e.g. jquery/slim)
		out.push(t);
	}
	return out.length ? "/@" + out.sort().join(",") : "";
}

export function getUID(url)
{
	let memoKey = url.hostname + url.pathname;
	// Same path + different build flags = different bytes = different UID.
	// (esm.sh ?dev/?bundle=false/?external=…, unpkg ?module UMD vs ESM.)
	let variant = "";
	if (url.hostname == "esm.sh")
	{
		variant = variantSuffix(url.searchParams, ESM_VARIANT_PARAMS);
		if (variant)
			memoKey += "?" + variant;
	}
	else if ((url.hostname == "unpkg.com" || url.hostname == "cdn.jsdelivr.net" || url.hostname == "fastly.jsdelivr.net") && url.searchParams.has("module"))
	{
		variant = "module";
		memoKey += "?module";
	}
	const memoHit = uidMemo.get(memoKey);
	if (memoHit)
		return memoHit;
	let { version, name, ext } = getVersionNameExt(url.hostname, url.pathname);
	// Variant goes in the name so the numeric version still point-upgrades
	// within one variant (dev 19.2.4 → dev 19.2.5) but never across variants.
	if (variant && name)
		name = name + "/@" + variant;
	// Build flavors (bundle/production/…) change bytes: namespace them too.
	// (.min alone stays shared — pure minification.)
	if (name)
		name = name + flavorSuffix(url.pathname, name);
	const out = (name && version != null)
		? { uid: name + " " + ext + " " + canonicalizeVersion(version), version: version }
		: { uid: "//" + url.host + url.pathname, version: "0" };
	if (uidMemo.size >= UID_MEMO_MAX)
		uidMemo.clear();
	uidMemo.set(memoKey, out);
	return out;
}

export function canonicalizeName(name)
{
	return name.toLowerCase().replace(/[_\.-]+/g, '/');
}

// Semantic Versioning
// [major, minor, patch]
// [x X *] wildcard
// ~ upgrade least significant digit to latest
//	~1.2.0 == 1.2.x
//	~1.0 == 1.x
// ^ upgrade all but most significant digit to latest
//	^1.0.0 == 1.x.x
// versionsMatch('1.0.0', ['1.0.1']) matches, but not in official Semantic Versioning!
const versionRE = /^[\^\~]?(\d+\.\d+\.)(\d+)$/;

export function canonicalizeVersion(versi)
{
	return versi.replace(versionRE, '$1x');
}
export function isNewerPointVersion(v1, v2)
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
