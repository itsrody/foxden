{
"use strict";
let settings = getOptionsDefault();

function onInputInput(evt)
{
	evt.preventDefault();
	let input = evt.currentTarget;
	settings[input.id] = input.checked;
	browser.storage.sync.set({settings}).then(
		//Success
		() => console.log("JSLibCache.options: Settings saved"),
		//Error
		msg => console.warn("JSLibCache.options: Error saving settings to browser.storage.sync: " + msg)
	);
}

function init()
{
	$('form input, form select, form textarea').bind("input", onInputInput);
	browser.storage.sync.get({"settings": getOptionsDefault()}).then(sett => {
		settings = sett.settings;
		for (let id in settings)
			document.getElementById(id).checked = settings[id];
	});
}
console.log(document, init);
document.addEventListener("DOMContentLoaded", init, false);

}

