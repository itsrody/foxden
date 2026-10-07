"use strict";

export function getDefaultSettings()
{
	return { allowModifyHeaders: true, blockUnknownGoogleFonts: true, domainBlacklist: [] };
}

export function loadSettings()
{
	return browser.storage.sync.get({ "settings": getDefaultSettings() }).then(sett => sett.settings);
}

export function saveSettings(settings)
{
	return browser.storage.sync.set({ settings });
}
