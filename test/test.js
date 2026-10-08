"use strict";

var expect = chai.expect;
chai.config.truncateThreshold = 2;
chai.config.includeStack = false;

/*
let fontFamilies = {};
for (let line of urls.googleapisfonts.split(/\r?\n/))
	if (line && line.charAt(0) != '#')
		for (let fam of getFamiliesFromGoogleFontCSSURL(new URL(line)))
			fontFamilies[fam] = fontFamilies[fam] ? fontFamilies[fam] + 1 : 1;
console.log(JSON.stringify(Object.keys(fontFamilies).sort((a,b) => fontFamilies[b] - fontFamilies[a])));
*/

describe("utils", function() {
	describe.skip("versionMatches", function() {
		// [major, minor, patch]
		// [x X *] wildcard
		// ~ upgrade least significant digit to latest
		//      ~1.2.0 == 1.2.x
		//      ~1.0 == 1.x
		// ^ upgrade all but most significant digit to latest
		//      ^1.0.0 == 1.x.x
		for (let line of [
			//requested, available, isMatch
			["1.0.0", "1.0.0", true],
			["^1.0.0", "1.0.0", true],
			["~1.0.0", "1.0.0", true],
			["1.0.x", "1.0.0", true],
			["1.0.*", "1.0.0", true],
			["1.x", "1.0.0", true],
			["1.*", "1.0.0", true],

			["1.0.0", "1.0.1", true],
			["^1.0.0", "1.0.1", true],
			["~1.0.0", "1.0.1", true],
			["1.0.x", "1.0.1", true],
			["1.0.*", "1.0.1", true],
			["1.x", "1.0.1", true],
			["1.*", "1.0.1", true],

			["1.0.1", "1.0.0", true],
			["^1.0.1", "1.0.0", true],
			["~1.0.1", "1.0.0", true],
			["1.1.x", "1.0.0", false],
			["1.1.*", "1.0.0", false],
			["2.x", "1.0.0", false],
			["2.*", "1.0.0", false],

			["1.0.1", "1.2.3", false],
			["^1.0.1", "1.2.3", true],
			["^1.1.1", "1.2.3", true],
			["^1.2.1", "1.2.3", true],
			["^1.2.4", "1.2.3", true],
			["^1.3.1", "1.2.1", false],
			["^1.3.1", "1.2.2", false],
			["^1.3.1", "1.2.3", false],
			["^1.3.1", "1.2.10", false],
			["^1.3.1", "1.10.1", true],
			["~1.0.1", "1.2.3", false],
			["~1.1.1", "1.2.3", false],
			["~1.2.1", "1.2.3", true],
			["~1.2.4", "1.2.3", true],
			["~1.3.1", "1.2.3", false],
			["1.1.x", "1.2.3", false],
			["1.1.*", "1.2.3", false],
			["1.2.*", "1.2.3", true],
			["1.3.*", "1.2.3", false],
			["1.10.*", "1.2.3", false],
			["2.x", "1.2.3", false],
			["2.*", "1.2.3", false],

			["1.0.0", "1.0.a", true],
			["1.0.0", "1.0.a0", true],
			["1.0.0", "1.0.0a", true],
			["1.0.0", "1.a.0", false],
			["1.1.0", "1.a.0", false],
			["1.b.0", "1.a.0", false],
			["1.0.0", "1.a", false],
		])
		{
			it('requested:' + line[0] + ', available:' + line[1] + ' ⟹ ' + line[2], function() {
				if (line[2])
					expect(versionsMatch(line[0], [line[1]])).to.deep.equal(line[1]);
				else
					expect(versionsMatch(line[0], [line[1]])).to.be.undefined;
			});
		}
	});
	describe("isMimeTextual", function() {
		for (let line of [
			["text/html", true],
			["application/json", true],
			["text/css", true],
			["text/xml", true],
			["application/xml", true],
			["text/javascript", true],
			["image/svg+xml", true],
			["image/jpeg", false],
			["audio/wav", false],
			["font/woff2", false],
		])
		{
			it(line[0] + ' ⟹ ' + line[1], function() {
				expect(isMimeTextual(line[0])).to.equal(line[1]);
			});
		}
	});
	describe("canonicalizeGoogleFontCSSURL", function() {
		for (let line of [
			["https://fonts.googleapis.com/css2?family=Noto+Sans+HK&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap", ["Noto Sans HK", "Roboto"]],
			["https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,200;0,300;0,400;0,500;0,700;0,900;1,100;1,200;1,300;1,400;1,500;1,700;1,900", ["Roboto"]],
			["https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700", ["Open Sans"]],
			["https://fonts.googleapis.com/css?family=Droid+Sans:700,regular|Droid+Serif:italic,regular&subset=latin", ["Droid Sans", "Droid Serif"]],
		])
		{
			it(line[0] + ' ⟹ ' + line[1], function() {
				expect(getFamiliesFromGoogleFontCSSURL(new URL(line[0]))).to.deep.equal(line[1]);
			});
		}
	});
	describe("getUID", function() {
		for (let line of [
			["https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js", "jquery js 1.12.x", "1.12.4"],
		])
		{
			it(line[0] + ' ⟹ ' + line[1] + ' / ' + line[2], function() {
				let { uid: storKey, version: versi } = getUID(new URL(line[0]));
				expect(storKey).to.equal(line[1]);
				expect(versi).to.equal(line[2]);
			});
		}
	});
	describe("getUID equivalency", function() {
		for (let line of [
			["https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js", "https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.js", "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.4/jquery.min.js"],
			["https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js", "https://code.jquery.com/jquery-1.12.4.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.4/jquery.min.js"],
			["https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css", "https://code.jquery.com/ui/1.12.1/themes/smoothness/jquery-ui.css", "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.min.css"],
			["https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js", "https://code.jquery.com/ui/1.12.1/jquery-ui.js", "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"],
		])
		{
			let { uid: uid1, version: version1 } = getUID(new URL(line[0]));
			it(line[0] + ' == ' + line[1], function() {
				let { uid: uid2, version: version2 } = getUID(new URL(line[1]));
				expect(uid1).to.equal(uid2);
				expect(version1).to.equal(version2);
			});
			it(line[0] + ' == ' + line[2], function() {
				let { uid: uid3, version: version3 } = getUID(new URL(line[2]));
				expect(uid1).to.equal(uid3);
				expect(version1).to.equal(version3);
			});
		}
	});
	describe("isNewerPointVersion", function() {
		for (let line of [
			["3.5.1", "3.5.0", true],
			["3.5.2", "3.5.0", true],
			["3.5.3", "3.5.0", true],
			["3.5.1", "3.5.1", false],
			["3.5.2", "3.5.1", true],
			["3.5.3", "3.5.1", true],
			["3.5.1", "3.5.2", false],
			["3.5.2", "3.5.2", false],
			["3.5.3", "3.5.2", true],
			["1.10.0", "1.10.0", false],
			["1.10.1", "1.10.0", true],
			["1.10.2", "1.10.0", true],
			["1.10.10", "1.10.0", true],
			["1.1.1", "1.1.0", true],
			["1.1.10", "1.1.0", true],
			["1.1.3", "1.1.20", false],
			["1.1.1a", "1.1.0", false],
			["1.1.1.1", "1.1.1.0", false],
			["1.2.1", "1.1.0", false],
			["2.5.1-beta2", "2.5.0-beta2", false],
		])
		{
			it(line[0] + ' > ' + line[1] + ' ⟹ ' + line[2], function() {
				expect(isNewerPointVersion(line[0], line[1])).to.equal(line[2]);
			});
		}
	});
	describe("canonicalizeVersion", function() {
		for (let line of [
			["0.0.0","0.0.x"],
			["0.0.1","0.0.x"],
			["0.0.10","0.0.x"],
			["0.0.11","0.0.x"],
			["0.0.99","0.0.x"],
			["0.0.123","0.0.x"],
			["6543.678657.123","6543.678657.x"],
			["1.10.1a","1.10.1a"],
			["1.12.4","1.12.x"],
			["3.4.1","3.4.x"],
			["r84","r84"],
			["1.1.1.1","1.1.1.1"],
			["",""],
			["2.5.0-beta2","2.5.0-beta2"],
			["1","1"],
		])
		{
			it(line[0] + ' ⟹ ' + line[1], function() {
				expect(canonicalizeVersion(line[0])).to.equal(line[1]);
			});
		}
	});
});
describe("allowDataUriInCsp", function() {
	for (let line of [
		// [policy, changed, expected]
		["script-src 'self' https://code.jquery.com", true, "script-src data: 'self' https://code.jquery.com"],
		["style-src https://cdnjs.cloudflare.com", true, "style-src data: https://cdnjs.cloudflare.com"],
		["font-src https://fonts.gstatic.com", true, "font-src data: moz-extension: https://fonts.gstatic.com"],
		["script-src 'self'; style-src 'self'; font-src 'self'", true, "script-src data: 'self';style-src data: 'self';font-src data: moz-extension: 'self'"],
		// directives governed by default-src are created from it
		["default-src 'self' https://code.jquery.com", true, "default-src 'self' https://code.jquery.com;script-src 'self' https://code.jquery.com data:;style-src 'self' https://code.jquery.com data:;font-src 'self' https://code.jquery.com data: moz-extension:"],
		["default-src 'self' https://fonts.gstatic.com", true, "default-src 'self' https://fonts.gstatic.com;script-src 'self' https://fonts.gstatic.com data:;style-src 'self' https://fonts.gstatic.com data:;font-src 'self' https://fonts.gstatic.com data: moz-extension:"],
		// default-src already allows data: for a type → that directive is not created
		["default-src data:", true, "default-src data:;font-src data: moz-extension:"],
		// nothing to patch: unrestricted or already patched
		["", false, ""],
		["img-src 'self'", false, "img-src 'self'"],
		["script-src data: https://x.com", false, "script-src data: https://x.com"],
		["script-src data:;style-src data:;font-src data: moz-extension:", false, "script-src data:;style-src data:;font-src data: moz-extension:"],
	])
	{
		it(line[0] + ' ⟹ changed:' + line[1], function() {
			const { changed, value } = allowDataUriInCsp(line[0]);
			expect(changed).to.equal(line[1]);
			expect(value).to.equal(line[2]);
		});
	}
});
describe("rewriteGstaticCss", function() {
	const base = "moz-extension://id/resources/fonts/";
	const families = { roboto: ["bundled.woff2"], lato: [] };
	const css = "src: url(https://fonts.gstatic.com/s/roboto/v51/bundled.woff2) format('woff2');" +
		"src: url(https://fonts.gstatic.com/s/roboto/v51/gone.woff2) format('woff2');" +
		"src: url(http://fonts.gstatic.com/s/other/v1/keep.ttf) format('truetype');" +
		"src: url(https://fonts.gstatic.com/s/strange/v2/x.eot) format('embedded-opentype');";
	it("bundled file → packaged URL; missing bundled file stays for the pipeline", function() {
		expect(rewriteGstaticCss(css, families, false, base)).to.equal(
			"src: url(" + base + "roboto/bundled.woff2) format('woff2');" +
			"src: url(https://fonts.gstatic.com/s/roboto/v51/gone.woff2) format('woff2');" +
			"src: url(http://fonts.gstatic.com/s/other/v1/keep.ttf) format('truetype');" +
			"src: url(https://fonts.gstatic.com/s/strange/v2/x.eot) format('embedded-opentype');");
	});
	it("blockUnknown: unknown family → nonexistent packaged path (blocked), known family falls back to pipeline", function() {
		expect(rewriteGstaticCss(css, families, true, base)).to.equal(
			"src: url(" + base + "roboto/bundled.woff2) format('woff2');" +
			"src: url(https://fonts.gstatic.com/s/roboto/v51/gone.woff2) format('woff2');" +
			"src: url(" + base + "other/keep.ttf) format('truetype');" +
			"src: url(" + base + "strange/x.eot) format('embedded-opentype');");
	});
	it("blockUnknown off: unknown family untouched", function() {
		expect(rewriteGstaticCss("url(https://fonts.gstatic.com/s/strange/v2/x.woff2)", families, false, base))
			.to.equal("url(https://fonts.gstatic.com/s/strange/v2/x.woff2)");
	});
	it("Map input and non-gstatic URLs", function() {
		const map = new Map([["roboto", ["bundled.woff2"]]]);
		expect(rewriteGstaticCss("url(https://fonts.gstatic.com/s/roboto/v40/bundled.woff2) url(https://example.com/f.woff2)", map, true, base))
			.to.equal("url(" + base + "roboto/bundled.woff2) url(https://example.com/f.woff2)");
	});
	it("family without file list never blocks and never rewrites", function() {
		expect(rewriteGstaticCss("url(https://fonts.gstatic.com/s/roboto/v51/x.woff2)", { roboto: null }, true, base))
			.to.equal("url(https://fonts.gstatic.com/s/roboto/v51/x.woff2)");
	});
});
describe("collectGstaticFontUrls", function() {
	it("returns distinct gstatic font URLs only", function() {
		const css = "url(https://fonts.gstatic.com/s/roboto/v51/a.woff2) url(https://fonts.gstatic.com/s/roboto/v51/a.woff2)" +
			" url(http://fonts.gstatic.com/s/lato/v20/b.woff) url(https://example.com/c.woff2)" +
			" url(https://fonts.gstatic.com/s/noto/v5/d.woff2?#iefix)";
		expect(collectGstaticFontUrls(css)).to.deep.equal([
			"https://fonts.gstatic.com/s/roboto/v51/a.woff2",
			"http://fonts.gstatic.com/s/lato/v20/b.woff",
			"https://fonts.gstatic.com/s/noto/v5/d.woff2",
		]);
	});
	it("empty when nothing matches", function() {
		expect(collectGstaticFontUrls("url(https://example.com/c.woff2)")).to.deep.equal([]);
	});
});
describe("perf", function() {
	describe("shouldCancelSourcemap", function() {
		it("cancels .map paths", function() {
			expect(shouldCancelSourcemap("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.map")).to.equal(true);
			expect(shouldCancelSourcemap("https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js.map?ver=1")).to.equal(true);
		});
		it("keeps real assets", function() {
			expect(shouldCancelSourcemap("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js")).to.equal(false);
			expect(shouldCancelSourcemap("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css")).to.equal(false);
		});
	});
	describe("shouldBypassLargeEntry", function() {
		it("bypasses >2MB data: URIs", function() {
			expect(shouldBypassLargeEntry(2_000_001)).to.equal(true);
			expect(shouldBypassLargeEntry(2_000_000)).to.equal(false);
			expect(shouldBypassLargeEntry(500_000)).to.equal(false);
		});
	});
	describe("extractNestedCdnUrls", function() {
		it("finds @import and url() absolute URLs, dedupes, skips data:", function() {
			const css = "@import url(https://cdn.jsdelivr.net/npm/a@1.0.0/a.css); " +
				"@import 'https://cdnjs.cloudflare.com/ajax/libs/b/2.0/b.css'; " +
				".x{background:url(../fonts/c.woff2)} " +
				".y{background:url(data:font/woff2;base64,AAA)} " +
				".x{background:url(../fonts/c.woff2)}";
			expect(extractNestedCdnUrls(css, "https://cdn.jsdelivr.net/npm/a@1.0.0/dir/a.css")).to.deep.equal([
				"https://cdn.jsdelivr.net/npm/a@1.0.0/a.css",
				"https://cdnjs.cloudflare.com/ajax/libs/b/2.0/b.css",
				"https://cdn.jsdelivr.net/npm/a@1.0.0/fonts/c.woff2",
			]);
		});
		it("empty on bad input", function() {
			expect(extractNestedCdnUrls("", "https://example.com/a.css")).to.deep.equal([]);
			expect(extractNestedCdnUrls("url(https://example.com/a.woff2)", "not a url")).to.deep.equal([]);
		});
	});
	describe("extractTagSrc", function() {
		it("extracts src/href", function() {
			expect(extractTagSrc('<script src="https://cdn.jsdelivr.net/npm/a@1.0.0/a.js"></script>')).to.equal("https://cdn.jsdelivr.net/npm/a@1.0.0/a.js");
			expect(extractTagSrc("<link href='https://example.com/a.css' rel=stylesheet>")).to.equal("https://example.com/a.css");
			expect(extractTagSrc("<script src=https://example.com/a.js></script>")).to.equal("https://example.com/a.js");
		});
		it("null when inline", function() {
			expect(extractTagSrc("<script>var a=1</script>")).to.equal(null);
			expect(extractTagSrc("<link rel=preload>")).to.equal(null);
		});
	});
	describe("getUID memo", function() {
		it("returns cached object for same host+path", function() {
			const a = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"));
			const b = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js?ver=2"));
			expect(b).to.equal(a);
		});
	});
	describe("isStaleUnversioned", function() {
		it("stale only when versionless and older than 24h", function() {
			const old = Date.now() - UNVERSIONED_REVALIDATE_MS - 1000;
			expect(isStaleUnversioned({ v: "", created: old })).to.equal(true);
			expect(isStaleUnversioned({ v: "", created: Date.now() })).to.equal(false);
			expect(isStaleUnversioned({ v: "1.2.3", created: old })).to.equal(false);
			expect(isStaleUnversioned(null)).to.equal(false);
		});
	});
	describe("gh ref versions", function() {
		it("numeric @ref becomes the version", function() {
			let r = getVersionNameExt("cdn.jsdelivr.net", "/gh/cutestat/bootstrap2@2/css/bootstrap.min.css");
			expect(r.version).to.equal("2");
			let s = getVersionNameExt("cdn.jsdelivr.net", "/gh/namamax/jqui-crcstm@1.0.0/js/bootstrap.min.js");
			expect(s.version).to.equal("1.0.0");
			expect(s.name).to.not.equal(r.name);
		});
		it("branch refs stay unversioned", function() {
			let r = getVersionNameExt("cdn.jsdelivr.net", "/gh/Wruczek/Bootstrap-Cookie-Alert@gh-pages/cookiealert.js");
			expect(r.version).to.equal("");
		});
	});
	describe("vendorFileForKey", function() {
		const libs = {
			"jquery js 3.7.x": { file: "jquery/jquery-3.7.1.min.js", version: "3.7.1" },
		};
		it("exact and older patches hit the bundle", function() {
			expect(vendorFileForKey("jquery js 3.7.x", "3.7.1", libs)).to.equal("jquery/jquery-3.7.1.min.js");
			expect(vendorFileForKey("jquery js 3.7.x", "3.7.0", libs)).to.equal("jquery/jquery-3.7.1.min.js");
		});
		it("newer patches never downgrade", function() {
			expect(vendorFileForKey("jquery js 3.7.x", "3.7.2", libs)).to.equal(null);
		});
		it("unknown keys miss", function() {
			expect(vendorFileForKey("vue js 3.4.x", "3.4.0", libs)).to.equal(null);
			expect(vendorFileForKey("jquery js 3.7.x", "3.7.1", {})).to.equal(null);
		});
	});
});
describe("urls", function() {
	describe("version, name, ext", function() {
		describe("fontsgstatic", function() {
			for (let line of [
				["/s/amaticsc/v13/TUZ3zwprpvBS1izr_vOMscGKfLUC_2fi-Q.woff2", "", "fontgstatic/TUZ3zwprpvBS1izr_vOMscGKfLUC_2fi-Q", "woff2"],
				["/s/notosanshk/v5/nKKQ-GM_FYFRJvXzVXaAPe9hMXBxEu-8JKJiwNdTve7W4-fhxjn5P_4rrgJoi8PfTdpQKp8.0.woff2", "", "fontgstatic/nKKQ-GM_FYFRJvXzVXaAPe9hMXBxEu-8JKJiwNdTve7W4-fhxjn5P_4rrgJoi8PfTdpQKp8.0", "woff2"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("fonts.gstatic.com", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("jquery", function() {
			for (let line of [
				["/jquery-latest.min.js", "1.11.1", "jquery", "js"],
				["/jquery-3.5.1.min.js", "3.5.1", "jquery", "js"],
				["/jquery-3.5.1.slim.js", "3.5.1", "jquery/slim", "js"],
				["/jquery-3.x-git.slim.min.js", "3.x-git", "jquery/slim", "js"],
				["/ui/1.12.1/jquery-ui.min.js", "1.12.1", "jquery/ui", "js"],
				["/ui/1.12.1/themes/smoothness/jquery-ui.css", "1.12.1", "themes/smoothness/jquery/ui", "css"],
				["/pep/0.4.3/pep.js", "0.4.3", "pep", "js"],
				["/mobile/1.4.5/jquery.mobile-1.4.5.min.js", "1.4.5", "jquery/mobile", "js"],
				["/mobile/1.4.5/jquery.mobile.structure-1.4.5.min.css", "1.4.5", "jquery/mobile/structure", "css"],
				["/mobile/1.0a4/jquery.mobile-1.0a4.min.css", "1.0a4", "jquery/mobile", "css"],
				["/mobile/1.1.0-rc.1/jquery.mobile.structure-1.1.0-rc.1.min.css", "1.1.0-rc.1", "jquery/mobile/structure", "css"],
				["/color/jquery.color-2.2.0.js", "2.2.0", "jquery/color", "js"],
				["/color/jquery.color-2.2.0.min.js", "2.2.0", "jquery/color", "js"],
				["/color/jquery.color.svg-names-2.2.0.js", "2.2.0", "jquery/color/svg/names", "js"],
				["/color/jquery.color.plus-names-2.2.0.js", "2.2.0", "jquery/color/plus/names", "js"],
				["/qunit/qunit-2.10.0.js", "2.10.0", "qunit", "js"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("code.jquery.com", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("unpkg", function() {
			for (let line of [
				["/flickity@2.2.2/dist/flickity.pkgd.min.js", "2.2.2", "flickity", "js"],
				["/flickity@2/dist/flickity.pkgd.min.js", "2", "flickity", "js"],
				//["/rivet-core@2.0.0-alpha.3/js/rivet-iife.js", "2.0.0-alpha.3", "rivet/iife", "js"],
				//["/@lottiefiles/lottie-player@latest/dist/lottie-player.js", "", "lottie-player", "js"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("unpkg.com", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("cloudflare", function() {
			for (let line of [
				["/ajax/libs/flexslider/2.7.2/jquery.flexslider.min.js", "2.7.2", "jquery/flexslider", "js"],
				["/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js", "3.3.7", "bootstrap", "js"],
				["/ajax/libs/toastr.js/latest/toastr.min.css", "2.1.3", "toastr", "css"],
				["/ajax/libs/Chart.js/2.9.3/Chart.bundle.min.js", "2.9.3", "chart", "js"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("cdnjs.cloudflare.com", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("googleapis", function() {
			for (let line of [
				["/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css", "1.12.1", "themes/smoothness/jquery/ui", "css"],
				["/ajax/libs/shaka-player/2.3.8/shaka-player.compiled.js", "2.3.8", "shaka/player", "js"],
				["/ajax/libs/d3js/5.15.1/d3.min.js", "5.15.1", "d3", "js"],
				["/ajax/libs/jquerymobile/1.4.1/jquery.mobile.min.css", "1.4.1", "jquery/mobile", "css"],
				["/ajax/libs/dojo/1.13.0/dojo/dojo.js", "1.13.0", "dojo", "js"],
				["/ajax/libs/myanmar-tools/1.0.1/zawgyi_detector.min.js", "1.0.1", "zawgyi/detector", "js"],
				["/ajax/libs/shaka-player/2.5.0-beta2/shaka-player.compiled.js", "2.5.0-beta2", "shaka/player", "js"],
				["/ajax/libs/threejs/r84/three.min.js", "r84", "three", "js"],
				["/ajax/libs/yui/2.9.0/build/yuiloader-dom-event/yuiloader-dom-event.js", "2.9.0", "yui/yuiloader/dom/event", "js"],
				["/ajax/libs/yui/2.8.0r4/build/json/json-min.js", "2.8.0r4", "yui/json", "js"],
				["/ajax/libs/yui/2.8.0r4/build/yahoo/yahoo-min.js", "2.8.0r4", "yui/yahoo", "js"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("ajax.googleapis.com", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("aspnetcdn", function() {
			for (let line of [
				["/ajax/jquery.ui/1.11.3/jquery-ui.min.js", "1.11.3", "jquery/ui/jquery/ui", "js"],
				["/ajax/4.5.2/1/MicrosoftAjax.js", "4.5.2", "microsoftajax", "js"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("ajax.aspnetcdn.com", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("staticfile", function() {
			for (let line of [
				["/jquery/3.7.1/jquery.min.js", "3.7.1", "jquery/jquery", "js"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("cdn.staticfile.org", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("esm", function() {
			for (let line of [
				["/react@19.2.4", "19.2.4", "react/index", "js"],
				["/react-dom@19.2.4/client", "19.2.4", "react/dom/client", "js"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("esm.sh", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("fastly", function() {
			it("shares jsdelivr keys", function() {
				let a = getVersionNameExt("cdn.jsdelivr.net", "/npm/jquery@3.7.1/dist/jquery.min.js");
				let b = getVersionNameExt("fastly.jsdelivr.net", "/npm/jquery@3.7.1/dist/jquery.min.js");
				expect(b).to.deep.equal(a);
			});
		});
		describe("bootstrapcdn", function() {
			for (let line of [
				["/bootstrap/3.3.7/css/bootstrap.min.css", "3.3.7", "bootstrap/css/bootstrap", "css"],
				["/font-awesome/4.7.0/css/font-awesome.min.css", "4.7.0", "font/awesome/css/font/awesome", "css"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					for (const host of ["maxcdn.bootstrapcdn.com", "stackpath.bootstrapcdn.com", "netdna.bootstrapcdn.com"])
					{
						let { version, name, ext } = getVersionNameExt(host, line[0]);
						expect(version).to.equal(line[1]);
						expect(name).to.equal(line[2]);
						expect(ext).to.equal(line[3]);
					}
				});
			}
			it("all three mirrors share keys", function() {
				const p = "/bootstrap/4.5.2/css/bootstrap.min.css";
				const a = getUID(new URL("https://maxcdn.bootstrapcdn.com" + p));
				const b = getUID(new URL("https://stackpath.bootstrapcdn.com" + p));
				expect(b.uid).to.equal(a.uid);
			});
		});
		describe("fontawesome", function() {
			for (let line of [
				["/releases/v5.15.4/css/all.css", "5.15.4", "fontawesome/css/all", "css"],
				["/releases/v6.5.2/js/all.min.js", "6.5.2", "fontawesome/js/all", "js"],
			])
			{
				it(line[0] + ' ⟹ ' + line[2] + ' ' + line[1] + ' ' + line[3], function() {
					let { version, name, ext } = getVersionNameExt("use.fontawesome.com", line[0]);
					expect(version).to.equal(line[1]);
					expect(name).to.equal(line[2]);
					expect(ext).to.equal(line[3]);
				});
			}
		});
		describe("query variants", function() {
			it("esm.sh ?dev is a different UID than plain", function() {
				let a = getUID(new URL("https://esm.sh/react@19.2.4"));
				let b = getUID(new URL("https://esm.sh/react@19.2.4?dev"));
				expect(b.uid).to.not.equal(a.uid);
				expect(b.version).to.equal(a.version);
			});
			it("esm.sh same query hits memo", function() {
				let a = getUID(new URL("https://esm.sh/react@19.2.4?dev"));
				let b = getUID(new URL("https://esm.sh/react@19.2.4?dev"));
				expect(b).to.equal(a);
			});
			it("esm.sh ?ver= busting still dedupes", function() {
				let a = getUID(new URL("https://esm.sh/react@19.2.4"));
				let b = getUID(new URL("https://esm.sh/react@19.2.4?ver=2"));
				expect(b).to.equal(a);
			});
			it("unpkg ?module is a different UID than UMD", function() {
				let a = getUID(new URL("http://unpkg.com/web-vitals@0.2.2/dist/web-vitals.es5.umd.min.js"));
				let b = getUID(new URL("http://unpkg.com/web-vitals@0.2.2/dist/web-vitals.es5.umd.min.js?module"));
				expect(b.uid).to.not.equal(a.uid);
			});
		});
	describe("combine", function() {
			it("different bundles get different UIDs", function() {
				let a = getUID(new URL("https://cdn.jsdelivr.net/combine/npm/jquery@3.3.1/dist/jquery.min.js,npm/bootstrap@3.3.7/dist/js/bootstrap.min.js"));
				let b = getUID(new URL("https://cdn.jsdelivr.net/combine/npm/jquery@1,npm/d3@3.5.6/d3.min.js"));
				expect(b.uid).to.not.equal(a.uid);
			});
			it("same bundle hits memo", function() {
				let u = "https://cdn.jsdelivr.net/g/jquery@1.10.2,bootstrap@3.3.4";
				expect(getUID(new URL(u))).to.equal(getUID(new URL(u)));
			});
		});
		describe("build flavors", function() {
			it("react development vs production split", function() {
				let dev = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js"));
				let prod = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"));
				expect(prod.uid).to.not.equal(dev.uid);
				expect(prod.version).to.equal(dev.version);
			});
			it("bootstrap bundle vs plain split", function() {
				let bundle = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.bundle.min.js"));
				let plain = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.min.js"));
				expect(bundle.uid).to.not.equal(plain.uid);
			});
			it("plain min vs full still share", function() {
				let min = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"));
				let full = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.js"));
				expect(full.uid).to.equal(min.uid);
			});
			it("slim is namespaced once, not twice", function() {
				let { uid } = getUID(new URL("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.slim.min.js"));
				expect(uid.match(/slim/g).length).to.equal(1);
			});
		});
		describe("preferMinSibling", function() {
			it("synthesizes .min sibling", function() {
				expect(preferMinSibling("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.js"))
					.to.equal("https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js");
			});
			it("null when already minified, not JS/CSS, or bad input", function() {
				expect(preferMinSibling("https://example.com/a/jquery.min.js")).to.equal(null);
				expect(preferMinSibling("https://example.com/a/jquery-min.js")).to.equal(null);
				expect(preferMinSibling("https://example.com/a/font.woff2")).to.equal(null);
				expect(preferMinSibling("not a url")).to.equal(null);
			});
		});
	describe("stripSourceMapComment", function() {
			it("removes line and block form, keeps code", function() {
				const src = "var a=1;\n//# sourceMappingURL=a.min.js.map\nvar b=2;";
				expect(stripSourceMapComment(src)).to.equal("var a=1;\n\nvar b=2;");
				expect(stripSourceMapComment("var a=1;/*# sourceMappingURL=a.map */"))
					.to.equal("var a=1;");
			});
		});
		describe("stripResourceHints", function() {
			it("drops CDN preconnect/dns-prefetch/preload", function() {
				expect(stripResourceHints('<link rel="preconnect" href="https://cdnjs.cloudflare.com">'))
					.to.equal("<!--JSLC hint-->");
				expect(stripResourceHints('<link rel=dns-prefetch href=https://cdn.jsdelivr.net>'))
					.to.equal("<!--JSLC hint-->");
				expect(stripResourceHints('<link rel="preload" as="font" href="https://fonts.gstatic.com/s/x.woff2">'))
					.to.equal("<!--JSLC hint-->");
			});
			it("keeps stylesheets, icons and first-party hints", function() {
				const css = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/x/1.0/x.css">';
				expect(stripResourceHints(css)).to.equal(css);
				const icon = '<link rel="icon" href="https://cdnjs.cloudflare.com/favicon.ico">';
				expect(stripResourceHints(icon)).to.equal(icon);
				const first = '<link rel="preconnect" href="https://example.com">';
				expect(stripResourceHints(first)).to.equal(first);
				const script = '<script src="https://cdnjs.cloudflare.com/ajax/libs/y/1.0/y.js"></script>';
				expect(stripResourceHints(script)).to.equal(script);
			});
			it("never matches lookalike hosts", function() {
				const evil = '<link rel="preconnect" href="https://cdnjs.cloudflare.com.evil.com">';
				expect(stripResourceHints(evil)).to.equal(evil);
			});
		});
		describe("hasCdnMarker", function() {
			it("true for intercepted hosts, false otherwise", function() {
				expect(hasCdnMarker('<script src="https://cdnjs.cloudflare.com/ajax/libs/x/1.0/x.js">')).to.equal(true);
				expect(hasCdnMarker('<link href="https://cdn.jsdelivr.net/npm/y@1.0/y.css">')).to.equal(true);
				expect(hasCdnMarker('<p>hello world</p>')).to.equal(false);
				expect(hasCdnMarker('<script src="https://example.com/a.js">')).to.equal(false);
			});
		});
		describe("isTabDomainBlacklisted", function() {
			it("exact match blocks", function() {
				setTabDomain(901, "evil.com");
				expect(isTabDomainBlacklisted(901, ["evil.com"])).to.equal(true);
			});
			it("unrelated domains pass", function() {
				setTabDomain(902, "good.com");
				expect(isTabDomainBlacklisted(902, ["evil.com"])).to.equal(false);
			});
			it("matching is case-insensitive", function() {
				setTabDomain(903, "evil.com");
				expect(isTabDomainBlacklisted(903, ["EVIL.COM"])).to.equal(true);
			});
			it("unknown tabs and empty lists pass", function() {
				expect(isTabDomainBlacklisted(999991, ["evil.com"])).to.equal(false);
				setTabDomain(904, "evil.com");
				expect(isTabDomainBlacklisted(904, [])).to.equal(false);
			});
			it("subdomain follows registrableDomain()", function() {
				setTabDomain(905, "sub.evil.com");
				const covered = registrableDomain("sub.evil.com") === "evil.com";
				expect(isTabDomainBlacklisted(905, ["evil.com"])).to.equal(covered);
				expect(isTabDomainBlacklisted(905, ["sub.evil.com"])).to.equal(true);
			});
		});
		describe("timing", function() {
			it("aggregates count/avg/max and resets", function() {
				resetTiming();
				const t = performance.now();
				timeStage("lookup", t);
				timeStage("lookup", t);
				const s = getTimingStats();
				expect(s.lookup.count).to.equal(2);
				expect(s.lookup.avgMs).to.be.at.least(0);
				expect(s.lookup.maxMs).to.be.at.least(s.lookup.avgMs);
				resetTiming();
				expect(getTimingStats()).to.deep.equal({});
			});
		});
		describe("css memo", function() {
			it("same base reuses encoding, other base re-resolves", function() {
				clearDataUriMemo();
				const entry = { kind: "text", contentType: "text/css", data: ".a{background:url(f.woff2)}", size: 27 };
				const abs = base => d => d.replace("f.woff2", base + "f.woff2");
				const k1 = "css|k|v|27|https://a.test/x.css";
				const k2 = "css|k|v|27|https://b.test/x.css";
				const first = entryToDataUri(entry, abs("https://a.test/"), k1);
				expect(entryToDataUri(entry, abs("https://a.test/"), k1)).to.equal(first);
				const other = entryToDataUri(entry, abs("https://b.test/"), k2);
				expect(other).to.not.equal(first);
				expect(decodeURIComponent(other)).to.contain("https://b.test/f.woff2");
			});
		});
		describe("cssfix", function() {
			it("adds missing standard fallbacks, keeps existing", function() {
				const out = addStandardFallbacks(".a{-webkit-appearance:none}.b{appearance:button;-webkit-appearance:button}");
				expect(out).to.contain(";appearance:none;/*JSLC*/");
				expect(out).to.contain(".b{appearance:button;-webkit-appearance:button}");
			});
			it("maps mask/line-clamp/clip", function() {
				const out = addStandardFallbacks(".a{-webkit-mask-image:url(x.png);-webkit-line-clamp:3;-webkit-background-clip:text}");
				expect(out).to.contain("mask-image:url(x.png)");
				expect(out).to.contain("line-clamp:3");
				expect(out).to.contain("background-clip:text");
			});
			it("is idempotent", function() {
				const once = addStandardFallbacks(".a{-webkit-appearance:none}");
				expect(addStandardFallbacks(once)).to.equal(once);
			});
			it("leaves non-webkit CSS alone", function() {
				const css = ".a{color:red;margin:0}";
				expect(addStandardFallbacks(css)).to.equal(css);
			});
		});
		describe("font-display", function() {
			it("inserts swap only when missing", function() {
				expect(ensureFontDisplaySwap("@font-face{font-family:x;src:url(a.woff2)}"))
					.to.equal("@font-face{font-display:swap;/*JSLC*/font-family:x;src:url(a.woff2)}");
				const kept = "@font-face{font-display:block;font-family:x}";
				expect(ensureFontDisplaySwap(kept)).to.equal(kept);
			});
		});
		describe("addAsyncDecoding", function() {
			it("adds decoding where missing, keeps the rest", function() {
				expect(addAsyncDecoding('<img src="a.png">')).to.equal('<img src="a.png" decoding="async">');
				expect(addAsyncDecoding('<img src="a.png"/>')).to.equal('<img src="a.png" decoding="async"/>');
				expect(addAsyncDecoding('<IMG SRC="a.png">')).to.equal('<IMG SRC="a.png" decoding="async">');
				const kept = '<img src="a.png" decoding="sync">';
				expect(addAsyncDecoding(kept)).to.equal(kept);
				expect(addAsyncDecoding('<p>no images</p>')).to.equal('<p>no images</p>');
			});
		});
		describe("findChromeSniff", function() {
			it("flags Chrome-only references", function() {
				expect(findChromeSniff("if(window.chrome){x()}")).to.equal("window.chrome");
				expect(findChromeSniff("u='chrome.webstore';")).to.equal("chrome.webstore");
				expect(findChromeSniff("isHeadlessChrome")).to.equal("HeadlessChrome");
			});
			it("null for clean, non-string and giant inputs", function() {
				expect(findChromeSniff("var jquery = 1;")).to.equal(null);
				expect(findChromeSniff(null)).to.equal(null);
				expect(findChromeSniff("x".repeat(2000001))).to.equal(null);
			});
		});
		describe("modulebypass", function() {
			it("detects module script tags only", function() {
				expect(isModuleTag('<script type="module" src="https://cdn.jsdelivr.net/npm/x@1.0/x.js">')).to.equal(true);
				expect(isModuleTag("<script type='MODULE' src='https://example.com/a.js'>")).to.equal(true);
				expect(isModuleTag('<script type=module src=https://example.com/a.js>')).to.equal(true);
				expect(isModuleTag('<script src="https://example.com/a.js">')).to.equal(false);
				expect(isModuleTag('<script type="text/javascript" src="https://example.com/a.js">')).to.equal(false);
				expect(isModuleTag('<link rel="modulepreload" href="https://example.com/a.js">')).to.equal(false);
			});
			it("notes, consults and clears per tab", function() {
				expect(isModuleBypassed(801, "jquery js 3.7.x")).to.equal(false);
				noteModuleBypass(801, "jquery js 3.7.x");
				expect(isModuleBypassed(801, "jquery js 3.7.x")).to.equal(true);
				expect(isModuleBypassed(802, "jquery js 3.7.x")).to.equal(false);
				noteModuleBypass(-1, "jquery js 3.7.x");
				expect(isModuleBypassed(-1, "jquery js 3.7.x")).to.equal(false);
				clearModuleBypass(801);
				expect(isModuleBypassed(801, "jquery js 3.7.x")).to.equal(false);
			});
		});
	});
	describe("not null", function() {
		describe("url keys", function() {
			let keys = ['fontsgstatic', 'cloudflare', 'cloudflareajax', 'googleapis', 'jquery', 'ampproject', 'jsdelivr', 'unpkg'];
			for (let key of keys)
			{
				it(key, function() {
					expect(Object.keys(urls)).to.contain(key);
				});
			}
		});
		for (let domain in urls)
		{
			if (domain != 'cloudflare' && domain != 'googleapisfonts') // cloudflare takes lots of time, googleapisfonts is different, not parseable by getVersionNameExt()
			describe(domain, function() {
				for (let line of urls[domain].split(/\r?\n/))
				{
					if (line && line.charAt(0) != '#')
					{
						it(line, function() {
							let url = new URL(line);
							let { version, name, ext } = getVersionNameExt(url.hostname, url.pathname);
							expect(name, 'Cannot parse ' + line).to.not.be.null;
						});
					}
				}
			});
		}
	});
});
