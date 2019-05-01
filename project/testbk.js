const bs = require('./booksys');

function addTestBookings() {
	bs.createBooking('03/05/2019', '10:00', '12:00', 'steve', {'sub': '80', 'email': 'steve@stevecorp.org', 'name': 'STEPHEN'}, false);
	bs.createBooking('04/05/2019', '16:00', '19:00', '', {'sub': '116714588086254124711', 'email': 'barnstormer322@gmail.com', 'name': 'Barnaby Collins'}, false);
	bs.createBooking('02/05/2019', '20:00', '22:00', 'Recurring booking', {'sub': '116714588086254124711', 'email': 'barnstormer322@gmail.com', 'name': 'Barnaby Collins'}, true);
}
module.exports = {addTestBookings};