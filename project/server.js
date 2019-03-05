class User {
	/**
	* Class for a user
	* @param {??} id user's id
	* @param {string} name user's name
	* @param {number} permissionLevel the permission level of the user
	*/
	constructor (id, name, permissionLevel) {
		this.id = id;
		this.name = name
		this.permissionLevel = permissionLevel;
	}
}

/**
* Add or update user entry
* @param {number} id ID of the user to add or update
* @param {string} name name to give to the user
*/
function updateUser(id, name) {
	var haveUser = false;
	for (i = 0; i < users.length; i++) {
		if (users[i].id == id) {
			haveUser = true;
			users[i].name = name;
		}
	}
	if (!haveUser) {
		users.push(new User(id, name, 0));
	}
}

class Booking {
	/**
	* Class for a booking
	* @param {number} booktime unix timestamp for the time the booking was made (used for priority)
	* @param {object} STime JS Date object representing the start time of the booking
	* @param {object} ETime JS Date object representing the end time of the booking
	* @param {string} name the name to display on that booking
	* @param {??} id the user id of the person that made the booking
	* @param {boolean} recurrence whether or not the booking will recur every week
	*/
	constructor(booktime, STime, ETime, name, id, recurrence) {
		this.booktime = booktime;
		this.STime = STime;
		this.ETime = ETime;
		this.name = name;
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
	var id = parseInt(id);
	var recurrencedict = {'true': true, 'false': false};
	var haveUser = false;
	for (i = 0; i < users.length; i++) {
		if (users[i].id == id) {
			haveUser = true;
			name = users[i].name;
		}
	}
	if (!haveUser) {
		users.push(new User(id, name, 0));
	}
	bookings.push(new Booking(Date.now(), STime, ETime, name, id, recurrencedict[recurrence]));
}


var users = [new User(1337, 'Barnaby Collins', 9)];
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
	resp.send(bookings);
});

/* GETTING USER LIST */
app.get('/users', function(req, resp) {
	resp.send(users);
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