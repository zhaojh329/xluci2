L.ui.view.extend({

	handleReboot: function(){
		var form = $('<p />').text(L.tr('Really reboot the device?'));
		L.ui.dialog(L.tr('Reboot'), form, {
			style: 'confirm',
			confirm: function() {
				L.system.performReboot().then(function(){
					L.ui.reconnect(L.tr('Device rebooting...'));
				});
			},
		});	
	},
		
	execute: function() {
		var self = this;
		
		$('#btn_reboot').click(self.handleReboot);
		
		self.handleReboot();
	}
});
