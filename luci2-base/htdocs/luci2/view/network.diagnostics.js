L.ui.view.extend({
	title: L.tr('Diagnostics'),

	runPing: L.rpc.declare({
		object: 'luci2.network',
		method: 'ping',
		params: [ 'data' ],
		expect: { '': { code: -1 } }
	}),

	runPing6: L.rpc.declare({
		object: 'luci2.network',
		method: 'ping6',
		params: [ 'data' ],
		expect: { '': { code: -1 } }
	}),

	runTraceroute: L.rpc.declare({
		object: 'luci2.network',
		method: 'traceroute',
		params: [ 'data' ],
		expect: { '': { code: -1 } }
	}),

	runTraceroute6: L.rpc.declare({
		object: 'luci2.network',
		method: 'traceroute6',
		params: [ 'data' ],
		expect: { '': { code: -1 } }
	}),

	runNslookup: L.rpc.declare({
		object: 'luci2.network',
		method: 'nslookup',
		params: [ 'data' ],
		expect: { '': { code: -1 } }
	}),

	execute: function() {
		var self = this;
		var tools = [ ];

		$.when(
			self.runPing('?').then(function(rv) {
				if (rv.code != -1) tools.push(['runPing', L.tr('IPv4 Ping')]);
			}),
			self.runPing6('?').then(function(rv) {
				if (rv.code != -1) tools.push(['runPing6', L.tr('IPv6 Ping')]);
			}),
			self.runTraceroute('?').then(function(rv) {
				if (rv.code != -1) tools.push(['runTraceroute', L.tr('IPv4 Traceroute')]);
			}),
			self.runTraceroute6('?').then(function(rv) {
				if (rv.code != -1) tools.push(['runTraceroute6', L.tr('IPv6 Tracroute')]);
			}),
			self.runNslookup('?').then(function(rv) {
				if (rv.code != -1) tools.push(['runNslookup', L.tr('DNS Lookup')]);
			})
		).then(function() {
			tools.sort(function(a, b) {
				if (a[0] < b[0])
					return -1;
				else if (a[0] > b[0])
					return 1;
				else
					return 0;
			});

			for (var i = 0; i < tools.length; i++)
				$('#tool').append($('<option />').attr('value', tools[i][0]).text(tools[i][1]));

			$('#tool').val('runPing');

			$('#run').click(function() {
				if ($('#tool option').length == 0)
					return;
				
				L.ui.loading(true);
				self[$('#tool').val()]($('#host').val()).then(function(rv) {
					$('#output').empty().show();

					if (rv.stdout)
						$('#output').text(rv.stdout);

					if (rv.stderr)
						$('#output').append($('<span />').css('color', 'red').text(rv.stderr));

					L.ui.loading(false);
				});
			});
		});
	}
});
