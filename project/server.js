class User {
	/**
	* Class for a user
	* @param {string} name user's name
	* @param {number} permissionLevel the permission level of the user
	*/
	constructor (name, permissionLevel) {
		this.name = name
		this.permissionLevel = permissionLevel;
	}
}

var UserList = {};
UserList[1337] = new User('Barnaby Collins', 9);

/**
* Add or update user entry
* @param {number} id ID of the user to add or update
* @param {string} name name to give to the user
*/
function updateUser(id, name) {
	if (id in UserList) {
		UserList[id].name = name;
	} else {
		userList[id] = new User(name, 0);
	}
}

class Booking {
	/**
	* Class for a booking
	* @param {number} booktime unix timestamp for the time the booking was made (used for priority)
	* @param {object} STime JS Date object representing the start time of the booking
	* @param {object} ETime JS Date object representing the end time of the booking
	* @param {??} id the user id of the person that made the booking
	* @param {boolean} recurrence whether or not the booking will recur every week
	*/
	constructor(booktime, STime, ETime, id, recurrence) {
		this.booktime = booktime;
		this.STime = STime;
		this.ETime = ETime;
		this.id = id;
		this.recurrence = recurrence;
	}
}

/**
* Create new booking
* @param {object} STime JS Date object representing the start time of the booking
* @param {object} ETime JS Date object representing the end time of the booking
* @param {string} name the name to display on that booking
* @param {??} id the user id of the person that made the booking
* @param {boolean} recurrence whether or not the booking will recur every week
*/
function createBooking(STime, ETime, name, id, recurrence) {
	var recurrencedict = {'true': true, 'false': false};
	if (!(id in UserList)) {
		UserList[id] = new User(name, 0);
	}
	bookings.push(new Booking(Date.now(), STime, ETime, id, recurrencedict[recurrence]));
}

var bookings = [];


// NODE SERVER
var express = require('express');
var app = express();


app.use(express.urlencoded({extended: false}));
app.use(express.static('static'));

/* ROOT */
app.get('/', function(req, resp) {
	resp.send('hello world');
});

/* GETTING BOOKINGS */
app.get('/bookings', function(req, resp) {
	content = [];
	for (i = 0; i < bookings.length; i++) {
		var j = bookings[i];
		j['name'] = UserList[j.id].name;
		content.push(j);
	}
	resp.send(content);
});

/* GETTING USER LIST */
app.get('/users', function(req, resp) {
	resp.send(UserList);
});

/* ADD OR UPDATE USER ENTRY */
app.post('/updateuser', function(req, resp) {
	updateUser(req.body.id, req.body.name);
	resp.send('User successfully updated');
});

/* NEW BOOKING */
app.post('/new', function(req, resp) {
	createBooking(req.body.stime, req.body.etime, req.body.name, req.body.id, req.body.recurrence);
	resp.send('Successfully added your booking to the database.');
});

/* OTHERWISE */
app.get('*', function(req, resp) {
	resp.send('no');
});

app.listen(8080);