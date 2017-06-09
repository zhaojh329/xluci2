Class.extend({
	read: L.rpc.declare({
		object: 'file',
		method: 'read',
		params: [ 'path', 'base64' ],
		expect: { 'data': '' }
	}),

	exec: L.rpc.declare({
		object: 'file',
		method: 'exec',
		params: [ 'command', 'params' ]
	})
});
