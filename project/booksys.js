const moment = require('moment');
const io = require('./file-io');
let ready = false;



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
	* @param {string} booktime ISO 8601 timestamp for the time the booking was made
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
* @param {string} date DD/MM/YYYY date string for the booking date
* @param {string} STime HH:mm string for the start time of the booking
* @param {string} ETime HH:mm string for the end time of the booking
* @param {string} name the name to display on that booking
* @param {object} user the user object of the Google account that made the booking
* @param {boolean} recurrence whether or not the booking will recur every week
*/
function createBooking(date, STime, ETime, name, user, recurrence) {
	let id = user['sub'];
	let email = user['email'];
	let userName = user['name'];
	let userPerms = getPerms(id);

	// pull name from user object if necessary
	if (!name || userPerms < 2) {
		name = userName;
	}

	try {
		var start = moment(date + ' ' + STime, 'DD/MM/YYYY HH:mm').startOf('hour');
	}
	catch (error) {
		throw 'Start time or date is not valid: please make sure you are using DD/MM/YYYY and HH:mm';
	}
	
	try {
		var end = moment(date + ' ' + ETime, 'DD/MM/YYYY HH:mm').startOf('hour');
	}
	catch (error) {
		throw 'End time is not valid: please make sure you are using HH:mm';
	}
	
	if (end.isBefore(moment())) {
		throw 'Booking is in the past';
	}
	
	// add the user to the user database if we haven't already
	if (!(id in UserList)) {
		UserList[id] = new User(userName, 0, email);
	}
	let mintime = start.clone().hour(10);
	let maxtime = start.clone().hour(22);

	// make sure that both start and end land in the range of 10 til 10 on the date of the start time
	if (!(start.isBetween(mintime, maxtime, null, '[]') && end.isBetween(mintime, maxtime, null, '[]'))) {
		throw 'Invalid start / end times';
	}
	// make sure end is after start (and the session spans at least one hour)
	else if (end.hour() <= start.hour()) {
		throw 'End is before start';
	}

	// only allow recurrence if they have the permissions for it (also make sure recurrence is of the right type)
	if (userPerms < 2 || recurrence !== true) {
		recurrence = false;
	}

	// booking is correctly formed

	let timeAllowed = -1;

	if (userPerms == 0) {
		timeAllowed = 4;
	}
	else if (userPerms == 1) {
		timeAllowed = 8;
	}

	if (timeAllowed >= 0) {
		let weekSum = end.hour()-start.hour();
		let weekStart = start.clone().startOf('week').toISOString();
		for (let i of Object.keys(bookings)) {
			let cur = bookings[i];
			if (cur.id == id && moment(cur.date, 'DD/MM/YYYY').startOf('week').toISOString() == weekStart) {
				weekSum += parseInt(cur.ETime.substring(0,2)) - parseInt(cur.STime.substring(0,2));
			}
		}
		if (weekSum > timeAllowed) {
			throw 'You have used up your allotted weekly time (' + weekSum.toString() + ' hours out of ' + timeAllowed.toString() + '). Please contact an admin to get your allowance increased!';
		}
	}

	// make booking object, including the time of booking and a name of appropriate length
	let toAdd = new Booking(moment().toISOString(), start.format('DD/MM/YYYY'), start.format('HH:mm'), end.format('HH:mm'), id, recurrence, name.substring(0, 32));
	let bookId = bookingnum;
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
		throw 'Your booking clashes with someone else\'s. (' + error + ')';
	}

	// if we added the booking successfully, add it to the database
	bookings[bookId] = toAdd;
	saveToDisk();
}



/**
 * Update user permissions
 * @param {string} admin 
 * @param {string} id 
 * @param {number} perms 
 */
function updateUser(admin, id, perms) {
	let permittedLevels = ['0', '1', '2', '3', '9'];
	if (!(perms in permittedLevels)) {
		throw 'Invalid permission level';
	}

	if (UserList[admin].permissionLevel < 9) {
		throw 'You don\'t have permission to change user permissions';
	}
	
	try {
		var permissionLevel = parseInt(perms);
	}
	catch (error) {
		throw 'Given permission level is not a number';
	}

	if (perms > 9 || perms < 0) {
		throw 'Permission level falls outside the range of 0-9';
	}

	try {
		UserList[id].permissionLevel = permissionLevel;
	}
	catch (error) {
		throw 'User does not exist';
	}
}



/**
 * Register booking to bookedTimes
 * @param {object} booking booking to add
 * @param {number} id id to give to the booking
 */
