L.ui.view.extend({
	title: L.tr('Startup'),

	getRcLocal: L.rpc.declare({
		object: 'luci2.system',
		method: 'rclocal_get',
		expect: { data: '' }
	}),

	setRcLocal: L.rpc.declare({
		object: 'luci2.system',
		method: 'rclocal_set',
		params: [ 'data' ]
	}),

	execute: function() {
		var self = this;
		var redraw = function() { return self.execute(); };
		var allow_write = self.options.acls.startup;

		return $.when(
			L.system.initList().then(function(list) {
				/* filter init scripts with no start prio */
				for (var i = 0; i < list.length; i++)
				{
					if (typeof(list[i].start) != 'undefined')
						continue;

					list.splice(i--, 1);
				}

				var initTable = new L.ui.table({
					columns: [ {
						caption: L.tr('Start priority'),
						key:     'start'
					}, {
						caption: L.tr('Initscript'),
						key:     'name'
					}, {
						key:     'enabled',
						format:  function(v, n) {
							return [
								$('<div />')
									.addClass('btn-group pull-right')
									.append($('<button />')
										.attr('disabled', !allow_write)
										.attr('name', list[n].name)
										.addClass('btn btn-sm')
										.addClass(v ? 'btn-success' : 'btn-danger')
										.text(v ? L.trc('Init script state', 'Enabled') : L.trc('Init script state', 'Disabled'))
										.click(function() {
											L.ui.loading(true);
											if (v)
												L.system.initDisable(this.getAttribute('name')).then(redraw);
											else
												L.system.initEnable(this.getAttribute('name')).then(redraw);
										}))
									.append($('<button />')
										.addClass('btn btn-primary btn-sm dropdown-toggle')
										.attr('data-toggle', 'dropdown')
										.attr('disabled', !allow_write)
										.text(L.tr('Action…')))
									.append($('<ul />')
										.addClass('dropdown-menu pull-right')
										.append($('<li />')
											.append($('<a />')
												.attr('href', '#')
												.text(L.tr('Reload'))
												.click(function(ev) { L.system.initReload(v).then(redraw); ev.preventDefault(); })))
										.append($('<li />')
											.append($('<a />')
												.attr('href', '#')
												.text(L.tr('Restart'))
												.click(function(ev) { L.system.initRestart(v).then(redraw); ev.preventDefault(); })))
										.append($('<li />')
											.append($('<a />')
												.attr('href', '#')
												.text(L.tr('Stop'))
												.click(function(ev) { L.system.initStop(v).then(redraw); ev.preventDefault(); }))))
							];
						}
					} ]
				});

				initTable.rows(list);
				initTable.insertInto('#init_table');

				L.ui.loading(false);
			}),
			self.getRcLocal().then(function(data) {
				$('textarea').val(data).attr('disabled', !allow_write);
				$('#rclocal button').attr('disabled', !allow_write).click(function() {
					var data = ($('textarea').val() || '').replace(/\r/g, '').replace(/\n?$/, '\n');
					L.ui.loading(true);
					self.setRcLocal(data).then(function() {
						$('textarea').val(data);
						L.ui.loading(false);
					});
				});
			})
		);
	}
});
