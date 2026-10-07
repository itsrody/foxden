export const logStyle = 'color:#093';

export const cdnDomains = [
	'fonts.googleapis.com/',		// 1000k+ / 362
	'ajax.googleapis.com/ajax/libs/',	// 1000k+ / 637
	'cdnjs.cloudflare.com/ajax/libs/',	// 1000k+ / 670
	'cdn.jsdelivr.net/',			// 1000k+ / 975
	'fastly.jsdelivr.net/',		// jsdelivr Fastly mirror, same paths as cdn.jsdelivr.net
	'esm.sh/',				// modern ESM CDN: /PKG[@SEMVER][/PATH]
	'code.jquery.com/',			// 1000k+ /1276
	'maxcdn.bootstrapcdn.com/',		// bootstrapcdn legacy: /<lib>/<ver>/<file>
	'stackpath.bootstrapcdn.com/',		// bootstrapcdn: /<lib>/<ver>/<file>
	'netdna.bootstrapcdn.com/',		// bootstrapcdn legacy: /<lib>/<ver>/<file>
//	'maps.googleapis.com/',			// 963k — dynamic API, never cache
	'fonts.gstatic.com/',			// 923k — font files referenced by Google Fonts CSS
	'use.fontawesome.com/releases/v',	// 573k — kit CSS: /releases/v<ver>/<css|js>/<file>
//	'cdn.bootcss.com/',			// 443k
	'unpkg.com/',				// 390k	alias for 'cdn.jsdelivr.net/npm/
//	'cdn.shopify.com/',			// 320k
//	'libs.baidu.com/',			// 280k
//	'apps.bdimg.com/libs/',			// 239k
	'ajax.aspnetcdn.com/ajax/',		// 203k — Microsoft Ajax CDN (same shape as ajax.microsoft.com)
	'ajax.microsoft.com/ajax/',		// 8k — legacy alias of ajax.aspnetcdn.com
	'cdn.staticfile.org/',			// 179k — staticfile mirror, /<lib>/<ver>/<file>
	'ajax.cloudflare.com/',			// 150k
//	'yastatic.net/',			// 104k
	'cdn.ampproject.org/',			// 73k
//	'yandex.st/',				// 64k
//	'code.createjs.com/',			// 9k
//	'lib.baomitu.com/',			// 9k
//	'lib.sinaapp.com/js/',			// 6k
//	'cdn.sstatic.net/',			// 2k
//	'mat1.gtimg.com/libs/',			// 1k
//	'upcdn.b0.upaiyun.com/libs/',		// 0.5k
//	'pagecdn.io/lib/',			// 0.2k	alias for 'cdnjs.cloudflare.com/ajax/libs/'
//	'akamai-webcdn.kgstatic.net/',		// 0
	'ajax.proxy.ustclug.org/ajax/libs/',	// 0
	'sdn.geekzu.org/ajax/ajax/libs/',
//	"gitcdn.github.io",
//	"vjs.zencdn.net",
//	"cdn.plyr.io",
//	"www.gstatic.com",
//	"cdn.materialdesignicons.com",
//	"cdn.ravenjs.com",
//	"cdn.css.net",
//	"cdnjs.loli.net",
//	"ajax.loli.net",
//	"fonts.loli.net",
];
export const cdnDomainsRE = new RegExp('//(' + cdnDomains.map(m => m.replace(/\W/g, '\\$&')).join('|') + ')');
