"use strict";
// Additive CSS firefoxification for served stylesheets: insert standard
// fallbacks next to -webkit- declarations and font-display:swap into
// @font-face blocks that lack it. Only ADDS declarations (never rewrites
// values or removes anything), so worst case is a few ignored bytes.

// [webkit property, standard property]
const FALLBACK_PAIRS = [
	["appearance", "appearance"],
	["mask", "mask"],
	["mask-image", "mask-image"],
	["mask-size", "mask-size"],
	["mask-repeat", "mask-repeat"],
	["mask-position", "mask-position"],
	["line-clamp", "line-clamp"],
	["text-size-adjust", "text-size-adjust"],
	["print-color-adjust", "print-color-adjust"],
	["background-clip", "background-clip"],
];

function ruleNeedsFallback(rule, webkitProp, stdProp)
{
	if (!new RegExp("(?:^|[;{])\\s*-webkit-" + webkitProp + "\\s*:", "i").test(rule))
		return null;
	if (new RegExp("(?:^|[;{])\\s*" + stdProp + "\\s*:", "i").test(rule))
		return null;
	const m = rule.match(new RegExp("-webkit-" + webkitProp + "\\s*:\\s*([^;{}]+);?", "i"));
	return m ? m[1].trim() : null;
}

export function addStandardFallbacks(css)
{
	return css.split("}").map(rule => {
		let out = rule;
		for (const [webkitProp, stdProp] of FALLBACK_PAIRS)
		{
			const value = ruleNeedsFallback(out, webkitProp, stdProp);
			if (value !== null && value !== "")
				out += `;${stdProp}:${value};/*JSLC*/`;
		}
		return out;
	}).join("}");
}

export function ensureFontDisplaySwap(css)
{
	return css.replace(/@font-face\s*\{([^}]*)\}/gi, (block, decls) => {
		if (/font-display\s*:/i.test(decls))
			return block;
		return block.replace("{", "{font-display:swap;/*JSLC*/");
	});
}
