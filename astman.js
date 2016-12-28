function Astman() {
	var me = this;
	var channels = new Array;
	var queues = new Array;
	var lastselect;
	var selecttarget;
	this.setURL = function (url) {
		this.url = url;
	};
	this.setEventCallback = function (callback) {
		this.eventcallback = callback;
	};
	this.setDebug = function (debug) {
		this.debug = debug;
	};
	this.clickChannel = function (ev) {
		var target = ev.target;
		// XXX This is icky, we statically use astmanEngine to call the callback XXX
		if (me.selecttarget)
			me.restoreTarget(me.selecttarget);
		while (!target.id || !target.id.length)
			target = target.parentNode;
		me.selecttarget = target.id;
		target.className = "chanlistselected";
		me.chancallback(target.id);
	};
	this.restoreTarget = function (targetname) {
		var other;
		target = $(targetname);
		if (!target)
			return;
		if (target.previousSibling) {
			other = target.previousSibling.previousSibling.className;
		} else if (target.nextSibling) {
			other = target.nextSibling.nextSibling.className;
		}
		if (other) {
			if (other == "chanlisteven")
				target.className = "chanlistodd";
			else
				target.className = "chanlisteven";
		} else
			target.className = "chanlistodd";
	};

	//zpracovani eventu tykajicich se front
	//var fields = new Array("callerid", "calleridname", "context", "extension", "priority", "account", "state", "link", "uniqueid" );
	/*
	tohle je event z uvodniho ququestatus a mozna po buttonu refresh
		Event: QueueMember
		Queue: 5500
		Name: Local/9143@from-internal/n
		Location: Local/9143@from-internal/n
		Membership: dynamic
		Penalty: 0
		CallsTaken: 0
		LastCall: 0
		Status: 1
		Paused: 0
	po waitevent chodi tyto eventy
	takhle vypada event po prihlaseni agenta 141
	Event: QueueMemberAdded
	Privilege: agent,all
	Queue: 5111
	Location: Local/9141@from-internal/n
	MemberName: Local/9141@from-internal/n
	Membership: dynamic
	Penalty: 0
	CallsTaken: 0
	LastCall: 0
	Status: 5
	Paused: 0
	
	takhle vypada event po odhlaseni agenta 141
	Event: QueueMemberRemoved
	Privilege: agent,all
	Queue: 5111
	Location: Local/9141@from-internal/n
	MemberName: Local/9141@from-internal/n
	
		*/
	this.queueUpdate = function (msg, qnumber) {
		var fields = new Array("event", "queue", "name", "location", "membership", "penalty", "callstaken", "lastcall", "status", "paused");
		var agent, aAgent;

		/* frontu bez memberu zalozoim z Event: QueueParams
			Event: QueueParams
			Queue: 5111
		
			a dasi zpracovavany eventy jsou added a removed
		*/
		if (!qnumber || !qnumber.length) {
			qnumber = msg.headers['queue'];
		}
		if ('/QueueParams/QueueMember/QueueMemberAdded/QueueMemberRemoved/'.indexOf(msg.headers.event) >= 0) {
			if (!queues[qnumber]) {
				queues[qnumber] = new Array();
				queues[qnumber]['agents'] = "";
				queues[qnumber]['queue'] = qnumber;
			}
			//ZALOGUJU EVENT
			console.log('Event LOG');
			for (x = 0; x < fields.length; x++) {
				if (msg.headers[fields[x]])
					console.log(fields[x] + "=>" + msg.headers[fields[x]]);
			}
		}
		if ('/QueueMember/QueueMemberAdded/QueueMemberRemoved/'.indexOf(msg.headers.event) >= 0) {
			aAgent = msg.headers['location'].match(/\/([0-9]{3,9})@/i);
			agent = aAgent[1];
			if (agent.length == 4 && agent.substr(0, 1) == '9')
				agent = agent.substr(1);
		}
		if (msg.headers.event == 'QueueMember') {
			if (queues[qnumber]['agents'].indexOf(agent) == -1)
				queues[qnumber]['agents'] = queues[qnumber]['agents'] + (queues[qnumber]['agents']!=""?"/":"") + agent;
			for (x = 0; x < fields.length; x++) {
				if (msg.headers[fields[x]] && fields[x] != 'queue')
					queues[qnumber][fields[x]] = msg.headers[fields[x]];
			}
		} else if (msg.headers.event == 'QueueMemberAdded') {
    		queues[qnumber]['agents'] = queues[qnumber]['agents'] + "/" + agent;
			alert(msg.headers.event + ' ' + agent + ' queue ' + qnumber);
		} else if (msg.headers.event == 'QueueMemberRemoved') {
    		queues[qnumber]['agents'] = queues[qnumber]['agents'].replace("/" + agent, "")
			alert(msg.headers.event + ' ' + agent + ' queue ' + qnumber);
		}
	};

	//konec front


	this.channelUpdate = function (msg, channame) {
		var fields = new Array("callerid", "calleridname", "context", "extension", "priority", "account", "state", "link", "uniqueid");

		if (!channame || !channame.length)
			channame = msg.headers['channel'];

		if (!channels[channame])
			channels[channame] = new Array();

		if (msg.headers.event) {
			if (msg.headers.event == "Hangup") {
				delete channels[channame];
			} else if (msg.headers.event == "Link") {
				var chan1 = msg.headers.channel1;
				var chan2 = msg.headers.channel2;
				if (chan1 && channels[chan1])
					channels[chan1].link = chan2;
				if (chan2 && channels[chan2])
					channels[chan2].link = chan1;
			} else if (msg.headers.event == "Unlink") {
				var chan1 = msg.headers.channel1;
				var chan2 = msg.headers.channel2;
				if (chan1 && channels[chan1])
					delete channels[chan1].link;
				if (chan2 && channels[chan2])
					delete channels[chan2].link;
			} else if (msg.headers.event == "Rename") {
				var oldname = msg.headers.oldname;
				var newname = msg.headers.newname;
				if (oldname && channels[oldname]) {
					channels[newname] = channels[oldname];
					delete channels[oldname];
				}
			} else {
				channels[channame]['channel'] = channame;
				for (x = 0; x < fields.length; x++) {
					if (msg.headers[fields[x]])
						channels[channame][fields[x]] = msg.headers[fields[x]];
				}
			}
		} else {
			channels[channame]['channel'] = channame;
			for (x = 0; x < fields.length; x++) {
				if (msg.headers[fields[x]])
					channels[channame][fields[x]] = msg.headers[fields[x]];
			}
		}
	};
	this.channelClear = function () {
		channels = new Array;
	}
	this.queueClear = function () {
		queues = new Array;
	}
	this.channelInfo = function (channame) {
		return channels[channame];
	};
	this.queueTable = function (callback) {
		var cclass, count = 0;
		var s;
		s = "<table class='chantable' align='center'>\n";
		s = s + "\t<tr class='labels' id='labels'><td>Queue</td><td>Agents</td></tr>";
		count = 0;
		for (x in queues.sort(function sortFunction(a, b) { if (a['queue'] === b['queue']) { return 0; } else { return (a['queue'] < b['queue']) ? -1 : 1; } })) {
			if (queues[x].queue) {
				if (count % 2)
					cclass = "chanlistodd";
				else
					cclass = "chanlisteven";

				count++;
				s = s + "\t<tr class='" + cclass + "' id='" + queues[x].queue + "'>";
				s = s + "<td>" + queues[x].queue + "</td>";
				s = s + "<td>" + queues[x].agents + "</td>";
				s = s + "</tr>";
			}
		}
		s += "</table>\n";
		return s;
	};

	this.channelTable = function (callback) {
		var s, x;
		var cclass, count = 0;
		var found = 0;
		var foundactive = 0;
		var fieldlist = new Array("channel", "callerid", "calleridname", "context", "extension", "priority");

		me.chancallback = callback;
		s = "<table class='chantable' align='center'>\n";
		s = s + "\t<tr class='labels' id='labels'><td>Channel</td><td>State</td><td>Caller</td><td>Location</td><td>Link</td></tr>";
		count = 0;
		for (x in channels) {
			if (channels[x].channel) {
				if (count % 2)
					cclass = "chanlistodd";
				else
					cclass = "chanlisteven";
				if (me.selecttarget && (me.selecttarget == x)) {
					cclass = "chanlistselected";
					foundactive = 1;
				}
				count++;
				s = s + "\t<tr class='" + cclass + "' id='" + channels[x].channel + "' onClick='astmanEngine.clickChannel(event)'>";
				s = s + "<td>" + channels[x].channel + "</td>";
				if (channels[x].state)
					s = s + "<td>" + channels[x].state + "</td>";
				else
					s = s + "<td><i class='light'>unknown</i></td>";
				if (channels[x].calleridname && channels[x].callerid && channels[x].calleridname != "<unknown>") {
					cid = channels[x].calleridname.escapeHTML() + " &lt;" + channels[x].callerid.escapeHTML() + "&gt;";
				} else if (channels[x].calleridname && (channels[x].calleridname != "<unknown>")) {
					cid = channels[x].calleridname.escapeHTML();
				} else if (channels[x].callerid) {
					cid = channels[x].callerid.escapeHTML();
				} else {
					cid = "<i class='light'>Unknown</i>";
				}
				s = s + "<td>" + cid + "</td>";
				if (channels[x].extension) {
					s = s + "<td>" + channels[x].extension + "@" + channels[x].context + ":" + channels[x].priority + "</td>";
				} else {
					s = s + "<td><i class='light'>None</i></td>";
				}
				if (channels[x].link) {
					s = s + "<td>" + channels[x].link + "</td>";
				} else {
					s = s + "<td><i class='light'>None</i></td>";
				}
				s = s + "</tr>\n";
				found++;
			}
		}
		if (!found)
			s += "<tr><td colspan=" + fieldlist.length + "><i class='light'>No active channels</i></td>\n";
		s += "</table>\n";
		if (!foundactive) {
			me.selecttarget = null;
		}
		return s;
	};
	this.parseResponse = function (t, callback) {
		var msgs = new Array();
		var inmsg = 0;
		var msgnum = 0;
		var x, y;
		var s = t.responseText;
		var allheaders = s.split('\r\n');
		if (me.debug)
			me.debug.value = "\n";
		for (x = 0; x < allheaders.length; x++) {
			if (allheaders[x].length) {
				var fields = allheaders[x].split(': ');
				if (!inmsg) {
					msgs[msgnum] = new Object();
					msgs[msgnum].headers = new Array();
					msgs[msgnum].names = new Array();
					y = 0;
				}
				msgs[msgnum].headers[fields[0].toLowerCase()] = fields[1];
				msgs[msgnum].names[y++] = fields[0].toLowerCase();
				if (me.debug)
					me.debug.value = me.debug.value + "field " + fields[0] + "/" + fields[1] + "\n";
				inmsg = 1;
			} else {
				if (inmsg) {
					if (me.debug)
						me.debug.value = me.debug.value + " new message\n";
					inmsg = 0;
					msgnum++;
				}
			}
		}
		if (me.debug) {
			me.debug.value = me.debug.value + "msgnum is " + msgnum + " and array length is " + msgs.length + "\n";
			me.debug.value = me.debug.value + "length is " + msgs.length + "\n";
			var x, y;
			for (x = 0; x < msgs.length; x++) {
				for (y = 0; y < msgs[x].names.length; y++) {
					me.debug.value = me.debug.value + "msg " + (x + 1) + "/" + msgs[x].names[y] + "/" + msgs[x].headers[msgs[x].names[y]] + "\n";
				}
			}
		}
		callback(msgs);
	};
	this.managerResponse = function (t) {
		me.parseResponse(t, me.callback);
	};
	this.doEvents = function (msgs) {
		me.eventcallback(msgs);
	};
	this.eventResponse = function (t) {
		me.parseResponse(t, me.doEvents);
	};
	this.sendRequest = function (request, callback) {
		var tmp;
		var opt = {
			method: 'get',
			asynchronous: true,
			onSuccess: this.managerResponse,
			onFailure: function (t) {
				alert("Event Error sendRequest: " + this.url + ": " + t.status + ": " + t.statusText);
			}
		};
		me.callback = callback;
		opt.parameters = request;
		tmp = new Ajax.Request(this.url, opt);
	};
	this.pollEvents = function () {
		var tmp;
		var opt = {
			method: 'get',
			asynchronous: true,
			onSuccess: this.eventResponse,
			onFailure: function (t) {
				alert("Event Error: " + this.url + ": " + t.status + ": " + t.statusText);
			}
		};
		opt.parameters = "action=waitevent";
		//alert("Requstuju tohle url s waitevent" + this.url+ ' '+opt);  //vola se rawman
		tmp = new Ajax.Request(this.url, opt);
	};
};

astmanEngine = new Astman();
