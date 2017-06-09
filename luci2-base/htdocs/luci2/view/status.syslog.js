L.ui.view.extend({
	title: L.tr('System Log'),
	refresh: 5000,

	getSystemLog: L.rpc.declare({
		object: 'luci2.system',
		method: 'syslog',
		expect: { log: '' }
	}),

	execute: function() {
		return this.getSystemLog().then(function(log) {
			var ta = document.getElementById('syslog');
			var lines = log.replace(/\n+$/, '').split(/\n/);

			ta.rows = lines.length;
			ta.value = lines.reverse().join("\n");
		});
	}
});
