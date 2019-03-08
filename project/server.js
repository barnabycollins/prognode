var moment = require('moment');
var express = require('express');

class User {
	/**
	* Class for a user
	* @param {string} name user's name
	* @param {number} permissionLevel the permission level of the user
	*/
	constructor (name, permissionLevel) {
		this.name = name;
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
		UserList[id] = new User(name, 0);
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
* @param {object} STime JS Date.toString() object representing the start time of the booking
* @param {object} ETime JS Date.toString() object representing the end time of the booking
* @param {string} name the name to display on that booking
* @param {??} id the user id of the person that made the booking
* @param {boolean} recurrence whether or not the booking will recur every week
*/
function createBooking(STime, ETime, name, id, recurrence) {
	var recurrencedict = {'1': true, '0': false};
	
	// add the user to the user database if we haven't already
	if (!(id in UserList)) {
		UserList[id] = new User(name, 0);
	}

	var start = moment(STime);
	var end = moment(ETime);
	var mintime = start.clone().hour(10);
	var maxtime = start.clone().hour(22);

	// make sure that both start and end land in the range of 10 til 10 on the date of the start time
	if (!(start.isBetween(mintime, maxtime, 'hour', '[]') && end.isBetween(mintime, maxtime, 'year', '[]'))) {
		return false;
	}
	// make sure end is after start (and the session spans at least one hour)
	else if (end.hour() <= start.hour()) {
		return false;
	}

	// make booking object
	var toAdd = new Booking(Date.now(), Date.parse(STime), Date.parse(ETime), parseInt(id), recurrencedict[recurrence]);

	// if the booking doesn't clash, add it to bookings
	if (registerBooking(toAdd)) {
		bookings.push(toAdd);
	}
	// otherwise, return false
	else {
		return false;
	}
	
	// if we completed successfully, return true
	return true;
}


// object to store what times are booked so we can check for clashes
var bookedTimes = {};

/**
 * Register booking to bookedTimes
 * @param {object} booking booking to add
 */
function registerBooking(booking) {
	var bookingtimes = [moment(booking.STime), moment(booking.ETime)];
	var year = bookingtimes[0].year();
	var day = bookingtimes[0].dayOfYear();
	
	// if we haven't yet got an entry for the year, add one for the year and day
	if (bookedTimes[year] == undefined) {
		bookedTimes[year] = {};
		bookedTimes[year][day] = {};
	}
	// if we haven't yet got an entry for the day, add one for it
	else if (bookedTimes[year][day] == undefined) {
		bookedTimes[year][day] = {};
	}
	// for each hour of the booking
	for (var j = bookingtimes[0].hour(); j < bookingtimes[1].hour(); j++) {
		// if we don't yet have anything else booked then, remember it's booked now
		if (!bookedTimes[year][day][j]) {
			bookedTimes[year][day][j] = true;
		}
		// if there's a clash, remove previous entries and return a failure
		else {
			for (var k = bookingtimes[0].hour(); k < j; k++) {
				delete bookedTimes[year][day][j];
			}
			return false;
		}
	}
	// if we successfully made a booking, return success
	return true;
}

var bookings = [];
createBooking('13 Mar 2019 10:00:00 GMT', '13 Mar 2019 12:00:00 GMT', 'steve', 80, '0');

// NODE SERVER
var app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.static('static'));

/* ROOT */
app.get('/', function(req, resp) {
	resp.send('hello world');
});

/* GETTING BOOKINGS */
app.get('/bookings', function(req, resp) {
	var content = [];
	for (var i = 0; i < bookings.length; i++) {
		var j = Object.assign({}, bookings[i]);
		j['name'] = UserList[j.id].name;
		delete j.id;
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
	if (createBooking(req.body.stime, req.body.etime, req.body.name, req.body.id, req.body.recurrence)) {
		resp.send('Successfully added your booking to the database.');
	}
	else {
		resp.status(409).send('Failed to add your booking, likely because of a clash with an existing booking. Please check the timetable before making your booking! Alternatively, this could be because your booking lands outside the 10-til-10 range allowed.');
	}
});

/* OTHERWISE */
app.get('*', function(req, resp) {
	resp.send('no');
});

app.listen(8080);