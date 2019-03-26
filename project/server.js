var moment = require('moment');
var express = require('express');

class User {
	/**
	* Class for a user
	* @param {string} name user's name
	* @param {number} permissionLevel the permission level of the user
	* @param {string} email user's email
	*/
	constructor (name, permissionLevel, email) {
		this.name = name;
		this.permissionLevel = permissionLevel;
		this.email = email;
	}
}

var UserList = {};
UserList['116714588086254124711'] = new User('Barnaby Collins', 9, 'barnstormer322@gmail.com');

/**
* Add or update user entry
* @param {number} id ID of the user to add or update
* @param {string} name name to give to the user
*/
function updateUser(id, name) {
	if (id in UserList) {
		UserList[id].name = name;
	}
	else {
		UserList[id] = new User(name, 0);
	}
}

class Booking {
	/**
	* Class for a booking
	* @param {number} booktime unix timestamp for the time the booking was made (used for priority)
	* @param {object} STime JS Date object representing the start time of the booking
	* @param {object} ETime JS Date object representing the end time of the booking
	* @param {string} id the user id of the person that made the booking
	* @param {boolean} recurrence whether or not the booking will recur every week
	* @param {string} name the name attached to the booking
	*/
	constructor(booktime, STime, ETime, id, recurrence, name) {
		this.booktime = booktime;
		this.STime = STime;
		this.ETime = ETime;
		this.id = id;
		this.recurrence = recurrence;
		this.name = name;
	}
}

/**
* Create new booking
* @param {object} date
* @param {object} STime JS Date.toString() object representing the start time of the booking
* @param {object} ETime JS Date.toString() object representing the end time of the booking
* @param {string} name the name to display on that booking
* @param {string} user the user object of the Google account that made the booking
* @param {boolean} recurrence whether or not the booking will recur every week
*/
function createBooking(date, STime, ETime, name, user, recurrence) {
	var recurrencedict = {'on': true, 'off': false};

	// pull information from user object
	if (!name) {
		name = user['name'];
	}
	var id = user['sub'];
	var email = user['email'];
	var userName = user['name'];
	
	// add the user to the user database if we haven't already
	if (!(id in UserList)) {
		UserList[id] = new User(userName, 0, email);
	}

	var start = moment(date + ' ' + STime, 'DD/MM/YYYY HH:mm').startOf('hour');
	var end = moment(date + ' ' + ETime, 'DD/MM/YYYY HH:mm').startOf('hour');
	var mintime = start.clone().hour(10);
	var maxtime = start.clone().hour(22);

	// make sure that both start and end land in the range of 10 til 10 on the date of the start time
	if (!(start.isBetween(mintime, maxtime, null, '[]') && end.isBetween(mintime, maxtime, null, '[]'))) {
		throw 'Invalid start / end times';
	}
	// make sure end is after start (and the session spans at least one hour)
	else if (end.hour() <= start.hour()) {
		throw 'End is before start';
	}

	// make booking object
	var toAdd = new Booking(Date.now(), Date.parse(start), Date.parse(end), id, recurrencedict[recurrence], name);
	var bookId = bookingnum;
	if (bookingpool.length > 0) {
		bookId = bookingpool.shift();
	}
	else {
		bookingnum += 1;
	}
	
	// try and add the booking to the clash structure
	try {
		registerBooking(toAdd, bookId);
	}
	catch(error) {
		throw error;
	}

	// if we added the booking successfully, add it to the database
	bookings[bookId] = toAdd;
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
			try {
				// remove that booking and try adding the current booking again
				removeBooking(bookedTimes[year][day][j], id);
				registerBooking(booking, id);
			}
			catch(error) {
				// if we fail to remove the clashing booking(s)
				for (var k = bookingtimes[0].hour(); k < j; k++) {
					// remove past entries in bookedTimes and put the id back in the bookingpool
					delete bookedTimes[year][day][j];
					bookingpool.push(id);
				}
				throw error;
			}
		}
	}
}

/**
 * Removes a booking from bookings and bookedTimes
 * @param {number} id id of the booking to remove
 * @param {string} user id of the user removing the booking
 */
function removeBooking(id, user) {
	if (!(id in bookings)) {
		throw 'Booking being removed does not exist';
	}

	var booking = bookings[id];
	if (user != booking.id && UserList[user] < 9) {
		throw 'You don\'t have permission to delete that booking';
	}

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
}

var bookings = {};		// object to store bookings in
var bookingnum = 1;		// counter to store the current booking index
var bookingpool = [];	// queue to store the pool of free booking numbers

// create a default booking to play with
try {
	createBooking('25/03/2019', '10:00', '12:00', 'steve', {'sub': 80, 'email': 'steve@stevecorp.org', 'name': 'STEPHEN'}, 'off');
}
catch (error) {
	// eslint-disable-next-line no-console
	console.log('Failed to create booking: ' + error);
}

const CLIENT_ID = '149049213874-0g5d6qbds8th0f1snmhap4n0a05cssp2.apps.googleusercontent.com';

const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);
async function verify(token) {
	const ticket = await client.verifyIdToken({
		idToken: token,
		audience: CLIENT_ID  // Specify the CLIENT_ID of the app that accesses the backend
	});
	const payload = await ticket.getPayload();
	return payload;
}

// NODE SERVER
var app = express();

app.use(express.urlencoded({extended: false}));
app.use(express.static('static'));

/* GETTING BOOKINGS */
app.get('/bookings', function(req, resp) {
	var content = [];
	for (var i = 0; i < Object.keys(bookings).length; i++) {
		// j = current booking object
		var j = Object.assign({}, bookings[Object.keys(bookings)[i]]);
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
app.post('/updateuser', async function(req, resp) {
	try {
		var user = await verify(req.body.id);
	}
	catch (error) {
		resp.status(401).send('Error: Failed to verify your Google account');
		return;
	}

	updateUser(user['sub'], req.body.name);
	resp.send('User successfully updated');
});

/* NEW BOOKING */
app.post('/new', async function(req, resp) {
	try {
		var user = await verify(req.body.id);
	}
	catch (error) {
		resp.status(401).send('Error: Failed to verify your Google account');
		return;
	}

	try {
		createBooking(req.body.date, req.body.stime, req.body.etime, req.body.name, user, req.body.recurrence);
	}
	catch(error) {
		resp.status(409).send('Error: failed to create your booking: ' + error);
		return;
	}
	resp.send('Successfully added your booking to the database.');
});

/* REMOVE BOOKING */
app.post('/remove', async function(req, resp) {
	try {
		var user = await verify(req.body.user);
		var id = user['sub'];
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
	}
	try {
		removeBooking(req.body.id, id);
	}
	catch (error) {
		resp.send('Error:', error);
		return;
	}
	resp.send('Successfully removed booking ' + req.body.id);
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