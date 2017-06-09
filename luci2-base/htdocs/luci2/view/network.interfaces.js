L.ui.view.extend({
	title: L.tr('Interface Overview'),

	pendingRestart: [ ],
	pendingShutdown: [ ],

	setUp: L.rpc.declare({
		object: 'luci2.network',
		method: 'ifup',
		params: [ 'data' ],
		expect: { '': { code: -1 } }
	}),

	setDown: L.rpc.declare({
		object: 'luci2.network',
		method: 'ifdown',
		params: [ 'data' ],
		expect: { '': { code: -1 } }
	}),

	renderDeviceIcon: function(dev, up)
	{
		var icon = dev ? dev.icon(up) : L.globals.resource + '/icons/ethernet_disabled.png';
		var desc = dev ? '%s (%s)'.format(dev.description(), dev.name()) : L.tr('Network interface not present');

		return $('<img />')
			.attr('title', desc)
			.attr('src', icon);
	},

	renderNetworkBadge: function(network, div)
	{
		var dest = div || $('#network-badge-%s'.format(network.name()));
		var device = network.getDevice(); //network.device || { type: 'Network device', device: '?' };
		var subdevs = network.getSubdevices();

		if (div)
		{
			var h = $('<div />')
				.addClass('ifacebox-head')
				.text(network.name());

			if (network.zone)
				h.css('background-color', network.zone.color).attr('title', L.trc('Interface status', 'Part of zone "%s"').format(network.zone.name));
			else
				h.css('background-color', '#cccccc').attr('title', L.trc('Interface status', 'Not part of any zone'));

			dest.append(h);
		}
		else
		{
			dest.children('div.ifacebox-body').remove();
		}

		var b = $('<div />')
			.addClass('ifacebox-body');

		b.append(this.renderDeviceIcon(device, network.isUp()));

		if (subdevs.length)
		{
			b.append('(');

			for (var i = 0; i < subdevs.length; i++)
				b.append(this.renderDeviceIcon(subdevs[i], subdevs[i].isUp()));

			b.append(')');
		}

		b.append($('<br />')).append($('<small />').text(device ? device.name() : '?'));

		return dest.append(b);
	},

	renderNetworkStatus: function(network, div)
	{
		var rv = '';

		if (network.isUp())
		{
			rv += '<strong>%s</strong>: %t<br />'.format(
				L.tr('Uptime'),
				network.getUptime()
			);
		}
		else
		{
			rv += '<strong>%s</strong>: %s<br />'.format(
				L.tr('Uptime'),
				L.tr('Interface is down')
			);
		}

		var v4 = network.getIPv4Addrs();
		if (v4.length)
			rv += '<strong>%s</strong>: %s<br />'.format(
				L.trc('Interface status', 'IPv4'),
				v4.join(', ')
			);

		var v6 = network.getIPv6Addrs();
		if (v6.length)
			rv += '<strong>%s</strong>: %s<br />'.format(
				L.trc('Interface status', 'IPv6'),
				v6.join(', ')
			);

		return (div || $('#network-status-%s'.format(network.name())))
			.empty()
			.append(rv);
	},

	renderNetworkChart: function(network, div)
	{
		var dest = (div || $('#network-chart-%s'.format(network.name())));

		dest.empty();

		dest.append($('<div />')
			.addClass('traffic-chart')
			.append($('<span />')
				.attr('id', 'network-chart-tx-%s'.format(network.name()))
				.hide())
			.append($('<label />')));

		dest.append($('<div />')
			.addClass('traffic-chart')
			.append($('<span />')
				.attr('id', 'network-chart-rx-%s'.format(network.name()))
				.hide())
			.append($('<label />')));

		dest.append($('<small />')
			.addClass('traffic-stats')
			.text(L.tr('Loading statistics…')));

		return dest;
	},

	refreshNetworkStatus: function()
	{
		var self = this;
		var deferreds = [ ];

		while (self.pendingRestart.length)
			deferreds.push(self.setUp(self.pendingRestart.shift()));

		while (self.pendingShutdown.length)
			deferreds.push(self.setDown(self.pendingShutdown.shift()));

		return $.when.apply($, deferreds).then(function() {
			$('button').prop('disabled', false);
			return $.when(
				L.network.refreshDeviceStatus(),
				L.network.refreshInterfaceStatus()
			);
		}).then(function() {
			var networks = L.network.getInterfaces();

			for (var i = 0; i < networks.length; i++)
			{
				self.renderNetworkBadge(networks[i]);
				self.renderNetworkStatus(networks[i]);
			}

			var max = 0.1;
			var networks = L.network.getInterfaces();

			for (var i = 0; i < networks.length; i++)
			{
				var network = networks[i];
				var history = network.getTrafficHistory();
				var stats = network.getStatistics();

				var tx = $('#network-chart-tx-%s'.format(network.name()));
				var rx = $('#network-chart-rx-%s'.format(network.name()));

				var tx_rate = history.tx_bytes[history.tx_bytes.length - 1];
				var rx_rate = history.rx_bytes[history.rx_bytes.length - 1];

				max = Math.max(Math.max.apply(Math, history.rx_bytes),
							   Math.max.apply(Math, history.tx_bytes),
							   max);

				for (var j = 0; j < history.rx_bytes.length; j++)
					history.rx_bytes[j] = -Math.abs(history.rx_bytes[j]);

				tx.text(history.tx_bytes.join(','));
				rx.text(history.rx_bytes.join(','));

				tx.next().attr('title', '%.2mB/s'.format(tx_rate));
				rx.next().attr('title', '%.2mB/s'.format(rx_rate));

				tx.nextAll('label').html('↑ %.2mB/s'.format(tx_rate));
				rx.nextAll('label').html('↓ %.2mB/s'.format(rx_rate));

				tx.parent().nextAll('small.traffic-stats').html(
					'<strong>%s</strong>: %.2mB (%d %s)<br />'.format(
						L.trc('Interface status', 'TX'),
						stats.tx_bytes, stats.tx_packets, L.trc('Interface status', 'Pkts')) +
					'<strong>%s</strong>: %.2mB (%d %s)<br />'.format(
						L.trc('Interface status', 'RX'),
						stats.rx_bytes, stats.rx_packets, L.trc('Interface status', 'Pkts')));
			}

			for (var i = 0; i < networks.length; i++)
			{
				var network = networks[i];

				var tx = $('#network-chart-tx-%s'.format(network.name()));
				var rx = $('#network-chart-rx-%s'.format(network.name()));

				tx.peity('line', { width: 200, min: 0, max: max });
				rx.peity('line', { width: 200, min: -max, max: 0 });
			}

			L.ui.loading(false);
		});
	},

	renderContents: function(networks)
	{
		var self = this;

		var list = new L.ui.table({
			columns: [ {
				caption: L.tr('Network'),
				width:   '120px',
				format:  function(v) {
					var div = $('<div />')
						.attr('id', 'network-badge-%s'.format(v.name()))
						.addClass('ifacebox');

					return self.renderNetworkBadge(v, div);
				}
			}, {
				caption: L.tr('Traffic'),
				width:   '215px',
				format:  function(v) {
					var div = $('<div />').attr('id', 'network-chart-%s'.format(v.name()));
					return self.renderNetworkChart(v, div);
				}
			}, {
				caption: L.tr('Status'),
				format:  function(v) {
					var div = $('<small />').attr('id', 'network-status-%s'.format(v.name()));
					return self.renderNetworkStatus(v, div);
				}
			}, {
				caption: L.tr('Actions'),
				format:  function(v, n) {
					return $('<div />')
						.addClass('btn-group btn-group-sm')
						.append(L.ui.button(L.tr('Restart'), 'default', L.tr('Enable or restart interface'))
							.click({ self: self, network: v }, self.handleIfup))
						.append(L.ui.button(L.tr('Shutdown'), 'default', L.tr('Shut down interface'))
							.click({ self: self, network: v }, self.handleIfdown))
						.append(L.ui.button(L.tr('Edit'), 'primary', L.tr('Edit interface'))
							.click({ self: self, network: v }, self.handleEdit))
						.append(L.ui.button(L.tr('Delete'), 'danger', L.tr('Delete interface'))
							.click({ self: self, network: v }, self.handleRemove));
				}
			} ]
		});

		for (var i = 0; i < networks.length; i++)
			list.row([ networks[i], networks[i], networks[i], networks[i] ]);

		self.repeat(self.refreshNetworkStatus, 5000);

		list.insertInto('#map');
	},

	renderInterfaceForm: function(network)
	{
		var m = new L.cbi.Map('network', {
			tabbed:      true,
			caption:     'Interface config',
			description: 'I can config interface!!!!'
		});



		var s4 = m.section(L.cbi.TypedSection, 'route', {
			caption:     L.tr('Static IPv4 Routes'),
			anonymous:   true,
			addremove:   true,
			sortable:    true,
			add_caption: L.tr('Add new route'),
			remove_caption: L.tr('Remove route')
		});

		var ifc = s4.option(L.cbi.ListValue, 'interface', {
			caption:     L.tr('Interface')
		});

		ifc.value('foo');

		s4.option(L.cbi.InputValue, 'target', {
			caption:     L.tr('Target'),
			datatype:    'ip4addr'
		});

		s4.option(L.cbi.InputValue, 'netmask', {
			caption:     L.tr('IPv4-Netmask'),
			datatype:    'netmask4',
			placeholder: '255.255.255.255',
			optional:    true
		});

		s4.option(L.cbi.InputValue, 'gateway', {
			caption:     L.tr('IPv4-Gateway'),
			datatype:    'ip4addr',
			optional:    true
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

		return m;
	},

	handleIfup: function(ev) {
		this.disabled = true;
		this.blur();
		ev.data.self.pendingRestart.push(ev.data.network.name());
	},

	handleIfdown: function(ev) {
		this.disabled = true;
		this.blur();
		ev.data.self.pendingShutdown.push(ev.data.network.name());
	},

	handleEdit: function(ev) {
		var self = ev.data.self;
		var network = ev.data.network;

		return network.createForm(L.cbi.Modal).show();
	},
	
	handleRemove: function(ev) {
		var self = ev.data.self;
		var network = ev.data.network;
		
		var form = $('<p />').text(L.tr('Really delete this interface? The deletion cannot be undone!You might lose access to this device if you are connected via this interface.'));
		L.ui.dialog(L.tr('Delete interface'), form, {
			style: 'confirm',
			confirm: function() {
				L.ui.dialog(false);
				
				L.ui.loading(true);
				L.uci.remove('network', network.name());
				L.firewall.delNetwork(network.name());
				
				L.uci.save().then(function() {
					L.uci.changes().then(function(changes) {
						if (!$.isEmptyObject(changes)) {
							L.uci.apply().then(function(rv) {
								L.ui.updateChanges();
								return L.network.update().then(function() {
									self.renderContents(L.network.getInterfaces());
									L.ui.loading(false);
								});
							});
						}
					});
				});
			}
		});	
	},

	handleAdd: function(ev) {
		var self = ev.data.self;
		var form = $('<form/>')
						.addClass('form-horizontal')
						.append($('<div/>')
									.addClass('form-group has-error')
									.append($('<label/>')
												.text(L.tr('Please enter the name of the new interface:'))
												.addClass('col-lg-4 control-label')
									)
									.append($('<div/>')
												.addClass('col-lg-8')
												.append($('<input/>')
															.addClass('form-control')
															.attr('type', 'text')
															.attr('name', 'name')
												)
												.append($('<p/>').text(L.tr('Legal character: A-Z, A-Z, 0-9 and _')))
												.append($('<p/>').text(L.tr('Cannot duplicate the existing interface name')))
									)
						);

		var vstack = L.cbi.validation.compile("and(uciname,maxlength(15))");
		form.find('input').blur(function() {
			var val = $(this).val();
			if (vstack[0].apply(val, vstack[1]) && !L.network.getInterface(val)) {
				form.find('.form-group').removeClass('has-error');
			} else {
				form.find('.form-group').addClass('has-error');
			}
		});
		
		L.ui.dialog(L.tr('Add new interface...'), form, {
			style: 'confirm',
			confirm: function() {
				if ($(form).find('.has-error').length > 0)
					return;
				
				L.ui.dialog(false);
				L.ui.loading(true);

				var name = form.find('input').val();
				L.uci.add('network', 'interface', name);
				L.uci.set('network', name, 'proto', 'none');

				L.uci.save().then(function() {
					L.uci.changes().then(function(changes) {
						if (!$.isEmptyObject(changes)) {
							L.uci.apply().then(function(rv) {
								L.ui.updateChanges();
								return L.network.update().then(function() {
									self.renderContents(L.network.getInterfaces());
									L.ui.loading(false);
								});
							});
						}
					});
				});
			}
		});
	},
	
	execute: function() {
		var self = this;

		return L.network.load().then(function() {
			self.renderContents(L.network.getInterfaces());

			$('#add').click({ self: self}, self.handleAdd);
		});
	}
});
