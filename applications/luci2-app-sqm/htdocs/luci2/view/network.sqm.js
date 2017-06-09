L.ui.view.extend({
	fileList: L.rpc.declare({
		object: 'file',
		method: 'list',
		params: [ 'path' ],
		expect: { entries: [ ] }
	}),

	readFile: L.rpc.declare({
		object: 'file',
		method: 'read',
		params: [ 'path' ],
		expect: { data: "" }
	}),

	scriptList: function() {
		var self = this;
		var deferred = $.Deferred();
		self.fileList('/usr/lib/sqm').then(function(entries) {
			var scripts = [];
			
			$.each(entries, function() {
				if (this.name.match(/\.qos$/)) {
					scripts.push({name: this.name});
				}
			});

			var pending = scripts.length;
			$.each(scripts, function(id, s) {
				for (var i = 0; i < entries.length; i++) {
					if (entries[i].name == s.name + '.help') {
						self.readFile('/usr/lib/sqm/' + entries[i].name).then(function(data) {
							s.description = data;
							if (pending-- == 1)
								deferred.resolve(scripts);
						});
						
						break;
					} else if (i == entries.length) {
						pending--;
					}
				}
			});
		});
		
		return deferred.promise();	
	},
		
	execute: function() {
		var self = this;

		return $.when(self.fileList('/tmp/run/sqm/available_qdiscs'), self.scriptList())
			.then(function(qdiscs, scripts) {
			var m = new L.cbi.Map('sqm', {
				caption:     L.tr('Smart Queue Management'),
				description: L.tr('With SQM you can enable traffic shaping, better mixing (Fair Queueing), active queue length management (AQM) and prioritisation on one network interface.')
			});

			var s = m.section(L.cbi.TypedSection, 'queue', {
				caption:	L.tr('Queues'),
				anonymous:	true,
				addremove:	true
			});

			s.tab({id: 'basic', caption: L.tr('Basic Settings')});
			s.tab({id: 'qdisc', caption: L.tr('Queue Discipline')});
			s.tab({id: 'linklayer', caption: L.tr('Link Layer Adaptation')});

			var e = s.taboption('basic', L.cbi.CheckboxValue, 'enabled', {
				caption:	L.tr('Enable this SQM instance')
			});

			e.save = function(sid) {
				if (this.formvalue(sid))
					return L.system.initStart('sqm') && L.system.initEnable('sqm');
				else
					return L.system.initStop('sqm') && L.system.initDisable('sqm');
			};

			s.taboption('basic', L.cbi.ListValue, 'interface', {
				caption:	L.tr('Interface name'),
				initial:	'eth0'
			}).load = function(sid) {
				this.choices = [];
				var devs = L.network.getDevices();
				for (var i = 0; i < devs.length; i++) {
					var dev = devs[i];
					if (dev.options.type == 1)
						this.value(dev.name());
				}
			};

			s.taboption('basic', L.cbi.InputValue, 'download', {
				caption:	L.tr('Download speed(ingress) (kbit/s)'),
				description: L.tr('set to 0 to selectively disable ingress shaping'),
				datatype:	'and(uinteger,min(0))'
			});

			s.taboption('basic', L.cbi.InputValue, 'upload', {
				caption:	L.tr('Upload speed(egress) (kbit/s)'),
				description: L.tr('set to 0 to selectively disable egress shaping'),
				datatype:	'and(uinteger,min(0))'
			});

			s.taboption('basic', L.cbi.CheckboxValue, 'debug_logging', {
				caption:	L.tr('Logging'),
				description: L.tr('Create log file for this SQM instance under /var/run/sqm/${Inerface_name}.debug.log. Make sure to delete log files manually.'),
				optional:	true
			});

			s.taboption('basic', L.cbi.ListValue, 'verbosity', {
				caption:	L.tr('Verbosity'),
				description: L.tr('Verbosity of SQM\'s output into the system log.'),
				initial:	'5'
			}).load = function(sid) {
				this.choices = [];
				this.value('0', 'silent');
				this.value('1', 'error');
				this.value('2', 'warning');
				this.value('5', 'info (' + L.tr('Default') + ')');
				this.value('8', 'debug');
				this.value('10', 'trace');
			};

			s.taboption('qdisc', L.cbi.ListValue, 'qdisc', {
				caption:	L.tr('Qdisc'),
				description: L.tr('Queuing disciplines useable on this system. After installing a new qdisc, you need to restart the router to see updates!'),
				initial:	'fq_codel'
			}).load = function(sid) {
				var qdisc = this;
				qdisc.choices = [];
				qdisc.value('fq_codel', 'fq_codel (' + L.tr('Default') + ')');

				$.each(qdiscs, function() {
					qdisc.value(this.name);
				});		
			};

			s.taboption('qdisc', L.cbi.ListValue, 'script', {
				caption:	L.tr('Queue setup script'),
				description: L.tr(scripts[0].description),
				initial:	'simple.qos'
			}).on('change', function(ev) {
				var self = ev.data.self;
				var sid = ev.data.sid;
				var val = self.formvalue(sid);
				$.each(scripts, function() {
					if (this.name == val)
						$('#' + self.id(sid)).parent().next().text(this.description);
				});
			}).load = function(sid) {
				var script = this;
				script.choices = [];
				$.each(scripts, function() {
					script.value(this.name);
				});
			};

			s.taboption('qdisc', L.cbi.CheckboxValue, 'qdisc_advanced', {
				caption:	L.tr('Advanced'),
				description: L.tr('Show and Use Advanced Configuration. Advanced options will only be used as long as this box is checked.'),
				initial:	false
			});

			s.taboption('qdisc', L.cbi.ListValue, 'squash_dscp', {
				caption:	L.tr('Squash DSCP on inbound packets (ingress)'),
				initial:	'1'
			}).value('1', 'SQUASH')
			  .value('0', 'DO NOT SQUASH')
			  .depends('qdisc_advanced', true);

			s.taboption('qdisc', L.cbi.ListValue, 'squash_ingress', {
				caption:	L.tr('Ignore DSCP on ingress'),
				initial:	'1'
			}).value('1', 'Ignore')
			  .value('0', 'Allow')
			  .depends('qdisc_advanced', true);

			s.taboption('qdisc', L.cbi.ListValue, 'ingress_ecn', {
				caption:	L.tr('Explicit congestion notification (ECN) status on inbound packets (ingress)'),
				initial:	'ECN'
			}).value('ECN', 'ECN (' + L.tr('Default') + ')')
			  .value('NOECN')
			  .depends('qdisc_advanced', true);

			s.taboption('qdisc', L.cbi.CheckboxValue, 'qdisc_really_really_advanced', {
				caption:	L.tr('Show and Use Dangerous Configuration. Dangerous options will only be used as long as this box is checked'),
				initial:	false
			}).depends('qdisc_advanced', true);

			s.taboption('qdisc', L.cbi.InputValue, 'ilimit', {
				caption:	L.tr('Hard limit on ingress queues; leave empty for default'),
				datatype:	'and(uinteger,min(0))'
			}).depends('qdisc_really_really_advanced', true);

			s.taboption('qdisc', L.cbi.InputValue, 'elimit', {
				caption:	L.tr('Hard limit on egress queues; leave empty for default'),
				datatype:	'and(uinteger,min(0))'
			}).depends('qdisc_really_really_advanced', true);

			s.taboption('qdisc', L.cbi.InputValue, 'itarget', {
				caption:	L.tr('Latency target for ingress, e.g 5ms [units: s, ms, or  us]; leave empty for automatic selection, put in the word default for the qdisc\'s default')
			}).depends('qdisc_really_really_advanced', true);

			s.taboption('qdisc', L.cbi.InputValue, 'etarget', {
				caption:	L.tr('Latency target for egress, e.g. 5ms [units: s, ms, or  us]; leave empty for automatic selection, put in the word default for the qdisc\'s default')
			}).depends('qdisc_really_really_advanced', true);

			s.taboption('qdisc', L.cbi.InputValue, 'iqdisc_opts', {
				caption:	L.tr('Advanced option string to pass to the ingress queueing disciplines; no error checking, use very carefully')
			}).depends('qdisc_really_really_advanced', true);

			s.taboption('qdisc', L.cbi.InputValue, 'eqdisc_opts', {
				caption:	L.tr('Advanced option string to pass to the egress queueing disciplines; no error checking, use very carefully')
			}).depends('qdisc_really_really_advanced', true);

			s.taboption('linklayer', L.cbi.ListValue, 'linklayer', {
				caption:	L.tr('Which link layer to account for'),
				initial:	'none'
			}).value('none', 'none (' + L.tr('Default') + ')')
			  .value('ethernet', 'Ethernet with overhead: select for e.g. VDSL2.')
			  .value('atm', 'ATM: select for e.g. ADSL1, ADSL2, ADSL2+.');

			s.taboption('linklayer', L.cbi.InputValue, 'overhead', {
				caption:	L.tr('Per Packet Overhead (byte)'),
				datatype:	'and(integer,min(-1500))',
				initial:	0
			}).depends('linklayer', 'ethernet')
			  .depends('linklayer', 'atm');

			s.taboption('linklayer', L.cbi.CheckboxValue, 'linklayer_advanced', {
				caption:	L.tr('Show Advanced Linklayer Options, (only needed if MTU > 1500). Advanced options will only be used as long as this box is checked.')
			}).depends('linklayer', 'ethernet')
			  .depends('linklayer', 'atm');

			s.taboption('linklayer', L.cbi.InputValue, 'tcMTU', {
				caption:	L.tr('Maximal Size for size and rate calculations, tcMTU (byte); needs to be >= interface MTU + overhead'),
				datatype:	'and(uinteger,min(0))',
				initial:	2047
			}).depends('linklayer_advanced', true);

			s.taboption('linklayer', L.cbi.InputValue, 'tcTSIZE', {
				caption:	L.tr('Number of entries in size/rate tables, TSIZE; for ATM choose TSIZE = (tcMTU + 1) / 16'),
				datatype:	'and(uinteger,min(0))',
				initial:	128
			}).depends('linklayer_advanced', true);

			s.taboption('linklayer', L.cbi.InputValue, 'tcMPU', {
				caption:	L.tr('Minimal packet size, MPU (byte); needs to be > 0 for ethernet size tables'),
				datatype:	'and(uinteger,min(0))',
				initial:	0
			}).depends('linklayer_advanced', true);

			s.taboption('linklayer', L.cbi.ListValue, 'linklayer_adaptation_mechanism', {
				caption:	L.tr('Which linklayer adaptation mechanism to use; for testing only'),
				initial:	'tc_stab'
			}).value('cake')
			  .value('htb_private')
			  .value('tc_stab', 'tc_stab (' + L.tr('Default') + ')')
			  .depends('linklayer_advanced', true);
				
			m.insertInto('#map');
		});		
	}
});
