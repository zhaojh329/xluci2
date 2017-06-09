L.ui.view.extend({
	title: L.tr('Routes'),
	description: L.tr('Routes specify over which interface and gateway a certain host or network can be reached.'),

	execute: function() {
		var self = this;
		var ifaces = L.network.getInterfaces();

		var m = new L.cbi.Map('network', {
			readonly:    !self.options.acls.network
		});

		var s4 = m.section(L.cbi.GridSection, 'route', {
			caption:     L.tr('Static IPv4 Routes'),
			anonymous:   true,
			addremove:   true,
			sortable:    true,
			add_caption: L.tr('Add new route'),
			remove_caption: L.tr('Remove route')
		});

		var ifc = s4.option(L.cbi.ListValue, 'interface', {
			caption:	L.tr('Interface')
		});

		ifc.ucivalue = function(sid) {
			var val = this.callSuper('ucivalue', sid);
			if (!val)
				return this.choices[0][0];
			return val;
		};

		for (var i = 0; i < ifaces.length; i++)
			ifc.value(ifaces[i].name());

		s4.option(L.cbi.InputValue, 'target', {
			caption:     L.tr('Target'),
			datatype:    'ip4addr',
			width:       2
		});

		s4.option(L.cbi.InputValue, 'netmask', {
			caption:     L.tr('IPv4-Netmask'),
			datatype:    'netmask4',
			placeholder: '255.255.255.255',
			optional:    true,
			width:       2
		});

		s4.option(L.cbi.InputValue, 'gateway', {
			caption:     L.tr('IPv4-Gateway'),
			datatype:    'ip4addr',
			optional:    true,
			width:       2
		});

		s4.option(L.cbi.InputValue, 'metric', {
			caption:     L.tr('Metric'),
			datatype:    'range(0,255)',
			placeholder: 0,
			optional:    true
		});

		s4.option(L.cbi.InputValue, 'mtu', {
			caption:     L.tr('MTU'),
			datatype:    'range(64,9000)',
			placeholder: 1500,
			optional:    true
		});


		var s6 = m.section(L.cbi.GridSection, 'route6', {
			caption:     L.tr('Static IPv6 Routes'),
			anonymous:   true,
			addremove:   true,
			sortable:    true,
			add_caption: L.tr('Add new route'),
			remove_caption: L.tr('Remove route')
		});

		var ifc = s6.option(L.cbi.ListValue, 'interface', {
			caption:     L.tr('Interface')
		});

		ifc.ucivalue = function(sid) {
			var val = this.callSuper('ucivalue'. sid);
			if (!val)
				return this.choices[0][0];
			return val;
		};

		for (var i = 0; i < ifaces.length; i++)
			ifc.value(ifaces[i].name());

		s6.option(L.cbi.InputValue, 'target', {
			caption:     L.tr('Target'),
			datatype:    'ip6addr',
			width:       3
		});

		s6.option(L.cbi.InputValue, 'gateway', {
			caption:     L.tr('IPv6-Gateway'),
			datatype:    'ip6addr',
			optional:    true,
			width:       3
		});

		s6.option(L.cbi.InputValue, 'metric', {
			caption:     L.tr('Metric'),
			datatype:    'range(0,255)',
			placeholder: 0,
			optional:    true
		});

		s6.option(L.cbi.InputValue, 'mtu', {
			caption:     L.tr('MTU'),
			datatype:    'range(64,9000)',
			placeholder: 1500,
			optional:    true
		});

		m.insertInto('#map');
	}
});
