/*
	LuCI2 - OpenWrt Web Interface

	Copyright 2013-2014 Jo-Philipp Wich <jow@openwrt.org>

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

		http://www.apache.org/licenses/LICENSE-2.0
*/

String.prototype.format = function()
{
	var html_esc = [/&/g, '&#38;', /"/g, '&#34;', /'/g, '&#39;', /</g, '&#60;', />/g, '&#62;'];
	var quot_esc = [/"/g, '&#34;', /'/g, '&#39;'];

	function esc(s, r) {
		for( var i = 0; i < r.length; i += 2 )
			s = s.replace(r[i], r[i+1]);
		return s;
	}

	var str = this;
	var out = '';
	var re = /^(([^%]*)%('.|0|\x20)?(-)?(\d+)?(\.\d+)?(%|b|c|d|u|f|o|s|x|X|q|h|j|t|m))/;
	var a = b = [], numSubstitutions = 0, numMatches = 0;

	while ((a = re.exec(str)) != null)
	{
		var m = a[1];
		var leftpart = a[2], pPad = a[3], pJustify = a[4], pMinLength = a[5];
		var pPrecision = a[6], pType = a[7];

		numMatches++;

		if (pType == '%')
		{
			subst = '%';
		}
		else
		{
			if (numSubstitutions < arguments.length)
			{
				var param = arguments[numSubstitutions++];

				var pad = '';
				if (pPad && pPad.substr(0,1) == "'")
					pad = leftpart.substr(1,1);
				else if (pPad)
					pad = pPad;

				var justifyRight = true;
				if (pJustify && pJustify === "-")
					justifyRight = false;

				var minLength = -1;
				if (pMinLength)
					minLength = parseInt(pMinLength);

				var precision = -1;
				if (pPrecision && pType == 'f')
					precision = parseInt(pPrecision.substring(1));

				var subst = param;

				switch(pType)
				{
					case 'b':
						subst = (parseInt(param) || 0).toString(2);
						break;

					case 'c':
						subst = String.fromCharCode(parseInt(param) || 0);
						break;

					case 'd':
						subst = (parseInt(param) || 0);
						break;

					case 'u':
						subst = Math.abs(parseInt(param) || 0);
						break;

					case 'f':
						subst = (precision > -1)
							? ((parseFloat(param) || 0.0)).toFixed(precision)
							: (parseFloat(param) || 0.0);
						break;

					case 'o':
						subst = (parseInt(param) || 0).toString(8);
						break;

					case 's':
						subst = param;
						break;

					case 'x':
						subst = ('' + (parseInt(param) || 0).toString(16)).toLowerCase();
						break;

					case 'X':
						subst = ('' + (parseInt(param) || 0).toString(16)).toUpperCase();
						break;

					case 'h':
						subst = esc(param, html_esc);
						break;

					case 'q':
						subst = esc(param, quot_esc);
						break;

					case 'j':
						subst = String.serialize(param);
						break;

					case 't':
						var td = 0;
						var th = 0;
						var tm = 0;
						var ts = (param || 0);

						if (ts > 60) {
							tm = Math.floor(ts / 60);
							ts = (ts % 60);
						}

						if (tm > 60) {
							th = Math.floor(tm / 60);
							tm = (tm % 60);
						}

						if (th > 24) {
							td = Math.floor(th / 24);
							th = (th % 24);
						}

						subst = (td > 0)
							? '%dd %dh %dm %ds'.format(td, th, tm, ts)
							: '%dh %dm %ds'.format(th, tm, ts);

						break;

					case 'm':
						var mf = pMinLength ? parseInt(pMinLength) : 1000;
						var pr = pPrecision ? Math.floor(10*parseFloat('0'+pPrecision)) : 2;

						var i = 0;
						var val = parseFloat(param || 0);
						var units = [ '', 'K', 'M', 'G', 'T', 'P', 'E' ];

						for (i = 0; (i < units.length) && (val > mf); i++)
							val /= mf;

						subst = val.toFixed(pr) + ' ' + units[i];
						break;
				}

				subst = (typeof(subst) == 'undefined') ? '' : subst.toString();

				if (minLength > 0 && pad.length > 0)
					for (var i = 0; i < (minLength - subst.length); i++)
						subst = justifyRight ? (pad + subst) : (subst + pad);
			}
		}

		out += leftpart + subst;
		str = str.substr(m.length);
	}

	return out + str;
}

if (!window.location.origin)
	window.location.origin = '%s//%s%s'.format(
		window.location.protocol,
		window.location.hostname,
		(window.location.port ? ':' + window.location.port : '')
	);

function LuCI2()
{
	var L = this;

	var Class = function() { };

	Class.extend = function(properties)
	{
		Class.initializing = true;

		var prototype = new this();
		var superprot = this.prototype;

		Class.initializing = false;

		$.extend(prototype, properties, {
			callSuper: function() {
				var args = [ ];
				var meth = arguments[0];

				if (typeof(superprot[meth]) != 'function')
					return undefined;

				for (var i = 1; i < arguments.length; i++)
					args.push(arguments[i]);

				return superprot[meth].apply(this, args);
			}
		});

		function _class()
		{
			this.options = arguments[0] || { };

			if (!Class.initializing && typeof(this.init) == 'function')
				this.init.apply(this, arguments);
		}

		_class.prototype = prototype;
		_class.prototype.constructor = _class;

		_class.extend = Class.extend;

		return _class;
	};

	Class.require = function(name)
	{
		var path = '/' + name.replace(/\./g, '/') + '.js';

		return $.ajax(path, {
			method: 'GET',
			async: false,
			cache: true,
			dataType: 'text'
		}).then(function(text) {
			var code = '%s\n\n//# sourceURL=%s/%s'.format(text, window.location.origin, path);
			var construct = eval(code);

			var parts = name.split(/\./);
			var cparent = L.Class || (L.Class = { });

			for (var i = 1; i < parts.length - 1; i++)
			{
				cparent = cparent[parts[i]];

				if (!cparent)
					throw "Missing parent class";
			}

			cparent[parts[i]] = construct;
		});
	};

	Class.instantiate = function(name)
	{
		Class.require(name).then(function() {
			var parts = name.split(/\./);
			var iparent = L;
			var construct = L.Class;

			for (var i = 1; i < parts.length - 1; i++)
			{
				iparent = iparent[parts[i]];
				construct = construct[parts[i]];

				if (!iparent)
					throw "Missing parent class";
			}

			if (construct[parts[i]])
				iparent[parts[i]] = new construct[parts[i]]();
		});
	};

	this.defaults = function(obj, def)
	{
		for (var key in def)
			if (typeof(obj[key]) == 'undefined')
				obj[key] = def[key];

		return obj;
	};

	this.isDeferred = function(x)
	{
		return (typeof(x) == 'object' &&
		        typeof(x.then) == 'function' &&
		        typeof(x.promise) == 'function');
	};

	this.deferrable = function()
	{
		if (this.isDeferred(arguments[0]))
			return arguments[0];

		var d = $.Deferred();
		    d.resolve.apply(d, arguments);

		return d.promise();
	};
	
	
	this.i18n = {
		loaded: false,
		catalog: { },
		plural:  function(n) { return 0 + (n != 1) },

		init: function() {
			if (L.i18n.loaded)
				return L.deferrable();
			
			var fetchLangInfo = L.rpc.declare({object: 'luci2.ui', method: 'lang'});

			var d = $.Deferred();
			
			fetchLangInfo().then(function(rv) {
				L.i18n.language = (navigator.userLanguage || navigator.language || 'en').toLowerCase();
				if (rv.lang != 'auto')
					L.i18n.language = rv.lang;
				
				if (L.i18n.language == 'zh_cn')
					L.i18n.language = 'zh-cn';
				
				var files = {};
				$.each(rv.files, function(){
					var file = this.match('[^.]+');
					if (!files[file])
						files[file] = true;
				});
				
				$.each(files, function(file) {
					$.ajax('%s/i18n/%s.%s.json'.format(L.globals.resource, file, L.i18n.language), {
						async:    false,
						cache:    true,
						dataType: 'json',
						success:  function(data) {
							$.extend(L.i18n.catalog, data);

							var pe = L.i18n.catalog[''];
							if (pe)
							{
								delete L.i18n.catalog[''];
								try {
									var pf = new Function('n', 'return 0 + (' + pe + ')');
									L.i18n.plural = pf;
								} catch (e) { };
							}
						}
					});
				});
				
				L.i18n.loaded = true;
				d.resolve();
			});

			return d.promise();
		}
	};

	this.tr = function(msgid)
	{
		var msgstr = L.i18n.catalog[msgid];

		if (typeof(msgstr) == 'undefined')
			return msgid;
		else if (typeof(msgstr) == 'string')
			return msgstr;
		else
			return msgstr[0];
	};

	this.trp = function(msgid, msgid_plural, count)
	{
		var msgstr = L.i18n.catalog[msgid];

		if (typeof(msgstr) == 'undefined')
			return (count == 1) ? msgid : msgid_plural;
		else if (typeof(msgstr) == 'string')
			return msgstr;
		else
			return msgstr[L.i18n.plural(count)];
	};

	this.trc = function(msgctx, msgid)
	{
		var msgstr = L.i18n.catalog[msgid + '\u0004' + msgctx];

		if (typeof(msgstr) == 'undefined')
			return msgid;
		else if (typeof(msgstr) == 'string')
			return msgstr;
		else
			return msgstr[0];
	};

	this.trcp = function(msgctx, msgid, msgid_plural, count)
	{
		var msgstr = L.i18n.catalog[msgid + '\u0004' + msgctx];

		if (typeof(msgstr) == 'undefined')
			return (count == 1) ? msgid : msgid_plural;
		else if (typeof(msgstr) == 'string')
			return msgstr;
		else
			return msgstr[L.i18n.plural(count)];
	};

	this.setHash = function(key, value)
	{
		var h = '';
		var data = this.getHash(undefined);

		if (typeof(value) == 'undefined')
			delete data[key];
		else
			data[key] = value;

		var keys = [ ];
		for (var k in data)
			keys.push(k);

		keys.sort();

		for (var i = 0; i < keys.length; i++)
		{
			if (i > 0)
				h += ',';

			h += keys[i] + ':' + data[keys[i]];
		}

		if (h.length)
			location.hash = '#' + h;
		else
			location.hash = '';
	};

	this.getHash = function(key)
	{
		var data = { };
		var tuples = (location.hash || '#').substring(1).split(/,/);

		for (var i = 0; i < tuples.length; i++)
		{
			var tuple = tuples[i].split(/:/);
			if (tuple.length == 2)
				data[tuple[0]] = tuple[1];
		}

		if (typeof(key) != 'undefined')
			return data[key];

		return data;
	};

	this.toArray = function(x)
	{
		switch (typeof(x))
		{
		case 'number':
		case 'boolean':
			return [ x ];

		case 'string':
			var r = [ ];
			var l = x.split(/\s+/);
			for (var i = 0; i < l.length; i++)
				if (l[i].length > 0)
					r.push(l[i]);
			return r;

		case 'object':
			if ($.isArray(x))
			{
				var r = [ ];
				for (var i = 0; i < x.length; i++)
					r.push(x[i]);
				return r;
			}
			else if ($.isPlainObject(x))
			{
				var r = [ ];
				for (var k in x)
					if (x.hasOwnProperty(k))
						r.push(k);
				return r.sort();
			}
		}

		return [ ];
	};

	this.toObject = function(x)
	{
		switch (typeof(x))
		{
		case 'number':
		case 'boolean':
			return { x: true };

		case 'string':
			var r = { };
			var l = x.split(/\x+/);
			for (var i = 0; i < l.length; i++)
				if (l[i].length > 0)
					r[l[i]] = true;
			return r;

		case 'object':
			if ($.isArray(x))
			{
				var r = { };
				for (var i = 0; i < x.length; i++)
					r[x[i]] = true;
				return r;
			}
			else if ($.isPlainObject(x))
			{
				return x;
			}
		}

		return { };
	};

	this.filterArray = function(array, item)
	{
		if (!$.isArray(array))
			return [ ];

		for (var i = 0; i < array.length; i++)
			if (array[i] === item)
				array.splice(i--, 1);

		return array;
	};

	this.toClassName = function(str, suffix)
	{
		var n = '';
		var l = str.split(/[\/.]/);

		for (var i = 0; i < l.length; i++)
			if (l[i].length > 0)
				n += l[i].charAt(0).toUpperCase() + l[i].substr(1).toLowerCase();

		if (typeof(suffix) == 'string')
			n += suffix;

		return n;
	};

	this.toColor = function(str)
	{
		if (typeof(str) != 'string' || str.length == 0)
			return '#CCCCCC';

		if (str == 'wan')
			return '#F09090';
		else if (str == 'lan')
			return '#90F090';

		var i = 0, hash = 0;

		while (i < str.length)
			hash = str.charCodeAt(i++) + ((hash << 5) - hash);

		var r = (hash & 0xFF) % 128;
		var g = ((hash >> 8) & 0xFF) % 128;

		var min = 0;
		var max = 128;

		if ((r + g) < 128)
			min = 128 - r - g;
		else
			max = 255 - r - g;

		var b = min + (((hash >> 16) & 0xFF) % (max - min));

		return '#%02X%02X%02X'.format(0xFF - r, 0xFF - g, 0xFF - b);
	};

	this.parseIPv4 = function(str)
	{
		if ((typeof(str) != 'string' && !(str instanceof String)) ||
		    !str.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/))
			return undefined;

		var num = [ ];
		var parts = str.split(/\./);

		for (var i = 0; i < parts.length; i++)
		{
			var n = parseInt(parts[i], 10);
			if (isNaN(n) || n > 255)
				return undefined;

			num.push(n);
		}

		return num;
	};

	this.parseIPv6 = function(str)
	{
		if ((typeof(str) != 'string' && !(str instanceof String)) ||
		    !str.match(/^[a-fA-F0-9:]+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})?$/))
			return undefined;

		var parts = str.split(/::/);
		if (parts.length == 0 || parts.length > 2)
			return undefined;

		var lnum = [ ];
		if (parts[0].length > 0)
		{
			var left = parts[0].split(/:/);
			for (var i = 0; i < left.length; i++)
			{
				var n = parseInt(left[i], 16);
				if (isNaN(n))
					return undefined;

				lnum.push((n / 256) >> 0);
				lnum.push(n % 256);
			}
		}

		var rnum = [ ];
		if (parts.length > 1 && parts[1].length > 0)
		{
			var right = parts[1].split(/:/);

			for (var i = 0; i < right.length; i++)
			{
				if (right[i].indexOf('.') > 0)
				{
					var addr = L.parseIPv4(right[i]);
					if (!addr)
						return undefined;

					rnum.push.apply(rnum, addr);
					continue;
				}

				var n = parseInt(right[i], 16);
				if (isNaN(n))
					return undefined;

				rnum.push((n / 256) >> 0);
				rnum.push(n % 256);
			}
		}

		if (rnum.length > 0 && (lnum.length + rnum.length) > 15)
			return undefined;

		var num = [ ];

		num.push.apply(num, lnum);

		for (var i = 0; i < (16 - lnum.length - rnum.length); i++)
			num.push(0);

		num.push.apply(num, rnum);

		if (num.length > 16)
			return undefined;

		return num;
	};

	this.isNetmask = function(addr)
	{
		if (!$.isArray(addr))
			return false;

		var c;

		for (c = 0; (c < addr.length) && (addr[c] == 255); c++);

		if (c == addr.length)
			return true;

		if ((addr[c] == 254) || (addr[c] == 252) || (addr[c] == 248) ||
			(addr[c] == 240) || (addr[c] == 224) || (addr[c] == 192) ||
			(addr[c] == 128) || (addr[c] == 0))
		{
			for (c++; (c < addr.length) && (addr[c] == 0); c++);

			if (c == addr.length)
				return true;
		}

		return false;
	};

	this.globals = {
		timeout:  15000,
		resource: '/luci2',
		sid:      '00000000000000000000000000000000'
	};

	Class.instantiate('luci2.rpc');
	Class.instantiate('luci2.uci');
	Class.instantiate('luci2.network');
	Class.instantiate('luci2.wireless');
	Class.instantiate('luci2.firewall');
	Class.instantiate('luci2.system');
	Class.instantiate('luci2.session');
	Class.instantiate('luci2.ui');
	Class.instantiate('luci2.cbi');
	Class.instantiate('luci2.file');
};
