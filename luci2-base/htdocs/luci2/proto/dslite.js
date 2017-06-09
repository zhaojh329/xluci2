L.network.Protocol.extend({
	protocol:    'dslite',
	description: L.tr('Dual-Stack Lite (RFC6333)'),
	tunnel:      true,
	virtual:     true,

	populateForm: function(section, iface)
	{
		var wan6 = L.network.findWAN6();

		section.taboption('general', L.cbi.InputValue, 'peeraddr', {
			caption:     L.tr('DS-Lite AFTR address'),
			datatype:    'ip6addr',
			optional:    false
		});

		section.taboption('general', L.cbi.InputValue, 'ip6addr', {
			caption:     L.tr('Local IPv6 address'),
			description: L.tr('Leave empty to use the current WAN address'),
			datatype:    'ip6addr',
			placeholder: wan6 ? wan6.getIPv6Addrs()[0] : undefined,
			optional:    true
		});

		section.taboption('advanced', L.cbi.NetworkList, 'tunlink', {
			caption:     L.tr('Tunnel Link'),
			initial:     wan6 ? wan6.name() : undefined,
			optional:    true
		});

		section.taboption('advanced', L.cbi.CheckboxValue, 'defaultroute', {
			caption:     L.tr('Default route'),
			description: L.tr('Create IPv4 default route via tunnel'),
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
