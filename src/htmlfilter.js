"use strict";
// onHeadersReceived pipeline: CSP data: allowance (all headers, incl. report-only),
// charset normalization, and streaming HTML rewriting via filterResponseData
// (strips integrity/crossorigin for CDN resources, forces utf-8 in meta tags).

import { logStyle, cdnDomainsRE } from './shared/constants.js';
import { allowDataUriInCsp } from './shared/csp.js';
import { isTabDomainBlacklisted } from './stats.js';
import { getUID } from './shared/urlkey.js';
import { extractTagSrc, stripResourceHints } from './shared/perf.js';

const MAX_PENDING_TAG = 4096;
const asciiDecoder = new TextDecoder('ASCII');//windows-1252 / iso-8859-1

export function absolutizeCssUrls(baseUrl, css)
{
	//src: url(relative.woff2) → absolute
	return css.replace(/([:,]\s*url\()("|'|)([^)"']+)\2\)/g, (m, p0, p1, p2) => p0 + p1 + new URL(p2, baseUrl).href + p1 + ")");
}

// Split off an incomplete trailing tag ("<script src=…" without ">") so that
// tags divided across stream chunks are still rewritten.
function splitTrailingTag(str)
{
	const lt = str.lastIndexOf('<');
	if (lt === -1)
		return [str, ''];
	const tail = str.slice(lt);
	if (tail.includes('>'))
		return [str, ''];
	if (tail.length > MAX_PENDING_TAG)
		return [str, ''];
	if (/^<[a-zA-Z\/!?]?$/.test(tail) || /^<[a-zA-Z][^>]*$/.test(tail))
		return [str.slice(0, lt), tail];
	return [str, ''];
}

function makeTransformer(req)
{
	// Per-page set of already-seen CDN UIDs: duplicate <script>/<link> tags
	// for the same library would each trigger a blocking redirect + data:
	// encode, so the second+ copies are dropped entirely.
	const seenUids = new Set();
	return str => stripResourceHints(str)
		.replace(/<(link|script)[^>]+>/ig, m => {
			if (!cdnDomainsRE.test(m))
				return m;
			const src = extractTagSrc(m);
			if (src)
			{
				try
				{
					const { uid } = getUID(new URL(src, req.url));
					if (seenUids.has(uid))
					{
						console.log(`%cJSLibCache: dropping duplicate CDN tag ${src}, id=${req.requestId}`, logStyle);
						return "<!--JSLC dupe-->";
					}
					seenUids.add(uid);
				}
				catch
				{
					// unresolvable URL: fall through to integrity strip
				}
			}
			console.log(`%cJSLibCache: adjusting integrity|crossorigin attributes on ${m}, id=${req.requestId}`, logStyle);
			// data: URL redirects fail both CORS (no CORS mode on opaque origins) and
			// SRI (final URL is cross-origin), so crossorigin and integrity must both
			// go for all redirected CDN tags — CSS and scripts alike.
			let out = m.replace(/\s+(crossorigin)(="[^"]*"|='[^']*'|=[^"'`=>\s]+|)/ig, '');
			out = out.replace(/\s+(integrity)(="[^"]*"|='[^']*'|=[^"'`=>\s]+|)/ig, '');
			return out;
		})
		.replace(/(<meta\s+)(http-equiv=["']?Content-Type["']?\s+content=["']?text\/html;\s*charset=|charset=["']?)([a-z0-9_-]+)/gi, "$1$2utf-8");
}

function sniffCharset(firstChunk)
{
	//<meta charset="ISO-8859-1">
	//<meta http-equiv="Content-Type" content="text/html; charset=gb2312">
	let htmlHead = asciiDecoder.decode(firstChunk, { stream: false });
	let charsetMatch = htmlHead.match(/<meta\s+charset=["']?([^>"'\/]+)["'>\/]/i);
	if (!charsetMatch)
		charsetMatch = htmlHead.match(/<meta\s+http-equiv=["']?content-type["']?\s+content=["']?text\/html;\s*charset=([^>"'\/]+)["'>\/]/i);
	return charsetMatch ? charsetMatch[1] : null;
}

function installHtmlFilter(req, charset)
{
	const filter = browser.webRequest.filterResponseData(req.requestId);
	const encoder = new TextEncoder();
	const transform = makeTransformer(req);
	let pending = '';

	filter.ondata = evt => {
		try
		{
			if (!filter.decoder)
			{
				let resolvedCharset = charset;
				if (!resolvedCharset) //content-type has no charset declared: sniff from the head
				{
					resolvedCharset = sniffCharset(evt.data);
					console.log(`%cJSLibCache: No charset in headers, decoding HTML head with ${resolvedCharset || 'utf-8'}, id=${req.requestId}`, logStyle);
				}
				try
				{
					filter.decoder = new TextDecoder(resolvedCharset || 'utf-8');
				}
				catch (err)
				{
					console.warn(`%cJSLibCache: unsupported charset "${resolvedCharset}", falling back to utf-8, id=${req.requestId}`, logStyle);
					filter.decoder = new TextDecoder('utf-8');
				}
				console.log(`%cJSLibCache: charset ${filter.decoder.encoding}, id=${req.requestId}`, logStyle);
			}
			const str = pending + filter.decoder.decode(evt.data, { stream: true });
			const [out, tail] = splitTrailingTag(str);
			pending = tail;
			if (out)
				filter.write(encoder.encode(transform(out)));
		}
		catch (err)
		{
			console.error(`%cJSLibCache: filter ondata error, id=${req.requestId}`, logStyle, err);
			try { filter.close(); } catch (e) {}
		}
	};

	filter.onstop = () => {
		try
		{
			let str = pending + (filter.decoder ? filter.decoder.decode() : '');
			pending = '';
			if (str)
				filter.write(encoder.encode(transform(str)));
			filter.close();
		}
		catch (err)
		{
			console.error(`%cJSLibCache: filter onstop error, id=${req.requestId}`, logStyle, err);
			try { filter.close(); } catch (e) {}
		}
	};

	filter.onerror = evt => {
		console.error(`%cJSLibCache: filter error, id=${req.requestId}`, logStyle, evt, filter.error);
		try { filter.close(); } catch (e) {}
	};
}

export function onHeadersReceived(req, getSettings)
{
	const settings = getSettings();
	if (req.tabId >= 0 && isTabDomainBlacklisted(req.tabId, settings.domainBlacklist))
	{
		console.log(`%cJSLibCache: stopping because domain is blacklisted`, logStyle);
		return;
	}
	if (req.statusCode != 200)
		return;

	let hasCspChange = false, hasCTChange = false;

	// patch every CSP header (and report-only variants) so data: subresources load
	for (const header of req.responseHeaders)
	{
		const name = header.name.toLowerCase();
		if (name == 'content-security-policy' || name == 'content-security-policy-report-only')
		{
			const { changed, value } = allowDataUriInCsp(header.value);
			if (changed && settings.allowModifyHeaders)
			{
				console.log(`%cJSLibCache: adding data: to CSP header (${header.name}) ${req.url}`, logStyle);
				header.value = value;
				hasCspChange = true;
			}
		}
	}

	const headerIdx = req.responseHeaders.findIndex(h => h.name.toLowerCase() == 'content-type');
	const headerCT = headerIdx > -1 ? req.responseHeaders[headerIdx] : undefined;
	let charset;
	if (headerCT)
	{
		const mimeType = headerCT.value.replace(/;.*/, '').toLowerCase();
		charset = /charset\s*=/.test(headerCT.value) && headerCT.value.replace(/^.*?charset\s*=\s*/, '').replace(/["']/g, '').toLowerCase();

		if (mimeType == 'text/html')
		{
			if (charset && charset != "utf-8")
			{
				hasCTChange = true;
				console.log(`%cJSLibCache: changing ContentType from "${headerCT.value}" to "text/html;charset=utf-8", id=${req.requestId}`, logStyle);
				headerCT.value = 'text/html;charset=utf-8';
				charset = 'utf-8';
			}
			console.log(`%cJSLibCache: checking integrity|crossorigin attributes in ${req.url} html, id=${req.requestId}`, logStyle);
			installHtmlFilter(req, charset || undefined);
		}
	}

	// https://developer.chrome.com/docs/extensions/reference/webRequest/
	// Only return responseHeaders if you really want to modify the headers in order to limit the number of conflicts (only one extension may modify responseHeaders for each request)
	if (hasCspChange || hasCTChange)
		return { responseHeaders: req.responseHeaders }; //headers with modified content-security-policy or content-type
}
