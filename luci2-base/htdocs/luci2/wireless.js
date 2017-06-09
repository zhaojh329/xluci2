Class.extend({
	loadCache: function()
	{
		var self = this;
		var d = $.Deferred();
		
		L.uci.load('wireless').then(function() {
			var cnt = L.uci.sections('wireless', 'wifi-device').length;
			L.uci.sections('wireless', 'wifi-device', function(s, sid) {
				$.when(self.getFreqList(sid),
					self.getTxpowerList(sid),
					self.getCountryList(sid),
					self.getDeviceStatus(sid)
					).then(function(freqlist, txpwrlist, countrylist, info) {
						cnt--;
						var hwmodes = info.hwmodes;
						var htmodes = info.htmodes;

						var channels = self.channels[sid] = {
							'11g': ['auto', L.tr('auto'), true],
							'11a': ['auto', L.tr('auto'), true]
						};

						for (var i = 0; i < freqlist.length; i++)
							channels[(freqlist[i].mhz > 2484) ? '11a' : '11g'].push(
								freqlist[i].channel,
								'%d (%d MHz)'.format(freqlist[i].channel, freqlist[i].mhz),
								!freqlist[i].restricted
							);

						self.modes[sid] = [
							'11g', channels['11g'].length > 3,
							'11a', channels['11a'].length > 3,
							'11n', $.inArray('n', hwmodes) > -1,
							'11ac', $.inArray('ac', hwmodes) > -1
						];

						self.htmodes[sid] = {
							'11g': [ ],
							'11a': [ ],
							'11n':  [
								'HT20', '20 MHz', $.inArray('HT20', htmodes) > -1,
								'HT40', '40 MHz', $.inArray('HT40', htmodes) > -1
							],
							'11ac': [
								'VHT20', '20 MHz', $.inArray('VHT20', htmodes) > -1,
								'VHT40', '40 MHz', $.inArray('VHT40', htmodes) > -1,
								'VHT80', '80 MHz', $.inArray('VHT80', htmodes) > -1,
								'VHT160', '160 MHz', $.inArray('VHT160', htmodes) > -1
							]
						};

						self.bands[sid] = {
							'11g': ['11g', '2.4 GHz', (channels['11g'].length > 3)],
							'11a': ['11a', '5 GHz', (channels['11a'].length > 3)],
							'11n':  [
								'11g', '2.4 GHz', (channels['11g'].length > 3),
								'11a', '5 GHz', (channels['11a'].length > 3)
							],
							'11ac': [
								'11a', '5 GHz', true
							]
						};

						self.txpwrlist[sid] = txpwrlist;
						self.countrylist[sid] = countrylist
						self.info[sid] = {
							country: info.country
						};
						
						if (cnt == 0)
							d.resolve();
					});
			});
		});

		return d.promise();	
	},
		
	load: function()
	{
		var self = this;

		if (self.rpcCache)
			return L.deferrable();

		self.rpcCache = { };
		self.modes = { };
		self.htmodes = { };
		self.channels = { };
		self.bands = { };
		self.txpwrlist = { };
		self.countrylist = { };
		self.info = { };
	
		return self.loadCache();
	},
	
	listDeviceNames: L.rpc.declare({
		object: 'iwinfo',
		method: 'devices',
		expect: { 'devices': [ ] },
		filter: function(data) {
			data.sort();
			return data;
		}
	}),

	getPhyName: L.rpc.declare({
		object: 'iwinfo',
		method: 'phyname',
		params: [ 'section' ],
		expect: { 'phyname': '' }
	}),
	
	getFreqList: L.rpc.declare({
		object: 'iwinfo',
		method: 'freqlist',
		params: [ 'device' ],
		expect: { 'results': [ ] }
	}),
	
	getTxpowerList: L.rpc.declare({
		object: 'iwinfo',
		method: 'txpowerlist',
		params: [ 'device' ],
		expect: { 'results': [ ] }
	}),

	getCountryList: L.rpc.declare({
		object: 'iwinfo',
		method: 'countrylist',
		params: [ 'device' ],
		expect: { 'results': [ ] }
	}),

	getDeviceStatus: L.rpc.declare({
		object: 'iwinfo',
		method: 'info',
		params: [ 'device' ],
		expect: { '': { } },
		filter: function(data, params) {
			if (!$.isEmptyObject(data))
			{
				data['device'] = params['device'];
				return data;
			}
			return undefined;
		}
	}),

	getAssocList: L.rpc.declare({
		object: 'iwinfo',
		method: 'assoclist',
		params: [ 'device' ],
		expect: { results: [ ] },
		filter: function(data, params) {
			for (var i = 0; i < data.length; i++)
				data[i]['device'] = params['device'];

			data.sort(function(a, b) {
				if (a.bssid < b.bssid)
					return -1;
				else if (a.bssid > b.bssid)
					return 1;
				else
					return 0;
			});

			return data;
		}
	}),

	getWirelessStatus: function() {
		return this.listDeviceNames().then(function(names) {
			L.rpc.batch();

			for (var i = 0; i < names.length; i++)
				L.wireless.getDeviceStatus(names[i]);

			return L.rpc.flush();
		}).then(function(networks) {
			var rv = { };
			var net_by_devname = { };

			var phy_attrs = [
				'country', 'channel', 'frequency', 'frequency_offset',
				'txpower', 'txpower_offset', 'hwmodes', 'hardware', 'phy'
			];

			var net_attrs = [
				'ssid', 'bssid', 'mode', 'quality', 'quality_max',
				'signal', 'noise', 'bitrate', 'encryption'
			];

			for (var i = 0; i < networks.length; i++)
			{
				var phy = rv[networks[i].phy] || (
					rv[networks[i].phy] = { networks: [ ] }
				);

				var net = net_by_devname[networks[i].device] = {
					device: networks[i].device
				};

				for (var j = 0; j < phy_attrs.length; j++)
					phy[phy_attrs[j]] = networks[i][phy_attrs[j]];

				for (var j = 0; j < net_attrs.length; j++)
					net[net_attrs[j]] = networks[i][net_attrs[j]];

				/* copy parent interface properties to wds interfaces */
				if (net.device.match(/^(.+)\.sta\d+$/) &&
				    net_by_devname[RegExp.$1])
				{
					var pnet = net_by_devname[RegExp.$1];
					for (var j = 0; j < net_attrs.length; j++)
						if (typeof(networks[i][net_attrs[j]]) === 'undefined' ||
						    net_attrs[j] == 'encryption')
							net[net_attrs[j]] = pnet[net_attrs[j]];
				}

				phy.networks.push(net);
			}

			return rv;
		});
	},

	getAssocLists: function()
	{
		return this.listDeviceNames().then(function(names) {
			L.rpc.batch();

			for (var i = 0; i < names.length; i++)
				L.wireless.getAssocList(names[i]);

			return L.rpc.flush();
		}).then(function(assoclists) {
			var rv = [ ];

			for (var i = 0; i < assoclists.length; i++)
				for (var j = 0; j < assoclists[i].length; j++)
					rv.push(assoclists[i][j]);

			return rv;
		});
	},

	formatEncryption: function(enc, condensed)
	{
		var format_list = function(l, s)
		{
			var rv = [ ];
			for (var i = 0; i < l.length; i++)
				rv.push(l[i].toUpperCase());
			return rv.join(s ? s : ', ');
		}

		if (!enc || !enc.enabled)
			return L.tr('No encryption');

		if (enc.wep)
		{
			if (condensed)
				return L.tr('WEP');
			else if (enc.wep.length == 2)
				return L.tr('WEP Open/Shared') + ' (%s)'.format(format_list(enc.ciphers, ', '));
			else if (enc.wep[0] == 'shared')
				return L.tr('WEP Shared Auth') + ' (%s)'.format(format_list(enc.ciphers, ', '));
			else
				return L.tr('WEP Open System') + ' (%s)'.format(format_list(enc.ciphers, ', '));
		}
		else if (enc.wpa)
		{
			if (condensed && enc.wpa.length == 2)
				return L.tr('WPA mixed');
			else if (condensed)
				return (enc.wpa[0] == 2) ? L.tr('WPA2') : L.tr('WPA');
			else if (enc.wpa.length == 2)
				return L.tr('mixed WPA/WPA2') + ' %s (%s)'.format(
					format_list(enc.authentication, '/'),
					format_list(enc.ciphers, ', ')
				);
			else if (enc.wpa[0] == 2)
				return 'WPA2 %s (%s)'.format(
					format_list(enc.authentication, '/'),
					format_list(enc.ciphers, ', ')
				);
			else
				return 'WPA %s (%s)'.format(
					format_list(enc.authentication, '/'),
					format_list(enc.ciphers, ', ')
				);
		}

		return L.tr('Unknown');
	},

	getOuiList: function()
	{
		var self = this;
		var d = $.Deferred();

		if (self.ouiList)
			return d.resolveWith(self, [self.ouiList]);
		
		L.file.exec('tar', ['-zxvf', '/usr/share/rpcd/oui.json.tar.gz', '-C', '/tmp']).then(function(r) {
			if (r.code == 1) {
				d.resolveWith(self, [{}]);
				return;
			}

			L.file.read('/tmp/oui.json').then(function(data) {
				L.file.exec('rm', ['/tmp/oui.json']);
				self.ouiList = JSON.parse(data);
				d.resolveWith(self, [self.ouiList]);
			});
		});

		return d.promise();	
	}
});
