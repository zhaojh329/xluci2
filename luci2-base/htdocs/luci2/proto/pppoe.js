L.network.Protocol.extend({
	protocol:    'pppoe',
	description: L.tr('PPPoE'),
	tunnel:      false,
	virtual:     false,
	
	populateForm: function(section, iface)
	{
		var device = L.network.getDeviceByInterface(iface);

		section.taboption('general', L.cbi.InputValue, 'username', {
			caption:  L.tr('PAP/CHAP username')
		});
		
		section.taboption('general', L.cbi.PasswordValue, 'password', {
			caption:  L.tr('PAP/CHAP password'),
			optional: true
		});
		
		section.taboption('general', L.cbi.InputValue, 'ac', {
			caption:  L.tr('Access Concentrator'),
			placeholder: L.tr('auto'),
			optional: true
		});
		
		section.taboption('general', L.cbi.InputValue, 'service', {
			caption:  L.tr('Service Name'),
			placeholder: L.tr('auto'),
			optional: true
		});
		
		section.taboption('advanced', L.cbi.CheckboxValue, 'defaultroute', {
			caption:  L.tr('Use gateway'),
			optional:    true,
			initial:     true
		});
		
		section.taboption('advanced', L.cbi.CheckboxValue, 'peerdns', {
			caption:  L.tr('Use DNS'),
			description: L.tr('Use DNS servers advertised by PPP'),
			optional:    true,
			initial:     true
		});
		
		section.taboption('advanced', L.cbi.DynamicList, 'dns', {
			caption:  L.tr('Custom DNS'),
			datatype: 'ipaddr',
			optional: true,
		}).depends('peerdns', false);
		
		kf = section.taboption('advanced', L.cbi.InputValue, '_keepalive_failure', {
			caption:  L.tr('LCP echo failure threshold'),
			description: L.tr('Presume peer to be dead after given amount of LCP echo failures, use 0 to ignore failures'),
			datatype: 'uinteger',
			placeholder: '0',
			optional: true
		});

		kf.ucivalue = function(sid) {
			var v = iface.get('keepalive');
			if (v && v.split(' '))
				return v.split(' ')[0];
		};
		
		kf.save = function(sid) {
			var f = kf.formvalue('wan');
			var i = ki.formvalue('wan');
			
			f = f ? parseInt(f) : 0;
			i = i ? parseInt(i) : 5;
			var v = undefined;	
			if (f > 0)
				v = f + ' ' + i;
			iface.set('keepalive', v);	
		}
		
		ki = section.taboption('advanced', L.cbi.InputValue, '_keepalive_interval', {
			caption:  L.tr('LCP echo interval'),
			description: L.tr('Send LCP echo requests at the given interval in seconds, only effective in conjunction with failure threshold'),
			datatype: 'min(1)',
			placeholder: '5',
			optional: true
		});

		ki.ucivalue = function(sid) {
			var v = iface.get('keepalive');
			if (v && v.split(' ').length > 1) {
				return v.split(' ')[1];
			}
		};
		
		ki.save = kf.save;
		
		section.taboption('advanced', L.cbi.InputValue, 'demand', {
			caption:  L.tr('Inactivity timeout'),
			description: L.tr('Close inactive connection after the given amount of seconds, use 0 to persist connection'),
			datatype: 'uinteger',
			placeholder: '0',
			optional: true
		});
	}
});
