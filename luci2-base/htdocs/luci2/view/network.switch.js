L.ui.view.extend({
	title: L.tr('Switch'),
	description: L.tr('The network ports on this device can be combined to several VLANs in which computers can communicate directly with each other. VLANs are often used to separate different network segments. Often there is by default one Uplink port for a connection to the next greater network like the internet and other ports for a local network.'),

	listSwitchNames: L.rpc.declare({
		object: 'luci2.network',
		method: 'switch_list',
		expect: { switches: [ ] }
	}),

	getSwitchInfo: L.rpc.declare({
		object: 'luci2.network',
		method: 'switch_info',
		params: [ 'switch' ],
		expect: { info: { } },
		filter: function(data, params) {
			data['attrs']      = data['switch'];
			data['vlan_attrs'] = data['vlan'];
			data['port_attrs'] = data['port'];
			data['switch']     = params['switch'];

			delete data.vlan;
			delete data.port;

			return data;
		}
	}),

	getSwitchStatus: L.rpc.declare({
		object: 'luci2.network',
		method: 'switch_status',
		params: [ 'switch' ],
		expect: { ports: [ ] }
	}),

	switchPortState: L.cbi.ListValue.extend({
		choices: [
			[ 'n', L.trc('Switch port state', 'off')      ],
			[ 'u', L.trc('Switch port state', 'untagged') ],
			[ 't', L.trc('Switch port state', 'tagged')   ]
		],

		init: function(name, options)
		{
			var self = this;

			options.datatype = function(val, elem)
			{
				if (val == 'u')
				{
					var u = false;
					var sections = self.ownerSection.getUCISections();

					for (var i = 0; i < sections.length; i++)
					{
						var v = self.formvalue(sections[i]['.name']);
						if (v == 'u')
						{
							if (u)
								return L.tr('Port must not be untagged in multiple VLANs');

							u = true;
						}
					}
				}

				return true;
			};

			this.callSuper('init', name, options);
		},

		ucivalue: function(sid)
		{
			var ports = (this.ownerMap.get('network', sid, 'ports') || '').match(/[0-9]+[tu]?/g);

			if (ports)
				for (var i = 0; i < ports.length; i++)
					if (ports[i].match(/^([0-9]+)([tu]?)$/))
						if (RegExp.$1 == this.name)
							return RegExp.$2 || 'u';

			return 'n';
		},

		save: function(sid)
		{
			return;
		}
	}),

	execute: function() {
		var self = this;
		return self.listSwitchNames().then(function(switches) {
			L.rpc.batch();

			for (var i = 0; i < switches.length; i++)
				self.getSwitchInfo(switches[i]);

			return L.rpc.flush();
		}).then(function(switches) {
			var m = new L.cbi.Map('network', {
				readonly:    !self.options.acls.network
			});

			for (var i = 0; i < switches.length; i++)
			{
				var swname    = switches[i]['switch'];

				var vid_opt   = 'vlan';
				var v4k_opt   = undefined;
				var pvid_opt  = undefined;
				var max_vid   = switches[i].num_vlans - 1;
				var num_vlans = switches[i].num_vlans;

				for (var j = 0; j < switches[i].vlan_attrs.length; j++)
				{
					switch (switches[i].vlan_attrs[j].name)
					{
					case 'tag':
					case 'vid':
					case 'pvid':
						vid_opt = switches[i].vlan_attrs[j].name;
						max_vid = 4095;
						break;
					}
				}

				for (var j = 0; j < switches[i].port_attrs.length; j++)
				{
					switch (switches[i].port_attrs[j].name)
					{
					case 'pvid':
						pvid_opt = switches[i].port_attrs[j].name;
						break;
					}
				}


				var sw = m.section(L.cbi.TypedSection, 'switch', {
					caption:  L.tr('Switch "%s"').format(switches[i].model),
					swname:   swname
				});

				sw.filter = function(section) {
					return (section['.name'] == this.options.swname ||
							section.name     == this.options.swname);
				};

				for (var j = 0; j < switches[i].attrs.length; j++)
				{
					switch (switches[i].attrs[j].name)
					{
					case 'enable_vlan':
						sw.option(L.cbi.CheckboxValue, 'enable_vlan', {
							caption:     L.tr('Enable VLAN functionality')
						});
						break;

					case 'enable_learning':
						sw.option(L.cbi.CheckboxValue, 'enable_learning', {
							caption:     L.tr('Enable learning and aging'),
							initial:     true,
							optional:    true
						});
						break;

					case 'max_length':
						sw.option(L.cbi.CheckboxValue, 'max_length', {
							caption:     L.tr('Enable Jumbo Frame passthrough'),
							enabled:     '3',
							optional:    true
						});
						break;

					case 'enable_vlan4k':
						v4k_opt = switches[i].attrs[j].name;
						break;
					}
				}

				var vlans = m.section(L.cbi.TableSection, 'switch_vlan', {
					caption:     L.tr('VLANs on "%s"').format(switches[i].model),
					swname:      swname,
					addremove:   true,
					add_caption: L.tr('Add VLAN entry …')
				});

				vlans.add = function() {
					var sections = this.getUCISections();
					var used_vids = { };

					for (var j = 0; j < sections.length; j++)
					{
						var v = this.ownerMap.get('network', sections[j]['.name'], 'vlan');
						if (v)
							used_vids[v] = true;
					}

					for (var j = 1; j < num_vlans; j++)
					{
						if (used_vids[j.toString()])
							continue;

						var sid = this.ownerMap.add('network', 'switch_vlan');
						this.ownerMap.set('network', sid, 'device', this.options.swname);
						this.ownerMap.set('network', sid, 'vlan', j);
						break;
					}
				};

				vlans.filter = function(section) {
					return (section.device == this.options.swname);
				};

				vlans.sections = function() {
					var s = this.callSuper('sections');

					s.sort(function(a, b) {
						var x = parseInt(a[vid_opt] || a.vlan);
						if (isNaN(x))
							x = 9999;

						var y = parseInt(b[vid_opt] || b.vlan);
						if (isNaN(y))
							y = 9999;

						return (x - y);
					});

					return s;
				};

				var port_opts = [ ];

				var vo = vlans.option(L.cbi.InputValue, vid_opt, {
					caption:     L.tr('VLAN ID'),
					datatype:    function(val) {
						var sections = vlans.getUCISections();
						var used_vids = { };

						for (var j = 0; j < sections.length; j++)
						{
							var v = vlans.fields[vid_opt].formvalue(sections[j]['.name']);
							if (!v)
								continue;

							if (used_vids[v])
								return L.tr('VLAN ID must be unique');

							used_vids[v] = true;
						}

						if (val.match(/[^0-9]/))
							return L.tr('Invalid VLAN ID');

						val = parseInt(val, 10);

						if (val < 1 || val > max_vid)
							return L.tr('VLAN ID must be a value between %u and %u').format(1, max_vid);

						return true;
					}
				});

				vo.ucivalue = function(sid) {
					var id = this.ownerMap.get('network', sid, vid_opt);

					if (isNaN(parseInt(id)))
						id = this.ownerMap.get('network', sid, 'vlan');

					return id;
				};

				vo.save = function(sid) {
					var old_ports = this.ownerMap.get('network', sid, 'ports');
					var new_ports = '';

					for (var j = 0; j < port_opts.length; j++)
					{
						var v = port_opts[j].formvalue(sid);
						if (v != 'n')
							new_ports += '%s%d%s'.format(
								new_ports ? ' ' : '', j,
								(v == 'u') ? '' : 't');
					}

					if (new_ports != old_ports)
						this.ownerMap.set('network', sid, 'ports', new_ports);

					if (v4k_opt)
					{
						var s = sw.getUCISections();
						for (var j = 0; j < s.length; j++)
							this.ownerMap.set('network', s[j]['.name'], v4k_opt, '1');
					}

					this.callSuper('save', sid);
				};

				for (var j = 0; j < switches[i].num_ports; j++)
				{
					var label = L.trc('Switch port label', 'Port %d').format(j);

					if (j == switches[i].cpu_port)
						label = L.trc('Switch port label', 'CPU');

					var po = vlans.option(self.switchPortState, j.toString(), {
						caption: label + '<br /><small id="portstatus-%s-%d"></small>'.format(swname, j)
					});

					port_opts.push(po);
				}
			}

			return m.insertInto('#map').then(function() {
				self.repeat(function() {
					return self.getSwitchStatus(swname).then(function(ports) {
						for (var j = 0; j < ports.length; j++)
						{
							var s = L.tr('No link');
							var d = '&#160;';

							if (ports[j].link)
							{
								s = '%dbaseT'.format(ports[j].speed);
								d = ports[j].full_duplex ? L.tr('Full-duplex') : L.tr('Half-duplex');
							}

							$('#portstatus-%s-%d'.format(swname, j))
								.empty().append(s + '<br />' + d);
						}
					});
				}, 5000);
			});
		});
	}
});