function registerBooking(booking, id) {
	let bookingtimes = getTimestamps(booking);
	let dayOfWeek = bookingtimes[0].isoWeekday();
	if (booking.recurrence) {
		if (bookedTimes.rec[dayOfWeek] == undefined) {
			bookedTimes.rec[dayOfWeek] = {};
		}

		for (let j = bookingtimes[0].hour(); j < bookingtimes[1].hour(); j++) {
			let clashingBooking = bookedTimes.rec[dayOfWeek][j];
			
			for (let a of Object.keys(bookedTimes.reg)) {		// years
				for (let b of Object.keys(bookedTimes.reg[a]))	{	// days
					clashingBooking = clashingBooking || bookedTimes.reg[a][b][j];
				}
			}
			if (clashingBooking === undefined) {
				bookedTimes.rec[dayOfWeek][j] = id;
			}
			else {
				try {
					removeBooking(clashingBooking, booking.id);
					registerBooking(booking, id);
					break;
				}
				catch (error) {
					for (let k = bookingtimes[0].hour(); k < j; k++) {
						delete bookedTimes.rec[dayOfWeek][k];
					}
					bookingpool.push(id);
					throw error;
				}
			}
		}
	}
	else {
		let year = bookingtimes[0].year();
		let day = bookingtimes[0].dayOfYear();
		
		// if we haven't yet got an entry for the year, add one for the year and day
		if (bookedTimes.reg[year] == undefined) {
			bookedTimes.reg[year] = {};
			bookedTimes.reg[year][day] = {};
		}
		// if we haven't yet got an entry for the day, add one for it
		else if (bookedTimes.reg[year][day] == undefined) {
			bookedTimes.reg[year][day] = {};
		}
		
		// for each hour of the booking
		for (let j = bookingtimes[0].hour(); j < bookingtimes[1].hour(); j++) {

			let clashingBooking;
			if (bookedTimes.rec[dayOfWeek]) {
				clashingBooking = bookedTimes.rec[dayOfWeek][j] || bookedTimes.reg[year][day][j];
			}
			else {
				clashingBooking = bookedTimes.reg[year][day][j];
			}
			if (clashingBooking === undefined) {
				// if we don't yet have anything else booked then, remember it's booked now
				bookedTimes.reg[year][day][j] = id;
			}
			else {
				try {
					if (bookings[clashingBooking].recurrence) {
						throw 'Please delete recurring bookings before trying to overwrite them';
					}
					// remove that booking and then try adding the current booking again
					removeBooking(clashingBooking, booking.id);
					registerBooking(booking, id);
					break;
				}
				catch (error) {
					// if we fail to remove the clashing booking(s)
					for (let k = bookingtimes[0].hour(); k < j; k++) {
						// remove past entries in bookedTimes and put the id back in the bookingpool
						delete bookedTimes.reg[year][day][k];
					}
					bookingpool.push(id);
					throw error;
				}
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
		throw 'Failed to remove booking: booking ' + id + ' does not exist';
	}

	let booking = bookings[id];
	if (user != booking.id && getPerms(user) < 9) {
		throw 'You can\'t delete someone else\'s booking';
	}

	let bookingtimes = getTimestamps(booking);
	if (booking.recurrence) {
		let dayOfWeek = bookingtimes[0].isoWeekday();
	
		for (let i = bookingtimes[0].hour(); i < bookingtimes[1].hour(); i++) {
			delete bookedTimes.rec[dayOfWeek][i];
		}

		if (Object.keys(bookedTimes.rec[dayOfWeek]).length == 0) {
			delete bookedTimes.rec[dayOfWeek];
		}
	}
	else {
		let year = bookingtimes[0].year();
		let day = bookingtimes[0].dayOfYear();
	
		for (let i = bookingtimes[0].hour(); i < bookingtimes[1].hour(); i++) {
			delete bookedTimes.reg[year][day][i];
		}
	
		// tidy up any empty entries in bookedTimes
		if (Object.keys(bookedTimes.reg[year][day]).length == 0) {
			delete bookedTimes.reg[year][day];
	
			if (Object.keys(bookedTimes.reg[year]).length == 0) {
				delete bookedTimes.reg[year];
			}
		}
	}

	// remove booking from bookings database and release the id back to the pool
	delete bookings[id];
	bookingpool.push(id);
	saveToDisk();
}



/**
 * Gets all bookings, or the bookings for a user ID if one is given
 * @param {string} [user] id of the user to check 
 */
function getBookings(user) {
	let i, j, content = {};
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
	let struct = {
		'bookings': bookings,
		'UserList': UserList,
		'bookedTimes': bookedTimes,
		'bookingnum': bookingnum,
		'bookingpool': bookingpool
	};

	try {
		io.write(struct);
	}
	catch (error) {
		// eslint-disable-next-line no-console
		console.log('Failed to write JSON to file -', error);
	}
}



/**
 * Converts booking objects to Moment objects
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
	let user = UserList[id];
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
function getState(id) {
	let perms = getPerms(id);
	if (perms < 9) {
		throw 'You don\'t have permission to access server state';
	}
	return {'bookings': bookings, 'bookedTimes': bookedTimes, 'bookingnum': bookingnum, 'bookingpool': bookingpool, 'UserList': UserList};
}



let bookings, UserList, bookedTimes, bookingnum, bookingpool;
try {
	if (io.checkFile()) {
		let struct = JSON.parse(io.read());
		bookings = struct['bookings'];
		UserList = struct['UserList'];
		bookedTimes = struct['bookedTimes'];
		bookingnum = struct['bookingnum'];
		bookingpool = struct['bookingpool'];
		ready = true;
	}
}
catch (error) {
	// eslint-disable-next-line no-console
	console.log('Error: failed to read data file -', error);
}

if (!ready) {
	// initialise structures
	UserList = {		// object to store registered users
		'116714588086254124711': new User('Barnaby Collins', 9, 'barnstormer322@gmail.com')
	};
	bookedTimes = {'reg': {}, 'rec': {}};	// object to store what times are booked so we can check for clashes (reg = regular, rec = recurring)
	bookings = {};		// object to store bookings in
	bookingnum = 1;		// counter to store the current booking index
	bookingpool = [];	// queue to store the pool of free booking numbers
	ready = true;		// boolean to tell the server when the database is set up
	saveToDisk();
}

module.exports = {createBooking, removeBooking, getBookings, getState, getPerms, ready, updateUser};