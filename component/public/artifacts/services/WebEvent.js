window.addEventListener("load", function() {
	var socket = null;
	var connected = false;
	var stopped = false;
	var id = new Date().toISOString().replace(/[:.-]+/g, "");
	var backlog = [];
	var promise = new nabu.utils.promise();

	if (!application.configuration.requestEnrichers) {
		application.configuration.requestEnrichers = [];
	}	
	application.configuration.requestEnrichers.push(function(x) {
		x.headers["Event-Session-Id"] = id;
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
		setTimeout(heartbeat, 2500);
	};
	heartbeat();
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
			if (connected) {
				if (event.content != null) {
					event = nabu.utils.objects.clone(event);
					event.content = JSON.stringify(event.content);
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