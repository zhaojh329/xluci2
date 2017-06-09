Class.extend({
	getSystemInfo: L.rpc.declare({
		object: 'system',
		method: 'info',
		expect: { '': { } }
	}),

	getBoardInfo: L.rpc.declare({
		object: 'system',
		method: 'board',
		expect: { '': { } }
	}),

	getDiskInfo: L.rpc.declare({
		object: 'luci2.system',
		method: 'diskfree',
		expect: { '': { } }
	}),

	getLocaltime: L.rpc.declare({
		object: 'luci2.system',
		method: 'localtime'
	}),

	getInfo: function(cb)
	{
		L.rpc.batch();

		this.getSystemInfo();
		this.getBoardInfo();
		this.getDiskInfo();

		return L.rpc.flush().then(function(info) {
			var rv = { };

			$.extend(rv, info[0]);
			$.extend(rv, info[1]);
			$.extend(rv, info[2]);

			return rv;
		});
	},


	initList: L.rpc.declare({
		object: 'luci2.system',
		method: 'init_list',
		expect: { initscripts: [ ] },
		filter: function(data) {
			data.sort(function(a, b) { return (a.start || 0) - (b.start || 0) });
			return data;
		}
	}),

	initEnabled: function(init, cb)
	{
		return this.initList().then(function(list) {
			for (var i = 0; i < list.length; i++)
				if (list[i].name == init)
					return !!list[i].enabled;

			return false;
		});
	},

	initRun: L.rpc.declare({
		object: 'luci2.system',
		method: 'init_action',
		params: [ 'name', 'action' ],
		filter: function(data) {
			return (data == 0);
		}
	}),

	initStart:   function(init, cb) { return L.system.initRun(init, 'start',   cb) },
	initStop:    function(init, cb) { return L.system.initRun(init, 'stop',    cb) },
	initRestart: function(init, cb) { return L.system.initRun(init, 'restart', cb) },
	initReload:  function(init, cb) { return L.system.initRun(init, 'reload',  cb) },
	initEnable:  function(init, cb) { return L.system.initRun(init, 'enable',  cb) },
	initDisable: function(init, cb) { return L.system.initRun(init, 'disable', cb) },


	performReboot: L.rpc.declare({
		object: 'luci2.system',
		method: 'reboot'
	})
});
