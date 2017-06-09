(function() {
	var type = function(f, l)
	{
		f.message = l;
		return f;
	};

	var cbi_class = {
		validation: {
			i18n: function(msg)
			{
				L.cbi.validation.message = L.tr(msg);
			},

			compile: function(code)
			{
				var pos = 0;
				var esc = false;
				var depth = 0;
				var types = L.cbi.validation.types;
				var stack = [ ];

				code += ',';

				for (var i = 0; i < code.length; i++)
				{
					if (esc)
					{
						esc = false;
						continue;
					}

					switch (code.charCodeAt(i))
					{
					case 92:
						esc = true;
						break;

					case 40:
					case 44:
						if (depth <= 0)
						{
							if (pos < i)
							{
								var label = code.substring(pos, i);
									label = label.replace(/\\(.)/g, '$1');
									label = label.replace(/^[ \t]+/g, '');
									label = label.replace(/[ \t]+$/g, '');

								if (label && !isNaN(label))
								{
									stack.push(parseFloat(label));
								}
								else if (label.match(/^(['"]).*\1$/))
								{
									stack.push(label.replace(/^(['"])(.*)\1$/, '$2'));
								}
								else if (typeof types[label] == 'function')
								{
									stack.push(types[label]);
									stack.push([ ]);
								}
								else
								{
									throw "Syntax error, unhandled token '"+label+"'";
								}
							}
							pos = i+1;
						}
						depth += (code.charCodeAt(i) == 40);
						break;

					case 41:
						if (--depth <= 0)
						{
							if (typeof stack[stack.length-2] != 'function')
								throw "Syntax error, argument list follows non-function";

							stack[stack.length-1] =
								L.cbi.validation.compile(code.substring(pos, i));

							pos = i+1;
						}
						break;
					}
				}

				return stack;
			}
		}
	};

	var validation = cbi_class.validation;

	validation.types = {
		'integer': function()
		{
			if (this.match(/^-?[0-9]+$/) != null)
				return true;

			validation.i18n('Must be a valid integer');
			return false;
		},

		'uinteger': function()
		{
			if (validation.types['integer'].apply(this) && (this >= 0))
				return true;

			validation.i18n('Must be a positive integer');
			return false;
		},

		'float': function()
		{
			if (!isNaN(parseFloat(this)))
				return true;

			validation.i18n('Must be a valid number');
			return false;
		},

		'ufloat': function()
		{
			if (validation.types['float'].apply(this) && (this >= 0))
				return true;

			validation.i18n('Must be a positive number');
			return false;
		},

		'ipaddr': function()
		{
			if (L.parseIPv4(this) || L.parseIPv6(this))
				return true;

			validation.i18n('Must be a valid IP address');
			return false;
		},

		'ip4addr': function()
		{
			if (L.parseIPv4(this))
				return true;

			validation.i18n('Must be a valid IPv4 address');
			return false;
		},

		'ip6addr': function()
		{
			if (L.parseIPv6(this))
				return true;

			validation.i18n('Must be a valid IPv6 address');
			return false;
		},

		'netmask4': function()
		{
			if (L.isNetmask(L.parseIPv4(this)))
				return true;

			validation.i18n('Must be a valid IPv4 netmask');
			return false;
		},

		'netmask6': function()
		{
			if (L.isNetmask(L.parseIPv6(this)))
				return true;

			validation.i18n('Must be a valid IPv6 netmask6');
			return false;
		},

		'cidr4': function()
		{
			if (this.match(/^([0-9.]+)\/(\d{1,2})$/))
				if (RegExp.$2 <= 32 && L.parseIPv4(RegExp.$1))
					return true;

			validation.i18n('Must be a valid IPv4 prefix');
			return false;
		},

		'cidr6': function()
		{
			if (this.match(/^([a-fA-F0-9:.]+)\/(\d{1,3})$/))
				if (RegExp.$2 <= 128 && L.parseIPv6(RegExp.$1))
					return true;

			validation.i18n('Must be a valid IPv6 prefix');
			return false;
		},

		'ipmask4': function()
		{
			if (this.match(/^([0-9.]+)\/([0-9.]+)$/))
			{
				var addr = RegExp.$1, mask = RegExp.$2;
				if (L.parseIPv4(addr) && L.isNetmask(L.parseIPv4(mask)))
					return true;
			}

			validation.i18n('Must be a valid IPv4 address/netmask pair');
			return false;
		},

		'ipmask6': function()
		{
			if (this.match(/^([a-fA-F0-9:.]+)\/([a-fA-F0-9:.]+)$/))
			{
				var addr = RegExp.$1, mask = RegExp.$2;
				if (L.parseIPv6(addr) && L.isNetmask(L.parseIPv6(mask)))
					return true;
			}

			validation.i18n('Must be a valid IPv6 address/netmask pair');
			return false;
		},

		'port': function()
		{
			if (validation.types['integer'].apply(this) &&
				(this >= 0) && (this <= 65535))
				return true;

			validation.i18n('Must be a valid port number');
			return false;
		},

		'portrange': function()
		{
			if (this.match(/^(\d+)-(\d+)$/))
			{
				var p1 = RegExp.$1;
				var p2 = RegExp.$2;

				if (validation.types['port'].apply(p1) &&
				    validation.types['port'].apply(p2) &&
				    (parseInt(p1) <= parseInt(p2)))
					return true;
			}
			else if (validation.types['port'].apply(this))
			{
				return true;
			}

			validation.i18n('Must be a valid port range');
			return false;
		},

		'macaddr': function()
		{
			if (this.match(/^([a-fA-F0-9]{2}:){5}[a-fA-F0-9]{2}$/) != null)
				return true;

			validation.i18n('Must be a valid MAC address');
			return false;
		},

		'host': function()
		{
			if (validation.types['hostname'].apply(this) ||
			    validation.types['ipaddr'].apply(this))
				return true;

			validation.i18n('Must be a valid hostname or IP address');
			return false;
		},

		'hostname': function()
		{
			if ((this.length <= 253) &&
			    ((this.match(/^[a-zA-Z0-9]+$/) != null ||
			     (this.match(/^[a-zA-Z0-9_][a-zA-Z0-9_\-.]*[a-zA-Z0-9]$/) &&
			      this.match(/[^0-9.]/)))))
				return true;

			validation.i18n('Must be a valid host name');
			return false;
		},

		'network': function()
		{
			if (validation.types['uciname'].apply(this) ||
			    validation.types['host'].apply(this))
				return true;

			validation.i18n('Must be a valid network name');
			return false;
		},

		'wpakey': function()
		{
			var v = this;

			if ((v.length == 64)
			      ? (v.match(/^[a-fA-F0-9]{64}$/) != null)
				  : ((v.length >= 8) && (v.length <= 63)))
				return true;

			validation.i18n('Must be a valid WPA key');
			return false;
		},

		'wepkey': function()
		{
			var v = this;

			if (v.substr(0,2) == 's:')
				v = v.substr(2);

			if (((v.length == 10) || (v.length == 26))
			      ? (v.match(/^[a-fA-F0-9]{10,26}$/) != null)
			      : ((v.length == 5) || (v.length == 13)))
				return true;

			validation.i18n('Must be a valid WEP key');
			return false;
		},

		'uciname': function()
		{
			if (this.match(/^[a-zA-Z0-9_]+$/) != null)
				return true;

			validation.i18n('Must be a valid UCI identifier');
			return false;
		},

		'range': function(min, max)
		{
			var val = parseFloat(this);

			if (validation.types['integer'].apply(this) &&
			    !isNaN(min) && !isNaN(max) && ((val >= min) && (val <= max)))
				return true;

			validation.i18n('Must be a number between %d and %d');
			return false;
		},

		'min': function(min)
		{
			var val = parseFloat(this);

			if (validation.types['integer'].apply(this) &&
			    !isNaN(min) && !isNaN(val) && (val >= min))
				return true;

			validation.i18n('Must be a number greater or equal to %d');
			return false;
		},

		'max': function(max)
		{
			var val = parseFloat(this);

			if (validation.types['integer'].apply(this) &&
			    !isNaN(max) && !isNaN(val) && (val <= max))
				return true;

			validation.i18n('Must be a number lower or equal to %d');
			return false;
		},

		'rangelength': function(min, max)
		{
			var val = '' + this;

			if (!isNaN(min) && !isNaN(max) &&
			    (val.length >= min) && (val.length <= max))
				return true;

			if (min != max)
				validation.i18n('Must be between %d and %d characters');
			else
				validation.i18n('Must be %d characters');
			return false;
		},

		'minlength': function(min)
		{
			var val = '' + this;

			if (!isNaN(min) && (val.length >= min))
				return true;

			validation.i18n('Must be at least %d characters');
			return false;
		},

		'maxlength': function(max)
		{
			var val = '' + this;

			if (!isNaN(max) && (val.length <= max))
				return true;

			validation.i18n('Must be at most %d characters');
			return false;
		},

		'or': function()
		{
			var msgs = [ ];

			for (var i = 0; i < arguments.length; i += 2)
			{
				delete validation.message;

				if (typeof(arguments[i]) != 'function')
				{
					if (arguments[i] == this)
						return true;
					i--;
				}
				else if (arguments[i].apply(this, arguments[i+1]))
				{
					return true;
				}

				if (validation.message)
					msgs.push(validation.message.format.apply(validation.message, arguments[i+1]));
			}

			validation.message = msgs.join( L.tr(' - or - '));
			return false;
		},

		'and': function()
		{
			var msgs = [ ];

			for (var i = 0; i < arguments.length; i += 2)
			{
				delete validation.message;

				if (typeof arguments[i] != 'function')
				{
					if (arguments[i] != this)
						return false;
					i--;
				}
				else if (!arguments[i].apply(this, arguments[i+1]))
				{
					return false;
				}

				if (validation.message)
					msgs.push(validation.message.format.apply(validation.message, arguments[i+1]));
			}

			validation.message = msgs.join(', ');
			return true;
		},

		'neg': function()
		{
			return validation.types['or'].apply(
				this.replace(/^[ \t]*![ \t]*/, ''), arguments);
		},

		'list': function(subvalidator, subargs)
		{
			if (typeof subvalidator != 'function')
				return false;

			var tokens = this.match(/[^ \t]+/g);
			for (var i = 0; i < tokens.length; i++)
				if (!subvalidator.apply(tokens[i], subargs))
					return false;

			return true;
		},

		'phonedigit': function()
		{
			if (this.match(/^[0-9\*#!\.]+$/) != null)
				return true;

			validation.i18n('Must be a valid phone number digit');
			return false;
		},

		'string': function()
		{
			return true;
		}
	};

	cbi_class.AbstractValue = L.ui.AbstractWidget.extend({
		init: function(name, options)
		{
			this.name = name;
			this.instance = { };
			this.dependencies = [ ];
			this.rdependency = { };

			this.options = L.defaults(options, {
				placeholder: '',
				datatype: 'string',
				optional: false,
				keep: true
			});
		},

		id: function(sid)
		{
			return this.ownerSection.id('field', sid || '__unknown__', this.name);
		},

		render: function(sid, condensed)
		{
			var i = this.instance[sid] = { };

			i.top = $('<div />')
				.addClass('luci2-field');

			if (!condensed)
			{
				i.top.addClass('form-group');

				if (typeof(this.options.caption) == 'string')
					$('<label />')
						.addClass('col-lg-2 control-label')
						.attr('for', this.id(sid))
						.text(this.options.caption)
						.appendTo(i.top);
			}

			i.error = $('<div />')
				.hide()
				.addClass('luci2-field-error label label-danger');

			i.widget = $('<div />')
				.addClass('luci2-field-widget')
				.append(this.widget(sid))
				.append(i.error)
				.appendTo(i.top);

			if (!condensed)
			{
				i.widget.addClass('col-lg-5');

				$('<div />')
					.addClass('col-lg-5')
					.text((typeof(this.options.description) == 'string') ? this.options.description : '')
					.appendTo(i.top);
			}

			return i.top;
		},

		active: function(sid)
		{
			return (this.instance[sid] && !this.instance[sid].disabled);
		},

		ucipath: function(sid)
		{
			return {
				config:  (this.options.uci_package || this.ownerMap.uci_package),
				section: (this.options.uci_section || sid),
				option:  (this.options.uci_option  || this.name)
			};
		},

		ucivalue: function(sid)
		{
			var uci = this.ucipath(sid);
			var val = this.ownerMap.get(uci.config, uci.section, uci.option);

			if (typeof(val) == 'undefined')
				return this.options.initial;

			return val;
		},

		formvalue: function(sid)
		{
			var v = $('#' + this.id(sid)).val();
			return (v === '') ? undefined : v;
		},

		textvalue: function(sid)
		{
			var v = this.formvalue(sid);

			if (typeof(v) == 'undefined' || ($.isArray(v) && !v.length))
				v = this.ucivalue(sid);

			if (typeof(v) == 'undefined' || ($.isArray(v) && !v.length))
				v = this.options.placeholder;

			if (typeof(v) == 'undefined' || v === '')
				return undefined;

			if (typeof(v) == 'string' && $.isArray(this.choices))
			{
				for (var i = 0; i < this.choices.length; i++)
					if (v === this.choices[i][0])
						return this.choices[i][1];
			}
			else if (v === true)
				return L.tr('yes');
			else if (v === false)
				return L.tr('no');
			else if ($.isArray(v))
				return v.join(', ');

			return v;
		},

		changed: function(sid)
		{
			var a = this.ucivalue(sid);
			var b = this.formvalue(sid);

			if (typeof(a) != typeof(b))
				return true;

			if ($.isArray(a))
			{
				if (a.length != b.length)
					return true;

				for (var i = 0; i < a.length; i++)
					if (a[i] != b[i])
						return true;

				return false;
			}
			else if ($.isPlainObject(a))
			{
				for (var k in a)
					if (!(k in b))
						return true;

				for (var k in b)
					if (!(k in a) || a[k] !== b[k])
						return true;

				return false;
			}

			return (a != b);
		},

		save: function(sid)
		{
			var uci = this.ucipath(sid);

			if (this.instance[sid].disabled)
			{
				if (!this.options.keep)
					return this.ownerMap.set(uci.config, uci.section, uci.option, undefined);

				return false;
			}

			var chg = this.changed(sid);
			var val = this.formvalue(sid);

			if (chg)
				this.ownerMap.set(uci.config, uci.section, uci.option, val);

			return chg;
		},

		findSectionID: function($elem)
		{
			return this.ownerSection.findParentSectionIDs($elem)[0];
		},

		setError: function($elem, msg, msgargs)
		{
			var $field = $elem.parents('.luci2-field:first');
			var $error = $field.find('.luci2-field-error:first');

			if (typeof(msg) == 'string' && msg.length > 0)
			{
				$field.addClass('luci2-form-error');
				$elem.parent().addClass('has-error');

				$error.text(msg.format.apply(msg, msgargs)).show();
				$field.trigger('validate');

				return false;
			}
			else
			{
				$elem.parent().removeClass('has-error');

				var $other_errors = $field.find('.has-error');
				if ($other_errors.length == 0)
				{
					$field.removeClass('luci2-form-error');
					$error.text('').hide();
					$field.trigger('validate');

					return true;
				}

				return false;
			}
		},

		handleValidate: function(ev)
		{
			var $elem = $(this);

			var d = ev.data;
			var rv = true;
			var val = $elem.val();
			var vstack = d.vstack;

			if (vstack && typeof(vstack[0]) == 'function')
			{
				delete validation.message;

				if ((val.length == 0 && !d.opt))
				{
					rv = d.self.setError($elem, L.tr('Field must not be empty'));
				}
				else if (val.length > 0 && !vstack[0].apply(val, vstack[1]))
				{
					rv = d.self.setError($elem, validation.message, vstack[1]);
				}
				else
				{
					rv = d.self.setError($elem);
				}
			}

			if (rv)
			{
				var sid = d.self.findSectionID($elem);

				for (var field in d.self.rdependency)
				{
					d.self.rdependency[field].toggle(sid);
					d.self.rdependency[field].validate(sid);
				}

				d.self.ownerSection.tabtoggle(sid);
			}

			return rv;
		},

		attachEvents: function(sid, elem)
		{
			var evdata = {
				self:   this,
				opt:    this.options.optional,
				sid:	sid
			};

			if (this.events)
				for (var evname in this.events)
					elem.on(evname, evdata, this.events[evname]);

			if (typeof(this.options.datatype) == 'undefined' && $.isEmptyObject(this.rdependency))
				return elem;

			var vstack;
			if (typeof(this.options.datatype) == 'string')
			{
				try {
					evdata.vstack = L.cbi.validation.compile(this.options.datatype);
				} catch(e) { };
			}
			else if (typeof(this.options.datatype) == 'function')
			{
				var vfunc = this.options.datatype;
				evdata.vstack = [ function(elem) {
					var rv = vfunc(this, elem);
					if (rv !== true)
						validation.message = rv;
					return (rv === true);
				}, [ elem ] ];
			}

			if (elem.prop('tagName') == 'SELECT')
			{
				elem.change(evdata, this.handleValidate);
			}
			else if (elem.prop('tagName') == 'INPUT' && elem.attr('type') == 'checkbox')
			{
				elem.click(evdata, this.handleValidate);
				elem.blur(evdata, this.handleValidate);
			}
			else
			{
				elem.keyup(evdata, this.handleValidate);
				elem.blur(evdata, this.handleValidate);
			}

			elem.addClass('luci2-field-validate')
				.on('validate', evdata, this.handleValidate);

			return elem;
		},

		validate: function(sid)
		{
			var i = this.instance[sid];

			i.widget.find('.luci2-field-validate').trigger('validate');

			return (i.disabled || i.error.text() == '');
		},

		depends: function(d, v, add)
		{
			var dep;

			if ($.isArray(d))
			{
				dep = { };
				for (var i = 0; i < d.length; i++)
				{
					if (typeof(d[i]) == 'string')
						dep[d[i]] = true;
					else if (d[i] instanceof L.cbi.AbstractValue)
						dep[d[i].name] = true;
				}
			}
			else if (d instanceof L.cbi.AbstractValue)
			{
				dep = { };
				dep[d.name] = (typeof(v) == 'undefined') ? true : v;
			}
			else if (typeof(d) == 'object')
			{
				dep = d;
			}
			else if (typeof(d) == 'string')
			{
				dep = { };
				dep[d] = (typeof(v) == 'undefined') ? true : v;
			}

			if (!dep || $.isEmptyObject(dep))
				return this;

			for (var field in dep)
			{
				var f = this.ownerSection.fields[field];
				if (f)
					f.rdependency[this.name] = this;
				else
					delete dep[field];
			}

			if ($.isEmptyObject(dep))
				return this;

			if (!add || !this.dependencies.length)
				this.dependencies.push(dep);
			else
				for (var i = 0; i < this.dependencies.length; i++)
					$.extend(this.dependencies[i], dep);

			return this;
		},

		toggle: function(sid)
		{
			var d = this.dependencies;
			var i = this.instance[sid];

			if (!d.length)
				return true;

			for (var n = 0; n < d.length; n++)
			{
				var rv = true;

				for (var field in d[n])
				{
					var val = this.ownerSection.fields[field].formvalue(sid);
					var cmp = d[n][field];

					if (typeof(cmp) == 'boolean')
					{
						if (cmp == (typeof(val) == 'undefined' || val === '' || val === false))
						{
							rv = false;
							break;
						}
					}
					else if (typeof(cmp) == 'string' || typeof(cmp) == 'number')
					{
						if (val != cmp)
						{
							rv = false;
							break;
						}
					}
					else if (typeof(cmp) == 'function')
					{
						if (!cmp(val))
						{
							rv = false;
							break;
						}
					}
					else if (cmp instanceof RegExp)
					{
						if (!cmp.test(val))
						{
							rv = false;
							break;
						}
					}
				}

				if (rv)
				{
					if (i.disabled)
					{
						i.disabled = false;
						i.top.removeClass('luci2-field-disabled');
						i.top.fadeIn();
					}

					return true;
				}
			}

			if (!i.disabled)
			{
				i.disabled = true;
				i.top.is(':visible') ? i.top.fadeOut() : i.top.hide();
				i.top.addClass('luci2-field-disabled');
			}

			return false;
		}
	});

	cbi_class.CheckboxValue = cbi_class.AbstractValue.extend({
		widget: function(sid)
		{
			var o = this.options;

			if (typeof(o.enabled)  == 'undefined') o.enabled  = '1';
			if (typeof(o.disabled) == 'undefined') o.disabled = '0';

			var i = $('<input />')
				.attr('id', this.id(sid))
				.attr('type', 'checkbox')
				.prop('checked', this.ucivalue(sid));

			return $('<div />')
				.addClass('checkbox')
				.append(this.attachEvents(sid, i));
		},

		ucivalue: function(sid)
		{
			var v = this.callSuper('ucivalue', sid);

			if (typeof(v) == 'boolean')
				return v;

			return (v == this.options.enabled);
		},

		formvalue: function(sid)
		{
			var v = $('#' + this.id(sid)).prop('checked');

			if (typeof(v) == 'undefined')
				return !!this.options.initial;

			return v;
		},

		save: function(sid)
		{
			var uci = this.ucipath(sid);

			if (this.instance[sid].disabled)
			{
				if (!this.options.keep)
					return this.ownerMap.set(uci.config, uci.section, uci.option, undefined);

				return false;
			}

			var chg = this.changed(sid);
			var val = this.formvalue(sid);

			if (chg)
			{
				if (this.options.optional && val == this.options.initial)
					this.ownerMap.set(uci.config, uci.section, uci.option, undefined);
				else
					this.ownerMap.set(uci.config, uci.section, uci.option, val ? this.options.enabled : this.options.disabled);
			}

			return chg;
		}
	});

	cbi_class.InputValue = cbi_class.AbstractValue.extend({
		widget: function(sid)
		{
			var i = $('<input />')
				.addClass('form-control')
				.attr('id', this.id(sid))
				.attr('type', 'text')
				.attr('placeholder', this.options.placeholder)
				.val(this.ucivalue(sid));

			return this.attachEvents(sid, i);
		}
	});

	cbi_class.PasswordValue = cbi_class.AbstractValue.extend({
		widget: function(sid)
		{
			var i = $('<input />')
				.addClass('form-control')
				.attr('id', this.id(sid))
				.attr('type', 'password')
				.attr('placeholder', this.options.placeholder)
				.val(this.ucivalue(sid));

			var t = $('<span />')
				.addClass('input-group-btn')
				.append(L.ui.button(L.tr('Reveal'), 'default')
					.click(function(ev) {
						var b = $(this);
						var i = b.parent().prev();
						var t = i.attr('type');
						b.text(t == 'password' ? L.tr('Hide') : L.tr('Reveal'));
						i.attr('type', (t == 'password') ? 'text' : 'password');
						b = i = t = null;
					}));

			this.attachEvents(sid, i);

			return $('<div />')
				.addClass('input-group')
				.append(i)
				.append(t);
		}
	});

	cbi_class.ListValue = cbi_class.AbstractValue.extend({
		widget: function(sid)
		{
			var s = $('<select />')
				.addClass('form-control');

			if (this.options.optional && !this.has_empty)
				$('<option />')
					.attr('value', '')
					.text(L.tr('-- Please choose --'))
					.appendTo(s);

			if (this.choices)
				for (var i = 0; i < this.choices.length; i++)
					$('<option />')
						.attr('value', this.choices[i][0])
						.text(this.choices[i][1])
						.appendTo(s);

			s.attr('id', this.id(sid)).val(this.ucivalue(sid));

			return this.attachEvents(sid, s);
		},

		value: function(k, v)
		{
			if (!this.choices)
				this.choices = [ ];

			if (k == '')
				this.has_empty = true;

			this.choices.push([k, v || k]);
			return this;
		}
	});

	cbi_class.MultiValue = cbi_class.ListValue.extend({
		widget: function(sid)
		{
			var v = this.ucivalue(sid);
			var t = $('<div />').attr('id', this.id(sid));

			if (!$.isArray(v))
				v = (typeof(v) != 'undefined') ? v.toString().split(/\s+/) : [ ];

			var s = { };
			for (var i = 0; i < v.length; i++)
				s[v[i]] = true;

			if (this.choices)
				for (var i = 0; i < this.choices.length; i++)
				{
					$('<label />')
						.addClass('checkbox')
						.append($('<input />')
							.attr('type', 'checkbox')
							.attr('value', this.choices[i][0])
							.prop('checked', s[this.choices[i][0]]))
						.append(this.choices[i][1])
						.appendTo(t);
				}

			return t;
		},

		formvalue: function(sid)
		{
			var rv = [ ];
			var fields = $('#' + this.id(sid) + ' > label > input');

			for (var i = 0; i < fields.length; i++)
				if (fields[i].checked)
					rv.push(fields[i].getAttribute('value'));

			return rv;
		},

		textvalue: function(sid)
		{
			var v = this.formvalue(sid);
			var c = { };

			if (this.choices)
				for (var i = 0; i < this.choices.length; i++)
					c[this.choices[i][0]] = this.choices[i][1];

			var t = [ ];

			for (var i = 0; i < v.length; i++)
				t.push(c[v[i]] || v[i]);

			return t.join(', ');
		}
	});

	cbi_class.ComboBox = cbi_class.AbstractValue.extend({
		_change: function(ev)
		{
			var s = ev.target;
			var self = ev.data.self;

			if (s.selectedIndex == (s.options.length - 1))
			{
				ev.data.select.hide();
				ev.data.input.show().focus();
				ev.data.input.val('');
			}
			else if (self.options.optional && s.selectedIndex == 0)
			{
				ev.data.input.val('');
			}
			else
			{
				ev.data.input.val(ev.data.select.val());
			}

			ev.stopPropagation();
		},

		_blur: function(ev)
		{
			var seen = false;
			var val = this.value;
			var self = ev.data.self;

			ev.data.select.empty();

			if (self.options.optional && !self.has_empty)
				$('<option />')
					.attr('value', '')
					.text(L.tr('-- please choose --'))
					.appendTo(ev.data.select);

			if (self.choices)
				for (var i = 0; i < self.choices.length; i++)
				{
					if (self.choices[i][0] == val)
						seen = true;

					$('<option />')
						.attr('value', self.choices[i][0])
						.text(self.choices[i][1])
						.appendTo(ev.data.select);
				}

			if (!seen && val != '')
				$('<option />')
					.attr('value', val)
					.text(val)
					.appendTo(ev.data.select);

			$('<option />')
				.attr('value', ' ')
				.text(L.tr('-- custom --'))
				.appendTo(ev.data.select);

			if (self.choices) {
				ev.data.input.hide();
				ev.data.select.val(val).show().blur();
			} else {
				ev.data.input.show();
				ev.data.select.hide();
			}
		},

		_enter: function(ev)
		{
			if (ev.which != 13)
				return true;

			ev.preventDefault();
			ev.data.self._blur(ev);
			return false;
		},

		widget: function(sid)
		{
			var d = $('<div />')
				.attr('id', this.id(sid));

			var t = $('<input />')
				.addClass('form-control')
				.attr('type', 'text')
				.hide()
				.appendTo(d);

			var s = $('<select />')
				.addClass('form-control')
				.appendTo(d);

			var evdata = {
				self: this,
				input: t,
				select: s
			};

			s.change(evdata, this._change);
			t.blur(evdata, this._blur);
			t.keydown(evdata, this._enter);

			var val = this.ucivalue(sid);
			if (!this.options.optional || this.has_empty) {
				if (this.choices && (!val || val == ''))
					val = this.choices[0][0];
			}
			
			t.val(val);
			t.blur();

			this.attachEvents(sid, t);
			this.attachEvents(sid, s);

			return d;
		},

		value: function(k, v)
		{
			if (!this.choices)
				this.choices = [ ];

			if (k == '')
				this.has_empty = true;

			this.choices.push([k, v || k]);
			return this;
		},

		formvalue: function(sid)
		{
			var v = $('#' + this.id(sid)).children('input').val();
			return (v == '') ? undefined : v;
		}
	});

	cbi_class.DynamicList = cbi_class.ComboBox.extend({
		_redraw: function(focus, add, del, s)
		{
			var v = s.values || [ ];
			delete s.values;

			$(s.parent).children('div.input-group').children('input').each(function(i) {
				if (i != del)
					v.push(this.value || '');
			});

			$(s.parent).empty();

			if (add >= 0)
			{
				focus = add + 1;
				v.splice(focus, 0, '');
			}
			else if (v.length == 0)
			{
				focus = 0;
				v.push('');
			}

			for (var i = 0; i < v.length; i++)
			{
				var evdata = {
					sid: s.sid,
					self: s.self,
					parent: s.parent,
					index: i,
					remove: ((i+1) < v.length)
				};

				var btn;
				if (evdata.remove)
					btn = L.ui.button('–', 'danger').click(evdata, this._btnclick);
				else
					btn = L.ui.button('+', 'success').click(evdata, this._btnclick);

				if (this.choices)
				{
					var txt = $('<input />')
						.addClass('form-control')
						.attr('type', 'text')
						.hide();

					var sel = $('<select />')
						.addClass('form-control');

					$('<div />')
						.addClass('input-group')
						.append(txt)
						.append(sel)
						.append($('<span />')
							.addClass('input-group-btn')
							.append(btn))
						.appendTo(s.parent);

					evdata.input = this.attachEvents(s.sid, txt);
					evdata.select = this.attachEvents(s.sid, sel);

					sel.change(evdata, this._change);
					txt.blur(evdata, this._blur);
					txt.keydown(evdata, this._keydown);

					txt.val(v[i]);
					txt.blur();

					if (i == focus || -(i+1) == focus)
						sel.focus();

					sel = txt = null;
				}
				else
				{
					var f = $('<input />')
						.attr('type', 'text')
						.attr('index', i)
						.attr('placeholder', (i == 0) ? this.options.placeholder : '')
						.addClass('form-control')
						.keydown(evdata, this._keydown)
						.keypress(evdata, this._keypress)
						.val(v[i]);

					$('<div />')
						.addClass('input-group')
						.append(f)
						.append($('<span />')
							.addClass('input-group-btn')
							.append(btn))
						.appendTo(s.parent);

					if (i == focus)
					{
						f.focus();
					}
					else if (-(i+1) == focus)
					{
						f.focus();

						/* force cursor to end */
						var val = f.val();
						f.val(' ');
						f.val(val);
					}

					evdata.input = this.attachEvents(s.sid, f);

					f = null;
				}

				evdata = null;
			}

			s = null;
		},

		_keypress: function(ev)
		{
			switch (ev.which)
			{
				/* backspace, delete */
				case 8:
				case 46:
					if (ev.data.input.val() == '')
					{
						ev.preventDefault();
						return false;
					}

					return true;

				/* enter, arrow up, arrow down */
				case 13:
				case 38:
				case 40:
					ev.preventDefault();
					return false;
			}

			return true;
		},

		_keydown: function(ev)
		{
			var input = ev.data.input;

			switch (ev.which)
			{
				/* backspace, delete */
				case 8:
				case 46:
					if (input.val().length == 0)
					{
						ev.preventDefault();

						var index = ev.data.index;
						var focus = index;

						if (ev.which == 8)
							focus = -focus;

						ev.data.self._redraw(focus, -1, index, ev.data);
						return false;
					}

					break;

				/* enter */
				case 13:
					ev.data.self._redraw(NaN, ev.data.index, -1, ev.data);
					break;

				/* arrow up */
				case 38:
					var prev = input.parent().prevAll('div.input-group:first').children('input');
					if (prev.is(':visible'))
						prev.focus();
					else
						prev.next('select').focus();
					break;

				/* arrow down */
				case 40:
					var next = input.parent().nextAll('div.input-group:first').children('input');
					if (next.is(':visible'))
						next.focus();
					else
						next.next('select').focus();
					break;
			}

			return true;
		},

		_btnclick: function(ev)
		{
			if (!this.getAttribute('disabled'))
			{
				if (ev.data.remove)
				{
					var index = ev.data.index;
					ev.data.self._redraw(-index, -1, index, ev.data);
				}
				else
				{
					ev.data.self._redraw(NaN, ev.data.index, -1, ev.data);
				}
			}

			return false;
		},

		widget: function(sid)
		{
			this.options.optional = true;

			var v = this.ucivalue(sid);

			if (!$.isArray(v))
				v = (typeof(v) != 'undefined') ? v.toString().split(/\s+/) : [ ];

			var d = $('<div />')
				.attr('id', this.id(sid))
				.addClass('cbi-input-dynlist');

			this._redraw(NaN, -1, -1, {
				self:      this,
				parent:    d[0],
				values:    v,
				sid:       sid
			});

			return d;
		},

		ucivalue: function(sid)
		{
			var v = this.callSuper('ucivalue', sid);

			if (!$.isArray(v))
				v = (typeof(v) != 'undefined') ? v.toString().split(/\s+/) : [ ];

			return v;
		},

		formvalue: function(sid)
		{
			var rv = [ ];
			var fields = $('#' + this.id(sid) + ' input');

			for (var i = 0; i < fields.length; i++)
				if (typeof(fields[i].value) == 'string' && fields[i].value.length)
					rv.push(fields[i].value);

			return rv;
		}
	});

	cbi_class.DummyValue = cbi_class.AbstractValue.extend({
		widget: function(sid)
		{
			return $('<div />')
				.addClass('form-control-static')
				.attr('id', this.id(sid))
				.html(this.ucivalue(sid) || this.label('placeholder'));
		},

		formvalue: function(sid)
		{
			return this.ucivalue(sid);
		}
	});

	cbi_class.ButtonValue = cbi_class.AbstractValue.extend({
		widget: function(sid)
		{
			this.options.optional = true;

			var btn = $('<button />')
				.addClass('btn btn-default')
				.attr('id', this.id(sid))
				.attr('type', 'button')
				.text(this.label('text'));

			return this.attachEvents(sid, btn);
		}
	});

	cbi_class.NetworkList = cbi_class.AbstractValue.extend({
		load: function(sid)
		{
			return L.network.load();
		},

		_device_icon: function(dev)
		{
			return $('<img />')
				.attr('src', dev.icon())
				.attr('title', '%s (%s)'.format(dev.description(), dev.name() || '?'));
		},

		widget: function(sid)
		{
			var id = this.id(sid);
			var ul = $('<ul />')
				.attr('id', id)
				.addClass('list-unstyled');

			var itype = this.options.multiple ? 'checkbox' : 'radio';
			var value = this.ucivalue(sid);
			var check = { };

			if (!this.options.multiple) {
				this.options.optional = true;
				
				if (value)
					check[value] = true;
			} else {
				for (var i = 0; i < value.length; i++)
					check[value[i]] = true;
			}
			
			var interfaces = L.network.getInterfaces();

			for (var i = 0; i < interfaces.length; i++)
			{
				var iface = interfaces[i];

				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline')
						.append(this.attachEvents(sid, $('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', iface.name())
							.prop('checked', !!check[iface.name()])))
						.append(iface.renderBadge()))
					.appendTo(ul);
			}

			if (!this.options.multiple)
			{
				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline text-muted')
						.append(this.attachEvents(sid, $('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', '')
							.prop('checked', $.isEmptyObject(check))))
						.append(L.tr('unspecified')))
					.appendTo(ul);
			}

			return ul;
		},

		ucivalue: function(sid)
		{
			var v = this.callSuper('ucivalue', sid);

			if (!this.options.multiple)
			{
				if ($.isArray(v))
				{
					return v[0];
				}
				else if (typeof(v) == 'string')
				{
					v = v.match(/\S+/);
					return v ? v[0] : undefined;
				}

				return v;
			}
			else
			{
				if (typeof(v) == 'string')
					v = v.match(/\S+/g);

				return v || [ ];
			}
		},

		formvalue: function(sid)
		{
			var inputs = $('#' + this.id(sid) + ' input');

			if (!this.options.multiple)
			{
				for (var i = 0; i < inputs.length; i++)
					if (inputs[i].checked && inputs[i].value !== '')
						return inputs[i].value;

				return undefined;
			}

			var rv = [ ];

			for (var i = 0; i < inputs.length; i++)
				if (inputs[i].checked)
					rv.push(inputs[i].value);

			return rv.length ? rv : undefined;
		}
	});

	cbi_class.DeviceList = cbi_class.NetworkList.extend({
		handleFocus: function(ev)
		{
			var self = ev.data.self;
			var input = $(this);

			input.parent().prev().prop('checked', true);
		},

		handleBlur: function(ev)
		{
			ev.which = 10;
			ev.data.self.handleKeydown.call(this, ev);
		},

		handleKeydown: function(ev)
		{
			if (ev.which != 10 && ev.which != 13)
				return;

			var sid = ev.data.sid;
			var self = ev.data.self;
			var input = $(this);
			var ifnames = L.toArray(input.val());

			if (!ifnames.length)
				return;

			L.network.createDevice(ifnames[0]);

			self._redraw(sid, $('#' + self.id(sid)), ifnames[0]);
		},

		load: function(sid)
		{
			return L.network.load();
		},

		_redraw: function(sid, ul, sel)
		{
			var id = ul.attr('id');
			var devs = L.network.getDevices();
			var iface = L.network.getInterface(sid);
			var itype = this.options.multiple ? 'checkbox' : 'radio';
			var check = { };

			if (!sel)
			{
				for (var i = 0; i < devs.length; i++)
					if (devs[i].isInNetwork(iface))
						check[devs[i].name()] = true;
			}
			else
			{
				if (this.options.multiple)
					check = L.toObject(this.formvalue(sid));

				check[sel] = true;
			}

			ul.empty();

			for (var i = 0; i < devs.length; i++)
			{
				var dev = devs[i];

				if (dev.isBridge() && this.options.bridges === false)
					continue;

				if (!dev.isBridgeable() && this.options.multiple)
					continue;

				var badge = $('<span />')
					.addClass('badge')
					.append($('<img />').attr('src', dev.icon()))
					.append(' %s: %s'.format(dev.name(), dev.description()));

				//var ifcs = dev.getInterfaces();
				//if (ifcs.length)
				//{
				//	for (var j = 0; j < ifcs.length; j++)
				//		badge.append((j ? ', ' : ' (') + ifcs[j].name());
				//
				//	badge.append(')');
				//}

				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline')
						.append($('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', dev.name())
							.prop('checked', !!check[dev.name()]))
						.append(badge))
					.appendTo(ul);
			}


			$('<li />')
				.append($('<label />')
					.attr('for', 'custom' + id)
					.addClass(itype + ' inline')
					.append($('<input />')
						.attr('name', itype + id)
						.attr('type', itype)
						.attr('value', ''))
					.append($('<span />')
						.addClass('badge')
						.append($('<input />')
							.attr('id', 'custom' + id)
							.attr('type', 'text')
							.css('color', 'black')
							.attr('placeholder', L.tr('Custom device …'))
							.on('focus', { self: this, sid: sid }, this.handleFocus)
							.on('blur', { self: this, sid: sid }, this.handleBlur)
							.on('keydown', { self: this, sid: sid }, this.handleKeydown))))
				.appendTo(ul);

			if (!this.options.multiple)
			{
				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline text-muted')
						.append($('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', '')
							.prop('checked', $.isEmptyObject(check)))
						.append(L.tr('unspecified')))
					.appendTo(ul);
			}
		},

		widget: function(sid)
		{
			var id = this.id(sid);
			var ul = $('<ul />')
				.attr('id', id)
				.addClass('list-unstyled');

			this._redraw(sid, ul);

			return ul;
		},

		save: function(sid)
		{
			if (this.instance[sid].disabled)
				return;

			var ifnames = this.formvalue(sid);
			//if (!ifnames)
			//	return;

			var iface = L.network.getInterface(sid);
			if (!iface)
				return;

			iface.setDevices($.isArray(ifnames) ? ifnames : [ ifnames ]);
		}
	});


	cbi_class.AbstractSection = L.ui.AbstractWidget.extend({
		id: function()
		{
			var s = [ arguments[0], this.ownerMap.uci_package, this.uci_type ];

			for (var i = 1; i < arguments.length && typeof(arguments[i]) == 'string'; i++)
				s.push(arguments[i].replace(/\./g, '_'));

			return s.join('_');
		},

		option: function(widget, name, options)
		{
			if (this.tabs.length == 0)
				this.tab({ id: '__default__', selected: true });

			return this.taboption('__default__', widget, name, options);
		},

		tab: function(options)
		{
			if (options.selected)
				this.tabs.selected = this.tabs.length;

			this.tabs.push({
				id:          options.id,
				caption:     options.caption,
				description: options.description,
				fields:      [ ],
				li:          { }
			});
		},

		taboption: function(tabid, widget, name, options)
		{
			var tab;
			for (var i = 0; i < this.tabs.length; i++)
			{
				if (this.tabs[i].id == tabid)
				{
					tab = this.tabs[i];
					break;
				}
			}

			if (!tab)
				throw 'Cannot append to unknown tab ' + tabid;

			var w = widget ? new widget(name, options) : null;

			if (!(w instanceof L.cbi.AbstractValue))
				throw 'Widget must be an instance of AbstractValue';

			w.ownerSection = this;
			w.ownerMap     = this.ownerMap;

			this.fields[name] = w;
			tab.fields.push(w);

			return w;
		},

		tabtoggle: function(sid)
		{
			for (var i = 0; i < this.tabs.length; i++)
			{
				var tab = this.tabs[i];
				var elem = $('#' + this.id('nodetab', sid, tab.id));
				var empty = true;

				for (var j = 0; j < tab.fields.length; j++)
				{
					if (tab.fields[j].active(sid))
					{
						empty = false;
						break;
					}
				}

				if (empty && elem.is(':visible'))
					elem.fadeOut();
				else if (!empty)
					elem.fadeIn();
			}
		},

		validate: function(parent_sid)
		{
			var s = this.getUCISections(parent_sid);
			var n = 0;

			for (var i = 0; i < s.length; i++)
			{
				var $item = $('#' + this.id('sectionitem', s[i]['.name']));

				$item.find('.luci2-field-validate').trigger('validate');
				n += $item.find('.luci2-field.luci2-form-error').not('.luci2-field-disabled').length;
			}

			return (n == 0);
		},

		load: function(parent_sid)
		{
			var deferreds = [ ];

			var s = this.getUCISections(parent_sid);
			for (var i = 0; i < s.length; i++)
			{
				for (var f in this.fields)
				{
					if (typeof(this.fields[f].load) != 'function')
						continue;

					var rv = this.fields[f].load(s[i]['.name']);
					if (L.isDeferred(rv))
						deferreds.push(rv);
				}

				for (var j = 0; j < this.subsections.length; j++)
				{
					var rv = this.subsections[j].load(s[i]['.name']);
					deferreds.push.apply(deferreds, rv);
				}
			}

			return deferreds;
		},

		save: function(parent_sid)
		{
			var deferreds = [ ];
			var s = this.getUCISections(parent_sid);

			for (var i = 0; i < s.length; i++)
			{
				if (!this.options.readonly)
				{
					for (var f in this.fields)
					{
						if (typeof(this.fields[f].save) != 'function')
							continue;

						var rv = this.fields[f].save(s[i]['.name']);
						if (L.isDeferred(rv))
							deferreds.push(rv);
					}
				}

				for (var j = 0; j < this.subsections.length; j++)
				{
					var rv = this.subsections[j].save(s[i]['.name']);
					deferreds.push.apply(deferreds, rv);
				}
			}

			return deferreds;
		},

		teaser: function(sid)
		{
			var tf = this.teaser_fields;

			if (!tf)
			{
				tf = this.teaser_fields = [ ];

				if ($.isArray(this.options.teasers))
				{
					for (var i = 0; i < this.options.teasers.length; i++)
					{
						var f = this.options.teasers[i];
						if (f instanceof L.cbi.AbstractValue)
							tf.push(f);
						else if (typeof(f) == 'string' && this.fields[f] instanceof L.cbi.AbstractValue)
							tf.push(this.fields[f]);
					}
				}
				else
				{
					for (var i = 0; tf.length <= 5 && i < this.tabs.length; i++)
						for (var j = 0; tf.length <= 5 && j < this.tabs[i].fields.length; j++)
							tf.push(this.tabs[i].fields[j]);
				}
			}

			var t = '';

			for (var i = 0; i < tf.length; i++)
			{
				if (tf[i].instance[sid] && tf[i].instance[sid].disabled)
					continue;

				var n = tf[i].options.caption || tf[i].name;
				var v = tf[i].textvalue(sid);

				if (typeof(v) == 'undefined')
					continue;

				t = t + '%s%s: <strong>%s</strong>'.format(t ? ' | ' : '', n, v);
			}

			return t;
		},

		findAdditionalUCIPackages: function()
		{
			var packages = [ ];

			for (var i = 0; i < this.tabs.length; i++)
				for (var j = 0; j < this.tabs[i].fields.length; j++)
					if (this.tabs[i].fields[j].options.uci_package)
						packages.push(this.tabs[i].fields[j].options.uci_package);

			return packages;
		},

		findParentSectionIDs: function($elem)
		{
			var rv = [ ];
			var $parents = $elem.parents('.luci2-section-item');

			for (var i = 0; i < $parents.length; i++)
				rv.push($parents[i].getAttribute('data-luci2-sid'));

			return rv;
		}
	});

	cbi_class.TypedSection = cbi_class.AbstractSection.extend({
		init: function(uci_type, options)
		{
			this.uci_type = uci_type;
			this.options  = options;
			this.tabs     = [ ];
			this.fields   = { };
			this.subsections  = [ ];
			this.active_panel = { };
			this.active_tab   = { };

			this.instance = { };
		},

		filter: function(section, parent_sid)
		{
			return true;
		},

		sort: function(section1, section2)
		{
			return 0;
		},

		subsection: function(widget, uci_type, options)
		{
			var w = widget ? new widget(uci_type, options) : null;

			if (!(w instanceof L.cbi.AbstractSection))
				throw 'Widget must be an instance of AbstractSection';

			w.ownerSection = this;
			w.ownerMap     = this.ownerMap;
			w.index        = this.subsections.length;

			this.subsections.push(w);
			return w;
		},

		getUCISections: function(parent_sid)
		{
			var s1 = L.uci.sections(this.ownerMap.uci_package);
			var s2 = [ ];

			for (var i = 0; i < s1.length; i++)
				if (s1[i]['.type'] == this.uci_type)
					if (this.filter(s1[i], parent_sid))
						s2.push(s1[i]);

			s2.sort(this.sort);

			return s2;
		},

		add: function(name, parent_sid)
		{
			return this.ownerMap.add(this.ownerMap.uci_package, this.uci_type, name);
		},

		remove: function(sid, parent_sid)
		{
			return this.ownerMap.remove(this.ownerMap.uci_package, sid);
		},

		handleAdd: function(ev)
		{
			var addb = $(this);
			var name = undefined;
			var self = ev.data.self;
			var sid  = self.findParentSectionIDs(addb)[0];

			if (addb.prev().prop('nodeName') == 'INPUT')
				name = addb.prev().val();

			if (addb.prop('disabled') || name === '')
				return;

			L.ui.saveScrollTop();

			self.setPanelIndex(sid, -1);
			self.ownerMap.save();

			ev.data.sid  = self.add(name, sid);
			ev.data.type = self.uci_type;
			ev.data.name = name;

			self.trigger('add', ev);

			self.ownerMap.redraw();

			L.ui.restoreScrollTop();
		},

		handleRemove: function(ev)
		{
			var self = ev.data.self;
			var sids = self.findParentSectionIDs($(this));

			if (sids.length)
			{
				L.ui.saveScrollTop();

				ev.sid = sids[0];
				ev.parent_sid = sids[1];

				self.trigger('remove', ev);

				self.ownerMap.save();
				self.remove(ev.sid, ev.parent_sid);
				self.ownerMap.redraw();

				L.ui.restoreScrollTop();
			}

			ev.stopPropagation();
		},

		handleSID: function(ev)
		{
			var self = ev.data.self;
			var text = $(this);
			var addb = text.next();
			var errt = addb.next();
			var name = text.val();

			if (!/^[a-zA-Z0-9_]*$/.test(name))
			{
				errt.text(L.tr('Invalid section name')).show();
				text.addClass('error');
				addb.prop('disabled', true);
				return false;
			}

			if (L.uci.get(self.ownerMap.uci_package, name))
			{
				errt.text(L.tr('Name already used')).show();
				text.addClass('error');
				addb.prop('disabled', true);
				return false;
			}

			errt.text('').hide();
			text.removeClass('error');
			addb.prop('disabled', false);
			return true;
		},

		handleTab: function(ev)
		{
			var self = ev.data.self;
			var $tab = $(this);
			var sid  = self.findParentSectionIDs($tab)[0];

			self.active_tab[sid] = $tab.parent().index();
		},

		handleTabValidate: function(ev)
		{
			var $pane = $(ev.delegateTarget);
			var $badge = $pane.parent()
				.children('.nav-tabs')
				.children('li')
				.eq($pane.index() - 1) // item #1 is the <ul>
				.find('.badge:first');

			var err_count = $pane.find('.luci2-field.luci2-form-error').not('.luci2-field-disabled').length;
			if (err_count > 0)
				$badge
					.text(err_count)
					.attr('title', L.trp('1 Error', '%d Errors', err_count).format(err_count))
					.show();
			else
				$badge.hide();
		},

		handlePanelValidate: function(ev)
		{
			var $elem = $(this);
			var $badge = $elem
				.prevAll('.luci2-section-header:first')
				.children('.luci2-section-teaser')
				.find('.badge:first');

			var err_count = $elem.find('.luci2-field.luci2-form-error').not('.luci2-field-disabled').length;
			if (err_count > 0)
				$badge
					.text(err_count)
					.attr('title', L.trp('1 Error', '%d Errors', err_count).format(err_count))
					.show();
			else
				$badge.hide();
		},

		handlePanelCollapse: function(ev)
		{
			var self = ev.data.self;

			var $items = $(ev.delegateTarget).children('.luci2-section-item');

			var $this_panel  = $(ev.target);
			var $this_teaser = $this_panel.prevAll('.luci2-section-header:first').children('.luci2-section-teaser');

			var $prev_panel  = $items.children('.luci2-section-panel.in');
			var $prev_teaser = $prev_panel.prevAll('.luci2-section-header:first').children('.luci2-section-teaser');

			var sids = self.findParentSectionIDs($prev_panel);

			self.setPanelIndex(sids[1], $this_panel.parent().index());

			$prev_panel
				.removeClass('in')
				.addClass('collapse');

			$prev_teaser
				.show()
				.children('span:last')
				.empty()
				.append(self.teaser(sids[0]));

			$this_teaser
				.hide();

			ev.stopPropagation();
		},

		handleSort: function(ev)
		{
			var self = ev.data.self;

			var $item = $(this).parents('.luci2-section-item:first');
			var $next = ev.data.up ? $item.prev() : $item.next();

			if ($item.length && $next.length)
			{
				var cur_sid = $item.attr('data-luci2-sid');
				var new_sid = $next.attr('data-luci2-sid');

				L.uci.swap(self.ownerMap.uci_package, cur_sid, new_sid);

				self.ownerMap.save();
				self.ownerMap.redraw();
			}

			ev.stopPropagation();
		},

		getPanelIndex: function(parent_sid)
		{
			return (this.active_panel[parent_sid || '__top__'] || 0);
		},

		setPanelIndex: function(parent_sid, new_index)
		{
			if (typeof(new_index) == 'number')
				this.active_panel[parent_sid || '__top__'] = new_index;
		},

		renderAdd: function()
		{
			if (!this.options.addremove)
				return null;

			var text = L.tr('Add section');
			var ttip = L.tr('Create new section...');

			if ($.isArray(this.options.add_caption))
				text = this.options.add_caption[0], ttip = this.options.add_caption[1];
			else if (typeof(this.options.add_caption) == 'string')
				text = this.options.add_caption, ttip = '';

			var add = $('<div />');

			if (this.options.anonymous === false)
			{
				$('<input />')
					.addClass('cbi-input-text')
					.attr('type', 'text')
					.attr('placeholder', ttip)
					.blur({ self: this }, this.handleSID)
					.keyup({ self: this }, this.handleSID)
					.appendTo(add);

				$('<img />')
					.attr('src', L.globals.resource + '/icons/cbi/add.gif')
					.attr('title', text)
					.addClass('cbi-button')
					.click({ self: this }, this.handleAdd)
					.appendTo(add);

				$('<div />')
					.addClass('cbi-value-error')
					.hide()
					.appendTo(add);
			}
			else
			{
				L.ui.button(text, 'success', ttip)
					.click({ self: this }, this.handleAdd)
					.appendTo(add);
			}

			return add;
		},

		renderRemove: function(index)
		{
			if (!this.options.addremove)
				return null;

			var text = L.tr('Remove');
			var ttip = L.tr('Remove this section');

			if ($.isArray(this.options.remove_caption))
				text = this.options.remove_caption[0], ttip = this.options.remove_caption[1];
			else if (typeof(this.options.remove_caption) == 'string')
				text = this.options.remove_caption, ttip = '';

			return L.ui.button(text, 'danger', ttip)
				.click({ self: this, index: index }, this.handleRemove);
		},

		renderSort: function(index)
		{
			if (!this.options.sortable)
				return null;

			var b1 = L.ui.button('↑', 'info', L.tr('Move up'))
				.click({ self: this, index: index, up: true }, this.handleSort);

			var b2 = L.ui.button('↓', 'info', L.tr('Move down'))
				.click({ self: this, index: index, up: false }, this.handleSort);

			return b1.add(b2);
		},

		renderCaption: function()
		{
			return $('<h3 />')
				.addClass('panel-title')
				.append(this.label('caption') || this.uci_type);
		},

		renderDescription: function()
		{
			var text = this.label('description');

			if (text)
				return $('<div />')
					.addClass('luci2-section-description')
					.text(text);

			return null;
		},

		renderTeaser: function(sid, index)
		{
			if (this.options.collabsible || this.ownerMap.options.collabsible)
			{
				return $('<div />')
					.attr('id', this.id('teaser', sid))
					.addClass('luci2-section-teaser well well-sm')
					.append($('<span />')
						.addClass('badge'))
					.append($('<span />'));
			}

			return null;
		},

		renderHead: function(condensed)
		{
			if (condensed)
				return null;

			return $('<div />')
				.addClass('panel-heading')
				.append(this.renderCaption())
				.append(this.renderDescription());
		},

		renderTabDescription: function(sid, index, tab_index)
		{
			var tab = this.tabs[tab_index];

			if (typeof(tab.description) == 'string')
			{
				return $('<div />')
					.addClass('cbi-tab-descr')
					.text(tab.description);
			}

			return null;
		},

		renderTabHead: function(sid, index, tab_index)
		{
			var tab = this.tabs[tab_index];
			var cur = this.active_tab[sid] || 0;

			var tabh = $('<li />')
				.append($('<a />')
					.attr('id', this.id('nodetab', sid, tab.id))
					.attr('href', '#' + this.id('node', sid, tab.id))
					.attr('data-toggle', 'tab')
					.text((tab.caption ? tab.caption.format(tab.id) : tab.id) + ' ')
					.append($('<span />')
						.addClass('badge'))
					.on('shown.bs.tab', { self: this, sid: sid }, this.handleTab));

			if (cur == tab_index)
				tabh.addClass('active');

			if (!tab.fields.length)
				tabh.hide();

			return tabh;
		},

		renderTabBody: function(sid, index, tab_index)
		{
			var tab = this.tabs[tab_index];
			var cur = this.active_tab[sid] || 0;

			var tabb = $('<div />')
				.addClass('tab-pane')
				.attr('id', this.id('node', sid, tab.id))
				.append(this.renderTabDescription(sid, index, tab_index))
				.on('validate', this.handleTabValidate);

			if (cur == tab_index)
				tabb.addClass('active');

			for (var i = 0; i < tab.fields.length; i++)
				tabb.append(tab.fields[i].render(sid));

			return tabb;
		},

		renderPanelHead: function(sid, index, parent_sid)
		{
			var head = $('<div />')
				.addClass('luci2-section-header')
				.append(this.renderTeaser(sid, index))
				.append($('<div />')
					.addClass('btn-group')
					.append(this.renderSort(index))
					.append(this.renderRemove(index)));

			if (this.options.collabsible)
			{
				head.attr('data-toggle', 'collapse')
					.attr('data-parent', this.id('sectiongroup', parent_sid))
					.attr('data-target', '#' + this.id('panel', sid));
			}

			return head;
		},

		renderPanelBody: function(sid, index, parent_sid)
		{
			var body = $('<div />')
				.attr('id', this.id('panel', sid))
				.addClass('luci2-section-panel')
				.on('validate', this.handlePanelValidate);

			if (this.options.collabsible || this.ownerMap.options.collabsible)
			{
				body.addClass('panel-collapse collapse');

				if (index == this.getPanelIndex(parent_sid))
					body.addClass('in');
			}

			var tab_heads = $('<ul />')
				.addClass('nav nav-tabs');

			var tab_bodies = $('<div />')
				.addClass('form-horizontal tab-content')
				.append(tab_heads);

			for (var j = 0; j < this.tabs.length; j++)
			{
				tab_heads.append(this.renderTabHead(sid, index, j));
				tab_bodies.append(this.renderTabBody(sid, index, j));
			}

			body.append(tab_bodies);

			if (this.tabs.length <= 1)
				tab_heads.hide();

			for (var i = 0; i < this.subsections.length; i++)
				body.append(this.subsections[i].render(false, sid));

			return body;
		},

		renderBody: function(condensed, parent_sid)
		{
			var s = this.getUCISections(parent_sid);
			var n = this.getPanelIndex(parent_sid);

			if (n < 0)
				this.setPanelIndex(parent_sid, n + s.length);
			else if (n >= s.length)
				this.setPanelIndex(parent_sid, s.length - 1);

			var body = $('<ul />')
				.addClass('luci2-section-group list-group');

			if (this.options.collabsible)
			{
				body.attr('id', this.id('sectiongroup', parent_sid))
					.on('show.bs.collapse', { self: this }, this.handlePanelCollapse);
			}

			if (s.length == 0)
			{
				body.append($('<li />')
					.addClass('list-group-item text-muted')
					.text(this.label('placeholder') || L.tr('There are no entries defined yet.')))
			}

			for (var i = 0; i < s.length; i++)
			{
				var sid = s[i]['.name'];
				var inst = this.instance[sid] = { tabs: [ ] };

				body.append($('<li />')
					.addClass('luci2-section-item list-group-item')
					.attr('id', this.id('sectionitem', sid))
					.attr('data-luci2-sid', sid)
					.append(this.renderPanelHead(sid, i, parent_sid))
					.append(this.renderPanelBody(sid, i, parent_sid)));
			}

			return body;
		},

		render: function(condensed, parent_sid)
		{
			this.instance = { };

			var panel = $('<div />')
				.addClass('panel panel-default')
				.append(this.renderHead(condensed))
				.append(this.renderBody(condensed, parent_sid));

			if (this.options.addremove)
				panel.append($('<div />')
					.addClass('panel-footer')
					.append(this.renderAdd()));

			return panel;
		},

		finish: function(parent_sid)
		{
			var s = this.getUCISections(parent_sid);

			for (var i = 0; i < s.length; i++)
			{
				var sid = s[i]['.name'];

				if (i != this.getPanelIndex(parent_sid))
					$('#' + this.id('teaser', sid)).children('span:last')
						.append(this.teaser(sid));
				else
					$('#' + this.id('teaser', sid))
						.hide();

				for (var j = 0; j < this.subsections.length; j++)
					this.subsections[j].finish(sid);
			}
		}
	});

	cbi_class.TableSection = cbi_class.TypedSection.extend({
		renderTableHead: function()
		{
			var thead = $('<thead />')
				.append($('<tr />')
					.addClass('cbi-section-table-titles'));

			for (var j = 0; j < this.tabs[0].fields.length; j++)
				thead.children().append($('<th />')
					.addClass('cbi-section-table-cell')
					.css('width', this.tabs[0].fields[j].options.width || '')
					.append(this.tabs[0].fields[j].label('caption')));

			if (this.options.addremove !== false || this.options.sortable)
				thead.children().append($('<th />')
					.addClass('cbi-section-table-cell')
					.text(' '));

			return thead;
		},

		renderTableRow: function(sid, index)
		{
			var row = $('<tr />')
				.addClass('luci2-section-item')
				.attr('id', this.id('sectionitem', sid))
				.attr('data-luci2-sid', sid);

			for (var j = 0; j < this.tabs[0].fields.length; j++)
			{
				row.append($('<td />')
					.css('width', this.tabs[0].fields[j].options.width || '')
					.append(this.tabs[0].fields[j].render(sid, true)));
			}

			if (this.options.addremove !== false || this.options.sortable)
			{
				row.append($('<td />')
					.css('width', '1%')
					.addClass('text-right')
					.append($('<div />')
						.addClass('btn-group')
						.append(this.renderSort(index))
						.append(this.renderRemove(index))));
			}

			return row;
		},

		renderTableBody: function(parent_sid)
		{
			var s = this.getUCISections(parent_sid);

			var tbody = $('<tbody />');

			if (s.length == 0)
			{
				var cols = this.tabs[0].fields.length;

				if (this.options.addremove !== false || this.options.sortable)
					cols++;

				tbody.append($('<tr />')
					.append($('<td />')
						.addClass('text-muted')
						.attr('colspan', cols)
						.text(this.label('placeholder') || L.tr('There are no entries defined yet.'))));
			}

			for (var i = 0; i < s.length; i++)
			{
				var sid = s[i]['.name'];
				var inst = this.instance[sid] = { tabs: [ ] };

				tbody.append(this.renderTableRow(sid, i));
			}

			return tbody;
		},

		renderBody: function(condensed, parent_sid)
		{
			return $('<table />')
				.addClass('table table-condensed table-hover')
				.append(this.renderTableHead())
				.append(this.renderTableBody(parent_sid));
		}
	});

	cbi_class.GridSection = cbi_class.TypedSection.extend({
		renderGridHead: function()
		{
			var ghead = $('<div />').addClass('row hidden-xs');

			for (var j = 0; j < this.tabs[0].fields.length; j++)
			{
				var wdh = this.tabs[0].fields[j].options.width;
				    wdh = isNaN(wdh) ? this.options.dyn_width : wdh;

				ghead.append($('<div />')
					.addClass('col-sm-%d cell caption clearfix'.format(wdh))
					.append(this.tabs[0].fields[j].label('caption')));
			}

			if (this.options.addremove !== false || this.options.sortable)
			{
				var wdh = this.options.dyn_width + this.options.pad_width;
				ghead.append($('<div />')
					.addClass('col-xs-8 col-sm-%d cell'.format(wdh))
					.text(' '));
			}

			return ghead;
		},

		renderGridRow: function(sid, index)
		{
			var row = $('<div />')
				.addClass('row luci2-section-item')
				.attr('id', this.id('sectionitem', sid))
				.attr('data-luci2-sid', sid);

			for (var j = 0; j < this.tabs[0].fields.length; j++)
			{
				var wdh = this.tabs[0].fields[j].options.width;
				    wdh = isNaN(wdh) ? this.options.dyn_width : wdh;

				row.append($('<div />')
					.addClass('col-xs-4 hidden-sm hidden-md hidden-lg cell caption')
					.append(this.tabs[0].fields[j].label('caption')));

				row.append($('<div />')
					.addClass('col-xs-8 col-sm-%d cell content clearfix'.format(wdh))
					.append(this.tabs[0].fields[j].render(sid, true)));
			}

			if (this.options.addremove !== false || this.options.sortable)
			{
				var wdh = this.options.dyn_width + this.options.pad_width;
				row.append($('<div />')
					.addClass('col-xs-12 col-sm-%d cell'.format(wdh))
					.append($('<div />')
						.addClass('btn-group pull-right')
						.append(this.renderSort(index))
						.append(this.renderRemove(index))));
			}

			return row;
		},

		renderGridBody: function(parent_sid)
		{
			var s = this.getUCISections(parent_sid);
			var rows = [ ];

			if (s.length == 0)
			{
				var cols = this.tabs[0].fields.length;

				if (this.options.addremove !== false || this.options.sortable)
					cols++;

				rows.push($('<div />')
					.addClass('row')
					.append($('<div />')
						.addClass('col-sm-12 cell placeholder text-muted')
						.text(this.label('placeholder') || L.tr('There are no entries defined yet.'))));
			}

			for (var i = 0; i < s.length; i++)
			{
				var sid = s[i]['.name'];
				var inst = this.instance[sid] = { tabs: [ ] };

				rows.push(this.renderGridRow(sid, i));
			}

			return rows;
		},

		renderBody: function(condensed, parent_sid)
		{
			var n_dynamic = 0;
			var dyn_width = 0;
			var fix_width = 0;
			var pad_width = 0;

			var cols = this.tabs[0].fields.length;

			if (this.options.addremove !== false || this.options.sortable)
				cols++;

			for (var i = 0; i < cols; i++)
			{
				var col = this.tabs[0].fields[i];
				if (col && !isNaN(col.options.width))
					fix_width += col.options.width;
				else
					n_dynamic++;
			}

			if (n_dynamic > 0)
			{
				this.options.dyn_width = Math.floor((12 - fix_width) / n_dynamic);
				this.options.pad_width = (12 - fix_width) % n_dynamic;
			}
			else
			{
				this.options.pad_width = 12 - fix_width;
			}

			return $('<div />')
				.addClass('luci2-grid luci2-grid-condensed')
				.append(this.renderGridHead())
				.append(this.renderGridBody(parent_sid));
		}
	});

	cbi_class.NamedSection = cbi_class.TypedSection.extend({
		getUCISections: function(cb)
		{
			var sa = [ ];
			var sl = L.uci.sections(this.ownerMap.uci_package);

			for (var i = 0; i < sl.length; i++)
				if (sl[i]['.name'] == this.uci_type)
				{
					sa.push(sl[i]);
					break;
				}

			if (typeof(cb) == 'function' && sa.length > 0)
				cb.call(this, sa[0]);

			return sa;
		}
	});

	cbi_class.SingleSection = cbi_class.NamedSection.extend({
		render: function()
		{
			this.instance = { };
			this.instance[this.uci_type] = { tabs: [ ] };

			return $('<div />')
				.addClass('luci2-section-item')
				.attr('id', this.id('sectionitem', this.uci_type))
				.attr('data-luci2-sid', this.uci_type)
				.append(this.renderPanelBody(this.uci_type, 0));
		}
	});

	cbi_class.DummySection = cbi_class.TypedSection.extend({
		getUCISections: function(cb)
		{
			if (typeof(cb) == 'function')
				cb.apply(this, [ { '.name': this.uci_type } ]);

			return [ { '.name': this.uci_type } ];
		}
	});

	cbi_class.Map = L.ui.AbstractWidget.extend({
		init: function(uci_package, options)
		{
			var self = this;

			this.uci_package = uci_package;
			this.sections = [ ];
			this.options = L.defaults(options, {
				save:    function() { },
				prepare: function() { }
			});
		},

		loadCallback: function()
		{
			var deferreds = [ L.deferrable(this.options.prepare.call(this)) ];

			for (var i = 0; i < this.sections.length; i++)
			{
				var rv = this.sections[i].load();
				deferreds.push.apply(deferreds, rv);
			}

			return $.when.apply($, deferreds);
		},

		load: function()
		{
			var self = this;
			var packages = [ this.uci_package ];

			for (var i = 0; i < this.sections.length; i++)
				packages.push.apply(packages, this.sections[i].findAdditionalUCIPackages());

			for (var i = 0; i < packages.length; i++)
				if (!L.uci.writable(packages[i]))
				{
					this.options.readonly = true;
					break;
				}

			return L.uci.load(packages).then(function() {
				return self.loadCallback();
			});
		},

		handleTab: function(ev)
		{
			ev.data.self.active_tab = $(ev.target).parent().index();
		},

		handleApply: function(ev)
		{
			var self = ev.data.self;

			self.send().then(function() {
				self.trigger('save', ev);
				
				L.uci.changes().then(function(changes) {
					if (!$.isEmptyObject(changes)) {
						L.uci.apply().then(function(rv) {
							self.trigger('apply', ev);
							L.ui.updateChanges();
						});
					}
				});
			});
		},

		handleSave: function(ev)
		{
			var self = ev.data.self;

			self.send().then(function() {
				self.trigger('save', ev);
			});
		},

		handleReset: function(ev)
		{
			var self = ev.data.self;

			self.trigger('reset', ev);
			self.reset();
		},

		renderTabHead: function(tab_index)
		{
			var section = this.sections[tab_index];
			var cur = this.active_tab || 0;

			var tabh = $('<li />')
				.append($('<a />')
					.attr('id', section.id('sectiontab'))
					.attr('href', '#' + section.id('section'))
					.attr('data-toggle', 'tab')
					.text(section.label('caption') + ' ')
					.append($('<span />')
						.addClass('badge'))
					.on('shown.bs.tab', { self: this }, this.handleTab));

			if (cur == tab_index)
				tabh.addClass('active');

			return tabh;
		},

		renderTabBody: function(tab_index)
		{
			var section = this.sections[tab_index];
			var desc = section.label('description');
			var cur = this.active_tab || 0;

			var tabb = $('<div />')
				.addClass('tab-pane')
				.attr('id', section.id('section'));

			if (cur == tab_index)
				tabb.addClass('active');

			if (desc)
				tabb.append($('<p />')
					.text(desc));

			var s = section.render(this.options.tabbed);

			if (this.options.readonly || section.options.readonly)
				s.find('input, select, button, img.cbi-button').attr('disabled', true);

			tabb.append(s);

			return tabb;
		},

		renderBody: function()
		{
			var tabs = $('<ul />')
				.addClass('nav nav-tabs');

			var body = $('<div />')
				.append(tabs);

			for (var i = 0; i < this.sections.length; i++)
			{
				tabs.append(this.renderTabHead(i));
				body.append(this.renderTabBody(i));
			}

			if (this.options.tabbed)
				body.addClass('tab-content');
			else
				tabs.hide();

			return body;
		},

		renderFooter: function()
		{
			var evdata = {
				self: this
			};

			return $('<div />')
				.addClass('panel panel-default panel-body text-right')
				.append($('<div />')
					.addClass('btn-group')
					.append(L.ui.button(L.tr('Save & Apply'), 'primary')
						.click(evdata, this.handleApply))
					.append(L.ui.button(L.tr('Save'), 'default')
						.click(evdata, this.handleSave))
					.append(L.ui.button(L.tr('Reset'), 'default')
						.click(evdata, this.handleReset)));
		},

		render: function()
		{
			var map = $('<form />');

			if (typeof(this.options.caption) == 'string')
				map.append($('<h2 />')
					.text(this.options.caption));

			if (typeof(this.options.description) == 'string')
				map.append($('<p />')
					.text(this.options.description));

			map.append(this.renderBody());

			if (this.options.pageaction !== false)
				map.append(this.renderFooter());

			return map;
		},

		finish: function()
		{
			for (var i = 0; i < this.sections.length; i++)
				this.sections[i].finish();

			this.validate();
		},

		redraw: function()
		{
			this.target.hide().empty().append(this.render());
			this.finish();
			this.target.show();
		},

		section: function(widget, uci_type, options)
		{
			var w = widget ? new widget(uci_type, options) : null;

			if (!(w instanceof L.cbi.AbstractSection))
				throw 'Widget must be an instance of AbstractSection';

			w.ownerMap = this;
			w.index = this.sections.length;

			this.sections.push(w);
			return w;
		},

		add: function(conf, type, name)
		{
			return L.uci.add(conf, type, name);
		},

		remove: function(conf, sid)
		{
			return L.uci.remove(conf, sid);
		},

		get: function(conf, sid, opt)
		{
			return L.uci.get(conf, sid, opt);
		},

		set: function(conf, sid, opt, val)
		{
			return L.uci.set(conf, sid, opt, val);
		},

		validate: function()
		{
			var rv = true;

			for (var i = 0; i < this.sections.length; i++)
			{
				if (!this.sections[i].validate())
					rv = false;
			}

			return rv;
		},

		save: function()
		{
			var self = this;

			if (self.options.readonly)
				return L.deferrable();

			var deferreds = [ ];

			for (var i = 0; i < self.sections.length; i++)
			{
				var rv = self.sections[i].save();
				deferreds.push.apply(deferreds, rv);
			}

			return $.when.apply($, deferreds).then(function() {
				return L.deferrable(self.options.save.call(self));
			});
		},

		send: function()
		{
			if (!this.validate())
				return $.Deferred().reject().promise();

			var self = this;

			L.ui.saveScrollTop();
			L.ui.loading(true);

			return this.save().then(function() {
				return L.uci.save();
			}).then(function() {
				return L.ui.updateChanges();
			}).then(function() {
				return self.load();
			}).then(function() {
				self.redraw();
				self = null;

				L.ui.loading(false);
				L.ui.restoreScrollTop();
			});
		},

		revert: function()
		{
			var packages = [ this.uci_package ];

			for (var i = 0; i < this.sections.length; i++)
				packages.push.apply(packages, this.sections[i].findAdditionalUCIPackages());

			L.uci.unload(packages);
		},

		reset: function()
		{
			var self = this;

			self.revert();

			return self.insertInto(self.target);
		},

		insertInto: function(id)
		{
			var self = this;
			    self.target = $(id);

			L.ui.loading(true);
			self.target.hide();

			return self.load().then(function() {
				self.target.empty().append(self.render());
				self.finish();
				self.target.show();
				self = null;
				L.ui.loading(false);
			});
		}
	});

	cbi_class.Modal = cbi_class.Map.extend({
		handleApply: function(ev)
		{
			var self = ev.data.self;

			self.send().then(function() {
				self.trigger('save', ev);
				
				L.uci.changes().then(function(changes) {
					if ($.isEmptyObject(changes)) {
						self.close();
					} else {
						L.uci.apply().then(function(rv) {
							self.trigger('apply', ev);
							L.ui.updateChanges();
							self.close();
						});
					}
				});
			});
		},

		handleSave: function(ev)
		{
			var self = ev.data.self;

			self.send().then(function() {
				self.trigger('save', ev);
				self.close();
			});
		},

		handleReset: function(ev)
		{
			var self = ev.data.self;

			self.trigger('close', ev);
			self.revert();
			self.close();
		},

		renderFooter: function()
		{
			var evdata = {
				self: this
			};

			return $('<div />')
				.addClass('btn-group')
				.append(L.ui.button(L.tr('Save & Apply'), 'primary')
					.click(evdata, this.handleApply))
				.append(L.ui.button(L.tr('Save'), 'default')
					.click(evdata, this.handleSave))
				.append(L.ui.button(L.tr('Cancel'), 'default')
					.click(evdata, this.handleReset));
		},

		render: function()
		{
			var modal = L.ui.dialog(this.label('caption'), null, { wide: true });
			var map = $('<form />');

			var desc = this.label('description');
			if (desc)
				map.append($('<p />').text(desc));

			map.append(this.renderBody());

			modal.find('.modal-body').append(map);
			modal.find('.modal-footer').append(this.renderFooter());

			return modal;
		},

		redraw: function()
		{
			this.render();
			this.finish();
		},

		show: function()
		{
			var self = this;

			L.ui.loading(true);

			return self.load().then(function() {
				self.render();
				self.finish();

				L.ui.loading(false);
			});
		},

		close: function()
		{
			L.ui.dialog(false);
		}
	});

	cbi_class.FirewallZoneList = cbi_class.NetworkList.extend({
		load: function(sid)
		{
			return $.when(this.callSuper('load'), L.firewall.load());
		},

		handleFocus: function(ev)
		{
			var self = ev.data.self;
			var input = $(this);

			input.parent().prev().prop('checked', true);
		},

		handleBlur: function(ev)
		{
			ev.which = 10;
			ev.data.self.handleKeydown.call(this, ev);
		},

		handleKeydown: function(ev)
		{
			if (ev.which != 10 && ev.which != 13)
				return;

			var sid = ev.data.sid;
			var self = ev.data.self;
			var input = $(this);
			var zname = L.toArray(input.val());

			if (!zname.length)
				return;

			$(this).parent().parent().find('input:first').val(zname[0]);
		},

		widget: function(sid)
		{
			var id = this.id(sid);
			
			var ul = $('<ul />')
				.attr('id', id)
				.addClass('list-unstyled');

			var itype = this.options.multiple ? 'checkbox' : 'radio';
			var value = this.ucivalue(sid);
			var check = { };
			
			if (!this.options.multiple) {
				this.options.optional = true;
				
				if (value)
					check[value] = true;
			} else {
				for (var i = 0; i < value.length; i++)
					check[value[i]] = true;
			}
			
			var zones = L.firewall.zoneObjects;
			for (var i = 0; i < zones.length; i++) {
				var z = zones[i];
				if (this.options.exclude == z.name())
					continue;
				
				var badge = $('<span />')
					.addClass('badge')
					.append(z.get('name'));
				
				$('<li />')
					.append($('<label />')
						.addClass(itype + ' inline')
						.append($('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', z.name())
							.prop('checked', !!check[z.name()]))
						.append(badge))
					.appendTo(ul);
			}
			
			if (!this.options.nocreate) {
				$('<li />')
					.append($('<label />')
						.attr('for', 'custom' + id)
						.addClass(itype + ' inline')
						.append($('<input />')
							.attr('name', itype + id)
							.attr('type', itype)
							.attr('value', ''))
						.append($('<span />')
							.addClass('badge')
							.append($('<input />')
								.attr('id', 'custom' + id)
								.attr('type', 'text')
								.css('color', 'black')
								.attr('placeholder', L.tr('Custom zone'))
								.on('focus', {self: this, sid: sid}, this.handleFocus)
								.on('blur', {self: this, sid: sid}, this.handleBlur)
								.on('keydown', {self: this, sid: sid}, this.handleKeydown))))
					.appendTo(ul);
			}

			if (!this.options.multiple) {
				$('<li />')
					.append($('<label />')
						.addClass('radio inline text-muted')
						.append($('<input />')
							.attr('name', 'radio' + id)
							.attr('type', 'radio')
							.attr('value', '')
							.prop('checked', $.isEmptyObject(check)))
						.append(L.tr('unspecified')))
					.appendTo(ul);
			}
			
			return ul;
		},

		/* The function needs to be redefined according to the specific application */
		ucivalue: function(sid)
		{
			if (!this.options.multiple) {
				return;
			} else {
				return [];
			}
		},

		/* The function needs to be redefined according to the specific application */
		save: function(sid)
		{
		}
	});

	/*
	** type:'th', 'calendar', 'time'.
	**		th : show date and time
	**		calendar : only show date
	**		time : only show time
	** format/linkFormat:The date format, combination of p, P, h, hh, i, ii, s, ss, d, dd, A, AA, m, mm, M, MM, yy, yyyy, YY, YYYY.
	**		p : meridian in lower case ('am' or 'pm') - according to locale file
	**		P : meridian in upper case ('AM' or 'PM') - according to locale file
	**		s : seconds without leading zeros
	**		ss : seconds, 2 digits with leading zeros
	**		i : minutes without leading zeros
	**		ii : minutes, 2 digits with leading zeros
	**		h : hour without leading zeros - 24-hour format
	**		hh : hour, 2 digits with leading zeros - 24-hour format
	**		H : hour without leading zeros - 12-hour format
	**		HH : hour, 2 digits with leading zeros - 12-hour format
	**		d : day of the month without leading zeros
	**		dd : day of the month, 2 digits with leading zeros
	**		A/AA: with an unit on d or dd
	**		m : numeric representation of month without leading zeros
	**		mm : numeric representation of the month, 2 digits with leading zeros
	**		M : short textual representation of a month, three letters
	**		MM : full textual representation of a month, such as January or March
	**		yy : two digit representation of a year
	**		yyyy : full numeric representation of a year, 4 digits
	**		YY/YYYY: with an unit on yy or yyyy
	**		t : unix epoch timestamp(ms)
	**		Z : abbreviated timezone name
	*/
	cbi_class.DatetimeValue = cbi_class.AbstractValue.extend({
		widget: function(sid)
		{
			var type = 'th';
			var format = '';
			var linkFormat = '';
			var options = {
				language:	L.i18n.language,
				weekStart:	1,
				autoclose:	true,
				todayHighlight: true,
				initialDate: this.ucivalue(sid)
			};

			if (this.options.type)
				type = this.options.type;

			if (type == 'th') {
				options.startView = 2;
				options.todayBtn = true;
				format = 'YYYY M A hh:ii';
				linkFormat = 'yyyy-m-d hh:ii';
			} else if (type == 'calendar') {
				options.startView = 2;
				options.minView = 2;
				options.todayBtn = true;
				format = 'YYYY M A';
				linkFormat = 'yyyy-m-d';
			} else if (type == 'time') {
				options.startView = 1;
				options.minView = 0;
				options.maxView = 1;
				options.title = '';
				format = 'hh:ii';
				linkFormat = 'hh:ii';
			}

			if (this.options.format)
				options.format = this.options.format;

			if (this.options.linkFormat)
				options.linkFormat = this.options.linkFormat;
				
			var i = $('<input />')
					.attr('id', this.id(sid))
					.attr('type', 'hidden');

			var t = $('<div />')
				.addClass('input-group date')
				.attr('data-link-field', this.id(sid))
				.attr('data-date-format', format)
				.attr('data-link-format', linkFormat)
				.append($('<input />')
					.addClass('form-control')
					.attr('type', 'text')
					.attr('readonly', true)
				)
				.append($('<span />')
					.addClass('input-group-addon')
					.append($('<span />')
						.addClass('glyphicon glyphicon-remove')
					)
				)
				.append($('<span />')
					.addClass('input-group-addon')
					.append($('<span />')
						.addClass('glyphicon glyphicon-' + type)
					)
				)
				.append(i).datetimepicker(options);

			if (options.initialDate)
				t.datetimepicker('setValue');
			
			this.events = {
				change: this.handleValidate
			};

			this.attachEvents(sid, i);
			
			return t;
		}
	});

	/* Operating frequency:Mode,Channel,Width */
	cbi_class.WlanFreqValue = cbi_class.AbstractValue.extend({
		setValues: function(sel, vals)
		{
			sel.empty();
			for (var i = 0; i < vals.length; i += 3)
			{
				if (vals[i + 2])
					$('<option />')
						.attr('value', vals[i])
						.text(vals[i + 1])
						.appendTo(sel);
			}

			if (sel.children().length <= 1)
				sel.parent().hide();
			else
				sel.parent().show();
		},

		get: function(sid, option)
		{
			return this.ownerMap.get('wireless', sid, option);
		},

		set: function(sid, option, val)
		{
			return this.ownerMap.set('wireless', sid, option, val);
		},
		
		modeChange: function(ev)
		{
			var sid = ev.data.sid;
			var self = ev.data.self;
			var bands = L.wireless.bands[sid][$(this).val()];
			var htmodes = L.wireless.htmodes[sid][$(this).val()];

			self.setValues(ev.data.bandSelect, bands);
			self.setValues(ev.data.widthSelect, htmodes);

			ev.data.bandSelect.change();
		},

		bandChange: function(ev)
		{
			var sid = ev.data.sid;
			var self = ev.data.self;
			var channels = L.wireless.channels[sid][$(this).val()];

			self.setValues(ev.data.channelSelect, channels);
		},
		
		widget: function(sid)
		{
			var id = this.id(sid);
			var vals = this.ucivalue(sid);
			
			var modeSelect = $('<select />').addClass('form-control').attr('id', id + 'mode');
			var bandSelect = $('<select />').addClass('form-control').attr('id', id + 'band');
			var channelSelect = $('<select />').addClass('form-control').attr('id', id + 'channel');
			var widthSelect = $('<select />').addClass('form-control').attr('id', id + 'width');
			
			var s = $('<div />')
					.append($('<label />')
						.attr('style', 'float:left; margin-right:3px')
						.append($('<span />').text(L.tr('Mode')))
						.append($('<br />'))
						.append(modeSelect)
					)
					.append($('<label />')
						.attr('style', 'float:left; margin-right:3px')
						.append($('<span />').text(L.tr('Band')))
						.append($('<br />'))
						.append(bandSelect)
					)
					.append($('<label />')
						.attr('style', 'float:left; margin-right:3px')
						.append($('<span />').text(L.tr('Channel')))
						.append($('<br />'))
						.append(channelSelect)
					)
					.append($('<label />')
						.attr('style', 'float:left; margin-right:3px')
						.append($('<span />').text(L.tr('Width')))
						.append($('<br />'))
						.append(widthSelect)
					);

			var modes = L.wireless.modes[sid];
			
			for (var i = 0; i < modes.length; i += 2)
			{
				if (modes[i + 1])
					$('<option />')
						.attr('value', modes[i])
						.text(modes[i])
						.appendTo(modeSelect);
			}

			if (/VHT20|VHT40|VHT80|VHT160/.test(vals[2]))
				modeSelect.val('11ac');
			else if (/HT20|HT40/.test(vals[2]))
				modeSelect.val('11n');
			else
				modeSelect.val(vals[0]);

			var evdata = {
				sid: sid,
				self: this,
				bandSelect: bandSelect,
				channelSelect: channelSelect,
				widthSelect: widthSelect
			};

			modeSelect.change(evdata, this.modeChange);
			bandSelect.change(evdata, this.bandChange);

			modeSelect.change();

			bandSelect.val(vals[0]);
			widthSelect.val(vals[2]);
			
			bandSelect.change();

			channelSelect.val(vals[1]);
			
			return s;
		},

		ucivalue: function(sid)
		{
			var id = this.id(sid);
			return [this.get(sid, 'hwmode'), this.get(sid, 'channel'), this.get(sid, 'htmode')];
		},
		
		formvalue: function(sid)
		{
			var id = this.id(sid);
			return [$('#' + id + 'band').val() || '', $('#' + id + 'channel').val() || '', $('#' + id + 'width').val() || ''];
		},

		save: function(sid)
		{
			var vals = this.formvalue(sid);
			this.set(sid, 'hwmode', vals[0]);
			this.set(sid, 'channel', vals[1]);
			this.set(sid, 'htmode', vals[2]);
		}
	});

	return Class.extend(cbi_class);
})();
