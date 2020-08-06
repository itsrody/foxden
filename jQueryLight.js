(function() {
"use strict";

//var DEBUG = 1;

var d = document.documentElement;
var matchesSel = d.matchesSelector || d.mozMatchesSelector || d.webkitMatchesSelector || d.oMatchesSelector || d.msMatchesSelector ||
		function(s) {
			var matches = (this.document || this.ownerDocument).querySelectorAll(s),
				i = matches.length;
			while (--i >= 0 && matches.item(i) !== this) {}
			return i > -1;
		};
var jqo = function() {};
jqo.prototype = [];
jqo.prototype.filter =	function(sel) { if (typeof sel == "function") { var ret = jqi();  ret._sel = this._sel + "').filter('" + sel; this.each(function(i,elem) { if (sel.call(elem,i,elem)) { ret.push(elem); } }); return ret; }
	else if (sel || sel === "") { var ret = jqi(); this.each(function(i,elem){ if (matchesSel.call(elem, sel)) { ret.push(elem); } }); return ret; }
	else { this.debug("filter",arguments,"Argument 1 should be a function reference or a selector string"); } return this; };
jqo.prototype.not =		function not(sel) { var ret = jqi(); ret._sel = this._sel + "').not('" + sel; this.each(function(i,elem){ if (!matchesSel.call(elem, sel)) { ret.push(elem); } }); return ret; };
jqo.prototype.prevAll =	function prevAll(sel) { var ret = jqi(); ret._sel = this._sel + "').prevAll('" + sel; this.each(function(i,elem){ var prev = elem.previousElementSibling; while (prev) { ret.push(prev); prev = prev.previousElementSibling; } }); if (sel != null && sel !== "") { return ret.filter(sel); } return ret; };
jqo.prototype.first =	function first() { var self = this; var ret = jqi(); if (self.length) { ret.push(self[0]); } return ret; };
jqo.prototype.eq =	function eq(i) { var self = this; var ret = jqi(); if (self.length > i) { ret.push(self[i]); } return ret; };
jqo.prototype.last =	function last() { var self = this; var ret = jqi(); if (self.length) { ret.push(self[self.length - 1]); } return ret; };
jqo.prototype.add =		function add(inst) { var self = this; inst.each(function(i,elem){ self.push(elem); }); return this; };
jqo.prototype.find =	function find(sel) { var ret = jqi(); ret._sel = this._sel + "').find('" + sel; this.each(function fi(i,elem) { var found = $(sel, elem); for (var j = 0; j < found.length; j++) { ret.push(found[j]); } }); return ret; };
jqo.prototype.parent =	function parent()	{ var ret = jqi(); this.each(function(i,elem) { ret.push(elem.parentNode); }); return ret; };
jqo.prototype.parents =	function parents(sel)	{ var ret = jqi(); ret._sel = this._sel + "').parents('"; this.each(function(i,elem) { while((elem = elem.parentNode) && elem.nodeType < 9){ ret.push(elem); }}); return ret.filter(sel); };
jqo.prototype.parentsUntil =	function parentsUntil(sel)	{ var ret = jqi(); ret._sel = this._sel + "').parentsUntil('"; this.each(function(i,elem) { while((elem = elem.parentNode) && elem.nodeType < 9 && !elem.matches(sel)){ ret.push(elem); }}); return ret; };
jqo.prototype.closest =	function (sel) { var ret = jqi(); ret._sel = this._sel + "').closest('"; this.each(function(i,elem) { if ("SVGElementInstance" in window && elem instanceof SVGElementInstance && elem.correspondingUseElement) { elem = elem.correspondingUseElement; } while((elem = elem.parentNode) && elem.nodeType < 9){ if (elem.matches(sel)) { ret.push(elem); break; }}}); return ret; };
jqo.prototype.clone =	function clone()	{ var ret = jqi(); this.each(function(i,elem) { ret.push(elem.cloneNode(true)); }); return ret; };
jqo.prototype.contents =	function contents()	{ var ret = jqi(); ret._sel = "').contents('"; if (this.length) { var cns = this[0].childNodes; for (var j = 0, len = cns.length; j < len; j++) { ret.push(cns[j]); } } return ret; };
jqo.prototype.map =		function map(callback)	{ var ret = []; ret.get = function(){ return this; }; this.each(function(i,elem) { ret.push(callback.call(elem,i,elem)); }); return ret; };
jqo.prototype.get =		function()	{ return this; };
jqo.prototype.toArray =	function()	{ return toArray(this); };
jqo.prototype.each =	function each(callback)	{ for (var i = 0; i < this.length; i++) { callback.call(this[i],i,this[i]); } return this; };
jqo.prototype.empty =	function empty()	{ this.each(function(i,elem) { while (elem.firstChild) { elem.removeChild(elem.firstChild); }}); return this; };
jqo.prototype.remove =	function()	{ this.each(function(i,elem) { elem.parentNode.removeChild(elem); }); return this; };
jqo.prototype.appendTo =	function(target)	{ this.each(function(i,elem) { if (target.length) { target[0].appendChild(elem); } else { console.warn("$().appendTo(target): target is undefined."); } }); return this; };
jqo.prototype.css =		function css(key,val)	{ if (typeof key == "string") { if (typeof val == "undefined") { return this[0].style[key]; } else { this.each(function(i,elem) { elem.style[key]=val; }); return this; }} else { this.debug("css",arguments,"Argument 1 should be a string"); }};
jqo.prototype.show =	function show()	{ this.each(function(i,elem) { elem.classList.remove("hide"); }); return this; };
jqo.prototype.toggle =	function toggle(on)
{
	var isBool = typeof on == "boolean";
	this.each(function(i,elem){
		elem.classList[isBool ? (on ? "remove" : "add") : "toggle"]("hide");
	});
	return this;
};
jqo.prototype.hide =	function hide()	{ this.each(function(i,elem) { elem.classList.add("hide"); }); return this; };
jqo.prototype.addClass =     function addClass(name)	{ this.each(function(i,elem) { elem.classList.add(name); }); return this; };
jqo.prototype.removeClass =  function removeClass(name)	{ this.each(function(i,elem) { elem.classList.remove(name); }); return this; };
jqo.prototype.toggleClass =  function toggleClass(name,on)	{ this.each(function(i,elem) { if(typeof on != "undefined") { elem.classList[on ? "add" : "remove"](name); } else { elem.classList.toggle(name);} }); return this; };
jqo.prototype.hasClass =     function hasClass(name)	{ return this.length && this[0].classList.contains(name); };
jqo.prototype.val =		function $val(val)	{ if (typeof val == "undefined") { return this.length ? ((this[0].tagName == "SELECT") ? this[0].options[this[0].selectedIndex].value : this[0].value) : ""; } else { this.each(function(j,elem) { if (elem.tagName == "SELECT") { var isArr = $.isArray(val); for (var i = 0; i < elem.options.length; i++) { var opt = elem.options[i]; if (isArr) { opt.selected = val.indexOf(opt.value) > -1; } else if (opt.value == val) { opt.selected=true; } } } else { elem.value = val; }}); return this; } };
jqo.prototype.html =	function $html(html)	{ if (typeof html == "undefined") { return this.length ? this[0].innerHTML : ""; } else { if (this[0]) { this[0].innerHTML = html; $(this[0]).find('script').each(function(i,elem){ eval(elem.textContent||elem.innerText); }); } else { this.debug("html",arguments,"Empty jQuery instance"); } } return this; };
jqo.prototype.append =	function append(html)	{ if (typeof html == "string") { this.each(function(i,elem) { elem.insertAdjacentHTML("beforeEnd",  html); }); } else if (html instanceof Element || html instanceof DocumentFragment) { var prnts = this.length; this.each(function(i,elem) { elem.appendChild(i == prnts - 1 ? html : html.cloneNode(true)); }); } else if (html && html.each) { var prnt = this[0]; html.each(function(i,elem) { prnt.appendChild(elem); }); } else { this.debug("append",arguments,"Argument 1 should be an html string, a DOM Element or a jQuery instance"); } return this; };
jqo.prototype.prepend =	function append(html)	{ if (typeof html == "string") { this.each(function(i,elem) { elem.insertAdjacentHTML("afterbegin", html); }); } else if (html instanceof Element || html instanceof DocumentFragment) { var prnts = this.length; this.each(function(i,elem) { if (elem.childNodes.length) { elem.insertBefore(i == prnts - 1 ? html : html.cloneNode(true), elem.firstChild); } else { elem.appendChild(i == prnts - 1 ? html : html.cloneNode(true)); } }); } else if (html && html.each) { var prnt = this[0]; html.each(function(i,elem) { prnt.appendChild(elem); }); } else { this.debug("append",arguments,"Argument 1 should be an html string, a DOM Element or a jQuery instance"); } return this; };
jqo.prototype.text =	function text(txt)	{ if (typeof txt == "undefined") { return this.length ? this[0].value||this[0].textContent : ""; } else { this.each(function(i,elem) { if (elem.textContent != txt) { elem.textContent = txt; } }); return this; } };
jqo.prototype.cut =		function(act)	{ return this.bind("cut",act); };
jqo.prototype.copy =	function(act)	{ return this.bind("copy",act); };
jqo.prototype.paste =	function(act)	{ return this.bind("paste",act); };
jqo.prototype.undo =	function(act)	{ return this.bind("undo",act); };
jqo.prototype.redo =	function(act)	{ return this.bind("redo",act); };
jqo.prototype.blur =	function(act)	{ return this.bind("blur",act); };
jqo.prototype.focus =	function(act)	{ if (typeof act == "function") { return this.bind("focus",act); } else { this[0].focus(); } };
jqo.prototype.ready =	function(act)	{ if (/^interactive|complete|loaded$/.test(document.readyState)) { act(); } else { return this.bind("DOMContentLoaded",act); } };
jqo.prototype.click =	function(act)	{ return this.bind("click",act); };
jqo.prototype.keydown =	function(act)	{ return this.bind("keydown",act); };
jqo.prototype.keypress =	function(act)	{ return this.bind("keypress",act); };
jqo.prototype.keyup =	function(act)	{ return this.bind("keyup",act); };
jqo.prototype.submit =	function(act)	{ return this.bind("submit",act); };
jqo.prototype.change =	function(act)	{ return this.bind("change",act); };
jqo.prototype.mouseup =	function(act)	{ return this.bind("mouseup",act); };
jqo.prototype.mouseout =	function(act)	{ return this.bind("mouseout",act); };
jqo.prototype.mousemove =	function(act)	{ return this.bind("mousemove",act); };
jqo.prototype.mouseover =	function(act)	{ return this.bind("mouseover",act); };
jqo.prototype.mousedown =	function(act)	{ return this.bind("mousedown",act); };
jqo.prototype.mouseenter =	function(act)	{ return this.bind("mouseenter",act); };
jqo.prototype.mouseleave =	function(act)	{ return this.bind("mouseleave",act); };
jqo.prototype.touchstart =	function(act)	{ return this.bind("touchstart",act); };
jqo.prototype.touchmove =	function(act)	{ return this.bind("touchmove",act); };
jqo.prototype.touchcancel =	function(act)	{ return this.bind("touchcancel",act); };
jqo.prototype.touchend =	function(act)	{ return this.bind("touchend",act); };
jqo.prototype.resize =	function(act)	{ return this.bind("resize",act); };
jqo.prototype.bind =	function(evtName, callback)	{ if (typeof callback == "function") { this.each(function(i,elem) { elem.addEventListener(evtName,callback,false); }); return this; } else { this.debug("bind",arguments,"Argument 2 should be a function reference but is " + typeof callback); } };
jqo.prototype.trigger =	function(eventType)	{ this.each(function(i,elem) { if (["click", "dblclick", "mouseup", "mousedown"].indexOf(eventType) > -1) { var event = new MouseEvent(eventType, {'view': window,'bubbles': true,'cancelable': true}); elem.dispatchEvent(event); } else { var evt = document.createEvent("Event"); evt.initEvent(eventType, true, true); return !elem.dispatchEvent(evt); } }); return this; };
jqo.prototype.load =	function(url, callback)	{ if (typeof url == "function") { return this.bind("load",url); } else { var self = this, cllbck = callback; JQL.ajax({"url": url, "success": function(html, status, xhr){ self.html(html); cllbck && cllbck(html, status, xhr);} , "dataType": "html"}); return this; } };
jqo.prototype.attr =	function attr(key,val)	{
	if (typeof val == "function") {
		this.each(function ai(i,elem) { elem.setAttribute(key,val(i,elem.getAttribute(key))); }); return this;
	} else if (typeof val != "undefined") {
		this.each(function ai(i,elem) { elem.setAttribute(key,val); }); return this;
	} else {
		if (this.length>0) return this[0].getAttribute(key);
	}
};
jqo.prototype.width =	function width(val)	{ if (typeof val != "undefined") { this.each(function(i,elem) { elem.style.width = val; }); } else return this.currentStyle("width"); };
jqo.prototype.height =	function height(val)	{ if (typeof val != "undefined") { this.each(function(i,elem) { elem.style.height = val; }); } else return this.currentStyle("height"); };
jqo.prototype.offset =	function()	{ if (this.length>0) { var bcr = this[0].getBoundingClientRect(); return {left:bcr.left+window.pageXOffset - document.body.clientLeft, top:bcr.top+window.pageYOffset - document.body.clientTop}; } };
jqo.prototype.debug =	function(fnc, args, str) { var argz = []; for (var i = 0, len = args.length; i < len; i++) { argz.push(JSON.stringify(args[i])||'function'); } console.warn("$('" + this._sel + "')." + fnc + "(" + argz.join(', ') + ")", str); };
jqo.prototype.extend =	function(methods) { for (var name in methods) { jqo.prototype[name] = methods[name]; } };

function jqi()
{
	return new jqo();
}

var testElem = document.createElement("div");
if (!("classList" in testElem)) //IE9
{
	jqo.prototype.addClass		= function(name) { this.each(function(i,elem) { elem.className += " " + name; }); return this; };
	jqo.prototype.removeClass	= function(name) { var reg = new RegExp('(\\s|^)'+name+'(\\s|$)'); this.each(function(i,elem) { elem.className=elem.className.replace(reg,' '); }); return this; };
	jqo.prototype.toggleClass	= function(name,on) { if(typeof on != "undefined") { this[on ? "addClass" : "removeClass"](name); } else { var RE = new RegExp('(\\s|^)'+name+'(\\s|$)'); this[RE.test(this[0].className) ? "removeClass" : "addClass"](name); } return this; };
}
else if (!DOMTokenList.prototype.toggle || testElem.classList.toggle("a",0)!==false) //IE11
{
	DOMTokenList.prototype.toggle = function(val){
		var isAdd = arguments.length > 1 ? !!arguments[1] : !this.contains(val);
		return (this[isAdd ? "add" : "remove"](val), isAdd);
	};
}
if (!Math.hypot) Math.hypot = function() {
	var y = 0, i = arguments.length;
	while (i--) y += arguments[i] * arguments[i];
	return Math.sqrt(y);
};


var JQL = function JQL(sel, parentNode)
{
	parentNode = parentNode || document;
//console.debug(sel);
	var ret = jqi();
	if (sel != null)
	{
		if (typeof sel == "string")
		{
			//HTML
			if (/^\s*</.test(sel)) {
				console.log('jQueryLight: FIXME: implement $("' + sel + '")');
			} else {
				var checkedMatch = sel.match(/^(.*)\:(checked|selected)$/);
				if (checkedMatch) {
					var elems = parentNode.querySelectorAll(checkedMatch[1]);
					for (var i = 0, len = elems.length; i < len; i++)
						ret.push(elems[i]);
					ret._sel = sel;
					return ret
						.filter(function(i,elem){return elem.checked||elem.selected;});
				} else {
					var elems = parentNode.querySelectorAll(sel);
					for (var i = 0, len = elems.length; i < len; i++)
						ret.push(elems[i]);
					ret._sel = sel;
				}
			}
		}
		else if (JQL.isArray(sel) || sel instanceof jqo)
		{
			for (var i = 0, len = sel.length; i < len; i++)
				ret.push(sel[i]);
		}
		else if (typeof sel != "undefined")
		{
			ret.push(sel);
			ret._sel = stringify(sel);
		}
	}
	return ret;
};

JQL.active = 0;
//JQL.fn = extensions;
JQL.fn = jqo.prototype;
JQL.extend = function(target)
{
	if (arguments.length == 1)
	{
		for (var name in target)
			JQL[name] = target[name];
		return JQL;
	}
	else
	{
		for (var i = 1; i < arguments.length; i++)
		{
			var methods = arguments[i];
			for (var name in methods)
				target[name] = methods[name];
		}
		return target;
	}
};

JQL.ajax = function(options)
{
	JQL.active = 1;
	options.type = options.type || "GET";
	var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Msxml2.XMLHTTP");
	xhr.onreadystatechange = function()
	{
		if (xhr.readyState == 3)
		{
			if (typeof options.partialSuccess == "function")
				options.partialSuccess(xhr.responseText);
		}
		else if (xhr.readyState == 4)
		{
			if (xhr.status == "200")
			{
				var ct = xhr.getResponseHeader("Content-type")||"";
				if (/\/json/.test(ct) || options.dataType == "json")
				{
					var jsondata = null;
					try
					{
						jsondata = JSON.parse(xhr.responseText);
					}
					catch (err)
					{
						console.log(err, options.url);
						if (options.error)
							options.error(xhr, "json parse error", xhr.status);
					}
					if (jsondata != null)
						options.success(jsondata, xhr.status, xhr);
				}
				else if (/\/xml/.test(ct) || options.dataType == "xml")
				{
					options.success(xhr.responseXML, xhr.status, xhr);
				}
				else
					options.success(xhr.responseText, xhr.status, xhr);
			}
			else if (xhr.status == "401")
			{
				//for statistics
				if (window.toggleUpdate)
					toggleUpdate(null, false);
				showLoginForm();
				if (options.error)
					options.error(xhr, "AuthorizationRequired", xhr.status);
			}
			else if (xhr.status == "403") //POST for client-side-ssl with expired session may have the old csrf token, the new csrf token is in this postresponse
			{
				var ct = xhr.getResponseHeader("Content-type")||"";
				if (/\/json/.test(ct) || options.dataType == "json")
				{
					try
					{
						var data = JSON.parse(xhr.responseText);
						setCsrf(data);
						alert("Session expired and restored.\n\nYour last action may have been aborted.");//FIXME: translate this!
					}
					catch (err)
					{
					}
				}
				if (options.error)
					options.error(xhr, "Forbidden", xhr.status);
			}
			else if (options.error)
			{
				options.error(xhr, "error", xhr.status);
			}
			else if (xhr.status > 299)
			{
				alert("HTTP Request " + options.url + " returned status " + xhr.status + "\n\n" + xhr.responseText);
			}
			JQL.active = 0;
		}
	};
	xhr.ontimeout = function()
	{
		if (options.error)
			options.error(xhr, "timeout", xhr.status);
	};
	var isPostOrPut = /POST|PUT/.test(options.type);
	xhr.open(options.type, options.url+((!isPostOrPut && options.data) ? "?" + options.data :""), true);
	if (isPostOrPut && options.contentType)
		xhr.setRequestHeader("Content-type", options.contentType);
	if (options.dataType == "json")
		xhr.setRequestHeader("Accept", "application/json");
	if (options.headers)
		for (var headerName in options.headers)
			xhr.setRequestHeader(headerName, options.headers[headerName]);
	if (options.uploadProgress && xhr.upload)
		xhr.upload.addEventListener("progress", options.uploadProgress);
	xhr.send(isPostOrPut ? options.data : null);
	return xhr;
};
JQL.getJSON = function(url, data, callback)
{
	if (typeof data == "function")
	{
		callback = data;
		data = undefined;
	}
	return JQL.ajax({"url": url,"data": data, "success": callback, "dataType": "json"});
};
JQL.isArray = function(obj)
{
	return Array.isArray(obj);//Object.prototype.toString.call(obj) == "[object Array]";
};
JQL.isPlainObject = function(obj)
{
	return Object.prototype.toString.call(obj) == "[object Object]";
};
JQL.each = function(object, callback)
{
	var length = object.length;
	if (length === undefined)
		for (var name in object)
			callback.call(object[name], name, object[name]);
	else
		for (var i = 0; i < length; i++)
			callback.call(object[i], i, object[i]);
	return object;
};

//Both are available in IE10+ and all other browsers
if (!('forEach' in Array.prototype)) {
	Array.prototype.forEach = function(action, that) {
		for (var i = 0, n = this.length; i < n; i++)
			if (i in this)
				action.call(that, this[i], i, this);
	};
}
if (!('indexOf' in Array.prototype)) {
	Array.prototype.indexOf = function(se) {
		for (var i = 0, n = this.length; i < n; i++)
			if (this[i] === se)
				return i;
		return -1;
	};
}
if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(search, this_len) {
		if (this_len === undefined || this_len > this.length) {
			this_len = this.length;
		}
		return this.substring(this_len - search.length, this_len) === search;
	};
}
// Helper functions
var toArray = function(nl) { var arr = []; for (var i = nl.length; i--; arr.unshift(nl[i])); return arr; };

/* helpers for mousenter and mouseleave */
var mouseEnter = function(_fn)
{
	return function(_evt)
	{
		var relTarget = _evt.relatedTarget;
		if (this === relTarget || isAChildOf(this, relTarget)) { return; }
		_fn.call(this, _evt);
	}
};
var isAChildOf = function(_parent, _child)
{
	if (_parent === _child) { return false; }
	while (_child && _child !== _parent) { _child = _child.parentNode; }
	return _child === _parent;
};

function setCsrf(data)
{
	if ("csrf" in data)
	{
		config.csrf = data.csrf; //name, value
		$('form input[name="' + data.csrf.name + '"]').val(data.csrf.value);
	}
}
function onLoginFormSubmit(evt)
{
	evt.preventDefault();
	var formElems = evt.target.elements;
	$('#sessionExpired h3').addClass('wait');
	$.ajax({
		'type': "POST",
		'url': config.rootUrl + "login",
		'contentType': "application/x-www-form-urlencoded",
		'data': "target=/sessionData"
			+ "&" + config.csrf.name + "=" + encodeURIComponent(formElems[config.csrf.name].value)
			+ "&username=" + encodeURIComponent(formElems.username.value)
			+ "&password=" + encodeURIComponent(formElems.password.value),
		'success': function(data){
			setCsrf(data);
			$('#sessionExpired').hide();
			window.requestAnimationFrame(function(){
				alert("Login Successful.\n\nYour last action may have been aborted.");//FIXME: translate this!
				if (window.toggleUpdate)
					toggleUpdate(null, true);
			});
		},
		'error': function(xhr, msg, statusCode)
		{
			if (statusCode == 401) //Login failed, bad creds?
				$('#sessionExpired').addClass('shake').find('h3').addClass("warn").text('Login failed');
		}
	})
}
var showLoginForm = function()
{
	$.ajax({
		'url': config.rootUrl + "login?ajax=true",
		'dataType': 'html',
		'success': showLoginForm2
	})
}
function showLoginForm2(data)
{
	var div = document.createElement("div");
	document.body.appendChild(div);
	div.innerHTML = data;
	var $se = $(div.querySelector('div#sessionExpired'));
	$se.find('h3').removeClass("wait").removeClass("warn");
	$se.find('form.login').submit(onLoginFormSubmit);
	$se.find('input[name="username"]')[0].focus();
	$(document).keydown(function(evt) { if (evt.which == 27) { $('#sessionExpired').hide() } } ); //Esc
};

/*
//run only once
if (DEBUG)
{
	var origExts = extensions;
	var newExts = {};
	for (var name in extensions)
	{
		if (name != "debug")
			newExts[name] = (function(ext,nme){
				return function () { this.debug(nme, arguments, ' '); return ext[nme].apply(this, arguments); }
				})(extensions,name);
	}
	extensions = newExts;
	extensions.debug = origExts.debug;
}
*/

var stringify = function(sel)
{
	if (sel.nodeType == 1) //DOM Element
	{
		var tagg = sel.tagName.toLowerCase();
		if (sel.id)
			return tagg + '#' + sel.id;
		else if (typeof sel.className == "string")
			return '*' + tagg + "." + sel.className.replace(/ /,'.') + '*';
		return '*' + tagg + '*';
	}
	if (sel.nodeType == 9) //Document
	{
		return 'document';
	}
	else
		return "FIXME987";
};


window.$ = JQL;
})();
