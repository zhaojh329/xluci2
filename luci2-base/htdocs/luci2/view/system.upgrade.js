L.ui.view.extend({
	title: L.tr('Flash operations'),

	testUpgrade: L.rpc.declare({
		object: 'luci2.system',
		method: 'upgrade_test',
		expect: { '': { } }
	}),

	startUpgrade: L.rpc.declare({
		object: 'luci2.system',
		method: 'upgrade_start',
		params: [ 'keep' ]
	}),

	cleanUpgrade: L.rpc.declare({
		object: 'luci2.system',
		method: 'upgrade_clean'
	}),

	restoreBackup: L.rpc.declare({
		object: 'luci2.system',
		method: 'backup_restore'
	}),

	cleanBackup: L.rpc.declare({
		object: 'luci2.system',
		method: 'backup_clean'
	}),

	getBackupConfig: L.rpc.declare({
		object: 'luci2.system',
		method: 'backup_config_get',
		expect: { config: '' }
	}),

	setBackupConfig: L.rpc.declare({
		object: 'luci2.system',
		method: 'backup_config_set',
		params: [ 'data' ]
	}),

	listBackup: L.rpc.declare({
		object: 'luci2.system',
		method: 'backup_list',
		expect: { files: [ ] }
	}),

	testReset: L.rpc.declare({
		object: 'luci2.system',
		method: 'reset_test',
		expect: { supported: false }
	}),

	startReset: L.rpc.declare({
		object: 'luci2.system',
		method: 'reset_start'
	}),

	handleFlashUpload: function() {
		var self = this;
		L.ui.upload(
			L.tr('Firmware upload'),
			L.tr('Select the sysupgrade image to flash and click "%s" to proceed.').format(L.tr('Ok')), {
				filename: '/tmp/firmware.bin',
				success: function(info) {
					self.handleFlashVerify(info);
				}
			}
		);
	},

	handleFlashVerify: function(info) {
		var self = this;
		self.testUpgrade().then(function(res) {
			if (res.code == 0) {
				var form = [
						$('<p />').text(L.tr('The firmware image was uploaded completely. Please verify the checksum and file size below, then click "%s" to start the flash procedure.').format(L.tr('Ok'))),
						$('<ul />')
							.append($('<li />')
								.append($('<strong />').text(L.tr('Checksum') + ': '))
								.append(info.checksum))
							.append($('<li />')
								.append($('<strong />').text(L.tr('Size') + ': '))
								.append('%1024mB'.format(info.size))),
						$('<label />')
							.append($('<input />')
								.attr('type', 'checkbox')
								.attr('name', 'keep')
								.prop('checked', true))
							.append(' ')
							.append(L.tr('Keep configuration when reflashing'))
					];
				
				L.ui.dialog(
					L.tr('Verify firmware'), form, {
						style: 'confirm',
						confirm: function() {
							var keep = form[2].find("input[name='keep']").prop("checked");
							self.startUpgrade(keep).then(function() {
								L.session.stopHeartbeat();
								L.ui.reconnect();
							});
						}
					}
				);
			} else {
				L.ui.dialog(
					L.tr('Invalid image'), [
						$('<p />').text(L.tr('The uploaded image file does not contain a supported format. Make sure that you choose the generic image format for your platform.'))
					], {
						style: 'close',
						close: function() {
							self.cleanUpgrade().then(function() {
								L.ui.dialog(false);
							});
						}
					}
				);
			}
		});
	},

	handleBackupUpload: function() {
		var self = this;
		L.ui.upload(
			L.tr('Backup restore'),
			L.tr('Select the backup archive to restore and click "%s" to proceed.').format(L.tr('Ok')), {
				filename: '/tmp/backup.tar.gz',
				success: function(info) {
					self.handleBackupVerify(info);
				}
			}
		);
	},

	handleBackupVerify: function(info) {
		var self = this;
		L.ui.dialog(
			L.tr('Backup restore'), [
				$('<p />').text(L.tr('The backup archive was uploaded completely. Please verify the checksum and file size below, then click "%s" to restore the archive.').format(L.tr('Ok'))),
				$('<ul />')
					.append($('<li />')
						.append($('<strong />').text(L.tr('Checksum') + ': '))
						.append(info.checksum))
					.append($('<li />')
						.append($('<strong />').text(L.tr('Size') + ': '))
						.append('%1024mB'.format(info.size)))
			], {
				style: 'confirm',
				confirm: function() {
					self.handleBackupRestore();
				}
			}
		);
	},

	handleBackupRestore: function() {
		var self = this;
		self.restoreBackup().then(function(res) {
			if (res.code == 0) {
				L.ui.dialog(
					L.tr('Backup restore'), [
						$('<p />').text(L.tr('The backup was successfully restored, it is advised to reboot the system now in order to apply all configuration changes.')),
						$('<input />')
							.addClass('cbi-button')
							.attr('type', 'button')
							.attr('value', L.tr('Reboot system'))
							.click(function() {
								L.system.performReboot().then(function(){
									L.ui.reconnect(L.tr('Device rebooting...'));
								});
							})
					], {
						style: 'close',
						close: function() {
							self.cleanBackup().then(function() {
								L.ui.dialog(false);
							});
						}
					}
				);
			} else {
				L.ui.dialog(
					L.tr('Backup restore'), [
						$('<p />').text(L.tr('Backup restoration failed, Make sure that you choose the file format for your platform.')),
					], {
						style: 'close',
						close: function() {
							self.cleanBackup().then(function() {
								L.ui.dialog(false);
							});
						}
					}
				);
			}
		});
	},

	handleBackupDownload: function() {
		var form = $('#btn_backup').parent();

		form.find('[name=sessionid]').val(L.globals.sid);
		form.submit();
	},

	handleReset: function() {
		var self = this;
		L.ui.dialog(L.tr('Really reset all changes?'), L.tr('This will reset the system to its initial configuration, all changes made since the initial flash will be lost!'), {
			style: 'confirm',
			confirm: function() {
				self.startReset().then(L.ui.reconnect);
			}
		});
	},

	execute: function() {
		var self = this;

		self.testReset().then(function(reset_avail) {
			if (!reset_avail) {
				$('#btn_reset').prop('disabled', true);
			}

			if (!self.options.acls.backup) {
				$('#btn_restore, #btn_save, textarea').prop('disabled', true);
			}
			else {
				$('#btn_backup').click(function() { self.handleBackupDownload(); });
				$('#btn_restore').click(function() { self.handleBackupUpload(); });
			}

			if (!self.options.acls.upgrade) {
				$('#btn_flash, #btn_reset').prop('disabled', true);
			}
			else {
				$('#btn_flash').click(function() { self.handleFlashUpload(); });
				$('#btn_reset').click(function() { self.handleReset(); });
			}

			return self.getBackupConfig();
		}).then(function(config) {
			$('textarea')
				.attr('rows', (config.match(/\n/g) || [ ]).length + 1)
				.val(config);

			$('#btn_save')
				.click(function() {
					var data = ($('textarea').val() || '').replace(/\r/g, '').replace(/\n?$/, '\n');
					L.ui.loading(true);
					self.setBackupConfig(data).then(function() {
						$('textarea')
							.attr('rows', (data.match(/\n/g) || [ ]).length + 1)
							.val(data);

						L.ui.loading(false);
					});
				});

			$('#btn_list')
				.click(function() {
					L.ui.loading(true);
					self.listBackup().then(function(list) {
						L.ui.loading(false);
						L.ui.dialog(
							L.tr('Backup file list'),
							$('<textarea />')
								.css('width', '100%')
								.attr('rows', list.length)
								.prop('readonly', true)
								.addClass('form-control')
								.val(list.join('\n')),
							{ style: 'close' }
						);
					});
				});
		});
	}
});
