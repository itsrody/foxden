"use strict";

export function parseCspHeader(policy)
{
	return policy.split(';').reduce((result, directive) => {
		const [directiveKey, ...directiveValue] = directive.trim().split(/\s+/g);
		if (!directiveKey || Object.prototype.hasOwnProperty.call(result, directiveKey))
			return result;
		return Object.assign(Object.assign({}, result), { [directiveKey]: directiveValue });
	}, {});
}

export function serializeCspHeader(parsed)
{
	return Object.keys(parsed).map(k => k + " " + parsed[k].join(" ")).join(";");
}

// Schemes the extension needs allowed per fetch directive:
// data:            — every redirected CDN resource is served as a data: URL
// moz-extension:   — bundled Google Fonts load from the extension package (fonts only)
const extensionSchemes = {
	"script-src": ["data:"],
	"style-src": ["data:"],
	"font-src": ["data:", "moz-extension:"],
};

// Ensures the extension's redirected data: URLs (and bundled moz-extension fonts)
// are allowed. Existing script-src/style-src/font-src get the schemes prepended;
// directives that are absent but governed by default-src are created from
// default-src's sources plus the schemes, so pages that rely on default-src keep
// loading their CDNs after the redirect. Directives absent from both the policy
// and default-src are unrestricted already and left alone.
// Returns { changed, value } — value is only meaningful when changed is true.
export function allowDataUriInCsp(policy)
{
	const parsed = parseCspHeader(policy);
	let changed = false;
	for (const [directive, schemes] of Object.entries(extensionSchemes))
	{
		const current = parsed[directive] || parsed["default-src"];
		if (!current)
			continue; // unrestricted: data:/moz-extension: already allowed
		const missing = schemes.filter(s => !current.includes(s));
		if (!missing.length)
			continue;
		parsed[directive] = parsed[directive]
			? [...missing, ...parsed[directive]]
			: [...parsed["default-src"], ...missing];
		changed = true;
	}
	return { changed, value: changed ? serializeCspHeader(parsed) : policy };
}
