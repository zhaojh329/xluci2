(function() {
	var network_class = {
		deviceBlacklist: [
			/^gre[0-9]+$/,
			/^gretap[0-9]+$/,
			/^ifb[0-9]+$/,
			/^ip6tnl[0-9]+$/,
			/^sit[0-9]+$/,
			/^wlan[0-9]+\.sta[0-9]+$/,
			/^tunl[0-9]+$/,
			/^ip6gre[0-9]+$/
		],

		rpcCacheFunctions: [
			'protolist', 0, L.rpc.declare({
				object: 'network',
				method: 'get_proto_handlers',
				expect: { '': { } }
			}),
			'ifstate', 1, L.rpc.declare({
				object: 'network.interface',
				method: 'dump',
				expect: { 'interface': [ ] }
			}),
			'devstate', 2, L.rpc.declare({
				object: 'network.device',
				method: 'status',
				expect: { '': { } }
			}),
			'wifistate', 0, L.rpc.declare({
				object: 'network.wireless',
				method: 'status',
				expect: { '': { } }
			}),
			'bwstate', 2, L.rpc.declare({
				object: 'luci2.network.bwmon',
				method: 'statistics',
				expect: { 'statistics': { } }
			}),
			'devlist', 2, L.rpc.declare({
				object: 'luci2.network',
				method: 'device_list',
				expect: { 'devices': [ ] }
			}),
			'swlist', 0, L.rpc.declare({
				object: 'luci2.network',
				method: 'switch_list',
				expect: { 'switches': [ ] }
			})
		],

		loadProtocolHandler: function(proto)
		{
			var url = L.globals.resource + '/proto/' + proto + '.js';
			var self = L.network;

			var def = $.Deferred();

			$.ajax(url, {
				method: 'GET',
				cache: true,
				dataType: 'text'
			}).then(function(data) {
				try {
					var protoConstructorSource = (
						'(function(L, $) { ' +
							'return %s' +
						'})(L, $);\n\n' +
						'//# sourceURL=%s/%s'
					).format(data, window.location.origin, url);

					var protoClass = eval(protoConstructorSource);

					self.protocolHandlers[proto] = new protoClass();
				}
				catch(e) {
					alert('Unable to instantiate proto "%s": %s'.format(url, e));
				};

				def.resolve();
			}).fail(function() {
				def.resolve();
			});

			return def;
		},

		loadProtocolHandlers: function()
		{
			var self = L.network;
			var deferreds = [
				self.loadProtocolHandler('none')
			];

			for (var proto in self.rpcCache.protolist)
				deferreds.push(self.loadProtocolHandler(proto));

			return $.when.apply($, deferreds);
		},

		callSwitchInfo: L.rpc.declare({
			object: 'luci2.network',
			method: 'switch_info',
			params: [ 'switch' ],
			expect: { 'info': { } }
		}),

		callSwitchInfoCallback: function(responses) {
			var self = L.network;
			var swlist = self.rpcCache.swlist;
			var swstate = self.rpcCache.swstate = { };

			for (var i = 0; i < responses.length; i++)
				swstate[swlist[i]] = responses[i];
		},

		loadCacheCallback: function(level)
		{
			var self = L.network;
			var name = '_fetch_cache_cb_' + level;

			return self[name] || (
				self[name] = function(responses)
				{
					for (var i = 0; i < self.rpcCacheFunctions.length; i += 3)
						if (!level || self.rpcCacheFunctions[i + 1] == level)
							self.rpcCache[self.rpcCacheFunctions[i]] = responses.shift();

					if (!level)
					{
						L.rpc.batch();

						for (var i = 0; i < self.rpcCache.swlist.length; i++)
							self.callSwitchInfo(self.rpcCache.swlist[i]);

						return L.rpc.flush().then(self.callSwitchInfoCallback);
					}

					return L.deferrable();
				}
			);
		},

		loadCache: function(level)
		{
			var self = L.network;

			return L.uci.load(['network', 'wireless']).then(function() {
				L.rpc.batch();

				for (var i = 0; i < self.rpcCacheFunctions.length; i += 3)
					if (!level || self.rpcCacheFunctions[i + 1] == level)
						self.rpcCacheFunctions[i + 2]();

				return L.rpc.flush().then(self.loadCacheCallback(level || 0));
			});
		},

		isBlacklistedDevice: function(dev)
		{
			for (var i = 0; i < this.deviceBlacklist.length; i++)
				if (dev.match(this.deviceBlacklist[i]))
					return true;

			return false;
		},

		sortDevicesCallback: function(a, b)
		{
			if (a.options.kind < b.options.kind)
				return -1;
			else if (a.options.kind > b.options.kind)
				return 1;

			if (a.options.name < b.options.name)
				return -1;
			else if (a.options.name > b.options.name)
				return 1;

			return 0;
		},

		getDeviceObject: function(ifname)
		{
			var alias = (ifname.charAt(0) == '@');
			return this.deviceObjects[ifname] || (
				this.deviceObjects[ifname] = {
					ifname:  ifname,
					kind:    alias ? 'alias' : 'ethernet',
					type:    alias ? 0 : 1,
					up:      false,
					changed: { }
				}
			);
		},

		getInterfaceObject: function(name)
		{
			return this.interfaceObjects[name] || (
				this.interfaceObjects[name] = {
					name:    name,
					proto:   this.protocolHandlers.none,
					changed: { }
				}
			);
		},

		loadDevicesCallback: function()
		{
			var self = L.network;
			var wificount = { };

			for (var ifname in self.rpcCache.devstate)
			{
				if (self.isBlacklistedDevice(ifname))
					continue;

				var dev = self.rpcCache.devstate[ifname];
				var entry = self.getDeviceObject(ifname);

				entry.up = dev.up;

				switch (dev.type)
				{
				case 'IP tunnel':
					entry.kind = 'tunnel';
					break;

				case 'Bridge':
					entry.kind = 'bridge';
					//entry.ports = dev['bridge-members'].sort();
					break;
				}
			}

			for (var i = 0; i < self.rpcCache.devlist.length; i++)
			{
				var dev = self.rpcCache.devlist[i];

				if (self.isBlacklistedDevice(dev.device))
					continue;

				var entry = self.getDeviceObject(dev.device);

				entry.up   = dev.is_up;
				entry.type = dev.type;

				switch (dev.type)
				{
				case 1: /* Ethernet */
					if (dev.is_bridge)
						entry.kind = 'bridge';
					else if (dev.is_tuntap)
						entry.kind = 'tunnel';
					else if (dev.is_wireless)
						entry.kind = 'wifi';
					break;

				case 512: /* PPP */
				case 768: /* IP-IP Tunnel */
				case 769: /* IP6-IP6 Tunnel */
				case 776: /* IPv6-in-IPv4 */
				case 778: /* GRE over IP */
					entry.kind = 'tunnel';
					break;
				}
			}

			var net = L.uci.sections('network');
			for (var i = 0; i < net.length; i++)
			{
				var s = net[i];
				var sid = s['.name'];

				if (s['.type'] == 'device' && s.name)
				{
					var entry = self.getDeviceObject(s.name);

					switch (s.type)
					{
					case 'macvlan':
					case 'tunnel':
						entry.kind = 'tunnel';
						break;
					}

					entry.sid = sid;
				}
				else if (s['.type'] == 'interface' && !s['.anonymous'] && s.ifname)
				{
					var ifnames = L.toArray(s.ifname);

					for (var j = 0; j < ifnames.length; j++)
						self.getDeviceObject(ifnames[j]);

					if (s['.name'] != 'loopback')
					{
						var entry = self.getDeviceObject('@%s'.format(s['.name']));

						entry.type = 0;
						entry.kind = 'alias';
						entry.sid  = sid;
					}
				}
				else if (s['.type'] == 'switch_vlan' && s.device)
				{
					var sw = self.rpcCache.swstate[s.device];
					var vid = parseInt(s.vid || s.vlan);
					var ports = L.toArray(s.ports);

					if (!sw || !ports.length || isNaN(vid))
						continue;

					var ifname = undefined;

					for (var j = 0; j < ports.length; j++)
					{
						var port = parseInt(ports[j]);
						var tag = (ports[j].replace(/[^tu]/g, '') == 't');

						if (port == sw.cpu_port)
						{
							// XXX: need a way to map switch to netdev
							if (tag)
								ifname = 'eth0.%d'.format(vid);
							else
								ifname = 'eth0';

							break;
						}
					}

					if (!ifname)
						continue;

					var entry = self.getDeviceObject(ifname);

					entry.kind = 'vlan';
					entry.sid  = sid;
					entry.vsw  = sw;
					entry.vid  = vid;
				}
			}

			var wifi = L.uci.sections('wireless');
			for (var i = 0, c = 0; i < wifi.length; i++)
			{
				var s = wifi[i];

				if (s['.type'] == 'wifi-iface')
				{
					var sid = '@wifi-iface[%d]'.format(c++);

					if (!s.device)
						continue;

					var r = parseInt(s.device.replace(/^[^0-9]+/, ''));
					var n = wificount[s.device] = (wificount[s.device] || 0) + 1;
					var id = 'radio%d.network%d'.format(r, n);
					var ifname = id;

					if (self.rpcCache.wifistate[s.device])
					{
						var ifcs = self.rpcCache.wifistate[s.device].interfaces;
						for (var ifc in ifcs)
						{
							if (ifcs[ifc].section == sid && ifcs[ifc].ifname)
							{
								ifname = ifcs[ifc].ifname;
								break;
							}
						}
					}

					var entry = self.getDeviceObject(ifname);

					entry.kind   = 'wifi';
					entry.sid    = s['.name'];
					entry.wid    = id;
					entry.wdev   = s.device;
					entry.wmode  = s.mode;
					entry.wssid  = s.ssid;
					entry.wbssid = s.bssid;
				}
			}

			for (var i = 0; i < net.length; i++)
			{
				var s = net[i];
				var sid = s['.name'];

				if (s['.type'] == 'interface' && !s['.anonymous'] && s.type == 'bridge')
				{
					var ifnames = L.toArray(s.ifname);

					for (var ifname in self.deviceObjects)
					{
						var dev = self.deviceObjects[ifname];

						if (dev.kind != 'wifi')
							continue;

						var wnets = L.toArray(L.uci.get('wireless', dev.sid, 'network'));
						if ($.inArray(sid, wnets) > -1)
							ifnames.push(ifname);
					}

					entry = self.getDeviceObject('br-%s'.format(s['.name']));
					entry.type  = 1;
					entry.kind  = 'bridge';
					entry.sid   = sid;
					entry.ports = ifnames.sort();
				}
			}
		},

		loadInterfacesCallback: function()
		{
			var self = L.network;
			var net = L.uci.sections('network');

			for (var i = 0; i < net.length; i++)
			{
				var s = net[i];
				var sid = s['.name'];

				if (s['.type'] == 'interface' && !s['.anonymous'] && s.proto)
				{
					var entry = self.getInterfaceObject(s['.name']);
					var proto = self.protocolHandlers[s.proto] || self.protocolHandlers.none;

					var l3dev = undefined;
					var l2dev = undefined;

					var ifnames = L.toArray(s.ifname);

					for (var ifname in self.deviceObjects)
					{
						var dev = self.deviceObjects[ifname];

						if (dev.kind != 'wifi')
							continue;

						var wnets = L.toArray(L.uci.get('wireless', dev.sid, 'network'));
						if ($.inArray(entry.name, wnets) > -1)
							ifnames.push(ifname);
					}

					if (proto.virtual)
						l3dev = '%s-%s'.format(s.proto, entry.name);
					else if (s.type == 'bridge')
						l3dev = 'br-%s'.format(entry.name);
					else
						l3dev = ifnames[0];

					if (!proto.virtual && s.type == 'bridge')
						l2dev = 'br-%s'.format(entry.name);
					else if (!proto.virtual)
						l2dev = ifnames[0];

					entry.proto = proto;
					entry.sid   = sid;
					entry.l3dev = l3dev;
					entry.l2dev = l2dev;
				}
			}

			for (var i = 0; i < self.rpcCache.ifstate.length; i++)
			{
				var iface = self.rpcCache.ifstate[i];
				var entry = self.getInterfaceObject(iface['interface']);
				var proto = self.protocolHandlers[iface.proto] || self.protocolHandlers.none;

				/* this is a virtual interface, either deleted from config but
				   not applied yet or set up from external tools (6rd) */
				if (!entry.sid)
				{
					entry.proto = proto;
					entry.l2dev = iface.device;
					entry.l3dev = iface.l3_device;
				}
			}
		},

		load: function()
		{
			var self = this;

			if (self.rpcCache)
				return L.deferrable();

			self.rpcCache         = { };
			self.deviceObjects    = { };
			self.interfaceObjects = { };
			self.protocolHandlers = { };

			return self.loadCache()
				.then(self.loadProtocolHandlers)
				.then(self.loadDevicesCallback)
				.then(self.loadInterfacesCallback);
		},

		update: function()
		{
			delete this.rpcCache;
			return this.load();
		},

		refreshInterfaceStatus: function()
		{
			return this.loadCache(1).then(this.loadInterfacesCallback);
		},

		refreshDeviceStatus: function()
		{
			return this.loadCache(2).then(this.loadDevicesCallback);
		},

		refreshStatus: function()
		{
			return this.loadCache(1)
				.then(this.loadCache(2))
				.then(this.loadDevicesCallback)
				.then(this.loadInterfacesCallback);
		},

		getDevices: function()
		{
			var devs = [ ];

			for (var ifname in this.deviceObjects)
				if (ifname != 'lo')
					devs.push(new L.network.Device(this.deviceObjects[ifname]));

			return devs.sort(this.sortDevicesCallback);
		},

		getDeviceByInterface: function(iface)
		{
			if (iface instanceof L.network.Interface)
				iface = iface.name();

			if (this.interfaceObjects[iface])
				return this.getDevice(this.interfaceObjects[iface].l3dev) ||
					   this.getDevice(this.interfaceObjects[iface].l2dev);

			return undefined;
		},

		getDevice: function(ifname)
		{
			if (this.deviceObjects[ifname])
				return new L.network.Device(this.deviceObjects[ifname]);

			return undefined;
		},

		createDevice: function(name)
		{
			return new L.network.Device(this.getDeviceObject(name));
		},

		getInterfaces: function()
		{
			var ifaces = [ ];

			for (var name in this.interfaceObjects)
				if (name != 'loopback')
					ifaces.push(this.getInterface(name));

			ifaces.sort(function(a, b) {
				if (a.name() < b.name())
					return -1;
				else if (a.name() > b.name())
					return 1;
				else
					return 0;
			});

			return ifaces;
		},

		getInterfacesByDevice: function(dev)
		{
			var ifaces = [ ];

			if (dev instanceof L.network.Device)
				dev = dev.name();

			for (var name in this.interfaceObjects)
			{
				var iface = this.interfaceObjects[name];
				if (iface.l2dev == dev || iface.l3dev == dev)
					ifaces.push(this.getInterface(name));
			}

			ifaces.sort(function(a, b) {
				if (a.name() < b.name())
					return -1;
				else if (a.name() > b.name())
					return 1;
				else
					return 0;
			});

			return ifaces;
		},

		getInterface: function(iface)
		{
			if (this.interfaceObjects[iface])
				return new L.network.Interface(this.interfaceObjects[iface]);

			return undefined;
		},

		getProtocols: function()
		{
			var rv = [ ];

			for (var proto in this.protocolHandlers)
			{
				var pr = this.protocolHandlers[proto];

				rv.push({
					name:        proto,
					description: pr.description,
					virtual:     pr.virtual,
					tunnel:      pr.tunnel
				});
			}

			return rv.sort(function(a, b) {
				if (a.name < b.name)
					return -1;
				else if (a.name > b.name)
					return 1;
				else
					return 0;
			});
		},

		findWANByAddr: function(ipaddr)
		{
			for (var i = 0; i < this.rpcCache.ifstate.length; i++)
			{
				var ifstate = this.rpcCache.ifstate[i];

				if (!ifstate.route)
					continue;

				for (var j = 0; j < ifstate.route.length; j++)
					if (ifstate.route[j].mask == 0 &&
						ifstate.route[j].target == ipaddr &&
						typeof(ifstate.route[j].table) == 'undefined')
					{
						return this.getInterface(ifstate['interface']);
					}
			}

			return undefined;
		},

		findWAN: function()
		{
			return this.findWANByAddr('0.0.0.0');
		},

		findWAN6: function()
		{
			return this.findWANByAddr('::');
		},

		resolveAlias: function(ifname)
		{
			if (ifname instanceof L.network.Device)
				ifname = ifname.name();

			var dev = this.deviceObjects[ifname];
			var seen = { };

			while (dev && dev.kind == 'alias')
			{
				// loop
				if (seen[dev.ifname])
					return undefined;

				var ifc = this.interfaceObjects[dev.sid];

				seen[dev.ifname] = true;
				dev = ifc ? this.deviceObjects[ifc.l3dev] : undefined;
			}

			return dev ? this.getDevice(dev.ifname) : undefined;
		}
	};

	network_class.Interface = Class.extend({
		getStatus: function(key)
		{
			var s = L.network.rpcCache.ifstate;

			for (var i = 0; i < s.length; i++)
				if (s[i]['interface'] == this.options.name)
					return key ? s[i][key] : s[i];

			return undefined;
		},

		get: function(key)
		{
			return L.uci.get('network', this.options.name, key);
		},

		set: function(key, val)
		{
			return L.uci.set('network', this.options.name, key, val);
		},

		name: function()
		{
			return this.options.name;
		},

		protocol: function()
		{
			return (this.get('proto') || 'none');
		},

		isUp: function()
		{
			return (this.getStatus('up') === true);
		},

		isVirtual: function()
		{
			return (typeof(this.options.sid) != 'string');
		},

		getProtocol: function()
		{
			var prname = this.get('proto') || 'none';
			return L.network.protocolHandlers[prname] || L.network.protocolHandlers.none;
		},

		getUptime: function()
		{
			var uptime = this.getStatus('uptime');
			return isNaN(uptime) ? 0 : uptime;
		},

		getDevice: function(resolveAlias)
		{
			if (this.options.l3dev)
				return L.network.getDevice(this.options.l3dev);

			return undefined;
		},

		getPhysdev: function()
		{
			if (this.options.l2dev)
				return L.network.getDevice(this.options.l2dev);

			return undefined;
		},

		getSubdevices: function()
		{
			var rv = [ ];
			var dev = this.options.l2dev ?
				L.network.deviceObjects[this.options.l2dev] : undefined;

			if (dev && dev.kind == 'bridge' && dev.ports && dev.ports.length)
				for (var i = 0; i < dev.ports.length; i++)
					rv.push(L.network.getDevice(dev.ports[i]));

			return rv;
		},

		getIPv4Addrs: function(mask)
		{
			var rv = [ ];
			var addrs = this.getStatus('ipv4-address');

			if (addrs)
				for (var i = 0; i < addrs.length; i++)
					if (!mask)
						rv.push(addrs[i].address);
					else
						rv.push('%s/%d'.format(addrs[i].address, addrs[i].mask));

			return rv;
		},

		getIPv6Addrs: function(mask)
		{
			var rv = [ ];
			var addrs;

			addrs = this.getStatus('ipv6-address');

			if (addrs)
				for (var i = 0; i < addrs.length; i++)
					if (!mask)
						rv.push(addrs[i].address);
					else
						rv.push('%s/%d'.format(addrs[i].address, addrs[i].mask));

			addrs = this.getStatus('ipv6-prefix-assignment');

			if (addrs)
				for (var i = 0; i < addrs.length; i++)
					if (!mask)
						rv.push('%s1'.format(addrs[i].address));
					else
						rv.push('%s1/%d'.format(addrs[i].address, addrs[i].mask));

			return rv;
		},

		getDNSAddrs: function()
		{
			var rv = [ ];
			var addrs = this.getStatus('dns-server');

			if (addrs)
				for (var i = 0; i < addrs.length; i++)
					rv.push(addrs[i]);

			return rv;
		},

		getIPv4DNS: function()
		{
			var rv = [ ];
			var dns = this.getStatus('dns-server');

			if (dns)
				for (var i = 0; i < dns.length; i++)
					if (dns[i].indexOf(':') == -1)
						rv.push(dns[i]);

			return rv;
		},

		getIPv6DNS: function()
		{
			var rv = [ ];
			var dns = this.getStatus('dns-server');

			if (dns)
				for (var i = 0; i < dns.length; i++)
					if (dns[i].indexOf(':') > -1)
						rv.push(dns[i]);

			return rv;
		},

		getIPv4Gateway: function()
		{
			var rt = this.getStatus('route');

			if (rt)
				for (var i = 0; i < rt.length; i++)
					if (rt[i].target == '0.0.0.0' && rt[i].mask == 0)
						return rt[i].nexthop;

			return undefined;
		},

		getIPv6Gateway: function()
		{
			var rt = this.getStatus('route');

			if (rt)
				for (var i = 0; i < rt.length; i++)
					if (rt[i].target == '::' && rt[i].mask == 0)
						return rt[i].nexthop;

			return undefined;
		},

		getStatistics: function()
		{
			var dev = this.getDevice() || new L.network.Device({});
			return dev.getStatistics();
		},

		getTrafficHistory: function()
		{
			var dev = this.getDevice() || new L.network.Device({});
			return dev.getTrafficHistory();
		},

		renderBadge: function()
		{
			var badge = $('<span />')
				.addClass('badge')
				.text('%s: '.format(this.name()));

			var dev = this.getDevice();
			var subdevs = this.getSubdevices();

			if (subdevs.length)
				for (var j = 0; j < subdevs.length; j++)
					badge.append($('<img />')
						.attr('src', subdevs[j].icon())
						.attr('title', '%s (%s)'.format(subdevs[j].description(), subdevs[j].name() || '?')));
			else if (dev)
				badge.append($('<img />')
					.attr('src', dev.icon())
					.attr('title', '%s (%s)'.format(dev.description(), dev.name() || '?')));
			else
				badge.append($('<em />').text(L.tr('(No devices attached)')));

			return badge;
		},

		setDevices: function(devs)
		{
			var dev = this.getPhysdev();
			var old_devs = [ ];
			var changed = false;

			if (dev && dev.isBridge())
				old_devs = this.getSubdevices();
			else if (dev)
				old_devs = [ dev ];

			if (old_devs.length != devs.length)
				changed = true;
			else
				for (var i = 0; i < old_devs.length; i++)
				{
					var dev = devs[i];

					if (dev instanceof L.network.Device)
						dev = dev.name();

					if (!dev || old_devs[i].name() != dev)
					{
						changed = true;
						break;
					}
				}

			if (changed)
			{
				for (var i = 0; i < old_devs.length; i++)
					old_devs[i].removeFromInterface(this);

				for (var i = 0; i < devs.length; i++)
				{
					var dev = devs[i];

					if (!(dev instanceof L.network.Device))
						dev = L.network.getDevice(dev);

					if (dev)
						dev.attachToInterface(this);
				}
			}
		},

		changeProtocol: function(proto)
		{
			var pr = L.network.protocolHandlers[proto];

			if (!pr)
				return;

			for (var opt in (this.get() || { }))
			{
				switch (opt)
				{
				case 'type':
				case 'ifname':
				case 'macaddr':
					if (pr.virtual)
						this.set(opt, undefined);
					break;

				case 'auto':
				case 'mtu':
					break;

				case 'proto':
					this.set(opt, pr.protocol);
					break;

				default:
					this.set(opt, undefined);
					break;
				}
			}
		},

		createFormPrepareCallback: function()
		{
			var map = this;
			var iface = map.options.netIface;
			var proto = iface.getProtocol();
			var device = iface.getDevice();

			map.options.caption = L.tr('Configure "%s"').format(iface.name());

			map.sections = [];
			
			var section = map.section(L.cbi.SingleSection, iface.name(), {
				anonymous:   true
			});

			section.tab({
				id:      'general',
				caption: L.tr('General Settings')
			});

			section.tab({
				id:      'advanced',
				caption: L.tr('Advanced Settings')
			});

			section.tab({
				id:      'ipv6',
				caption: L.tr('IPv6')
			});

			section.tab({
				id:      'physical',
				caption: L.tr('Physical Settings')
			});

			section.tab({
				id:      'firewall',
				caption: L.tr('Firewall Settings')
			});

			section.taboption('general', L.cbi.CheckboxValue, 'auto', {
				caption:     L.tr('Start on boot'),
				optional:    true,
				initial:     true
			});

			var pr = section.taboption('general', L.cbi.ListValue, 'proto', {
				caption:     L.tr('Protocol')
			});

			pr.ucivalue = function(sid) {
				return iface.get('proto') || 'none';
			};

			var ok = section.taboption('general', L.cbi.ButtonValue, '_confirm', {
				caption:     L.tr('Really switch?'),
				description: L.tr('Changing the protocol will clear all configuration for this interface!'),
				text:        L.tr('Change protocol')
			});

			ok.on('click', function(ev) {
				iface.changeProtocol(pr.formvalue(ev.data.sid));
				iface.createForm(L.cbi.Modal).show();
			});

			var protos = L.network.getProtocols();

			for (var i = 0; i < protos.length; i++)
				pr.value(protos[i].name, protos[i].description);

			proto.populateForm(section, iface);

			if (!proto.virtual)
			{
				var br = section.taboption('physical', L.cbi.CheckboxValue, 'type', {
					caption:     L.tr('Network bridge'),
					description: L.tr('Merges multiple devices into one logical bridge'),
					optional:    true,
					enabled:     'bridge',
					disabled:    '',
					initial:     ''
				});

				section.taboption('physical', L.cbi.DeviceList, '__iface_multi', {
					caption:     L.tr('Devices'),
					multiple:    true,
					bridges:     false
				}).depends('type', true);

				section.taboption('physical', L.cbi.DeviceList, '__iface_single', {
					caption:     L.tr('Device'),
					multiple:    false,
					bridges:     true
				}).depends('type', false);

				var mac = section.taboption('physical', L.cbi.InputValue, 'macaddr', {
					caption:     L.tr('Override MAC'),
					optional:    true,
					placeholder: device ? device.getMACAddress() : undefined,
					datatype:    'macaddr'
				})				
			}

			section.taboption('physical', L.cbi.InputValue, 'mtu', {
				caption:     L.tr('Override MTU'),
				optional:    true,
				placeholder: device ? device.getMTU() : undefined,
				datatype:    'range(1, 9000)'
			});

			section.taboption('physical', L.cbi.InputValue, 'metric', {
				caption:     L.tr('Override Metric'),
				optional:    true,
				placeholder: 0,
				datatype:    'uinteger'
			});

			for (var field in section.fields)
			{
				switch (field)
				{
				case 'proto':
					break;

				case '_confirm':
					for (var i = 0; i < protos.length; i++)
						if (protos[i].name != proto.protocol)
							section.fields[field].depends('proto', protos[i].name);
					break;

				default:
					section.fields[field].depends('proto', proto.protocol, true);
					break;
				}
			}

			var fwz = section.taboption('firewall', L.cbi.FirewallZoneList, '_fwzone', {
				caption:     L.tr('Create / Assign firewall-zone'),
				description: L.tr('Choose the firewall zone you want to assign to this interface. Select unspecified to remove the interface from the associated zone or fill out the custom field to define a new zone and attach the interface to it.')
			});

			fwz.ucivalue = function(sid) {
				var z = L.firewall.findZoneByNetwork(sid);
				return z && z.name();
			};

			fwz.save = function(sid) {
				var name = this.formvalue(sid);
				var z = L.firewall.findZoneByName(name);

				if (!z) {
					if (name && name.length > 0)
						z = L.firewall.createZone(name, sid);
					else
						L.firewall.delNetwork(sid);
				}
				
				if (z) {
					L.firewall.delNetwork(sid);
					z.addNetwork(sid)
				}
			}
		},

		createForm: function(mapwidget)
		{
			var self = this;

			if (!mapwidget)
				mapwidget = L.cbi.Map;

			var map = new mapwidget('network', {
				prepare:     self.createFormPrepareCallback,
				netIface:    self
			});

			map.on('save', function() {
				L.firewall.update();
			});

			map.on('apply', function() {
				setTimeout(function() {
					var form = $('<p/>').text(L.tr('Have to restart the device to take effect after modifying the network configuration, whether to restart immediately?'));
					L.ui.dialog(L.tr('Interface Configure'), form, {
						style: 'confirm',
						confirm: function() {
							L.system.performReboot().then(function() {
								L.ui.reconnect(L.tr('Device rebooting...'));
							});
						}
					});
				}, 500);
			});

			return map;
		}
	});

	network_class.Device = Class.extend({
		wifiModeStrings: {
			ap: L.tr('Master'),
			sta: L.tr('Client'),
			adhoc: L.tr('Ad-Hoc'),
			monitor: L.tr('Monitor'),
			wds: L.tr('Static WDS')
		},

		getStatus: function(key)
		{
			var s = L.network.rpcCache.devstate[this.options.ifname];

			if (s)
				return key ? s[key] : s;

			return undefined;
		},

		get: function(key)
		{
			var sid = this.options.sid;
			var pkg = (this.options.kind == 'wifi') ? 'wireless' : 'network';
			return L.uci.get(pkg, sid, key);
		},

		set: function(key, val)
		{
			var sid = this.options.sid;
			var pkg = (this.options.kind == 'wifi') ? 'wireless' : 'network';
			return L.uci.set(pkg, sid, key, val);
		},

		init: function()
		{
			if (typeof(this.options.type) == 'undefined')
				this.options.type = 1;

			if (typeof(this.options.kind) == 'undefined')
				this.options.kind = 'ethernet';

			if (typeof(this.options.networks) == 'undefined')
				this.options.networks = [ ];
		},

		name: function()
		{
			return this.options.ifname;
		},

		description: function()
		{
			switch (this.options.kind)
			{
			case 'alias':
				return L.tr('Alias for network "%s"').format(this.options.ifname.substring(1));

			case 'bridge':
				return L.tr('Network bridge');

			case 'ethernet':
				return L.tr('Network device');

			case 'tunnel':
				switch (this.options.type)
				{
				case 1: /* tuntap */
					return L.tr('TAP device');

				case 512: /* PPP */
					return L.tr('PPP tunnel');

				case 768: /* IP-IP Tunnel */
					return L.tr('IP-in-IP tunnel');

				case 769: /* IP6-IP6 Tunnel */
					return L.tr('IPv6-in-IPv6 tunnel');

				case 776: /* IPv6-in-IPv4 */
					return L.tr('IPv6-over-IPv4 tunnel');
					break;

				case 778: /* GRE over IP */
					return L.tr('GRE-over-IP tunnel');

				default:
					return L.tr('Tunnel device');
				}

			case 'vlan':
				return L.tr('VLAN %d on %s').format(this.options.vid, this.options.vsw.model);

			case 'wifi':
				var o = this.options;
				return L.trc('(Wifi-Mode) "(SSID)" on (radioX)', '%s "%h" on %s').format(
					o.wmode ? this.wifiModeStrings[o.wmode] : L.tr('Unknown mode'),
					o.wssid || '?', o.wdev
				);
			}

			return L.tr('Unknown device');
		},

		icon: function(up)
		{
			var kind = this.options.kind;

			if (kind == 'alias')
				kind = 'ethernet';

			if (typeof(up) == 'undefined')
				up = this.isUp();

			return L.globals.resource + '/icons/%s%s.png'.format(kind, up ? '' : '_disabled');
		},

		isUp: function()
		{
			var l = L.network.rpcCache.devlist;

			for (var i = 0; i < l.length; i++)
				if (l[i].device == this.options.ifname)
					return (l[i].is_up === true);

			return false;
		},

		isAlias: function()
		{
			return (this.options.kind == 'alias');
		},

		isBridge: function()
		{
			return (this.options.kind == 'bridge');
		},

		isBridgeable: function()
		{
			return (this.options.type == 1 && this.options.kind != 'bridge');
		},

		isWireless: function()
		{
			return (this.options.kind == 'wifi');
		},

		isInNetwork: function(net)
		{
			if (!(net instanceof L.network.Interface))
				net = L.network.getInterface(net);

			if (net)
			{
				if (net.options.l3dev == this.options.ifname ||
					net.options.l2dev == this.options.ifname)
					return true;

				var dev = L.network.deviceObjects[net.options.l2dev];
				if (dev && dev.kind == 'bridge' && dev.ports)
					return ($.inArray(this.options.ifname, dev.ports) > -1);
			}

			return false;
		},

		getMTU: function()
		{
			var dev = L.network.rpcCache.devstate[this.options.ifname];
			if (dev && !isNaN(dev.mtu))
				return dev.mtu;

			return undefined;
		},

		getMACAddress: function()
		{
			if (this.options.type != 1)
				return undefined;

			var dev = L.network.rpcCache.devstate[this.options.ifname];
			if (dev && dev.macaddr)
				return dev.macaddr.toUpperCase();

			return undefined;
		},

		getInterfaces: function()
		{
			return L.network.getInterfacesByDevice(this.options.name);
		},

		getStatistics: function()
		{
			var s = this.getStatus('statistics') || { };
			return {
				rx_bytes: (s.rx_bytes || 0),
				tx_bytes: (s.tx_bytes || 0),
				rx_packets: (s.rx_packets || 0),
				tx_packets: (s.tx_packets || 0)
			};
		},

		getTrafficHistory: function()
		{
			var def = new Array(120);

			for (var i = 0; i < 120; i++)
				def[i] = 0;

			var h = L.network.rpcCache.bwstate[this.options.ifname] || { };
			return {
				rx_bytes: (h.rx_bytes || def),
				tx_bytes: (h.tx_bytes || def),
				rx_packets: (h.rx_packets || def),
				tx_packets: (h.tx_packets || def)
			};
		},

		removeFromInterface: function(iface)
		{
			if (!(iface instanceof L.network.Interface))
				iface = L.network.getInterface(iface);

			if (!iface)
				return;

			var ifnames = L.toArray(iface.get('ifname'));
			if ($.inArray(this.options.ifname, ifnames) > -1)
				iface.set('ifname', L.filterArray(ifnames, this.options.ifname));

			if (this.options.kind != 'wifi')
				return;

			var networks = L.toArray(this.get('network'));
			if ($.inArray(iface.name(), networks) > -1)
				this.set('network', L.filterArray(networks, iface.name()));
		},

		attachToInterface: function(iface)
		{
			if (!(iface instanceof L.network.Interface))
				iface = L.network.getInterface(iface);

			if (!iface)
				return;

			if (this.options.kind != 'wifi')
			{
				var ifnames = L.toArray(iface.get('ifname'));
				if ($.inArray(this.options.ifname, ifnames) < 0)
				{
					ifnames.push(this.options.ifname);
					iface.set('ifname', (ifnames.length > 1) ? ifnames : ifnames[0]);
				}
			}
			else
			{
				var networks = L.toArray(this.get('network'));
				if ($.inArray(iface.name(), networks) < 0)
				{
					networks.push(iface.name());
					this.set('network', (networks.length > 1) ? networks : networks[0]);
				}
			}
		}
	});

	network_class.Protocol = network_class.Interface.extend({
		description: '__unknown__',
		tunnel:      false,
		virtual:     false,

		populateForm: function(section, iface)
		{

		}
	});

	return Class.extend(network_class);
})();
