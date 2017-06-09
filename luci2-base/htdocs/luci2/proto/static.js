L.network.Protocol.extend({
	protocol:    'static',
	description: L.tr('Static address'),
	tunnel:      false,
	virtual:     false,

	_ev_broadcast: function(ev)
	{
		var self = ev.data.self;
		var sid = ev.data.sid;

		var i = ($('#' + self.ownerSection.id('field', sid, 'ipaddr')).val() || '').split(/\./);
		var m = ($('#' + self.ownerSection.id('field', sid, 'netmask') + ' select').val() || '').split(/\./);

		var I = 0;
		var M = 0;

		for (var n = 0; n < 4; n++)
		{
			i[n] = parseInt(i[n]);
			m[n] = parseInt(m[n]);

			if (isNaN(i[n]) || i[n] < 0 || i[n] > 255 ||
				isNaN(m[n]) || m[n] < 0 || m[n] > 255)
				return;

			I |= (i[n] << ((3 - n) * 8));
			M |= (m[n] << ((3 - n) * 8));
		}

		var B = I | ~M;

		$('#' + self.ownerSection.id('field', sid, 'broadcast'))
			.attr('placeholder', '%d.%d.%d.%d'.format(
				(B >> 24) & 0xFF, (B >> 16) & 0xFF,
				(B >>  8) & 0xFF, (B >>  0) & 0xFF
			));
	},

	populateForm: function(section, iface)
	{
		var device = L.network.getDeviceByInterface(iface);

		section.taboption('general', L.cbi.InputValue, 'ipaddr', {
			caption:  L.tr('IPv4 address'),
			datatype: 'ip4addr'
		}).on('blur validate', this._ev_broadcast);

		section.taboption('general', L.cbi.ComboBox, 'netmask', {
			caption:  L.tr('IPv4 netmask'),
			datatype: 'netmask4'
		}).on('blur validate', this._ev_broadcast)
			.value('255.255.255.0')
			.value('255.255.0.0')
			.value('255.0.0.0');

		section.taboption('general', L.cbi.InputValue, 'broadcast', {
			caption:  L.tr('IPv4 broadcast'),
			datatype: 'ip4addr',
			optional: true
		});

		section.taboption('general', L.cbi.InputValue, 'gateway', {
			caption:  L.tr('IPv4 gateway'),
			datatype: 'ip4addr',
			optional: true
		});

		section.taboption('general', L.cbi.DynamicList, 'dns', {
			caption:  L.tr('DNS servers'),
			datatype: 'ipaddr',
			optional: true
		});


		section.taboption('ipv6', L.cbi.ComboBox, 'ip6assign', {
			caption:     L.tr('IPv6 assignment length'),
			description: L.tr('Assign a part of given length of every public IPv6-prefix to this interface'),
			datatype:    'range(1,64)',
			optional:    true
		}).value('', L.tr('disabled')).value('64');

		var ip6hint = section.taboption('ipv6', L.cbi.InputValue, 'ip6hint', {
			caption:     L.tr('IPv6 assignment hint'),
			description: L.tr('Assign prefix parts using this hexadecimal subprefix ID for this interface'),
			optional:    true
		});

		for (var i = 33; i <= 64; i++)
			ip6hint.depends('ip6assign', i);

		section.taboption('ipv6', L.cbi.InputValue, 'ip6addr', {
			caption:     L.tr('IPv6 address'),
			datatype:    'ip6addr',
			optional:    true
		}).depends('ip6assign', false);

		section.taboption('ipv6', L.cbi.InputValue, 'ip6gw', {
			caption:     L.tr('IPv6 gateway'),
			datatype:    'ip6addr',
			optional:    true
		}).depends('ip6assign', false);

		section.taboption('ipv6', L.cbi.InputValue, 'ip6prefix', {
			caption:     L.tr('IPv6 routed prefix'),
			description: L.tr('Public prefix routed to this device for distribution to clients'),
			datatype:    'ip6addr',
			optional:    true
		}).depends('ip6assign', false);
	}
});
