L.network.Protocol.extend({
	protocol:    '6to4',
	description: L.tr('IPv6-over-IPv4 (6to4)'),
	tunnel:      true,
	virtual:     true,

	populateForm: function(section, iface)
	{
		section.taboption('general', L.cbi.InputValue, 'ipaddr', {
			caption:     L.tr('Local IPv4 address'),
			description: L.tr('Leave empty to use the current WAN address'),
			datatype:    'ip4addr',
			optional:    true
		}).load = function() {
			var wan = L.network.findWAN();
			if (wan)
				this.options.placeholder = wan.getIPv4Addrs()[0];
		};

		section.taboption('advanced', L.cbi.CheckboxValue, 'defaultroute', {
			caption:     L.tr('Default route'),
			description: L.tr('Create IPv6 default route via tunnel'),
			optional:    true,
			initial:     true
		});

		section.taboption('advanced', L.cbi.InputValue, 'ttl', {
			caption:     L.tr('Override TTL'),
			description: L.tr('Specifies the Time-to-Live on the tunnel interface'),
			datatype:    'range(1,255)',
			placeholder: 64,
			optional:    true
		});
	}
});
