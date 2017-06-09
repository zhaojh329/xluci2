L.ui.view.extend({
	title: L.tr('Scheduled Tasks'),
	description: L.tr('This is the system crontab in which scheduled tasks can be defined.'),

	getCrontab: L.rpc.declare({
		object: 'luci2.system',
		method: 'crontab_get',
		expect: { data: '' }
	}),

	setCrontab: L.rpc.declare({
		object: 'luci2.system',
		method: 'crontab_set',
		params: [ 'data' ]
	}),

	execute: function() {
		var self = this;
		var allow_write = this.options.acls.cron;

		return self.getCrontab().then(function(data) {
			$('textarea').val(data).attr('disabled', !allow_write);
			$('#btn_save').attr('disabled', !allow_write).click(function() {
				var data = ($('textarea').val() || '').replace(/\r/g, '').replace(/\n?$/, '\n');
				L.ui.loading(true);
				self.setCrontab(data).then(function() {
					$('textarea').val(data);
					L.ui.loading(false);
				});
			});
		});
	}
});
