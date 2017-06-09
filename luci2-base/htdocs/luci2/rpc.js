Class.extend({
	_id: 1,
	_batch: undefined,
	_requests: { },

	_call: function(req, cb)
	{
		var q = '';

		if ($.isArray(req))
			for (var i = 0; i < req.length; i++)
				q += '%s%s.%s'.format(
					q ? ';' : '/',
					req[i].params[1],
					req[i].params[2]
				);
		else
			q += '/%s.%s'.format(req.params[1], req.params[2]);

		return $.ajax('/ubus' + q, {
			cache:       false,
			contentType: 'application/json',
			data:        JSON.stringify(req),
			dataType:    'json',
			type:        'POST',
			timeout:     L.globals.timeout,
			_rpc_req:   req
		}).then(cb, cb);
	},

	_list_cb: function(msg)
	{
		var list = msg.result;

		/* verify message frame */
		if (typeof(msg) != 'object' || msg.jsonrpc != '2.0' || !msg.id || !$.isArray(list))
			list = [ ];

		return $.Deferred().resolveWith(this, [ list ]);
	},

	_call_cb: function(msg)
	{
		var data = [ ];
		var type = Object.prototype.toString;
		var reqs = this._rpc_req;

		if (!$.isArray(reqs))
		{
			msg = [ msg ];
			reqs = [ reqs ];
		}

		for (var i = 0; i < msg.length; i++)
		{
			/* fetch related request info */
			var req = L.rpc._requests[reqs[i].id];
			if (typeof(req) != 'object')
				throw 'No related request for JSON response';

			/* fetch response attribute and verify returned type */
			var ret = undefined;

			/* verify message frame */
			if (typeof(msg[i]) == 'object' && msg[i].jsonrpc == '2.0')
				if ($.isArray(msg[i].result) && msg[i].result[0] == 0)
					ret = (msg[i].result.length > 1) ? msg[i].result[1] : msg[i].result[0];

			if (req.expect)
			{
				for (var key in req.expect)
				{
					if (typeof(ret) != 'undefined' && key != '')
						ret = ret[key];

					if (typeof(ret) == 'undefined' || type.call(ret) != type.call(req.expect[key]))
						ret = req.expect[key];

					break;
				}
			}

			/* apply filter */
			if (typeof(req.filter) == 'function')
			{
				req.priv[0] = ret;
				req.priv[1] = req.params;
				ret = req.filter.apply(L.rpc, req.priv);
			}

			/* store response data */
			if (typeof(req.index) == 'number')
				data[req.index] = ret;
			else
				data = ret;

			/* delete request object */
			delete L.rpc._requests[reqs[i].id];
		}

		return $.Deferred().resolveWith(this, [ data ]);
	},

	list: function()
	{
		var params = [ ];
		for (var i = 0; i < arguments.length; i++)
			params[i] = arguments[i];

		var msg = {
			jsonrpc: '2.0',
			id:      this._id++,
			method:  'list',
			params:  (params.length > 0) ? params : undefined
		};

		return this._call(msg, this._list_cb);
	},

	batch: function()
	{
		if (!$.isArray(this._batch))
			this._batch = [ ];
	},

	flush: function()
	{
		if (!$.isArray(this._batch))
			return L.deferrable([ ]);

		var req = this._batch;
		delete this._batch;

		/* call rpc */
		return this._call(req, this._call_cb);
	},

	declare: function(options)
	{
		var _rpc = this;

		return function() {
			/* build parameter object */
			var p_off = 0;
			var params = { };
			if ($.isArray(options.params))
				for (p_off = 0; p_off < options.params.length; p_off++)
					params[options.params[p_off]] = arguments[p_off];

			/* all remaining arguments are private args */
			var priv = [ undefined, undefined ];
			for (; p_off < arguments.length; p_off++)
				priv.push(arguments[p_off]);

			/* store request info */
			var req = _rpc._requests[_rpc._id] = {
				expect: options.expect,
				filter: options.filter,
				params: params,
				priv:   priv
			};

			/* build message object */
			var msg = {
				jsonrpc: '2.0',
				id:      _rpc._id++,
				method:  'call',
				params:  [
					L.globals.sid,
					options.object,
					options.method,
					params
				]
			};

			/* when a batch is in progress then store index in request data
			 * and push message object onto the stack */
			if ($.isArray(_rpc._batch))
			{
				req.index = _rpc._batch.push(msg) - 1;
				return L.deferrable(msg);
			}

			/* call rpc */
			return _rpc._call(msg, _rpc._call_cb);
		};
	}
});
