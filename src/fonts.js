"use strict";
// Known bundled Google Font families, from the generated manifest.json
// (replaces the old directory-listing fetch of resources/fonts/).

import { logStyle } from './shared/constants.js';

let knownFonts = [];
// family name → array of bundled file names (or null when the manifest has none)
let knownFontFiles = new Map();

export function getKnownFonts()
{
	return knownFonts;
}

export async function loadFontsManifest()
{
	try
	{
		const resp = await fetch(browser.runtime.getURL("resources/fonts/manifest.json"));
		if (!resp.ok)
			throw new Error("HTTP " + resp.status);
		const manifest = await resp.json();
		const families = manifest.families;
		if (Array.isArray(families))
		{
			knownFonts = families;
			knownFontFiles = new Map(families.map(name => [name, null]));
		}
		else
		{
			knownFonts = Object.keys(families || {});
			knownFontFiles = new Map(Object.entries(families || {}));
		}
		console.log(`%cFoxDen: ${knownFonts.length} bundled font families`, logStyle);
	}
	catch (err)
	{
		knownFonts = [];
		knownFontFiles = new Map();
		console.warn(`%cFoxDen: fonts manifest unavailable (${err}), bundled font rewriting disabled`, logStyle);
	}
}

// Rewrite fonts.gstatic.com URLs in Google Fonts CSS:
// - file bundled: point at the packaged copy (no network, no Google contact)
// - everything else: leave the URL — fontcss.js embeds it as a data: URI at
//   serve time (Google renames files on font updates; the bundle can lag
//   behind, and Firefox font loads cannot follow redirects to data:)
// - unknown family with blockUnknown: point at a nonexistent packaged path so
//   the font 404s and stays blocked
export const GSTATIC_FONT_URL_RE = /https?:\/\/fonts\.gstatic\.com\/s\/[a-z0-9]+\/v\d+\/[A-Za-z0-9_-]+\.(?:woff2|woff|ttf|eot|svg)/g;

// All distinct fonts.gstatic.com font-file URLs still present in the CSS,
// after rewriteGstaticCss has resolved the bundled/blocked ones.
export function collectGstaticFontUrls(css)
{
	return [...new Set(css.match(GSTATIC_FONT_URL_RE) || [])];
}

export function rewriteGstaticCss(css, families, blockUnknown, fontsBase)
{
	const files = families instanceof Map ? families : new Map(Object.entries(families));
	return css.replace(
		/https?:\/\/fonts\.gstatic\.com\/s\/([a-z0-9]+)\/v\d+\/([A-Za-z0-9_-]+\.(?:woff2|woff|ttf|eot|svg))/g,
		(match, family, filename) =>
		{
			if (files.has(family))
			{
				const bundled = files.get(family);
				if (bundled && bundled.includes(filename))
					return fontsBase + family + "/" + filename;
				return match; // missing bundled file: let the pipeline cache it
			}
			if (blockUnknown)
				return fontsBase + family + "/" + filename; // nonexistent → blocked
			return match;
		});
}

export function replaceFontsGstaticURLs(css, blockUnknown)
{
	const fontsBase = browser.runtime.getURL("resources/fonts/");
	return rewriteGstaticCss(css, knownFontFiles, blockUnknown, fontsBase);
}
