L.ui.view.extend({
	PubkeyListValue: L.cbi.AbstractValue.extend({
		base64Table: {
			'A':  0, 'B':  1, 'C':  2, 'D':  3, 'E':  4, 'F':  5, 'G':  6,
			'H':  7, 'I':  8, 'J':  9, 'K': 10, 'L': 11, 'M': 12, 'N': 13,
			'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19, 'U': 20,
			'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25, 'a': 26, 'b': 27,
			'c': 28, 'd': 29, 'e': 30, 'f': 31, 'g': 32, 'h': 33, 'i': 34,
			'j': 35, 'k': 36, 'l': 37, 'm': 38, 'n': 39, 'o': 40, 'p': 41,
			'q': 42, 'r': 43, 's': 44, 't': 45, 'u': 46, 'v': 47, 'w': 48,
			'x': 49, 'y': 50, 'z': 51, '0': 52, '1': 53, '2': 54, '3': 55,
			'4': 56, '5': 57, '6': 58, '7': 59, '8': 60, '9': 61, '+': 62,
			'/': 63, '=': 64
		},

		base64Decode: function(s)
		{
			var i = 0;
			var d = '';

			if (s.match(/[^A-Za-z0-9\+\/\=]/))
				return undefined;

			while (i < s.length)
			{
				var e1 = this.base64Table[s.charAt(i++)];
				var e2 = this.base64Table[s.charAt(i++)];
				var e3 = this.base64Table[s.charAt(i++)];
				var e4 = this.base64Table[s.charAt(i++)];

				var c1 = ( e1       << 2) | (e2 >> 4);
				var c2 = ((e2 & 15) << 4) | (e3 >> 2);
				var c3 = ((e3 &  3) << 6) |  e4;

				d += String.fromCharCode(c1);

				if (e3 < 64)
					d += String.fromCharCode(c2);

				if (e4 < 64)
					d += String.fromCharCode(c3);
			}

			return d;
		},

		lengthDecode: function(s, off)
		{
			var l = (s.charCodeAt(off++) << 24) |
					(s.charCodeAt(off++) << 16) |
					(s.charCodeAt(off++) <<  8) |
					 s.charCodeAt(off++);

			if (l < 0 || (off + l) > s.length)
				return -1;

			return l;
		},

		pubkeyDecode: function(s)
		{
			var parts = s.split(/\s+/);
			if (parts.length < 2)
				return undefined;

			var key = this.base64Decode(parts[1]);
			if (!key)
				return undefined;

			var off, len;

			off = 0;
			len = this.lengthDecode(key, off);

			if (len < 0)
				return undefined;

			var type = key.substr(off + 4, len);
			if (type != parts[0])
				return undefined;

			off += 4 + len;

			var len1 = this.lengthDecode(key, off);
			if (len1 < 0)
				return undefined;

			off += 4 + len1;

			var len2 = this.lengthDecode(key, off);
			if (len2 < 0)
				return undefined;

			if (len1 & 1)
				len1--;

			if (len2 & 1)
				len2--;

			switch (type)
			{
			case 'ssh-rsa':
				return { type: 'RSA', bits: len2 * 8, comment: parts[2] };

			case 'ssh-dss':
				return { type: 'DSA', bits: len1 * 8, comment: parts[2] };

			default:
				return undefined;
			}
		},

		_remove: function(ev)
		{
			var self = ev.data.self;

			self._keys.splice(ev.data.index, 1);
			self._render(ev.data.div);
		},

		_add: function(ev)
		{
			var self = ev.data.self;

			var form = $('<div />')
				.append($('<p />')
					.text(L.tr('Paste the public key line into the field below and press "%s" to continue.').format(L.tr('Ok'))))
				.append($('<p />')
					.text(L.tr('Unrecognized public key! Please add only RSA or DSA keys.'))
					.addClass('alert alert-danger')
					.hide())
				.append($('<p />')
					.append($('<input />')
						.attr('type', 'text')
						.attr('placeholder', L.tr('Paste key here'))
						.addClass('form-control')));

			L.ui.dialog(L.tr('Add new public key'), form, {
				style: 'confirm',
				confirm: function() {
					var val = form.find('input').val();
					if (!val)
					{
						return;
					}

					var key = self.pubkeyDecode(val);
					if (!key)
					{
						form.find('input').val('');
						form.find('.alert').show();
						return;
					}

					self._keys.push(val);
					self._render(ev.data.div);

					L.ui.dialog(false);
				}
			});
		},

		_show: function(ev)
		{
			var self = ev.data.self;

			L.ui.dialog(
				L.tr('Public key'),
				$('<pre />').text(self._keys[ev.data.index]),
				{ style: 'close' }
			);
		},

		_render: function(div)
		{
			div.empty();

			for (var i = 0; i < this._keys.length; i++)
			{
				var k = this.pubkeyDecode(this._keys[i] || '');

				if (!k)
					continue;

				$('<div />')
					.addClass('input-group')
					.append($('<input />')
						.addClass('form-control')
						.attr('type', 'text')
						.prop('readonly', true)
						.click({ self: this, index: i }, this._show)
						.val('%dBit %s - %s'.format(k.bits, k.type, k.comment || '?')))
					.append($('<span />')
						.addClass('input-group-btn')
						.append($('<button />')
							.addClass('btn btn-danger')
							.attr('title', L.tr('Remove public key'))
							.text('–')
							.click({ self: this, div: div, index: i }, this._remove)))
					.appendTo(div);
			}

			if (this._keys.length > 0)
				$('<br />').appendTo(div);

			L.ui.button(L.tr('Add public key …'), 'success')
				.click({ self: this, div: div }, this._add)
				.appendTo(div);
		},

		widget: function(sid)
		{
			this._keys = [ ];

			for (var i = 0; i < this.options.keys.length; i++)
				this._keys.push(this.options.keys[i]);

			var d = $('<div />')
				.attr('id', this.id(sid));

			this._render(d);

			return d;
		},

		changed: function(sid)
		{
			if (this.options.keys.length != this._keys.length)
				return true;

			for (var i = 0; i < this.options.keys.length; i++)
				if (this.options.keys[i] != this._keys[i])
					return true;

			return false;
		},

		save: function(sid)
		{
			if (this.changed(sid))
			{
				this.options.keys = [ ];

				for (var i = 0; i < this._keys.length; i++)
					this.options.keys.push(this._keys[i]);

				return L.views.SystemAdmin.setSSHKeys(this._keys);
			}

			return undefined;
		}
	}),

	getSSHKeys: L.rpc.declare({
		object: 'luci2.system',
		method: 'sshkeys_get',
		expect: { keys: [ ] }
	}),

	setSSHKeys: L.rpc.declare({
		object: 'luci2.system',
		method: 'sshkeys_set',
		params: [ 'keys' ]
	}),

	setPassword: L.rpc.declare({
		object: 'luci2.system',
		method: 'password_set',
		params: [ 'user', 'password' ]
	}),

	execute: function() {
		var self = this;
		return self.getSSHKeys().then(function(keys) {
			var m = new L.cbi.Map('dropbear', {
				caption:     L.tr('SSH Access'),
				description: L.tr('Dropbear offers SSH network shell access and an integrated SCP server'),
				tabbed:      true
			});

			var s1 = m.section(L.cbi.DummySection, '__password', {
				caption:     L.tr('Router Password'),
				description: L.tr('Changes the administrator password for accessing the device'),
				readonly:    !self.options.acls.admin
			});

			var p1 = s1.option(L.cbi.PasswordValue, 'pass1', {
				caption:     L.tr('Password'),
				optional:    true
			});

			var p2 = s1.option(L.cbi.PasswordValue, 'pass2', {
				caption:     L.tr('Confirmation'),
				optional:    true,
				datatype:    function(v) {
					var v1 = p1.formvalue('__password');
					if (v1 && v1.length && v != v1)
						return L.tr('Passwords must match!');
					return true;
				}
			});

			p1.save = function(sid) { };
			p2.save = function(sid) {
				var v1 = p1.formvalue(sid);
				var v2 = p2.formvalue(sid);
				if (v2 && v2.length > 0 && v1 == v2)
					return L.system.setPassword('root', v2);
			};


			var s2 = m.section(L.cbi.DummySection, '__pubkeys', {
				caption:     L.tr('SSH-Keys'),
				description: L.tr('Specifies public keys for passwordless SSH authentication'),
				readonly:    !self.options.acls.admin
			});

			var k = s2.option(self.PubkeyListValue, 'keys', {
				caption:     L.tr('Saved keys'),
				keys:        keys
			});


			var s3 = m.section(L.cbi.TypedSection, 'dropbear', {
				caption:     L.tr('SSH Server'),
				description: L.tr('This sections define listening instances of the builtin Dropbear SSH server'),
				addremove:   true,
				add_caption: L.tr('Add instance ...'),
				readonly:    !self.options.acls.admin,
				collabsible: true
			});

			s3.option(L.cbi.NetworkList, 'Interface', {
				caption:     L.tr('Interface'),
				description: L.tr('Listen only on the given interface or, if unspecified, on all')
			});

			s3.option(L.cbi.InputValue, 'Port', {
				caption:     L.tr('Port'),
				description: L.tr('Specifies the listening port of this Dropbear instance'),
				datatype:    'port',
				placeholder: 22,
				optional:    true
			});

			s3.option(L.cbi.CheckboxValue, 'PasswordAuth', {
				caption:     L.tr('Password authentication'),
				description: L.tr('Allow SSH password authentication'),
				initial:     true,
				enabled:     'on',
				disabled:    'off'
			});

			s3.option(L.cbi.CheckboxValue, 'RootPasswordAuth', {
				caption:     L.tr('Allow root logins with password'),
				description: L.tr('Allow the root user to login with password'),
				initial:     true,
				enabled:     'on',
				disabled:    'off'
			});

			s3.option(L.cbi.CheckboxValue, 'GatewayPorts', {
				caption:     L.tr('Gateway ports'),
				description: L.tr('Allow remote hosts to connect to local SSH forwarded ports'),
				initial:     false,
				enabled:     'on',
				disabled:    'off'
			});

			return m.insertInto('#map');
		});
	}
});
