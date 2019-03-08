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
	var mintime = start.clone().hour(10).minute(0).second(0).millisecond(0);
	var maxtime = start.clone().hour(22).minute(0).second(0).millisecond(0);

	// make sure that both start and end land in the range of 10 til 10 on the date of the start time
	if (!(start.isBetween(mintime, maxtime, null, '[]') && end.isBetween(mintime, maxtime, null, '[]'))) {
		return false;
	}
	// make sure end is after start (and the session spans at least one hour)
	else if (end.hour() <= start.hour()) {
		return false;
	}

	// make booking object
	var toAdd = new Booking(Date.now(), Date.parse(STime), Date.parse(ETime), parseInt(id), recurrencedict[recurrence]);

	var bookId = bookingnum;
	if (bookingpool.length > 0) {
		bookId = bookingpool.shift();
	}
	else {
		bookingnum += 1;
	}
	// if the booking doesn't clash, add it to bookings
	if (registerBooking(toAdd, bookId)) {
		bookings[bookId] = toAdd;
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
 * @param {number} id id to give to the booking
 */
function registerBooking(booking, id) {
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
			bookedTimes[year][day][j] = id;
		}
		// if there's a clash
		else {
			// if the clashing booking belongs to the same user as the booking being added
			if (bookings[bookedTimes[year][day][j]].id == booking.id) {
				// remove that booking and continue adding the current booking
				removeBooking(bookedTimes[year][day][j]);
				bookedTimes[year][day][j] = id;
			}
			else {
				// if it belongs to someone else
				for (var k = bookingtimes[0].hour(); k < j; k++) {
					// remove past entries in bookedTimes and put the id back in the bookingpool
					delete bookedTimes[year][day][j];
					bookingpool.push(id);
				}
				// return a failure
				return false;
			}
		}
	}
	// if we successfully made a booking, return success
	return true;
}

/**
 * Removes a booking from bookings and bookedTimes
 * @param {number} id 
 */
function removeBooking(id) {
	if (!(id in bookings)) {
		return false;
	}
	var booking = bookings[id];
	var bookingtimes = [moment(booking.STime), moment(booking.ETime)];
	var year = bookingtimes[0].year();
	var day = bookingtimes[0].dayOfYear();

	for (var i = bookingtimes[0].hour(); i < bookingtimes[1].hour(); i++) {
		delete bookedTimes[year][day][i];
	}

	// tidy up any empty entries in bookedTimes
	if (Object.keys(bookedTimes[year][day]).length == 0) {
		delete bookedTimes[year][day];

		if (Object.keys(bookedTimes[year]).length == 0) {
			delete bookedTimes[year];
		}
	}

	// remove booking from bookings database and release the id back to the pool
	delete bookings[id];
	bookingpool.push(id);

	return true;
}

var bookings = {};		// object to store bookings in
var bookingnum = 1;		// counter to store the current booking index
var bookingpool = [];	// queue to store the pool of free booking numbers
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

app.post('/remove', function(req, resp) {
	if (removeBooking(req.body.id)) {
		resp.send('Successfully removed booking ' + req.body.id);
	}
	else {
		resp.send('Booking ' + req.body.id +' did not exist in the first place');
	}
});

/* DEBUG: GET FULL STATE */
app.get('/all', function(req, resp) {
	var body = {'bookings': bookings, 'bookedTimes': bookedTimes, 'bookingnum': bookingnum, 'bookingpool': bookingpool, 'UserList': UserList};
	resp.send(body);
});

/* OTHERWISE */
app.get('*', function(req, resp) {
	resp.send('no');
});

app.listen(8080);