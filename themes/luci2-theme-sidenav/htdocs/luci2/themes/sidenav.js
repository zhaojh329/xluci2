({
	placeMainmenu: function() {
		$('#mainmenu').empty().append(L.globals.mainMenu.render(0, 1));
		$('#indicator').empty().append(L.ui.renderChangeIndicator());

		$('.navbar-fixed-side .dropdown').on('hidden.bs.dropdown', function() {
			$(this).addClass('side-open');
		});

		$('.navbar-fixed-side .dropdown').on('shown.bs.dropdown', function() {
			$('.side-open.dropdown').removeClass('side-open');
		});
	}
})
