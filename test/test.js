"use strict";

var expect = chai.expect;
chai.config.truncateThreshold = 0;
describe("utils", function() {
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
		describe("cloudflare", function() {
			for (let line of [
				["/ajax/libs/flexslider/2.7.2/jquery.flexslider.min.js", "2.7.2", "jquery/flexslider", "js"],
				["/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js", "3.3.7", "bootstrap", "js"],
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
	});
	describe("not null", function() {
		describe("url keys", function() {
			let keys = ['fontsgstatic', 'cloudflare', 'cloudflareajax', 'googleapis', 'jquery', 'ampproject'];
			it(keys.join(", "), function() {
				expect(urls).to.have.all.keys(...keys);
			});
		});
		for (let domain in urls)
		{
			if (domain != 'cloudflare')
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
