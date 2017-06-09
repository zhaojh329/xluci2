L.network.Protocol.extend({
	protocol:    '6rd',
	description: L.tr('IPv6-over-IPv4 (6rd)'),
	tunnel:      true,
	virtual:     true,

	populateForm: function(section, iface)
	{
		var wan = L.network.findWAN();

		section.taboption('general', L.cbi.InputValue, 'peeraddr', {
			caption:     L.tr('6RD Gateway'),
			datatype:    'ip4addr',
			optional:    false
		});

		section.taboption('general', L.cbi.InputValue, 'ipaddr', {
			caption:     L.tr('Local IPv4 address'),
			description: L.tr('Leave empty to use the current WAN address'),
			datatype:    'ip4addr',
			placeholder: wan ? wan.getIPv4Addrs()[0] : undefined,
			optional:    true
		});

		section.taboption('general', L.cbi.InputValue, 'ip4prefixlen', {
			caption:     L.tr('IPv4 prefix length'),
			description: L.tr('The length of the IPv4 prefix in bits, the remainder is used in the IPv6 addresses'),
			datatype:    'range(0, 32)',
			placeholder: 0,
			optional:    true
		});

		section.taboption('general', L.cbi.InputValue, 'ip6prefix', {
			caption:     L.tr('IPv6 prefix'),
			description: L.tr('The IPv6 prefix assigned to the provider, usually ends with "::"'),
			datatype:    'ip6addr',
			optional:    false
		});

		section.taboption('general', L.cbi.InputValue, 'ip6prefixlen', {
			caption:     L.tr('IPv6 prefix length'),
			description: L.tr('The length of the IPv6 prefix in bits'),
			datatype:    'range(0, 128)',
			placeholder: 16,
			optional:    true
		});

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
