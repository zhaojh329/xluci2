(function() {
	var firewall_class  = {

		loadZones: function()
		{
			var self = this;
			self.zoneObjects = [];
			L.uci.sections('firewall', 'zone', function(z, sid) {
				var options = {sid: sid};
				self.zoneObjects.push(new L.firewall.Zone(options));
			});
		},

		loadForwards: function()
		{
			var self = this;
			self.forwardObjects = [];
			L.uci.sections('firewall', 'forwarding', function(fwd, sid) {
				var options = {sid: sid};
				self.forwardObjects.push(new L.firewall.Forward(options));
			});
		},

		loadCache: function()
		{
			var self = this;
			self.rpcCache = true;
			
			return L.uci.load('firewall').then(function() {
				self.loadZones();
				self.loadForwards();
			});
		},
		
		load: function()
		{
			var self = this;
			if (self.rpcCache)
				return L.deferrable();
			else
				return self.loadCache();
		},

		update: function()
		{
			delete this.rpcCache;
			return this.load();
		},
		
		getZoneColor: function(zone)
		{
			if ($.isPlainObject(zone))
				zone = zone.name();

			if (zone == 'lan')
				return '#90f090';
			else if (zone == 'wan')
				return '#f09090';

			for (var i = 0, hash = 0;
				 i < zone.length;
				 hash = zone.charCodeAt(i++) + ((hash << 5) - hash));

			for (var i = 0, color = '#';
				 i < 3;
				 color += ('00' + ((hash >> i++ * 8) & 0xFF).tostring(16)).slice(-2));

			return color;
		},

		findZoneByNetwork: function(network)
		{
			var self = this;
			var zone = undefined;

			$.each(self.zoneObjects, function() {
				var name = this.name();
				var nets = this.network();
				if (!name)
					return;

				for (var i = 0; i < nets.length; i++) {
					if (nets[i] == network) {
						zone = this;
						return;
					}
				}
			});

			return zone;
		},

		findZoneByName: function(name)
		{
			var self = this;
			var zone = undefined;

			$.each(self.zoneObjects, function() {
				if (this.name() == name) {
					zone = this;
					return;
				}
			});

			return zone;
		},

		findZoneBySid: function(sid)
		{
			var self = this;
			var zone = undefined;

			$.each(self.zoneObjects, function() {
				if (this.sid() == sid) {
					zone = this;
					return;
				}
			});

			return zone;
		},

		createZone: function(name)
		{
			var self = this;
			var sid = L.uci.add('firewall', 'zone');
			var z = new L.firewall.Zone({sid: sid});
			self.zoneObjects.push(z);
			
			z.set('name', name);
			z.set('input', 'ACCEPT');
			z.set('forward', 'REJECT');
			z.set('output', 'ACCEPT');
			
			return z;
		},
		
		delNetwork: function(n)
		{
			var self = this;
			
			if (!n)
				return;
			
			$.each(self.zoneObjects, function() {
				this.delNetwork(n);
			});	
		}
	};

	firewall_class.Zone = Class.extend({
		sid: function()
		{
			return this.options.sid;
		},
		
		get: function(key)
		{
			return L.uci.get('firewall', this.sid(), key);
		},

		set: function(key, val)
		{
			return L.uci.set('firewall', this.sid(), key, val);
		},

		network: function()
		{
			return L.toArray(this.get('network'));
		},
		
		name: function()
		{
			return this.get('name');
		},

		addNetwork: function(n)
		{
			var nets = L.toObject(this.network());
			if (!nets[n])
				nets[n] = true;

			this.set('network', L.toArray(nets));
		},

		delNetwork: function(n)
		{
			var nets = this.network();
			var netsObj = L.toObject(nets);
			
			if (netsObj[n])
				nets.pop(n);

			this.set('network', nets);
		},

		findForwardsBy: function(what)
		{
			var forwards = [];
			var name = this.name()

			$.each(L.firewall.forwardObjects, function() {
				if (this.src() && this.dest() && this[what]() == name)
					forwards.push(this);
			});

			return forwards
		},

		createFormPrepareCallback: function()
		{
			var map = this;
			var zone = map.options.zone;

			map.options.caption = L.tr('Zone "%s"').format(zone.name());

			map.sections = [];

			var section = map.section(L.cbi.SingleSection, zone.sid(), {
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
				id:      		'fwd',
				caption: 		L.tr('Inter-Zone Forwarding'),
				description:	L.tr('The options below control the forwarding policies between this zone ("%s") and other zones.Destination zones cover forwarded traffic originating from "%s". Source zones match forwarded traffic from other zones targeted at "%s". The forwarding rule is unidirectional, e.g. a forward from lan to wan does not imply a permission to forward from wan to lan as well.').format(zone.name(), zone.name(), zone.name())
			});

			section.taboption('general', L.cbi.InputValue, 'name', {
				caption:     L.tr('Name'),
				datatype:    'and(uciname,maxlength(11))'
			});

			section.taboption('general', L.cbi.ListValue, 'input', {
				caption:     L.tr('Input')
			}).load = function(sid) {
				this.choices = [];
				this.value('REJECT', L.tr('reject'));
				this.value('DROP', L.tr('drop'));
				this.value('ACCEPT', L.tr('accept'));
			};

			section.taboption('general', L.cbi.ListValue, 'output', {
				caption:     L.tr('Output')
			}).load = function(sid) {
				this.choices = [];
				this.value('REJECT', L.tr('reject'));
				this.value('DROP', L.tr('drop'));
				this.value('ACCEPT', L.tr('accept'));
			};

			section.taboption('general', L.cbi.ListValue, 'forward', {
				caption:     L.tr('Forward')
			}).load = function(sid) {
				this.choices = [];
				this.value('REJECT', L.tr('reject'));
				this.value('DROP', L.tr('drop'));
				this.value('ACCEPT', L.tr('accept'));
			};

			section.taboption('general', L.cbi.CheckboxValue, 'masq', {
				caption:	L.tr('Masquerading')
			});

			section.taboption('general', L.cbi.CheckboxValue, 'mtu_fix', {
				caption:	L.tr('MSS clamping')
			});

			section.taboption('general', L.cbi.NetworkList, 'network', {
				caption:	L.tr('Covered networks'),
				multiple:	true
			});

			section.taboption('advanced', L.cbi.ListValue, 'family', {
				caption:	L.tr('Restrict to address family'),
				optional:	true
			}).load = function(sid) {
				this.choices = [];
				this.value('', L.tr('IPv4 and IPv6'));
				this.value('ipv4', L.tr('IPv4 only'));
				this.value('ipv6', L.tr('IPv6 only'));
			};

			section.taboption('advanced', L.cbi.DynamicList, 'masq_src', {
				caption:		L.tr('Restrict Masquerading to given source subnets'),
				datatype:		"list(neg(or(uciname,hostname,ip4addr)))",
				placeholder:	"0.0.0.0/0"
			}).depends('family', false).depends('family', 'ipv4');

			section.taboption('advanced', L.cbi.DynamicList, 'masq_dest', {
				caption:	L.tr('Restrict Masquerading to given destination subnets'),
				datatype:		"list(neg(or(uciname,hostname,ip4addr)))",
				placeholder:	"0.0.0.0/0"
			}).depends('family', false).depends('family', 'ipv4');
			
			section.taboption('advanced', L.cbi.CheckboxValue, 'conntrack', {
				caption:	L.tr('Force connection tracking')
			});

			section.taboption('advanced', L.cbi.CheckboxValue, 'log', {
				caption:	L.tr('Enable logging on this zone'),
				initial:	true
			});

			section.taboption('advanced', L.cbi.InputValue, 'log_limit', {
				caption:		L.tr('Limit log messages'),
				optional:		true,
				placeholder:	'10/minute'
			}).depends('log', true);

			var out = section.taboption('fwd', L.cbi.FirewallZoneList, 'out', {
				caption:	L.tr('Allow forward to destination zones'),
				nocreate:	true,
				multiple:	true,
				exclude:	zone.name()
			});

			out.ucivalue = function(sid) {
				var zones = [];
				$.each(zone.findForwardsBy('src'), function() {
					zones.push(this.dest());
				});

				return zones;
			};

			out.save = function(sid) {
				var self = this;
				
				var i = 0;
				var dests = L.toArray(self.formvalue(sid));
				$.each(L.firewall.forwardObjects, function() {
					if (this.src() == zone.name()) {
						if (i < dests.length)
							this.set('dest', dests[i++]);
						else
							L.uci.remove('firewall', this.sid());
					}
				});

				while (i < dests.length) {
					var sid = L.uci.add('firewall', 'forwarding');
					var fwd = new L.firewall.Forward({sid: sid});

					fwd.set('src', zone.name());
					fwd.set('dest', dests[i++]);
				}

				L.firewall.loadForwards();
			};

			var inp = section.taboption('fwd', L.cbi.FirewallZoneList, 'in', {
				caption:	L.tr('Allow forward from source zones'),
				nocreate:	true,
				multiple:	true,
				exclude:	zone.name()
			});

			inp.ucivalue = function(sid) {
				var zones = [];
				$.each(zone.findForwardsBy('dest'), function() {
					zones.push(this.src());
				});

				return zones;
			};

			inp.save = function(sid) {
				var self = this;
				
				var i = 0;
				var srcs = L.toArray(self.formvalue(sid));
				$.each(L.firewall.forwardObjects, function() {
					if (this.dest() == zone.name()) {
						if (i < srcs.length)
							this.set('src', srcs[i++]);
						else
							L.uci.remove('firewall', this.sid());
					}
				});

				while (i < srcs.length) {
					var sid = L.uci.add('firewall', 'forwarding');
					var fwd = new L.firewall.Forward({sid: sid});

					fwd.set('src', srcs[i++]);
					fwd.set('dest', zone.name());
				}

				L.firewall.loadForwards();
			};			
		},

		createForm: function()
		{
			var self = this;

			var map = new L.cbi.Modal('firewall', {
				prepare:	self.createFormPrepareCallback,
				zone:		self
			});

			map.on('save', function() {
				L.firewall.update();
			});

			return map.show();
		}
	});

	firewall_class.Forward = Class.extend({
		sid: function()
		{
			return this.options.sid;
		},
		
		get: function(key)
		{
			return L.uci.get('firewall', this.sid(), key);
		},

		set: function(key, val)
		{
			return L.uci.set('firewall', this.sid(), key, val);
		},

		src: function()
		{
			return this.get('src');
		},

		dest: function()
		{
			return this.get('dest');
		}
	});
	
	return Class.extend(firewall_class);
})();
