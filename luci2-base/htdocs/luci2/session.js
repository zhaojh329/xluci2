Class.extend({
	login: L.rpc.declare({
		object: 'session',
		method: 'login',
		params: [ 'username', 'password' ],
		expect: { '': { } }
	}),

	access: L.rpc.declare({
		object: 'session',
		method: 'access',
		params: [ 'scope', 'object', 'function' ],
		expect: { access: false }
	}),

	isAlive: function()
	{
		return L.session.access('ubus', 'session', 'access');
	},

	startHeartbeat: function()
	{
		this._hearbeatInterval = window.setInterval(function() {
			L.session.isAlive().then(function(alive) {
				if (!alive)
				{
					L.session.stopHeartbeat();
					L.ui.login(true);
				}

			});
		}, L.globals.timeout * 2);
	},

	stopHeartbeat: function()
	{
		if (typeof(this._hearbeatInterval) != 'undefined')
		{
			window.clearInterval(this._hearbeatInterval);
			delete this._hearbeatInterval;
		}
	},


	aclCache: { },

	callAccess: L.rpc.declare({
		object: 'session',
		method: 'access',
		expect: { '': { } }
	}),

	callAccessCallback: function(acls)
	{
		L.session.aclCache = acls;
	},

	updateACLs: function()
	{
		return L.session.callAccess()
			.then(L.session.callAccessCallback);
	},

	hasACL: function(scope, object, func)
	{
		var acls = L.session.aclCache;

		if (typeof(func) == 'undefined')
			return (acls && acls[scope] && acls[scope][object]);

		if (acls && acls[scope] && acls[scope][object])
			for (var i = 0; i < acls[scope][object].length; i++)
				if (acls[scope][object][i] == func)
					return true;

		return false;
	}
});
