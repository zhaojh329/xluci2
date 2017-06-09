L.ui.view.extend({
	aclTable: L.cbi.AbstractValue.extend({
		strGlob: function(pattern, match) {
			var re = new RegExp('^' + (pattern
				.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1')
				.replace(/\\\*/g, '.*?')) + '$');

			return re.test(match);
		},

		aclMatch: function(list, group) {
			for (var i = 0; i < list.length; i++)
			{
				var x = list[i].replace(/^\s*!\s*/, '');
				if (x == list[i])
					continue;

				if (this.strGlob(x, group))
					return false;
			}

			for (var i = 0; i < list.length; i++)
			{
				var x = list[i].replace(/^\s*!\s*/, '');
				if (x != list[i])
					continue;

				if (this.strGlob(x, group))
					return true;
			}

			return false;
		},

		aclTest: function(list, group) {
			for (var i = 0; i < list.length; i++)
				if (list[i] == group)
					return true;

			return false;
		},

		aclEqual: function(list1, list2) {
			if (list1.length != list2.length)
				return false;

			for (var i = 0; i < list1.length; i++)
				if (list1[i] != list2[i])
					return false;

			return true;
		},

		aclFromUCI: function(value) {
			var list;
			if (typeof(value) == 'string')
				list = value.split(/\s+/);
			else if ($.isArray(value))
				list = value;
			else
				list = [ ];

			var rv = [ ];
			if (this.choices)
				for (var i = 0; i < this.choices.length; i++)
					if (this.aclMatch(list, this.choices[i][0]))
						rv.push(this.choices[i][0]);

			return rv;
		},

		aclToUCI: function(list) {
			if (list.length < (this.choices.length / 2))
				return list;

			var set = { };
			for (var i = 0; i < list.length; i++)
				set[list[i]] = true;

			var rv = [ '*' ];
			for (var i = 0; i < this.choices.length; i++)
				if (!set[this.choices[i][0]])
					rv.push('!' + this.choices[i][0]);

			return rv;
		},

		setAll: function(ev) {
			$(this).parents('table')
				.find('input[value=%d]'.format(ev.data.level))
				.prop('checked', true);
		},

		widget: function(sid)
		{
			var t = $('<table />')
				.addClass('table table-condensed table-hover')
				.attr('id', this.id(sid))
				.append($('<tr />')
					.append($('<th />')
						.text(L.tr('ACL Group')))
					.append($('<th />')
						.text(L.trc('No access', 'N'))
						.attr('title', L.tr('Set all to no access'))
						.css('cursor', 'pointer')
						.click({ level: 0 }, this.setAll))
					.append($('<th />')
						.text(L.trc('Read only access', 'R'))
						.attr('title', L.tr('Set all to read only access'))
						.css('cursor', 'pointer')
						.click({ level: 1 }, this.setAll))
					.append($('<th />')
						.text(L.trc('Full access', 'F'))
						.attr('title', L.tr('Set all to full access'))
						.css('cursor', 'pointer')
						.click({ level: 2 }, this.setAll)));

			var acl_r = this.aclFromUCI(this.ownerMap.get('rpcd', sid, 'read'));
			var acl_w = this.aclFromUCI(this.ownerMap.get('rpcd', sid, 'write'));

			if (this.choices)
				for (var i = 0; i < this.choices.length; i++)
				{
					var r = t.get(0).insertRow(-1);
					var is_r = this.aclTest(acl_r, this.choices[i][0]);
					var is_w = this.aclTest(acl_w, this.choices[i][0]);

					$(r.insertCell(-1))
						.text(this.choices[i][1]);

					for (var j = 0; j < 3; j++)
					{
						$(r.insertCell(-1))
							.append($('<input />')
								.addClass('form-control')
								.attr('type', 'radio')
								.attr('name', '%s_%s'.format(this.id(sid), this.choices[i][0]))
								.attr('value', j)
								.prop('checked', (j == 0 && !is_r && !is_w) ||
												 (j == 1 &&  is_r && !is_w) ||
												 (j == 2 &&           is_w)));
					}
				}

			return t;
		},

		textvalue: function(sid)
		{
			var acl_r = this.aclFromUCI(this.ownerMap.get('rpcd', sid, 'read'));
			var acl_w = this.aclFromUCI(this.ownerMap.get('rpcd', sid, 'write'));

			var htmlid = this.id(sid);
			var radios = $('#' + htmlid + ' input');

			var acls = [  ];

			for (var i = 0; i < this.choices.length; i++)
			{
				switch (radios.filter('[name=%s_%s]:checked'.format(htmlid, this.choices[i][0])).val())
				{
				case '2':
					acls.push('%s: %s'.format(this.choices[i][0], L.trc('Full access', 'F')));
					break;

				case '1':
					acls.push('%s: %s'.format(this.choices[i][0], L.trc('Read only access', 'R')));
					break;

				case '0':
					acls.push('%s: %s'.format(this.choices[i][0], L.trc('No access', 'N')));
					break;
				}
			}

			return acls.join(', ');
		},

		value: function(k, v)
		{
			if (!this.choices)
				this.choices = [ ];

			this.choices.push([k, v || k]);
			return this;
		},

		save: function(sid)
		{
			var acl_r = this.aclFromUCI(this.ownerMap.get('rpcd', sid, 'read'));
			var acl_w = this.aclFromUCI(this.ownerMap.get('rpcd', sid, 'write'));

			var acl_r_new = [ ];
			var acl_w_new = [ ];

			var htmlid = this.id(sid);
			var radios = $('#' + htmlid + ' input');

			for (var i = 0; i < this.choices.length; i++)
			{
				switch (radios.filter('[name=%s_%s]:checked'.format(htmlid, this.choices[i][0])).val())
				{
				case '2':
					acl_r_new.push(this.choices[i][0]);
					acl_w_new.push(this.choices[i][0]);
					break;

				case '1':
					acl_r_new.push(this.choices[i][0]);
					break;
				}
			}

			if (!this.aclEqual(acl_r, acl_r_new))
				this.ownerMap.set('rpcd', sid, 'read', this.aclToUCI(acl_r_new));

			if (!this.aclEqual(acl_w, acl_w_new))
				this.ownerMap.set('rpcd', sid, 'write', this.aclToUCI(acl_w_new));
		}
	}),

	execute: function() {
		var self = this;
		return L.ui.getAvailableACLs().then(function(acls) {
			var m = new L.cbi.Map('rpcd', {
				caption:     L.tr('Guest Logins'),
				description: L.tr('Manage user accounts and permissions for accessing the LuCI ui.'),
				readonly:    !self.options.acls.users
			});

			var s = m.section(L.cbi.TypedSection, 'login', {
				caption:      L.tr('Accounts'),
				collabsible:  true,
				addremove:    true,
				add_caption:  L.tr('Add account …'),
				teasers:      [ 'username', '__shadow', '__acls' ]
			});

			s.option(L.cbi.InputValue, 'username', {
				caption:     L.tr('Username'),
				description: L.tr('Specifies the login name for the guest account'),
				optional:    false
			});


			var shadow = s.option(L.cbi.CheckboxValue, '__shadow', {
				caption:     L.tr('Use system account'),
				description: L.tr('Use password from the Linux user database')
			});

			shadow.ucivalue = function(sid) {
				var pw = this.ownerMap.get('rpcd', sid, 'password');
				return (pw && pw.indexOf('$p$') == 0);
			};


			var password = s.option(L.cbi.PasswordValue, 'password', {
				caption:     L.tr('Password'),
				description: L.tr('Specifies the password for the guest account. If you enter a plaintext password here, it will get replaced with a crypted password hash on save.'),
				optional:    false
			});

			password.depends('__shadow', false);

			password.toggle = function(sid) {
				var id = '#' + this.id(sid);
				var pw = this.ownerMap.get('rpcd', sid, 'password');
				var sh = this.ownerSection.fields.__shadow.formvalue(sid);

				if (!sh && pw && pw.indexOf('$p$') == 0)
					$(id).val('');

				this.callSuper('toggle', sid);
			};

			shadow.save = password.save = function(sid) {
				var sh = this.ownerSection.fields.__shadow.formvalue(sid);
				var pw = this.ownerSection.fields.password.formvalue(sid);

				if (!sh && !pw)
					return;

				if (sh)
					pw = '$p$' + this.ownerSection.fields.username.formvalue(sid);

				if (pw.match(/^\$[0-9p][a-z]?\$/))
				{
					if (pw != this.ownerMap.get('rpcd', sid, 'password'))
						this.ownerMap.set('rpcd', sid, 'password', pw);
				}
				else
				{
					var map = this.ownerMap;
					return L.ui.cryptPassword(pw).then(function(crypt) {
						map.set('rpcd', sid, 'password', crypt);
					});
				}
			};

			var o = s.option(self.aclTable, '__acls', {
				caption:     L.tr('User ACLs'),
				description: L.tr('Specifies the access levels of this account. The "N" column means no access, "R" stands for read only access and "F" for full access.')
			});

			var groups = [ ];
			for (var group_name in acls)
				groups.push(group_name);

			groups.sort();

			for (var i = 0; i < groups.length; i++)
				o.value(groups[i], acls[groups[i]].description);

			return m.insertInto('#map');
		});
	}
});
