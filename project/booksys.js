var moment = require('moment');
var fs = require('fs');
var datafile = 'data.json';



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



class Booking {
	/**
	* Class for a booking
	* @param {number} booktime unix timestamp for the time the booking was made (used for priority)
	* @param {string} date date of booking
	* @param {string} STime start time of the booking
	* @param {string} ETime end time of the booking
	* @param {string} id the user id of the person that made the booking
	* @param {boolean} recurrence whether or not the booking will recur every week
	* @param {string} name the name attached to the booking
	*/
	constructor(booktime, date, STime, ETime, id, recurrence, name) {
		this.booktime = booktime;
		this.date = date;
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

	// pull name from user object if necessary
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

	// only allow recurrence if they have the permissions for it
	if (getPerms(id) < 2) {
		recurrence = false;
	}

	// make booking object
	var toAdd = new Booking(Date.now(), start.format('DD/MM/YYYY'), start.format('HH:mm'), end.format('HH:mm'), id, recurrence, name.substring(0, 32));
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
	saveToDisk();
}



/**
 * Register booking to bookedTimes
 * @param {object} booking booking to add
 * @param {number} id id to give to the booking
 */
function registerBooking(booking, id) {
	var bookingtimes = getTimestamps(booking);
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
	if (user != booking.id && getPerms(user) < 9) {
		throw 'You don\'t have permission to delete that booking';
	}

	var bookingtimes = getTimestamps(booking);
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

	saveToDisk();
}



/**
 * Gets all bookings, or the bookings for a user if one is given
 * @param {string} user 
 */
function getBookings(user) {
	var i, j, content = {};
	if (user) {
		for (i of Object.keys(bookings)) {
			if (bookings[i].id == user) {
				j = Object.assign({}, bookings[i]);
				delete j.id;
				content[i] = j;
			}
		}
	}
	else {
		for (i of Object.keys(bookings)) {
			j = Object.assign({}, bookings[i]);
			delete j.id;
			content[i] = j;
		}
	}

	return content;
}




function saveToDisk() {
	var struct = {
		'bookings': bookings,
		'UserList': UserList,
		'bookedTimes': bookedTimes,
		'bookingnum': bookingnum,
		'bookingpool': bookingpool
	};
	try {
		fs.writeFile(datafile, JSON.stringify(struct, null, 4), 'utf8', function(err) {
			if (err) {
				// eslint-disable-next-line no-console
				console.log('Failed to write JSON to file -', err);
			}
		});
	}
	catch (error) {
		// eslint-disable-next-line no-console
		console.log('Failed to write JSON to file -', error);
	}
}



/**
 * Converts booking objects to Unix timestamps
 * @param {Object} booking booking to convert to a timestamp
 */
function getTimestamps(booking) {
	return [moment(booking.date + ' ' + booking.STime, 'DD/MM/YYYY HH:mm'), moment(booking.date + ' ' + booking.ETime, 'DD/MM/YYYY HH:mm')];
}



/**
 * Returns the permission level of a user
 * @param {object} id 
 */
function getPerms(id) {
	var user = UserList[id];
	if (user) {
		return user.permissionLevel;
	}
	else {
		return 0;
	}
}



/**
 * DEBUG: returns the full state of the booking system
 */
function getState() {
	return {'bookings': bookings, 'bookedTimes': bookedTimes, 'bookingnum': bookingnum, 'bookingpool': bookingpool, 'UserList': UserList};
}

var completed = false, bookings, UserList, bookedTimes, bookingnum, bookingpool;
try {
	if (fs.exists(datafile)) {
		var struct = JSON.parse(fs.readFile(datafile));
		bookings = struct['bookings'];
		UserList = struct['UserList'];
		bookedTimes = struct['bookedTimes'];
		bookingnum = struct['bookingnum'];
		bookingpool = struct['bookingpool'];
	}
	completed = true;
}
catch (error) {
	// eslint-disable-next-line no-console
	console.log('Error: failed to check for data file -', error);
}

if (!completed) {
	// initialise structures
	UserList = {		// object to store registered users
		'116714588086254124711': new User('Barnaby Collins', 9, 'barnstormer322@gmail.com')
	};
	bookedTimes = {};	// object to store what times are booked so we can check for clashes
	bookings = {};		// object to store bookings in
	bookingnum = 1;		// counter to store the current booking index
	bookingpool = [];	// queue to store the pool of free booking numbers
}

module.exports = {createBooking, removeBooking, getBookings, getState, getPerms};