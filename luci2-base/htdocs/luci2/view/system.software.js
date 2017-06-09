L.ui.view.extend({
	title: L.tr('Package management'),

	opkg: {
		updateLists: L.rpc.declare({
			object: 'luci2.opkg',
			method: 'update',
			expect: { '': { } }
		}),

		_allPackages: L.rpc.declare({
			object: 'luci2.opkg',
			method: 'list',
			params: [ 'offset', 'limit', 'pattern' ],
			expect: { '': { } }
		}),

		_installedPackages: L.rpc.declare({
			object: 'luci2.opkg',
			method: 'list_installed',
			params: [ 'offset', 'limit', 'pattern' ],
			expect: { '': { } }
		}),

		_findPackages: L.rpc.declare({
			object: 'luci2.opkg',
			method: 'find',
			params: [ 'offset', 'limit', 'pattern' ],
			expect: { '': { } }
		}),

		_fetchPackages: function(action, offset, limit, pattern)
		{
			var packages = [ ];

			return action(offset, limit, pattern).then(function(list) {
				if (!list.total || !list.packages)
					return { length: 0, total: 0 };

				packages.push.apply(packages, list.packages);
				packages.total = list.total;

				if (limit <= 0)
					limit = list.total;

				if (packages.length >= limit)
					return packages;

				L.rpc.batch();

				for (var i = offset + packages.length; i < limit; i += 100)
					action(i, (Math.min(i + 100, limit) % 100) || 100, pattern);

				return L.rpc.flush();
			}).then(function(lists) {
				for (var i = 0; i < lists.length; i++)
				{
					if (!lists[i].total || !lists[i].packages)
						continue;

					packages.push.apply(packages, lists[i].packages);
					packages.total = lists[i].total;
				}

				return packages;
			});
		},

		listPackages: function(offset, limit, pattern)
		{
			return this._fetchPackages(this._allPackages, offset, limit, pattern);
		},

		installedPackages: function(offset, limit, pattern)
		{
			return this._fetchPackages(this._installedPackages, offset, limit, pattern);
		},

		findPackages: function(offset, limit, pattern)
		{
			return this._fetchPackages(this._findPackages, offset, limit, pattern);
		},

		installPackage: L.rpc.declare({
			object: 'luci2.opkg',
			method: 'install',
			params: [ 'package' ],
			expect: { '': { } }
		}),

		removePackage: L.rpc.declare({
			object: 'luci2.opkg',
			method: 'remove',
			params: [ 'package' ],
			expect: { '': { } }
		}),

		getConfig: L.rpc.declare({
			object: 'luci2.opkg',
			method: 'config_get',
			expect: { config: '' }
		}),

		setConfig: L.rpc.declare({
			object: 'luci2.opkg',
			method: 'config_set',
			params: [ 'data' ]
		}),

		isInstalled: function(pkg)
		{
			return this._installedPackages(0, 1, pkg).then(function(list) {
				return (!isNaN(list.total) && list.total > 0);
			});
		}
	},

	updateDiskSpace: function()
	{
		return L.system.getDiskInfo().then(function(info) {
			$('#package_space').empty().append(
				new L.ui.progress({
					value:  info.root.used / 1024,
					max:    info.root.total / 1024,
					format: '%d ' + L.tr('kB') + ' / %d ' + L.tr('kB') + ' ' + L.trc('Used disk space', 'used') + ' (%d%%)'
				}).render());
		});
	},

	installRemovePackage: function(pkgname, installed)
	{
		var self = this;

		var dspname   = pkgname.replace(/^.+\//, '');
		var action    = installed ? self.opkg.removePackage : self.opkg.installPackage;
		var title     = (installed ? L.tr('Removing package "%s" …') : L.tr('Installing package "%s" …')).format(dspname);
		var confirm   = (installed ? L.tr('Really remove package "%h" ?') : L.tr('Really install package "%h" ?')).format(dspname);

		L.ui.dialog(title, confirm, {
			style:   'confirm',
			confirm: function() {
				L.ui.dialog(title, L.tr('Waiting for package manager …'), { style: 'wait' });

				action.call(self.opkg, pkgname).then(function(res) {
					self.fetchInstalledList().then(function() { return self.fetchPackageList(); }).then(function() {
						var output = [ ];

						if (res.stdout)
							output.push($('<pre />').text(res.stdout));

						if (res.stderr)
							output.push($('<pre />').addClass('alert-message').text(res.stderr));

						output.push(res.code ? L.tr('Package manager failed with status %d.').format(res.code) : L.tr('Package manager finished successfully.'));

						L.ui.dialog(title, output, { style: 'close' });

						if (name)
							$('#package_url').val('');
					});
				});
			}
		});
	},

	fetchInstalledList: function()
	{
		var self = this;
		return self.opkg.installedPackages(0, 0, '*').then(function(list) {
			self.installedList = { };
			for (var i = 0; i < list.length; i++)
				self.installedList[list[i][0]] = true;
		});
	},

	fetchPackageList: function(offset, interactive)
	{
		if (interactive)
			L.ui.loading(true);

		if (typeof(offset) == 'undefined')
			offset = parseInt($('#package_filter').attr('offset')) || 0;

		var self = this;

		var pattern = $('#package_filter').val() || '';
		var action;

		if (pattern.length)
		{
			action = $('#package_which').prop('checked') ? self.opkg.installedPackages : self.opkg.findPackages;
			pattern = '*' + pattern + '*';

			$('#package_filter').next().attr('src', L.globals.resource + '/icons/cbi/remove.gif');
		}
		else
		{
			action = $('#package_which').prop('checked') ? self.opkg.installedPackages : self.opkg.listPackages;
			pattern = '*';

			$('#package_filter').next().attr('src', L.globals.resource + '/icons/cbi/find.gif');
		}

		$('#package_filter').attr('offset', offset);

		var install_disabled = $('#package_install').attr('disabled');

		return action.call(self.opkg, offset, 100, pattern).then(function(list) {
			var packageTable = new L.ui.table({
				placeholder: L.tr('No matching packages found.'),
				columns: [ {
					caption: L.trc('Package table header', 'Package'),
					key:     0
				}, {
					caption: L.trc('Package table header', 'Version'),
					key:     1,
					format:  function(v) {
						return (v.length > 15 ? v.substring(0, 14) + '…' : v);
					}
				}, {
					caption: L.trc('Package table header', 'Description'),
					key:     2
				}, {
					caption: L.trc('Package table header', 'Installation Status'),
					key:     0,
					width:   '120px',
					format: function(v, n) {
						var inst = self.installedList[list[n][0]];
						return L.ui.button(inst ? L.trc('Package state', 'Installed') : L.trc('Package state', 'Not installed'), inst ? 'success' : 'danger')
							.css('width', '100%')
							.attr('disabled', install_disabled)
							.attr('pkgname', list[n][0])
							.attr('installed', inst)
							.click(function() {
								self.installRemovePackage(this.getAttribute('pkgname'), this.getAttribute('installed') == 'true');
							});
					}
				} ]
			});

			packageTable.rows(list);
			packageTable.insertInto('#package_table');

			if (offset > 0)
				$('#package_prev')
					.attr('offset', offset - 100)
					.attr('disabled', false)
					.text('« %d - %d'.format(offset - 100 + 1, offset));
			else
				$('#package_prev')
					.attr('disabled', true)
					.text('« %d - %d'.format(1, Math.min(100, list.total)));

			if ((offset + 100) < list.total)
				$('#package_next')
					.attr('offset', offset + 100)
					.attr('disabled', false)
					.text('%d - %d »'.format(offset + 100 + 1, Math.min(offset + 200, list.total)));
			else
				$('#package_next')
					.attr('disabled', true)
					.text('%d - %d »'.format(list.total - (list.total % 100) + 1, list.total));

			if (interactive)
				L.ui.loading(false);
		}).then(self.updateDiskSpace);
	},

	execute: function()
	{
		var self = this;

		$('textarea, input.cbi-button-save').attr('disabled', !this.options.acls.software);
		$('#package_update, #package_url, #package_install').attr('disabled', !this.options.acls.software);

		return $.when(
			self.opkg.getConfig().then(function(config) {
				$('#config textarea')
					.attr('rows', (config.match(/\n/g) || [ ]).length + 1)
					.val(config);

				$('#config button')
					.click(function() {
						var data = ($('#config textarea').val() || '').replace(/\r/g, '').replace(/\n?$/, '\n');
						L.ui.loading(true);
						self.opkg.setConfig(data).then(function() {
							$('#config textarea')
								.attr('rows', (data.match(/\n/g) || [ ]).length + 1)
								.val(data);

							L.ui.loading(false);
						});
					});
			}),
			self.fetchInstalledList(),
			self.updateDiskSpace()
		).then(function() {
			$('#package_prev, #package_next').click(function(ev) {
				if (!this.getAttribute('disabled'))
				{
					self.fetchPackageList(parseInt(this.getAttribute('offset')), true);
					this.blur();
				}
			});

			$('#package_filter').next().click(function(ev) {
				$('#package_filter').val('');
				self.fetchPackageList(0, true);
			});

			$('#package_filter').keyup(function(ev) {
				if (ev.which != 13)
					return true;

				ev.preventDefault();
				self.fetchPackageList(0, true);
				return false;
			});

			$('#package_which').click(function(ev) {
				this.blur();
				self.fetchPackageList(0, true);
			});

			$('#package_url').keyup(function(ev) {
				if (ev.which != 13)
					return true;

				ev.preventDefault();

				if (this.value)
					self.installRemovePackage(this.value, false);
			});

			$('#package_install').click(function(ev) {
				var name = $('#package_url').val();
				if (name)
					self.installRemovePackage(name, false);
			});

			$('#package_update').click(function(ev) {
				L.ui.dialog(L.tr('Updating package lists'), L.tr('Waiting for package manager …'), { style: 'wait' });
				self.opkg.updateLists().then(function(res) {
					var output = [ ];

					if (res.stdout)
						output.push($('<pre />').text(res.stdout));

					if (res.stderr)
						output.push($('<pre />').addClass('alert-message').text(res.stderr));

					output.push(res.code ? L.tr('Package manager failed with status %d.').format(res.code) : L.tr('Package manager finished successfully.'));

					L.ui.dialog(L.tr('Updating package lists'), output, { style: 'close' });
				});
			});

			return self.fetchPackageList(0);
		});
	}
});
