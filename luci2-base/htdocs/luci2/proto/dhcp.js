L.network.Protocol.extend({
	protocol:    'dhcp',
	description: L.tr('DHCP client'),
	tunnel:      false,
	virtual:     false,

	populateForm: function(section, iface)
	{
		section.taboption('general', L.cbi.InputValue, 'hostname', {
			caption:     L.tr('Hostname'),
			description: L.tr('Hostname to send when requesting DHCP'),
			datatype:    'hostname',
			optional:    true
		}).load = function() {
			var self = this;
			return L.system.getBoardInfo().then(function(info) {
				self.options.placeholder = info.hostname;
			});
		};

		section.taboption('advanced', L.cbi.CheckboxValue, 'broadcast', {
			caption:     L.tr('Use broadcast'),
			description: L.tr('Required for certain ISPs, e.g. Charter with DOCSIS3'),
			optional:    true
		});

		section.taboption('advanced', L.cbi.CheckboxValue, 'defaultroute', {
			caption:     L.tr('Use gateway'),
			description: L.tr('Create default route via DHCP gateway'),
			optional:    true,
			initial:     true
		});

		section.taboption('advanced', L.cbi.CheckboxValue, 'peerdns', {
			caption:     L.tr('Use DNS'),
			description: L.tr('Use DNS servers advertised by DHCP'),
			optional:    true,
			initial:     true
		});

		section.taboption('advanced', L.cbi.DynamicList, 'dns', {
			caption:     L.tr('Custom DNS'),
			datatype:    'ipaddr',
			optional:    true
		}).depends('peerdns', false);

		section.taboption('advanced', L.cbi.InputValue, 'clientid', {
			caption:     L.tr('Client ID'),
			description: L.tr('Client ID to send when requesting DHCP'),
			optional:    true
		});

		section.taboption('advanced', L.cbi.InputValue, 'vendorid', {
			caption:     L.tr('Vendor Class'),
			description: L.tr('Vendor Class to send when requesting DHCP'),
			optional:    true
		});
	}
});
