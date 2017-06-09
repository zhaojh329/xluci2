L.ui.view.extend({
	title: L.tr('Status'),

	getConntrackCount: L.rpc.declare({
		object: 'luci2.network',
		method: 'conntrack_count',
		expect: { '': { count: 0, limit: 0 } }
	}),

	getDHCPLeases: L.rpc.declare({
		object: 'luci2.network',
		method: 'dhcp_leases',
		expect: { leases: [ ] }
	}),

	getDHCPv6Leases: L.rpc.declare({
		object: 'luci2.network',
		method: 'dhcp6_leases',
		expect: { leases: [ ] }
	}),

	renderContents: function() {
		var self = this;
		return $.when(
			L.network.refreshStatus().then(function() {
				var wan  = L.network.findWAN();
				var wan6 = L.network.findWAN6();

				if (!wan && !wan6)
				{
					$('#network_status_table').empty();
					return;
				}

				var networkTable = new L.ui.grid({
					caption: L.tr('Network'),
					columns: [ {
						width:    2,
						width_sm: 12,
						format:   '%s'
					}, {
						width:    2,
						width_sm: 3,
						align:  'right',
						format: function(v) {
							var dev = L.network.resolveAlias(v.getDevice());
							if (dev)
								return $('<span />')
									.addClass('badge')
									.attr('title', dev.description())
									.append($('<img />').attr('src', dev.icon()))
									.append(' %s'.format(dev.name()));

							return '';
						}
					}, {
						width:  6,
						width_sm: 9,
						format: function(v, n) {
							return new L.ui.hlist({ items: [
								L.tr('Type'), v.getProtocol().description,
								L.tr('Connected'), '%t'.format(v.getUptime()),
								L.tr('Address'), (n ? v.getIPv6Addrs() : v.getIPv4Addrs()).join(', '),
								L.tr('Gateway'), v.getIPv4Gateway(),
								L.tr('DNS'), (n ? v.getIPv6DNS() : v.getIPv4DNS()).join(', ')
							] }).render();
						}
					} ]
				});

				if (wan)
					networkTable.row([ L.tr('IPv4 WAN Status'), wan, wan ]);

				if (wan6)
					networkTable.row([ L.tr('IPv6 WAN Status'), wan6, wan6 ]);

				networkTable.insertInto('#network_status_table');
			}),
			self.getConntrackCount().then(function(count) {
				var conntrackTable = new L.ui.grid({
					caption: L.tr('Connection Tracking'),
					columns: [ {
						width:    4
					}, {
						format: function(v) {
							return new L.ui.progress({
								value:  v.count,
								max:    v.limit,
								format: '%d / %d (%d%%)'
							}).render();
						}
					} ]
				});

				conntrackTable.row([ L.tr('Active Connections'), count ]);
				conntrackTable.insertInto('#conntrack_status_table');
			}),
			L.system.getInfo().then(function(info) {
				var sysinfoTable = new L.ui.grid({
					caption: L.tr('System'),
					columns: [ {
						width:    4
					}, {
						width:    8,
						nowrap:   true
					} ]
				});

				sysinfoTable.rows([
					[ L.tr('Hostname'),         info.hostname                         ],
					[ L.tr('Model'),            info.model                            ],
					[ L.tr('Firmware Version'), info.release.description              ],
					[ L.tr('Kernel Version'),   info.kernel                           ],
					[ L.tr('Local Time'),       (new Date(info.localtime * 1000)).toLocaleString() ],
					[ L.tr('Uptime'),           '%t'.format(info.uptime)              ],
					[ L.tr('Load Average'),
					  '%.2f %.2f %.2f'.format(
						  info.load[0] / 65535.0,
						  info.load[1] / 65535.0,
						  info.load[2] / 65535.0
					  ) ]
				]);

				sysinfoTable.insertInto('#system_status_table');

				var memoryTable = new L.ui.grid({
					caption: L.tr('Memory'),
					columns: [ {
						format:   '%s',
						width:    4
					}, {
						format: function(v) {
							return new L.ui.progress({
								value:  v,
								max:    info.memory.total,
								format: function(pc) {
									return ('%d ' + L.tr('kB') + ' / %d ' + L.tr('kB') + ' (%d%%)').format(
										v / 1024, info.memory.total / 1024, pc
									);
								}
							}).toString();
						}
					} ]
				});

				memoryTable.rows([
					[ L.tr('Total Available'), info.memory.free + info.memory.buffered ],
					[ L.tr('Free'),            info.memory.free                        ],
					[ L.tr('Cached'),          info.memory.shared                      ],
					[ L.tr('Buffered'),        info.memory.buffered                    ],
				]);

				memoryTable.insertInto('#memory_status_table');

				if (info.swap.total > 0)
				{
					var swapTable = new L.ui.grid({
						caption: L.tr('Swap'),
						columns: [ {
							format:   '%s',
							width:    4
						}, {
							format: function(v) {
								return new L.ui.progress({
									value:  v,
									max:    info.swap.total,
									format: function(pc) {
										return ('%d ' + L.tr('kB') + ' / %d ' + L.tr('kB') + ' (%d%%)').format(
											v / 1024, info.swap.total / 1024, pc
										);
									}
								}).toString();
							}
						} ]
					});

					swapTable.row([ L.tr('Free'), info.swap.free ]);
					swapTable.insertInto('#swap_status_table');
				}

				var diskTable = new L.ui.grid({
					caption: L.tr('Storage'),
					columns: [ {
						format:   '%s',
						width:    4
					}, {
						format: function(v) {
							return new L.ui.progress({
								value:  v[0],
								max:    v[1],
								format: function(pc) {
									return ('%d ' + L.tr('kB') + ' / %d ' + L.tr('kB') + ' (%d%%)').format(
										v[0] / 1024, v[1] / 1024, pc
									);
								}
							}).toString();
						}
					} ]
				});

				diskTable.row([ '' + L.tr('Root Usage') + ' (/)', [ info.root.used, info.root.total ] ]);
				diskTable.row([ '' + L.tr('Temporary Usage') + ' (/tmp)', [ info.tmp.used, info.tmp.total ] ]);
				diskTable.insertInto('#disk_status_table');
			}),
			L.wireless.getWirelessStatus().then(function(radios) {
				var phys = [ ];
				for (var phy in radios)
					phys.push(phy);

				phys.sort();

				$('#wifi_status_table').empty();

				for (var i = 0; i < phys.length; i++)
				{
					var rows = [ ];
					var radio = radios[phys[i]];

					rows.push([false, {
						name: radio.hardware
							? '%s 802.11%s (%s)'.format(
								radio.hardware.name, radio.hwmodes.join(''),
								radio.phy.replace(/^[^0-9]+/, 'radio'))
							: ('802.11%s ' + L.tr('Radio') + ' (%s)').format(
								radio.hwmodes.join(''),
								radio.phy.replace(/^[^0-9]+/, 'radio')),
						channel:   radio.channel,
						frequency: radio.frequency,
						txpower:   radio.txpower
					}]);

					for (var j = 0; j < radio.networks.length; j++)
					{
						var network = radio.networks[j];

						if (network.bssid && network.bssid != '00:00:00:00:00:00' && radio.channel)
							rows[0][0] = true;

						rows.push([{
							signal:      network.signal,
							noise:       network.noise,
							device:      network.device
						}, {
							ssid:        network.ssid,
							bssid:       network.bssid,
							mode:        network.mode,
							encryption:  network.encryption,
							bitrate:     network.bitrate
						}]);
					}

					var wifiTable = new L.ui.grid({
						caption: i ? null : L.tr('Wireless'),
						columns: [ {
							width:    2,
							width_sm: 3,
							align:  'right',
							format: function(v, n)
							{
								if (typeof(v) != 'boolean')
									return new L.ui.devicebadge(v).render();
								else
									return L.ui.icon('wifi_big' + (v ? '' : '_disabled'));
							}
						}, {
							width:    6,
							width_sm: 9,
							format: function(v, n)
							{
								if (typeof(rows[n][0]) != 'boolean')
								{
									return new L.ui.hlist({ items: [
										L.tr('Mode'), v.mode,
										L.tr('Bitrate'), v.bitrate ? ('~ %.1f ' + L.tr('Mbit/s')).format(v.bitrate / 1000) : undefined,
										L.tr('SSID'), v.ssid,
										L.tr('BSSID'), v.bssid,
										L.tr('Encryption'), L.wireless.formatEncryption(v.encryption)
									] }).render();
								}
								else
								{
									return $('<big />')
										.append($('<strong />')
											.addClass('nowrap')
											.append(v.name))
										.append('<br />')
										.add(new L.ui.hlist({ items: [
												L.tr('Channel'), '%d (%.3f %s)'.format(v.channel, v.frequency / 1000, L.tr('GHz')),
												L.tr('TX Power'), '%d %s'.format(v.txpower, L.tr('dBm'))
											] }).render());
								}
							}
						} ]
					});

					wifiTable.rows(rows);
					$('#wifi_status_table').append(wifiTable.render());
				}
			}),
			$.when(L.wireless.getOuiList(),
				L.wireless.getAssocLists()
			).then(function(ouiList, assoclist) {
				/*
				assoclist.push({mac: '00:00:00:F8:A4:5F', signal: -40, noise: 20, tx: {}, rx: {}}); // Unknown				
				assoclist.push({mac: 'F8:A4:5F:F8:A4:5F', signal: -40, noise: 20, tx: {}, rx: {}}); // Xiaomi				
				assoclist.push({mac: 'D8:96:95:F8:A4:5F', signal: -40, noise: 20, tx: {}, rx: {}}); // Apple				
				assoclist.push({mac: '7C:1C:F1:F8:A4:5F', signal: -40, noise: 20, tx: {}, rx: {}}); // HUAWEI				
				assoclist.push({mac: 'C0:9F:05:F8:A4:5F', signal: -40, noise: 20, tx: {}, rx: {}}); // OPPO				
				assoclist.push({mac: '54:40:AD:F8:A4:5F', signal: -40, noise: 20, tx: {}, rx: {}}); // Samsung
				*/
				var formatRate = function(v)
				{
					return '<span class="nowrap">%s</span>'.format(
						(!isNaN(v.mcs) && v.mcs > 0)
							? ('%.1f ' + L.tr('Mbit/s') + ', MCS %d, %d%s').format(v.rate / 1000, v.mcs, v['40mhz'] ? 40 : 20, L.tr('MHz'))
							: ('%.1f ' + L.tr('Mbit/s')).format(v.rate / 1000));
				};

				var assocTable = new L.ui.grid({
					caption:     L.tr('Associated Stations'),
					placeholder: L.tr('No station connected'),
					columns:     [ {
						format:  function(v, n) {
							v = v.replace(/:/g, '').substring(0, 6);
							return L.ui.icon('vender/%s.png'.format(ouiList[v] || 'unknown'));
						},
						key:      'mac'
					}, {
						format:  function(v, n) {
							return new L.ui.devicebadge(assoclist[n]).render();
						},
						width:    2,
						width_sm: 2,
						align:    'right',
						key:      'signal'
					}, {
						width_sm: 4,
						caption:  L.tr('MAC-Address'),
						key:      'mac'
					}, {
						caption:  L.tr('Signal'),
						format:   '%d ' + L.tr('dBm') + '',
						key:      'signal',
						width:    1,
						width_sm: 0
					}, {
						caption:  L.tr('Noise'),
						format:   '%d ' + L.tr('dBm') + '',
						key:      'noise',
						width:    1,
						width_sm: 0
					}, {
						caption:  L.tr('RX Rate'),
						format:   formatRate,
						key:      'rx',
						width:    3
					}, {
						caption:  L.tr('TX Rate'),
						format:   formatRate,
						key:      'tx',
						width:    3
					} ]
				});

				assocTable.rows(assoclist);
				assocTable.insertInto('#wifi_assoc_table');
			}),
			self.getDHCPLeases().then(function(leases) {
				var leaseTable = new L.ui.grid({
					caption:     L.tr('DHCP Leases'),
					placeholder: L.tr('There are no active leases.'),
					columns: [ {
						caption:     L.tr('Hostname'),
						placeholder: '?',
						key:         'hostname',
						nowrap:      true,
						width_sm:    5
					}, {
						caption:     L.tr('IPv4-Address'),
						key:         'ipaddr',
						width_sm:    4
					}, {
						caption:     L.tr('MAC-Address'),
						key:         'macaddr',
						width_sm:    0
					}, {
						caption:     L.tr('Leasetime remaining'),
						key:         'expires',
						width_sm:    3,
						nowrap:      true,
						format:      function(v) {
							return (v <= 0) ? L.tr('expired') : '%t'.format(v);
						}
					} ]
				});

				leaseTable.rows(leases);
				leaseTable.insertInto('#lease_status_table');
			}),
			self.getDHCPv6Leases().then(function(leases) {
				if (!leases.length)
					return;

				var leaseTable = new L.ui.grid({
					caption:     L.tr('DHCPv6 Leases'),
					columns: [ {
						caption:     L.tr('Hostname'),
						placeholder: '?',
						key:         'hostname',
						width_sm:    0
					}, {
						caption:     L.tr('IPv6-Address'),
						key:         'ip6addr',
						width_sm:    6
					}, {
						caption:     L.tr('DUID'),
						key:         'duid',
						width_sm:    0
					}, {
						caption:     L.tr('Leasetime remaining'),
						key:         'expires',
						width_sm:    6,
						format:      function(v) {
							return (v <= 0) ? L.tr('expired') : '%t'.format(v);
						}
					} ]
				});

				leaseTable.rows(leases);
				leaseTable.insertInto('#lease6_status_table');
			})
		)
	},

	execute: function()
	{
		var self = this;
        return L.network.load().then(function() {
			self.repeat(self.renderContents, 5000);
        });
	}
});
