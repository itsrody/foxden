"use strict";

export function getFamiliesFromGoogleFontCSSURL(url)
{
	//https://fonts.googleapis.com/css2?family=Noto+Sans+HK&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap
	//https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,200;0,300;0,400;0,500;0,700;0,900;1,100;1,200;1,300;1,400;1,500;1,700;1,900
	//https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700
	//https://fonts.googleapis.com/css?family=Droid+Sans:700,regular|Droid+Serif:italic,regular&subset=latin
	//https://fonts.googleapis.com/css?family=Lato&text=ABC
	//https://fonts.googleapis.com/icon?family=Material+Icons
	//https://fonts.googleapis.com/icon?family=Material+Icons&ver=5.4.1
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

// Per-family css2/icon request values, preserving axis specs (e.g. "Roboto:ital,wght@0,400..700")
export function getFamilyParamsFromGoogleFontCSSURL(url)
{
	let params = new URLSearchParams(url.search);
	let result = [];
	if (url.pathname == "/css2" || url.pathname == "/icon")
	{
		for (let family of params.getAll('family'))
			result.push(family);
	}
	else if (url.pathname == "/css" && params.has('family'))
	{
		for (let family of params.get('family').split('|'))
			result.push(family);
	}
	return result;
}
