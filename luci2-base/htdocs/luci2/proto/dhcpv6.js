L.network.Protocol.extend({
	protocol:    'dhcpv6',
	description: L.tr('DHCPv6 client / IPv6 autoconfig'),
	tunnel:      false,
	virtual:     false,

	populateForm: function(section, iface)
	{
		section.taboption('general', L.cbi.ListValue, 'reqaddress', {
			caption:     L.tr('Request IPv6 address'),
			initial:     'try'
		}).value('try',   L.tr('Attempt DHCPv6, fallback to RA'))
		  .value('force', L.tr('Force DHCPv6'))
		  .value('none',  L.tr('RA only'));

		section.taboption('general', L.cbi.ComboBox, 'reqprefix', {
			caption:      L.tr('Request IPv6 prefix'),
			description:  L.tr('Specifies the requested prefix length'),
			initial:      'auto',
			datatype:     'or("auto", "no", range(32, 64))'
		}).value('auto',   L.tr('automatic'))
		  .value('no',     L.tr('disabled'))
		  .value('48').value('52').value('56').value('60').value('64');

		section.taboption('general', L.cbi.InputValue, 'ip6prefix', {
			caption:     L.tr('Custom prefix'),
			description: L.tr('Specifies an additional custom IPv6 prefix for distribution to clients'),
			datatype:    'ip6addr',
			optional:    true
		});

		section.taboption('advanced', L.cbi.CheckboxValue, 'defaultroute', {
			caption:     L.tr('Default route'),
			description: L.tr('Create IPv6 default route via tunnel'),
			optional:    true,
			initial:     true
		});

		section.taboption('advanced', L.cbi.CheckboxValue, 'peerdns', {
			caption:     L.tr('Use DNS'),
			description: L.tr('Use DNS servers advertised by DHCPv6'),
			optional:    true,
			initial:     true
		});

		section.taboption('advanced', L.cbi.DynamicList, 'dns', {
			caption:     L.tr('Custom DNS'),
			description: L.tr('Use custom DNS servers instead of DHCPv6 ones'),
			datatype:    'ipaddr',
			optional:    true
		}).depends('peerdns', false);

		section.taboption('advanced', L.cbi.InputValue, 'clientid', {
			caption:     L.tr('Client ID'),
			description: L.tr('Client ID to send when requesting DHCPv6'),
			optional:    true
		});
	}
});
