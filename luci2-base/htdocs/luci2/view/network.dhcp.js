L.ui.view.extend({
	
	getARPTable: L.rpc.declare({
		object: 'luci2.network',
		method: 'arp_table',
		expect: { entries: [ ] },
		filter: function(data, params) {
			var tmp = [ ];
			for (var i = 0; i < data.length; i++)
				if (data[i].macaddr != '00:00:00:00:00:00')
					tmp.push(data[i]);
			return tmp;
		}
	}),

	execute: function() {
		var self = this;
		
		var m = new L.cbi.Map('dhcp', {
			caption:     L.tr('DHCP and DNS'),
			description: L.tr('Dnsmasq is a combined DHCP-Server and DNS-Forwarder for NAT firewalls'),
			collabsible: true
		});

		var s = m.section(L.cbi.TypedSection, 'dnsmasq', {
			caption:     L.tr('Server Settings')
		});

		s.tab({
			id:			'general',
			caption:	L.tr('General Settings')
		});

		s.taboption('general', L.cbi.CheckboxValue, 'domainneeded', {
			caption:     L.tr('Domain required'),
			description: L.tr('Don\'t forward DNS-Requests without DNS-Name'),
			initial:	 true
		});
		
		s.taboption('general', L.cbi.CheckboxValue, 'authoritative', {
			caption:     L.tr('Authoritative'),
			description: L.tr('This is the only DHCP in the local network'),
			initial:	 true
		});
		
		s.taboption('general', L.cbi.InputValue, 'local', {
			caption:     L.tr('Local server'),
			description: L.tr('Local domain specification. Names matching this domain are never forwarded and are resolved from DHCP or hosts files only')
		});

		s.taboption('general', L.cbi.InputValue, 'domain', {
			caption:     L.tr('Local domain'),
			description: L.tr('Local domain suffix appended to DHCP names and hosts file entries')
		});
		
		s.taboption('general', L.cbi.CheckboxValue, 'logqueries', {
			caption:     L.tr('Log queries'),
			description: L.tr('Write received DNS requests to syslog')
		});
		
		s.taboption('general', L.cbi.DynamicList, 'server', {
			caption:     L.tr('DNS forwardings'),
			description: L.tr('List of DNS servers to forward requests to'),
			placeholder: '/example.org/10.1.2.3',
			optional:	 true
		});
		
		s.taboption('general', L.cbi.CheckboxValue, 'rebind_protection', {
			caption:     L.tr('Rebind protection'),
			description: L.tr('Discard upstream RFC1918 responses'),
			initial:     true
		});
		
		s.taboption('general', L.cbi.CheckboxValue, 'rebind_localhost', {
			caption:     L.tr('Allow localhost'),
			description: L.tr('Allow upstream responses in the 127.0.0.0/8 range, e.g. for RBL services')
		}).depends('rebind_protection', true);
		
		s.taboption('general', L.cbi.DynamicList, 'rebind_domain', {
			caption:     L.tr('Domain whitelist'),
			description: L.tr('List of domains to allow RFC1918 responses for'),
			datatype:    'host',
			placeholder: 'ihost.netflix.com',
		}).depends('rebind_protection', true);
		
		s.tab({
			id:			'files',
			caption:	L.tr('Resolv and Hosts Files')
		});
		
		s.taboption('files', L.cbi.CheckboxValue, 'readethers', {
			caption:     L.tr('Use /etc/ethers'),
			description: L.tr('Read /etc/ethers to configure the DHCP-Server')
		});
		
		s.taboption('files', L.cbi.InputValue, 'leasefile', {
			caption:	 L.tr('Leasefile'),
			description: L.tr('file where given DHCP-leases will be stored')
		});
		
		s.taboption('files', L.cbi.CheckboxValue, 'noresolv', {
			caption:	L.tr('Ignore resolve file')
		});
		
		s.taboption('files', L.cbi.InputValue, 'resolvfile', {
			caption:     L.tr('Resolve file'),
			description: L.tr('local DNS file'),
			optional:    true
		}).depends('noresolv', false);
		
		s.taboption('files', L.cbi.CheckboxValue, 'nohosts', {
			caption:     L.tr('Ignore /etc/hosts')
		});
		
		s.taboption('files', L.cbi.DynamicList, 'addnhosts', {
			caption:    L.tr('Additional Hosts files'),
			optional:	true
		});

		s.tab({
			id:			'advanced',
			caption:	L.tr('Advanced Settings')
		});
		
		s.taboption('advanced', L.cbi.CheckboxValue, 'quietdhcp', {
			caption:     L.tr('Suppress logging'),
			description: L.tr('Suppress logging of the routine operation of these protocols.')
		});
		
		s.taboption('advanced', L.cbi.CheckboxValue, 'sequential_ip', {
			caption:     L.tr('Allocate IP sequentially'),
			description: L.tr('Allocate IP addresses sequentially, starting from the lowest available address')
		});
		
		s.taboption('advanced', L.cbi.CheckboxValue, 'boguspriv', {
			caption:     L.tr('Filter private'),
			description: L.tr('Do not forward reverse lookups for local networks')
		});
		
		s.taboption('advanced', L.cbi.CheckboxValue, 'filterwin2k', {
			caption:     L.tr('Filter useless'),
			description: L.tr('Do not forward requests that cannot be answered by public name servers')
		});
		
		s.taboption('advanced', L.cbi.CheckboxValue, 'localise_queries', {
			caption:     L.tr('Localise queries'),
			description: L.tr('Localise hostname depending on the requesting subnet if multiple IPs are available')
		});
		
		s.taboption('advanced', L.cbi.CheckboxValue, 'expandhosts', {
			caption:     L.tr('Expand hosts'),
			description: L.tr('Add local domain suffix to names served from hosts files'),
			initial:	 true
		});
		
		s.taboption('advanced', L.cbi.CheckboxValue, 'nonegcache', {
			caption:     L.tr('No negative cache'),
			description: L.tr('Do not cache negative replies, e.g. for not existing domains')
		});
		
		s.taboption('advanced', L.cbi.CheckboxValue, 'strictorder', {
			caption:     L.tr('Strict order'),
			description: L.tr('DNS servers will be queried in the order of the resolvfile')
		});
		
		s.taboption('advanced', L.cbi.DynamicList, 'bogusnxdomain', {
			caption:     L.tr('Bogus NX Domain Override'),
			description: L.tr('List of hosts that supply bogus NX domain results'),
			placeholder: '67.215.65.132',
			optional:	 true
		});
		
		s.taboption('advanced', L.cbi.InputValue, 'port', {
			caption:     L.tr('DNS server port'),
			description: L.tr('Listening port for inbound DNS queries'),
			placeholder: '53',
			datatype:	 "port",
			optional:	 true
		});
		
		s.taboption('advanced', L.cbi.InputValue, 'queryport', {
			caption:     L.tr('DNS query port'),
			description: L.tr('Fixed source port for outbound DNS queries'),
			placeholder: L.tr('any'),
			datatype:	 "port",
			optional:	 true
		});
		
		s.taboption('advanced', L.cbi.InputValue, 'dhcpleasemax', {
			caption:     L.tr('Max. DHCP leases'),
			description: L.tr('Maximum allowed number of active DHCP leases'),
			placeholder: L.tr('unlimited'),
			datatype:	 "uinteger",
			optional:	 true
		});
		
		s.taboption('advanced', L.cbi.InputValue, 'ednspacket_max', {
			caption:     L.tr('Max. EDNS0 packet size'),
			description: L.tr('Maximum allowed size of EDNS.0 UDP packets'),
			placeholder: '1280',
			datatype:	 "uinteger",
			optional:	 true
		});
		
		s.taboption('advanced', L.cbi.InputValue, 'dnsforwardmax', {
			caption:     L.tr('Max. concurrent queries'),
			description: L.tr('Maximum allowed number of concurrent DNS queries'),
			placeholder: '150',
			datatype:	 "uinteger",
			optional:	 true
		});

		var s2 = m.section(L.cbi.TypedSection, 'dhcp', {
				caption:	L.tr('DHCP Server'),
				collabsible:	true
		});

		s2.tab({
			id:			'general',
			caption:	L.tr('General Settings')
		});

		s2.tab({
			id:			'advanced',
			caption:	L.tr('Advanced Settings')
		});

		s2.taboption('general', L.cbi.DummyValue, 'interface', {
			caption:     L.tr('Interface')
		});

		s2.taboption('general', L.cbi.CheckboxValue, 'ignore', {
			caption:		L.tr('Ignore interface'),
			description:	L.tr('Disable DHCP for this interface.')
		});

		s2.taboption('general', L.cbi.InputValue, 'start', {
			caption:     	L.tr('Start'),
			description:	L.tr('Lowest leased address as offset from the network address.'),
			optional:		true,
			datatype:		'or(uinteger,ip4addr)',
			placeholder:	'100'
		});

		s2.taboption('general', L.cbi.InputValue, 'limit', {
			caption:     	L.tr('Limit'),
			description:	L.tr('Maximum number of leased addresses.'),
			optional:		true,
			datatype:		'uinteger',
			placeholder:	'150'
		});

		s2.taboption('general', L.cbi.InputValue, 'leasetime', {
			caption:     	L.tr('Leasetime'),
			description:	L.tr('Expiry time of leased addresses, minimum is 2 minutes (2m).'),
			optional:		true,
			placeholder:	'12h',
			datatype:		function(v, elem) {
				if (v == '1m')
					return L.tr('minimum is 2 minutes (2m).');
				
				if (/^\d+h$|m$/.test(v))
					return true;

				return L.tr('Invalid format. Correct format: "12h" or "30m"');
			}
		});

		s2.taboption('advanced', L.cbi.CheckboxValue, 'dynamicdhcp', {
			caption:     	L.tr('Dynamic DHCP'),
			description:	L.tr('Dynamically allocate DHCP addresses for clients. If disabled, only clients having static leases will be served.'),
			initial:		true
		});

		s2.taboption('advanced', L.cbi.CheckboxValue, 'force', {
			caption:     	L.tr('Force'),
			description:	L.tr('Force DHCP on this network even if another server is detected.')
		});

		s2.taboption('advanced', L.cbi.InputValue, 'netmask', {
			caption:     	L.tr('IPv4-Netmask'),
			description:	L.tr('Override the netmask sent to clients. Normally it is calculated from the subnet that is served.'),
			optional:		true,
			datatype:		'ip4addr'
		});
/*
		s2.taboption('advanced', L.cbi.DynamicList, 'dhcp_option', {
			caption:     	L.tr('DHCP-Options'),
			description:	L.tr('Define additional DHCP options, for example "6,192.168.2.1,192.168.2.2" which advertises different DNS servers to clients.')
		});
*/
		var cd = s2.taboption('advanced', L.cbi.DynamicList, '__dns', {
			caption:     	L.tr('Custom DNS'),
			description:	L.tr('Advertises different DNS servers to clients.'),
			uci_option:		'dhcp_option',			
			datatype:		'ip4addr'
		});

		cd.ucivalue = function(sid) {
			var v = this.callSuper('ucivalue', sid);
			
			if (!$.isArray(v))
				v = (typeof(v) != 'undefined') ? v.toString().split(/\s+/) : [ ];
			
			for (var i = 0; i < v.length; i++) {
				var t = v[i].split(',');
				if (t[0] != '6')
					continue;
				
				for (var j = 1; j < t.length; j++)
					if (!L.parseIPv4(t[j]))
						break;

				if (j < t.length)
					break;
				
				return t.slice(1);
			}
			
			return [ ];
		};

		cd.save = function(sid) {
			var v = this.formvalue(sid);
			
			if (v.length)
				v = ['6,' + v.join(',')];
			
			this.ownerMap.set('dhcp', sid, 'dhcp_option', v);
		};
		
		var s3 = m.section(L.cbi.TableSection, 'host', {
			caption:		L.tr('Static Leases'),
			anonymous:  	true,
			addremove:  	true,
			add_caption: 	L.tr('Add'),
			remove_caption: L.tr('Remove')
		});
		
		s3.option(L.cbi.InputValue, 'name', {
			caption:     L.tr('Hostname'),
			datatype:    'hostname',
			optional:	 true
		});
		
		mac = s3.option(L.cbi.ComboBox, 'mac', {
			caption:     L.tr('MAC-Address'),
			datatype:    'macaddr'
		});

		ip = s3.option(L.cbi.ComboBox, 'ip', {
			caption:     L.tr('IPv4-Address'),
			datatype:    'ip4addr'
		});

		m.on("apply", function(ev){
			L.system.initRestart("dnsmasq");
		});

		return self.getARPTable().then(function(arp) {
			for (var i = 0; i < arp.length; i++) {
				mac.value(arp[i].macaddr);
				ip.value(arp[i].ipaddr);
			}
			
			m.insertInto('#map');
		});
	}
});
