window.addEventListener("load", function() {
	var socket = null;
	var connected = false;
	var stopped = false;
	//var id = new Date().toISOString().replace(/[:.-]+/g, "");
	var id = crypto && crypto.randomUUID ? crypto.randomUUID() : new Date().toISOString().replace(/[:.-]+/g, "");
	var backlog = [];
	var promise = new nabu.utils.promise();

	if (!application.configuration.requestEnrichers) {
		application.configuration.requestEnrichers = [];
	}	
	application.configuration.requestEnrichers.push(function(x) {
		x.headers["Session-Id"] = id;
	});
	
	var start = function() {
		var url = window.location.protocol == "https:" ? "wss" : "ws";
		url += "://";
		url += window.location.hostname;
		if ((window.location.protocol == "https:" && window.location.port != 443) || (window.location.protocol == "http:" && window.location.port != 80)) {
			url += ":" + window.location.port;
		}
		url += "${server.root()}";
		url += "t/w/e/" + id;
		socket = new WebSocket(url, "analysis");
		// set authenticated to false to start with
		socket.authenticatedBearer = null;
		socket.onopen = function(event) {
			connected = true;
			if (backlog.length > 0) {
				backlog.splice(0).forEach(function(event) {
					socket.send(JSON.stringify(event));
				});
			}
			promise.resolve();
		};
		// if it is remotely closed, we will try again!
		socket.onclose = function(event) {
			console.log("closing!");
			connected = false;
			// don't reconnect if we actually stopped
			if (!stopped) {
				setTimeout(start, 2000);
			}
		};
		socket.onmessage = function(event) {
			// var data = event.data
			console.log("Received message", event.data);
		};
	};
	
	var heartbeat = function() {
		if (connected) {
			socket.send(JSON.stringify({
				timestamp: new Date().toISOString()
			}));
		}
		setTimeout(heartbeat, 15000);
	};
	heartbeat();
	
	var authenticate = function() {
		// get the current bearer
		var bearer = application && application.services && application.services.user ? application.services.user.bearer : null;
		// if we have a bearer and we have not sent it yet or it differs from the one we sent, resend it
		if (bearer && socket && connected && socket.authenticatedBearer != bearer) {
			socket.authenticatedBearer = bearer;
			socket.send(JSON.stringify({
				token: bearer
			}));
		}
		else if (!bearer && socket.authenticatedBearer) {
			socket.authenticatedBearer = null;
			// close without stopping, it will reopen with a clean slate
			socket.close();
		}
	}
	
	nabu.page.provide("page-analysis", {
		name: "webEvent",
		start: start,
		stop: function() {
			stopped = true;
			if (socket != null) {
				socket.close();
			}
		},
		push: function(event) {
			console.log("event is", event);
			authenticate();
			if (connected) {
				event = nabu.utils.objects.clone(event);
				if (event.content != null) {
					event.content = JSON.stringify(event.content);
				}
				if (event.data != null) {
					event.data = JSON.stringify(event.data, null, 2);
				}
				//console.log("sending: ", event);
				socket.send(JSON.stringify(event));
			}
			else {
				backlog.push(event);
			}
		},
		reauthenticate: function() {
			// we close the socket without toggling the stopped
			// that means it will attempt to reconnect
			if (socket != null) {
				socket.close();
			}
		}
	});
});