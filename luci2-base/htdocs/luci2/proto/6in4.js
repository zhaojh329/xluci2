L.network.Protocol.extend({
	protocol:    '6in4',
	description: L.tr('IPv6-in-IPv4 (RFC4213)'),
	tunnel:      true,
	virtual:     true,

	populateForm: function(section, iface)
	{
		var wan = L.network.findWAN();

		section.taboption('general', L.cbi.InputValue, 'ipaddr', {
			caption:     L.tr('Local IPv4 address'),
			description: L.tr('Leave empty to use the current WAN address'),
			datatype:    'ip4addr',
			placeholder: wan ? wan.getIPv4Addrs()[0] : undefined,
			optional:    true
		});

		section.taboption('general', L.cbi.InputValue, 'peeraddr', {
			caption:     L.tr('Remote IPv4 address'),
			description: L.tr('This is usually the address of the nearest PoP operated by the tunnel broker'),
			datatype:    'ip4addr',
			optional:    false
		});

		section.taboption('general', L.cbi.InputValue, 'ip6addr', {
			caption:     L.tr('Local IPv6 address'),
			description: L.tr('This is the local endpoint address assigned by the tunnel broker'),
			datatype:    'cidr6',
			optional:    false
		});

		section.taboption('general', L.cbi.InputValue, 'ip6prefix', {
			caption:     L.tr('IPv6 routed prefix'),
			description: L.tr('This is the prefix routed to you by the tunnel broker for use by clients'),
			datatype:    'cidr6',
			optional:    true
		});

		var update = section.taboption('general', L.cbi.CheckboxValue, '_update', {
			caption:     L.tr('Dynamic tunnel'),
			description: L.tr('Enable HE.net dynamic endpoint update'),
			enabled:     '1',
			disabled:    '0'
		});

		update.save = function(sid) { };
		update.ucivalue = function(sid) {
			var n = parseInt(this.ownerMap.get('network', sid, 'tunnelid'));
			return !isNaN(n);
		};

		section.taboption('general', L.cbi.InputValue, 'tunnelid', {
			caption:     L.tr('Tunnel ID'),
			datatype:    'uinteger',
			optional:    false,
			keep:        false
		}).depends('_update', true);

		section.taboption('general', L.cbi.InputValue, 'username', {
			caption:     L.tr('HE.net user ID'),
			description: L.tr('The login name of the HE.net account'),
			datatype:    'string',
			optional:    false,
			keep:        false
		}).depends('_update', true);

		section.taboption('general', L.cbi.PasswordValue, 'password', {
			caption:     L.tr('Password'),
			description: L.tr('Tunnel update key or HE.net account password'),
			optional:    false,
			keep:        false
		}).depends('_update', true);

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
