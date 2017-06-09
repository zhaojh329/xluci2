L.ui.view.extend({
	ZoneTableSection: L.cbi.TableSection.extend({
		handleEdit: function(ev)
		{
			var sid = ev.data.sid;
			var z = L.firewall.findZoneBySid(sid);
			return z.createForm();
		},
		
		renderEdit: function(sid)
		{
			return L.ui.button(L.tr('Edit'), 'primary')
				.click({ self: this, sid: sid }, this.handleEdit);
		},
		
		renderTableRow: function(sid, index)
		{
			var row = this.callSuper('renderTableRow', sid, index);
			var btnGroup = row.find('.btn-group').empty();
			btnGroup.append(this.renderEdit(sid))
					.append(this.renderRemove(index));
			
			return row;
		}
	}),

	PFTableSection: L.cbi.TableSection.extend({
		handleEdit: function(ev)
		{
		},
		
		renderEdit: function(sid)
		{
			return L.ui.button(L.tr('Edit'), 'primary')
				.click({ self: this, sid: sid }, this.handleEdit);
		},
		
		renderTableRow: function(sid, index)
		{
			var row = this.callSuper('renderTableRow', sid, index);
			var btnGroup = row.find('.btn-group').empty();
			btnGroup.append(this.renderSort(index))
					.append(this.renderEdit(sid))
					.append(this.renderRemove(index));
			
			return row;
		}
	}),
	
	execute: function() {
		var self = this;
		
		var m = new L.cbi.Map('firewall', {
			caption:     L.tr('Firewall'),
			tabbed:      true
		});

		var s = m.section(L.cbi.TypedSection, 'defaults', {
			caption:     L.tr('General Settings')
		});

		s.option(L.cbi.CheckboxValue, 'syn_flood', {
			caption:      L.tr('Enable SYN-flood protection')
		});

		s.option(L.cbi.CheckboxValue, 'drop_invalid', {
			caption:      L.tr('Drop invalid packets')
		});

		s.option(L.cbi.ListValue, 'input', {
			caption:     L.tr('Input')
		}).load = function(sid) {
			this.choices = [];
			this.value('REJECT', L.tr('reject'));
			this.value('DROP', L.tr('drop'));
			this.value('ACCEPT', L.tr('accept'));
		};

		s.option(L.cbi.ListValue, 'output', {
			caption:     L.tr('Output')
		}).load = function(sid) {
			this.choices = [];
			this.value('REJECT', L.tr('reject'));
			this.value('DROP', L.tr('drop'));
			this.value('ACCEPT', L.tr('accept'));
		};

		s.option(L.cbi.ListValue, 'forward', {
			caption:     L.tr('Forward')
		}).load = function(sid) {
			this.choices = [];
			this.value('REJECT', L.tr('reject'));
			this.value('DROP', L.tr('drop'));
			this.value('ACCEPT', L.tr('accept'));
		};

		var zone = m.section(self.ZoneTableSection, 'zone', {
			caption:		L.tr('Zones'),
			description:	L.tr('The firewall creates zones over your network interfaces to control network traffic flow.'),
			anonymous:  	true,
			addremove:  	true,
			add_caption: 	L.tr('Add'),
			remove_caption: L.tr('Remove')
		});

		zone.option(L.cbi.InputValue, 'name', {
			caption:	L.tr('Name'),
			datatype:	function(val) {
				var vstack = L.cbi.validation.compile('and(uciname,maxlength(11))');

				delete L.cbi.validation.message;
				
				if (!vstack[0].apply(val, vstack[1]))
					return L.cbi.validation.message;

				var sections = zone.getUCISections();
				var used_names = {};
				for (var i = 0; i < sections.length; i++) {
					var v = zone.fields['name'].formvalue(sections[i]['.name']);
					if (!v)
						continue;

					if (used_names[v] && v == val)
						return L.tr('Name must be unique');

					used_names[v] = true;
				}

				return true;
			}
		});

		zone.option(L.cbi.ListValue, 'input', {
			caption:	L.tr('Input'),
			initial:	'ACCEPT'
		}).load = function(sid) {
			this.choices = [];
			this.value('REJECT', L.tr('reject'));
			this.value('DROP', L.tr('drop'));
			this.value('ACCEPT', L.tr('accept'));
		};

		zone.option(L.cbi.ListValue, 'output', {
			caption:     L.tr('Output'),
			initial:	'ACCEPT'
		}).load = function(sid) {
			this.choices = [];
			this.value('REJECT', L.tr('reject'));
			this.value('DROP', L.tr('drop'));
			this.value('ACCEPT', L.tr('accept'));
		};

		zone.option(L.cbi.ListValue, 'forward', {
			caption:     L.tr('Forward'),
			initial:	'REJECT'
		}).load = function(sid) {
			this.choices = [];
			this.value('REJECT', L.tr('reject'));
			this.value('DROP', L.tr('drop'));
			this.value('ACCEPT', L.tr('accept'));
		};

		zone.option(L.cbi.CheckboxValue, 'masq', {
			caption:      L.tr('Masquerading')
		});

		zone.option(L.cbi.CheckboxValue, 'mtu_fix', {
			caption:      L.tr('MSS clamping')
		});

		var pf = m.section(self.PFTableSection, 'redirect', {
			caption:		L.tr('Port Forwards'),
			sortable:		true,
			anonymous:  	true,
			addremove:  	true,
			add_caption: 	L.tr('Add'),
			remove_caption: L.tr('Remove')
		});

		pf.option(L.cbi.InputValue, 'name', {
			caption:	L.tr('Name'),
			datatype:	'and(uciname,maxlength(11))'
		});

		pf.option(L.cbi.ComboBox, 'proto', {
			caption:     L.tr('Protocol'),
			initial:	'tcp udp'
		}).load = function(sid) {
			this.value('tcp udp', L.tr('TCP+UDP'));
			this.value('tcp', L.tr('TCP'));
			this.value('udp', L.tr('UDP'));
			this.value('icmp', L.tr('ICMP'));
		};
			
		pf.option(L.cbi.ListValue, 'extzone', {
			caption:	L.tr('External zone'),
			optional:	true
		}).load = function(sid) {
			var zones = L.firewall.zoneObjects;
			for (var i = 0; i < zones.length; i++)
				this.value(zones[i].name());
		};

		pf.option(L.cbi.InputValue, 'extport', {
			caption:	L.tr('External port'),
			datatype:	'port'
		});

		pf.option(L.cbi.ListValue, 'intzone', {
			caption:	L.tr('Internal zone'),
			optional:	true
		}).load = function(sid) {
			var zones = L.firewall.zoneObjects;
			for (var i = 0; i < zones.length; i++)
				this.value(zones[i].name());
		};

		pf.option(L.cbi.InputValue, 'intaddr', {
			caption:	L.tr('Internal IP address'),
			datatype:	'ip4addr'
		});

		pf.option(L.cbi.InputValue, 'intport', {
			caption:	L.tr('Internal port'),
			datatype:	'port'
		});
			
		return L.firewall.load().then(function() {
			m.insertInto('#map')
		});
	}
});
