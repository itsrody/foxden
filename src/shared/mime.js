"use strict";

export function isMimeTextual(contentType)
{
	const textuals = ["text/", "application/javascript", "application/atom+xml", "application/rss+xml", "image/svg+xml", "application/json", "application/vnd.google-earth.kml+xml", "application/x-perl", "application/xhtml+xml", "application/xspf+xml", "application/xml", "application/ld+json", "message/"];
	for (const textual of textuals)
		if (contentType.startsWith(textual))
			return true;
	return false;
}

export function bytesToBase64(u8)
{
	const CHUNK = 0x8000;
	let bin = '';
	for (let i = 0; i < u8.length; i += CHUNK)
		bin += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
	return btoa(bin);
}

export function base64ToBytes(b64)
{
	const bin = atob(b64);
	const u8 = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++)
		u8[i] = bin.charCodeAt(i);
	return u8;
}
