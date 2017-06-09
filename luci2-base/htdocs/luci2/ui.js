(function() {
	var ui_class = {
		saveScrollTop: function()
		{
			this._scroll_top = $(document).scrollTop();
		},

		restoreScrollTop: function()
		{
			if (typeof(this._scroll_top) == 'undefined')
				return;

			$(document).scrollTop(this._scroll_top);

			delete this._scroll_top;
		},

		loading: function(enable, msg)
		{
			var win = $(window);
			var body = $('body');
			if (!msg)
				msg = L.tr('Loading data…');
			
			var state = this._loading || (this._loading = {
				modal: $('<div />')
					.css('z-index', 2000)
					.addClass('modal fade')
					.append($('<div />')
						.addClass('modal-dialog')
						.append($('<div />')
							.addClass('modal-content luci2-modal-loader')
							.append($('<div />')
								.addClass('modal-body'))))
					.appendTo(body)
					.modal({
						backdrop: 'static',
						keyboard: false
					})
			});

			state.modal.find('.modal-body').text(msg)
			
			state.modal.modal(enable ? 'show' : 'hide');
		},

		dialog: function(title, content, options)
		{
			var win = $(window);
			var body = $('body');
			var self = this;

			var state = this._dialog || (this._dialog = {
				dialog: $('<div />')
					.addClass('modal fade')
					.append($('<div />')
						.addClass('modal-dialog')
						.append($('<div />')
							.addClass('modal-content')
							.append($('<div />')
								.addClass('modal-header')
								.append('<h4 />')
									.addClass('modal-title'))
							.append($('<div />')
								.addClass('modal-body'))
							.append($('<div />')
								.addClass('modal-footer')
								.append(self.button(L.tr('Close'), 'primary')
									.click(function() {
										$(this).parents('div.modal').modal('hide');
									})))))
					.appendTo(body)
			});

			if (typeof(options) != 'object')
				options = { };

			if (title === false)
			{
				state.dialog.modal('hide');

				return state.dialog;
			}

			var cnt = state.dialog.children().children().children('div.modal-body');
			var ftr = state.dialog.children().children().children('div.modal-footer');

			ftr.empty().show();

			if (options.style == 'confirm')
			{
				ftr.append(L.ui.button(L.tr('Ok'), 'primary')
					.click(options.confirm || function() { L.ui.dialog(false) }));

				ftr.append(L.ui.button(L.tr('Cancel'), 'default')
					.click(options.cancel || function() { L.ui.dialog(false) }));
			}
			else if (options.style == 'close')
			{
				ftr.append(L.ui.button(L.tr('Close'), 'primary')
					.click(options.close || function() { L.ui.dialog(false) }));
			}
			else if (options.style == 'wait')
			{
				ftr.append(L.ui.button(L.tr('Close'), 'primary')
					.attr('disabled', true));
			}

			if (options.wide)
			{
				state.dialog.addClass('wide');
			}
			else
			{
				state.dialog.removeClass('wide');
			}

			state.dialog.find('h4:first').text(title);

			var data = state.dialog.data('bs.modal');
			if (data) {
				data.options.backdrop = options.backdrop;
				data.options.keyboard = options.keyboard;
				state.dialog.modal('show');
			} else {
				state.dialog.modal({
					backdrop: options.backdrop,
					keyboard: options.keyboard
				});
			}
			
			cnt.empty().append(content);

			return state.dialog;
		},

		upload: function(title, content, options)
		{
			var state = L.ui._upload || (L.ui._upload = {
				form: $('<form />')
					.attr('method', 'post')
					.attr('action', '/cgi-bin/luci-upload')
					.attr('enctype', 'multipart/form-data')
					.attr('target', 'cbi-fileupload-frame')
					.append($('<p />'))
					.append($('<input />')
						.attr('type', 'hidden')
						.attr('name', 'sessionid'))
					.append($('<input />')
						.attr('type', 'hidden')
						.attr('name', 'filename'))
					.append($('<input />')
						.attr('type', 'file')
						.attr('name', 'filedata')
						.addClass('cbi-input-file'))
					.append($('<div />')
						.css('width', '100%')
						.addClass('progress progress-striped active')
						.append($('<div />')
							.addClass('progress-bar')
							.css('width', '100%')))
					.append($('<iframe />')
						.addClass('pull-right')
						.attr('name', 'cbi-fileupload-frame')
						.css('width', '1px')
						.css('height', '1px')
						.css('visibility', 'hidden')),

				finish_cb: function(ev) {
					$(this).off('load');

					var body = (this.contentDocument || this.contentWindow.document).body;
					if (body.firstChild.tagName.toLowerCase() == 'pre')
						body = body.firstChild;

					var json;
					try {
						json = $.parseJSON(body.innerHTML);
					} catch(e) {
						json = {
							message: L.tr('Invalid server response received'),
							error: [ -1, L.tr('Invalid data') ]
						};
					};

					if (json.error)
					{
						L.ui.dialog(L.tr('File upload'), [
							$('<p />').text(L.tr('The file upload failed with the server response below:')),
							$('<pre />').addClass('alert-message').text(json.message || json.error[1]),
							$('<p />').text(L.tr('In case of network problems try uploading the file again.'))
						], { style: 'close' });
					}
					else if (typeof(state.success_cb) == 'function')
					{
						state.success_cb(json);
					}
				},

				confirm_cb: function() {
					var f = state.form.find('.cbi-input-file');
					var b = state.form.find('.progress');
					var p = state.form.find('p');

					if (!f.val())
						return;

					state.form.find('iframe').on('load', state.finish_cb);
					state.form.submit();

					f.hide();
					b.show();
					p.text(L.tr('File upload in progress …'));

					state.form.parent().parent().find('button').prop('disabled', true);
				}
			});

			state.form.find('.progress').hide();
			state.form.find('.cbi-input-file').val('').show();
			state.form.find('p').text(content || L.tr('Select the file to upload and press "%s" to proceed.').format(L.tr('Ok')));

			state.form.find('[name=sessionid]').val(L.globals.sid);
			state.form.find('[name=filename]').val(options.filename);

			state.success_cb = options.success;

			L.ui.dialog(title || L.tr('File upload'), state.form, {
				style: 'confirm',
				confirm: state.confirm_cb
			});
		},

		reconnect: function(info)
		{
			var protocols = (location.protocol == 'https:') ? [ 'http', 'https' ] : [ 'http' ];
			var ports     = (location.protocol == 'https:') ? [ 80, location.port || 443 ] : [ location.port || 80 ];
			var address   = location.hostname.match(/^[A-Fa-f0-9]*:[A-Fa-f0-9:]+$/) ? '[' + location.hostname + ']' : location.hostname;
			var images    = $();
			var interval, timeout;

			L.ui.dialog(
				L.tr('Waiting for device'), [
					$('<p />').text(info || L.tr('Please stand by while the device is reconfiguring …')),
					$('<div />')
						.css('width', '100%')
						.addClass('progress progress-striped active')
						.append(
							$('<div />')
							.addClass('progress-bar')
							.css('width', '40%')
						)
				], { style: 'wait', backdrop: 'static', keyboard: false }
			);

			for (var i = 0; i < protocols.length; i++)
				images = images.add($('<img />').attr('url', protocols[i] + '://' + address + ':' + ports[i]));

			images.on('load', function() {
				var url = this.getAttribute('url');
				L.session.isAlive().then(function(access) {
					if (access) {
						window.clearTimeout(timeout);
						window.clearInterval(interval);
						L.ui.dialog(false);
						images = null;
					} else {
						location.href = url;
					}
				});
			});

			interval = window.setInterval(function() {
				images.each(function() {
					this.setAttribute('src', this.getAttribute('url') + L.globals.resource + '/icons/loading.gif?r=' + Math.random());
				});
			}, 5000);

			timeout = window.setTimeout(function() {
				window.clearInterval(interval);
				images.off('load');

				L.ui.dialog(
					L.tr('Device not responding'),
					L.tr('The device was not responding within 180 seconds, you might need to manually reconnect your computer or use SSH to regain access.'),
					{ style: 'close' }
				);
			}, 180000);
		},

		login: function(invalid)
		{
			var state = L.ui._login || (L.ui._login = {
				form: $('<form />')
					.attr('target', '')
					.attr('method', 'post')
					.append($('<p />')
						.addClass('alert alert-danger')
						.text(L.tr('Wrong username or password given!')))
					.append($('<p />')
						.append($('<label />')
							.text(L.tr('Username'))
							.append($('<br />'))
							.append($('<input />')
								.attr('type', 'text')
								.attr('name', 'username')
								.addClass('form-control')
								.keypress(function(ev) {
									if (ev.which == 10 || ev.which == 13)
										state.confirm_cb();
								}))))
					.append($('<p />')
						.append($('<label />')
							.text(L.tr('Password'))
							.append($('<br />'))
							.append($('<input />')
								.attr('type', 'password')
								.attr('name', 'password')
								.addClass('form-control')
								.keypress(function(ev) {
									if (ev.which == 10 || ev.which == 13)
										state.confirm_cb();
								}))))
					.append($('<p />')
						.text(L.tr('Enter your username and password above, then click "%s" to proceed.').format(L.tr('Ok')))),

				response_cb: function(response) {
					if (!response.ubus_rpc_session)
					{
						L.ui.login(true);
					}
					else
					{
						L.globals.sid = response.ubus_rpc_session;
						L.setHash('id', L.globals.sid);
						L.session.startHeartbeat();
						L.ui.dialog(false);
						state.deferred.resolve();
					}
				},

				confirm_cb: function() {
					var u = state.form.find('[name=username]').val();
					var p = state.form.find('[name=password]').val();

					if (!u)
						return;

					L.ui.dialog(
						L.tr('Logging in'), [
							$('<p />').text(L.tr('Log in in progress …')),
							$('<div />')
								.css('width', '100%')
								.addClass('progressbar')
								.addClass('intermediate')
								.append($('<div />')
									.css('width', '100%'))
						], { style: 'wait' }
					);

					L.globals.sid = '00000000000000000000000000000000';
					L.session.login(u, p).then(state.response_cb);
				}
			});

			if (!state.deferred || state.deferred.state() != 'pending')
				state.deferred = $.Deferred();

			/* try to find sid from hash */
			var sid = L.getHash('id');
			if (sid && sid.match(/^[a-f0-9]{32}$/))
			{
				L.globals.sid = sid;
				L.session.isAlive().then(function(access) {
					if (access)
					{
						L.session.startHeartbeat();
						state.deferred.resolve();
					}
					else
					{
						L.setHash('id', undefined);
						L.ui.login();
					}
				});

				return state.deferred;
			}

			if (invalid)
				state.form.find('.alert').show();
			else
				state.form.find('.alert').hide();

			L.ui.dialog(L.tr('Authorization Required'), state.form, {
				style: 'confirm',
				confirm: state.confirm_cb
			});

			state.form.find('[name=password]').focus();

			return state.deferred;
		},

		cryptPassword: L.rpc.declare({
			object: 'luci2.ui',
			method: 'crypt',
			params: [ 'data' ],
			expect: { crypt: '' }
		}),


		mergeACLScope: function(acl_scope, scope)
		{
			if ($.isArray(scope))
			{
				for (var i = 0; i < scope.length; i++)
					acl_scope[scope[i]] = true;
			}
			else if ($.isPlainObject(scope))
			{
				for (var object_name in scope)
				{
					if (!$.isArray(scope[object_name]))
						continue;

					var acl_object = acl_scope[object_name] || (acl_scope[object_name] = { });

					for (var i = 0; i < scope[object_name].length; i++)
						acl_object[scope[object_name][i]] = true;
				}
			}
		},

		mergeACLPermission: function(acl_perm, perm)
		{
			if ($.isPlainObject(perm))
			{
				for (var scope_name in perm)
				{
					var acl_scope = acl_perm[scope_name] || (acl_perm[scope_name] = { });
					L.ui.mergeACLScope(acl_scope, perm[scope_name]);
				}
			}
		},

		mergeACLGroup: function(acl_group, group)
		{
			if ($.isPlainObject(group))
			{
				if (!acl_group.description)
					acl_group.description = group.description;

				if (group.read)
				{
					var acl_perm = acl_group.read || (acl_group.read = { });
					L.ui.mergeACLPermission(acl_perm, group.read);
				}

				if (group.write)
				{
					var acl_perm = acl_group.write || (acl_group.write = { });
					L.ui.mergeACLPermission(acl_perm, group.write);
				}
			}
		},

		callACLsCallback: function(trees)
		{
			var acl_tree = { };

			for (var i = 0; i < trees.length; i++)
			{
				if (!$.isPlainObject(trees[i]))
					continue;

				for (var group_name in trees[i])
				{
					var acl_group = acl_tree[group_name] || (acl_tree[group_name] = { });
					L.ui.mergeACLGroup(acl_group, trees[i][group_name]);
				}
			}

			return acl_tree;
		},

		callACLs: L.rpc.declare({
			object: 'luci2.ui',
			method: 'acls',
			expect: { acls: [ ] }
		}),

		getAvailableACLs: function()
		{
			return this.callACLs().then(this.callACLsCallback);
		},

		renderChangeIndicator: function()
		{
			return $('<ul />')
				.addClass('nav navbar-nav navbar-right')
				.append($('<li />')
					.append($('<a />')
						.attr('id', 'changes')
						.attr('href', '#')
						.append($('<span />')
							.addClass('label label-info')
							.hide())));
		},

		callMenuCallback: function(entries)
		{
			L.globals.mainMenu = new L.ui.menu();
			L.globals.mainMenu.entries(entries);

			if (typeof L.theme.placeMainmenu == 'function') {
				L.theme.placeMainmenu();
			} else {
				$('#mainmenu').empty()
					.append(L.globals.mainMenu.render(0, 1))
					.append(L.ui.renderChangeIndicator());
			}
		},

		callMenu: L.rpc.declare({
			object: 'luci2.ui',
			method: 'menu',
			expect: { menu: { } }
		}),

		renderMainMenu: function()
		{
			return this.callMenu().then(this.callMenuCallback);
		},

		renderViewMenu: function()
		{
			$('#viewmenu')
				.empty()
				.append(L.globals.mainMenu.render(2, 900));
		},

		renderView: function()
		{
			var node  = arguments[0];
			var name  = node.view.split(/\//).join('.');
			var cname = L.toClassName(name);
			var views = L.views || (L.views = { });
			var args  = [ ];

			for (var i = 1; i < arguments.length; i++)
				args.push(arguments[i]);

			if (L.globals.currentView)
				L.globals.currentView.finish();

			L.ui.renderViewMenu();
			L.setHash('view', node.view);

			if (views[cname] instanceof L.ui.view)
			{
				L.globals.currentView = views[cname];
				return views[cname].render.apply(views[cname], args);
			}

			var url = L.globals.resource + '/view/' + name + '.js';

			return $.ajax(url, {
				method: 'GET',
				cache: true,
				dataType: 'text'
			}).then(function(data) {
				try {
					var viewConstructorSource = (
						'(function(L, $) { ' +
							'return %s' +
						'})(L, $);\n\n' +
						'//# sourceURL=%s'
					).format(data, url);

					var viewConstructor = eval(viewConstructorSource);

					views[cname] = new viewConstructor({
						name: name,
						acls: node.write || { }
					});

					L.globals.currentView = views[cname];
					return views[cname].render.apply(views[cname], args);
				}
				catch(e) {
					alert('Unable to instantiate view "%s": %s'.format(url, e));
				};

				return $.Deferred().resolve();
			});
		},

		changeView: function()
		{
			var name = L.getHash('view');
			var node = L.globals.defaultNode;

			if (name && L.globals.mainMenu)
				node = L.globals.mainMenu.getNode(name);

			if (node)
			{
				L.ui.loading(true);
				L.ui.renderView(node).then(function() {
					$('#mainmenu.in').collapse('hide');
					L.ui.loading(false);
				});
			}
		},

		updateHostname: function()
		{
			return L.system.getBoardInfo().then(function(info) {
				if (info.hostname)
					$('#hostname').text(info.hostname);
			});
		},

		updateChanges: function()
		{
			return L.uci.changes().then(function(changes) {
				var n = 0;
				var html = '';

				for (var config in changes)
				{
					var log = [ ];

					for (var i = 0; i < changes[config].length; i++)
					{
						var c = changes[config][i];

						switch (c[0])
						{
						case 'order':
							log.push('uci reorder %s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2]));
							break;

						case 'remove':
							if (c.length < 3)
								log.push('uci delete %s.<del>%s</del>'.format(config, c[1]));
							else
								log.push('uci delete %s.%s.<del>%s</del>'.format(config, c[1], c[2]));
							break;

						case 'rename':
							if (c.length < 4)
								log.push('uci rename %s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2], c[3]));
							else
								log.push('uci rename %s.%s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2], c[3], c[4]));
							break;

						case 'add':
							log.push('uci add %s <ins>%s</ins> (= <ins><strong>%s</strong></ins>)'.format(config, c[2], c[1]));
							break;

						case 'list-add':
							log.push('uci add_list %s.%s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2], c[3], c[4]));
							break;

						case 'list-del':
							log.push('uci del_list %s.%s.<del>%s=<strong>%s</strong></del>'.format(config, c[1], c[2], c[3], c[4]));
							break;

						case 'set':
							if (c.length < 4)
								log.push('uci set %s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2]));
							else
								log.push('uci set %s.%s.<ins>%s=<strong>%s</strong></ins>'.format(config, c[1], c[2], c[3], c[4]));
							break;
						}
					}

					html += '<code>/etc/config/%s</code><pre class="uci-changes">%s</pre>'.format(config, log.join('\n'));
					n += changes[config].length;
				}

				if (n > 0)
					$('#changes')
						.click(function(ev) {
							L.ui.dialog(L.tr('Staged configuration changes'), html, {
								style: 'confirm',
								confirm: function() {
									L.uci.apply().then(function(){
										L.ui.updateChanges();
										L.ui.dialog(false);
									});
								}
							});
							ev.preventDefault();
						})
						.children('span')
							.show()
							.text(L.trcp('Pending configuration changes', '1 change', '%d changes', n).format(n));
				else
					$('#changes').children('span').hide();
			});
		},

		loadTheme: function() {
			var self = this;
			var d = $.Deferred();
			var getCurrentTheme = L.rpc.declare({object: 'luci2.ui', method: 'theme'});

			L.theme = {};
			
			getCurrentTheme().then(function(rv) {
				var theme = rv.theme;

				if (theme == 'none') {
					var form = $('<p />').text(L.tr('You have not installed any theme, please install the theme, and then try again!'));
					self.dialog(L.tr('Error'), form, {style: 'wait', backdrop: 'static', keyboard: false });
					return;
				}
				
				$.ajax(L.globals.resource + '/themes/%s.htm'.format(theme), {
					cache:    true,
					dataType: 'text',
					success:  function(data) {
						$('head').append($("<link>")
											.attr('type', 'text/css')
											.attr('rel', 'stylesheet')
											.attr('href', L.globals.resource + '/themes/%s.css'.format(theme)));
						
						$('body').empty().append(data);

						$.getScript(L.globals.resource + '/themes/%s.js'.format(theme))
							.then(function(script) {
								$.extend(L.theme, eval(script));
								d.resolve();
							}, function() {
								d.resolve();
							});
					}
				});
			});
			return d.promise();	
		},

		load: function()
		{
			var self = this;

			self.loading(true);

			$.when(
				L.session.updateACLs(),
				self.updateHostname(),
				self.updateChanges(),
				self.renderMainMenu(),
				L.network.load()
			).then(function() {
				self.renderView(L.globals.defaultNode).then(function() {
					self.loading(false);
				});

				$(window).on('hashchange', function() {
					self.changeView();
				});
			});
		},

		button: function(label, style, title)
		{
			style = style || 'default';

			return $('<button />')
				.attr('type', 'button')
				.attr('title', title ? title : '')
				.addClass('btn btn-' + style)
				.text(label);
		},

		icon: function(src, alt, title)
		{
			if (!src.match(/\.[a-z]+$/))
				src += '.png';

			if (!src.match(/^\//))
				src = L.globals.resource + '/icons/' + src;

			var icon = $('<img />')
				.attr('src', src);

			if (typeof(alt) !== 'undefined')
				icon.attr('alt', alt);

			if (typeof(title) !== 'undefined')
				icon.attr('title', title);

			return icon;
		}
	};

	ui_class.AbstractWidget = Class.extend({
		i18n: function(text) {
			return text;
		},

		label: function() {
			var key = arguments[0];
			var args = [ ];

			for (var i = 1; i < arguments.length; i++)
				args.push(arguments[i]);

			switch (typeof(this.options[key]))
			{
			case 'undefined':
				return '';

			case 'function':
				return this.options[key].apply(this, args);

			default:
				return ''.format.apply('' + this.options[key], args);
			}
		},

		toString: function() {
			return $('<div />').append(this.render()).html();
		},

		insertInto: function(id) {
			return $(id).empty().append(this.render());
		},

		appendTo: function(id) {
			return $(id).append(this.render());
		},

		on: function(evname, evfunc)
		{
			var evnames = L.toArray(evname);

			if (!this.events)
				this.events = { };

			for (var i = 0; i < evnames.length; i++)
				this.events[evnames[i]] = evfunc;

			return this;
		},

		trigger: function(evname, evdata)
		{
			if (this.events)
			{
				var evnames = L.toArray(evname);

				for (var i = 0; i < evnames.length; i++)
					if (this.events[evnames[i]])
						this.events[evnames[i]].call(this, evdata);
			}

			return this;
		}
	});

	ui_class.view = ui_class.AbstractWidget.extend({
		_fetch_template: function()
		{
			return $.ajax(L.globals.resource + '/template/' + this.options.name + '.htm', {
				method: 'GET',
				cache: true,
				dataType: 'text',
				success: function(data) {
					data = data.replace(/<%([#:=])?(.+?)%>/g, function(match, p1, p2) {
						p2 = p2.replace(/^\s+/, '').replace(/\s+$/, '');
						switch (p1)
						{
						case '#':
							return '';

						case ':':
							return L.tr(p2);

						case '=':
							return L.globals[p2] || '';

						default:
							return '(?' + match + ')';
						}
					});

					$('#maincontent').append(data);
				}
			});
		},

		execute: function()
		{
			throw "Not implemented";
		},

		render: function()
		{
			var container = $('#maincontent');

			container.empty();

			if (this.title)
				container.append($('<h2 />').append(this.title));

			if (this.description)
				container.append($('<p />').append(this.description));

			var self = this;
			var args = [ ];

			for (var i = 0; i < arguments.length; i++)
				args.push(arguments[i]);

			return this._fetch_template().then(function() {
				return L.deferrable(self.execute.apply(self, args));
			});
		},

		repeat: function(func, interval)
		{
			var self = this;

			if (!self._timeouts)
				self._timeouts = [ ];

			var index = self._timeouts.length;

			if (typeof(interval) != 'number')
				interval = 5000;

			var setTimer, runTimer;

			setTimer = function() {
				if (self._timeouts)
					self._timeouts[index] = window.setTimeout(runTimer, interval);
			};

			runTimer = function() {
				L.deferrable(func.call(self)).then(setTimer, setTimer);
			};

			runTimer();
		},

		finish: function()
		{
			if ($.isArray(this._timeouts))
			{
				for (var i = 0; i < this._timeouts.length; i++)
					window.clearTimeout(this._timeouts[i]);

				delete this._timeouts;
			}
		}
	});

	ui_class.menu = ui_class.AbstractWidget.extend({
		init: function() {
			this._nodes = { };
		},

		entries: function(entries)
		{
			for (var entry in entries)
			{
				var path = entry.split(/\//);
				var node = this._nodes;

				for (i = 0; i < path.length; i++)
				{
					if (!node.childs)
						node.childs = { };

					if (!node.childs[path[i]])
						node.childs[path[i]] = { };

					node = node.childs[path[i]];
				}

				$.extend(node, entries[entry]);
			}
		},

		sortNodesCallback: function(a, b)
		{
			var x = a.index || 0;
			var y = b.index || 0;
			return (x - y);
		},

		firstChildView: function(node)
		{
			if (node.view)
				return node;

			var nodes = [ ];
			for (var child in (node.childs || { }))
				nodes.push(node.childs[child]);

			nodes.sort(this.sortNodesCallback);

			for (var i = 0; i < nodes.length; i++)
			{
				var child = this.firstChildView(nodes[i]);
				if (child)
				{
					for (var key in child)
						if (!node.hasOwnProperty(key) && child.hasOwnProperty(key))
							node[key] = child[key];

					return node;
				}
			}

			return undefined;
		},

		handleClick: function(ev)
		{
			L.setHash('view', ev.data);

			ev.preventDefault();
			this.blur();
		},

		renderNodes: function(childs, level, min, max)
		{
			var nodes = [ ];
			for (var node in childs)
			{
				var child = this.firstChildView(childs[node]);
				if (child)
					nodes.push(childs[node]);
			}

			nodes.sort(this.sortNodesCallback);

			var list = $('<ul />');

			if (level == 0)
				list.addClass('nav').addClass('navbar-nav');
			else if (level == 1)
				list.addClass('dropdown-menu');

			for (var i = 0; i < nodes.length; i++)
			{
				if (!L.globals.defaultNode)
				{
					var v = L.getHash('view');
					if (!v || v == nodes[i].view)
						L.globals.defaultNode = nodes[i];
				}

				var item = $('<li />')
					.append($('<a />')
						.attr('href', '#')
						.text(L.tr(nodes[i].title)))
					.appendTo(list);

				if (nodes[i].childs && level < max)
				{
					item.addClass('dropdown');

					item.find('a')
						.addClass('dropdown-toggle')
						.attr('data-toggle', 'dropdown')
						.append('<b class="caret"></b>');

					item.append(this.renderNodes(nodes[i].childs, level + 1));
				}
				else
				{
					item.find('a').click(nodes[i].view, this.handleClick);
				}
			}

			return list.get(0);
		},

		render: function(min, max)
		{
			var top = min ? this.getNode(L.globals.defaultNode.view, min) : this._nodes;
			return this.renderNodes(top.childs, 0, min, max);
		},

		getNode: function(path, max)
		{
			var p = path.split(/\//);
			var n = this._nodes;

			if (!n.childs)
				return undefined;
			
			if (typeof(max) == 'undefined')
				max = p.length;

			if (max > p.length)
				max = p.length;
			
			for (var i = 0; i < max; i++)
			{
				if (!n.childs[p[i]])
					return undefined;

				n = n.childs[p[i]];
			}

			return n;
		}
	});

	ui_class.table = ui_class.AbstractWidget.extend({
		init: function()
		{
			this._rows = [ ];
		},

		row: function(values)
		{
			if ($.isArray(values))
			{
				this._rows.push(values);
			}
			else if ($.isPlainObject(values))
			{
				var v = [ ];
				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];

					if (typeof col.key == 'string')
						v.push(values[col.key]);
					else
						v.push(null);
				}
				this._rows.push(v);
			}
		},

		rows: function(rows)
		{
			for (var i = 0; i < rows.length; i++)
				this.row(rows[i]);
		},

		render: function(id)
		{
			var fieldset = document.createElement('fieldset');
				fieldset.className = 'cbi-section';

			if (this.options.caption)
			{
				var legend = document.createElement('legend');
				$(legend).append(this.options.caption);
				fieldset.appendChild(legend);
			}

			var table = document.createElement('table');
				table.className = 'table table-condensed table-hover';

			var has_caption = false;
			var has_description = false;

			for (var i = 0; i < this.options.columns.length; i++)
				if (this.options.columns[i].caption)
				{
					has_caption = true;
					break;
				}
				else if (this.options.columns[i].description)
				{
					has_description = true;
					break;
				}

			if (has_caption)
			{
				var tr = table.insertRow(-1);
					tr.className = 'cbi-section-table-titles';

				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];
					var th = document.createElement('th');
						th.className = 'cbi-section-table-cell';

					tr.appendChild(th);

					if (col.width)
						th.style.width = col.width;

					if (col.align)
						th.style.textAlign = col.align;

					if (col.caption)
						$(th).append(col.caption);
				}
			}

			if (has_description)
			{
				var tr = table.insertRow(-1);
					tr.className = 'cbi-section-table-descr';

				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];
					var th = document.createElement('th');
						th.className = 'cbi-section-table-cell';

					tr.appendChild(th);

					if (col.width)
						th.style.width = col.width;

					if (col.align)
						th.style.textAlign = col.align;

					if (col.description)
						$(th).append(col.description);
				}
			}

			if (this._rows.length == 0)
			{
				if (this.options.placeholder)
				{
					var tr = table.insertRow(-1);
					var td = tr.insertCell(-1);
						td.className = 'cbi-section-table-cell';

					td.colSpan = this.options.columns.length;
					$(td).append(this.options.placeholder);
				}
			}
			else
			{
				for (var i = 0; i < this._rows.length; i++)
				{
					var tr = table.insertRow(-1);

					for (var j = 0; j < this.options.columns.length; j++)
					{
						var col = this.options.columns[j];
						var td = tr.insertCell(-1);

						var val = this._rows[i][j];

						if (typeof(val) == 'undefined')
							val = col.placeholder;

						if (typeof(val) == 'undefined')
							val = '';

						if (col.width)
							td.style.width = col.width;

						if (col.align)
							td.style.textAlign = col.align;

						if (typeof col.format == 'string')
							$(td).append(col.format.format(val));
						else if (typeof col.format == 'function')
							$(td).append(col.format(val, i));
						else
							$(td).append(val);
					}
				}
			}

			this._rows = [ ];
			fieldset.appendChild(table);

			return fieldset;
		}
	});

	ui_class.grid = ui_class.AbstractWidget.extend({
		init: function()
		{
			this._rows = [ ];
		},

		row: function(values)
		{
			if ($.isArray(values))
			{
				this._rows.push(values);
			}
			else if ($.isPlainObject(values))
			{
				var v = [ ];
				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];

					if (typeof col.key == 'string')
						v.push(values[col.key]);
					else
						v.push(null);
				}
				this._rows.push(v);
			}
		},

		rows: function(rows)
		{
			for (var i = 0; i < rows.length; i++)
				this.row(rows[i]);
		},

		createCell: function(col, classNames)
		{
			var sizes = [ 'xs', 'sm', 'md', 'lg' ];

			var cell = $('<div />')
				.addClass('cell clearfix');

			if (classNames)
				cell.addClass(classNames);

			if (col.nowrap)
				cell.addClass('nowrap');

			if (col.align)
				cell.css('text-align', col.align);

			for (var i = 0; i < sizes.length; i++)
				cell.addClass((col['width_' + sizes[i]] > 0)
					? 'col-%s-%d'.format(sizes[i], col['width_' + sizes[i]])
					: 'hidden-%s'.format(sizes[i]));

			if (col.hidden)
				cell.addClass('hidden-%s'.format(col.hidden));

			return cell;
		},

		render: function(id)
		{
			var fieldset = $('<fieldset />')
				.addClass('cbi-section');

			if (this.options.caption)
				fieldset.append($('<legend />').append(this.options.caption));

			var grid = $('<div />')
				.addClass('luci2-grid luci2-grid-hover');

			if (this.options.condensed)
				grid.addClass('luci2-grid-condensed');

			var has_caption = false;
			var has_description = false;

			var sizes = [ 'xs', 'sm', 'md', 'lg' ];

			for (var i = 0; i < sizes.length; i++)
			{
				var size = sizes[i];
				var width_unk = 0;
				var width_dyn = 0;
				var width_rem = 12;

				for (var j = 0; j < this.options.columns.length; j++)
				{
					var col = this.options.columns[j];
					var k = i, width = NaN;

					do { width = col['width_' + sizes[k++]]; }
						while (isNaN(width) && k < sizes.length);

					if (isNaN(width))
						width = col.width;

					if (isNaN(width))
						width_unk++;
					else
						width_rem -= width, col['width_' + size] = width;

					if (col.caption)
						has_caption = true;

					if (col.description)
						has_description = true;
				}

				if (width_unk > 0)
					width_dyn = Math.floor(width_rem / width_unk);

				for (var j = 0; j < this.options.columns.length; j++)
					if (isNaN(this.options.columns[j]['width_' + size]))
						this.options.columns[j]['width_' + size] = width_dyn;
			}

			if (has_caption)
			{
				var row = $('<div />')
					.addClass('row')
					.appendTo(grid);

				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];
					var cell = this.createCell(col, 'caption')
						.appendTo(row);

					if (col.caption)
						cell.append(col.caption);
				}
			}

			if (has_description)
			{
				var row = $('<div />')
					.addClass('row')
					.appendTo(grid);

				for (var i = 0; i < this.options.columns.length; i++)
				{
					var col = this.options.columns[i];
					var cell = this.createCell(col, 'description')
						.appendTo(row);

					if (col.description)
						cell.append(col.description);
				}
			}

			if (this._rows.length == 0)
			{
				if (this.options.placeholder)
					$('<div />')
						.addClass('row')
						.append($('<div />')
							.addClass('col-md-12 cell placeholder clearfix')
							.append(this.options.placeholder))
						.appendTo(grid);
			}
			else
			{
				for (var i = 0; i < this._rows.length; i++)
				{
					var row = $('<div />')
						.addClass('row')
						.appendTo(grid);

					for (var j = 0; j < this.options.columns.length; j++)
					{
						var col = this.options.columns[j];
						var cell = this.createCell(col, 'content')
							.appendTo(row);

						var val = this._rows[i][j];

						if (typeof(val) == 'undefined')
							val = col.placeholder;

						if (typeof(val) == 'undefined')
							val = '';

						if (typeof col.format == 'string')
							cell.append(col.format.format(val));
						else if (typeof col.format == 'function')
							cell.append(col.format(val, i));
						else
							cell.append(val);
					}
				}
			}

			this._rows = [ ];

			return fieldset.append(grid);
		}
	});

	ui_class.hlist = ui_class.AbstractWidget.extend({
		render: function()
		{
			if (!$.isArray(this.options.items))
				return '';

			var list = $('<span />');
			var sep = this.options.separator || ' | ';
			var items = [ ];

			for (var i = 0; i < this.options.items.length; i += 2)
			{
				if (typeof(this.options.items[i+1]) === 'undefined' ||
				    this.options.items[i+1] === '')
					continue;

				items.push(this.options.items[i], this.options.items[i+1]);
			}

			for (var i = 0; i < items.length; i += 2)
			{
				list.append($('<span />')
						.addClass('nowrap')
						.append($('<strong />')
							.append(items[i])
							.append(': '))
						.append(items[i+1])
						.append(((i+2) < items.length) ? sep : ''))
					.append(' ');
			}

			return list;
		}
	});

	ui_class.progress = ui_class.AbstractWidget.extend({
		render: function()
		{
			var vn = parseInt(this.options.value) || 0;
			var mn = parseInt(this.options.max) || 100;
			var pc = Math.floor((100 / mn) * vn);

			var text;

			if (typeof(this.options.format) == 'string')
				text = this.options.format.format(this.options.value, this.options.max, pc);
			else if (typeof(this.options.format) == 'function')
				text = this.options.format(pc);
			else
				text = '%.2f%%'.format(pc);

			return $('<div />')
				.addClass('progress')
				.append($('<div />')
					.addClass('progress-bar')
					.addClass('progress-bar-info')
					.css('width', pc + '%'))
				.append($('<small />')
					.text(text));
		}
	});

	ui_class.devicebadge = ui_class.AbstractWidget.extend({
		render: function()
		{
			var l2dev = this.options.l2_device || this.options.device;
			var l3dev = this.options.l3_device;
			var dev = l3dev || l2dev || '?';

			var span = document.createElement('span');
				span.className = 'badge';

			if (typeof(this.options.signal) == 'number' ||
				typeof(this.options.noise) == 'number')
			{
				var r = 'none';
				if (typeof(this.options.signal) != 'undefined' &&
					typeof(this.options.noise) != 'undefined')
				{
					var q = (-1 * (this.options.noise - this.options.signal)) / 5;
					if (q < 1)
						r = '0';
					else if (q < 2)
						r = '0-25';
					else if (q < 3)
						r = '25-50';
					else if (q < 4)
						r = '50-75';
					else
						r = '75-100';
				}

				span.appendChild(document.createElement('img'));
				span.lastChild.src = L.globals.resource + '/icons/signal-' + r + '.png';

				if (r == 'none')
					span.title = L.tr('No signal');
				else
					span.title = '%s: %d %s / %s: %d %s'.format(
						L.tr('Signal'), this.options.signal, L.tr('dBm'),
						L.tr('Noise'), this.options.noise, L.tr('dBm')
					);
			}
			else
			{
				var type = 'ethernet';
				var desc = L.tr('Ethernet device');

				if (l3dev != l2dev)
				{
					type = 'tunnel';
					desc = L.tr('Tunnel interface');
				}
				else if (dev.indexOf('br-') == 0)
				{
					type = 'bridge';
					desc = L.tr('Bridge');
				}
				else if (dev.indexOf('.') > 0)
				{
					type = 'vlan';
					desc = L.tr('VLAN interface');
				}
				else if (dev.indexOf('wlan') == 0 ||
						 dev.indexOf('ath') == 0 ||
						 dev.indexOf('wl') == 0)
				{
					type = 'wifi';
					desc = L.tr('Wireless Network');
				}

				span.appendChild(document.createElement('img'));
				span.lastChild.src = L.globals.resource + '/icons/' + type + (this.options.up ? '' : '_disabled') + '.png';
				span.title = desc;
			}

			$(span).append(' ');
			$(span).append(dev);

			return span;
		}
	});

	return Class.extend(ui_class);
})();
