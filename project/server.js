var express = require('express');
var bs = require('./booksys.js');

// create a default booking to play with
try {
	bs.createBooking('09/04/2019', '10:00', '12:00', 'steve', {'sub': '80', 'email': 'steve@stevecorp.org', 'name': 'STEPHEN'}, 'off');
}
catch (error) {
	// eslint-disable-next-line no-console
	console.log('Failed to create booking: ' + error);
}

// set up Google OAuth API
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
app.get('/bookings', async function(req, resp) {
	var user;
	var token = req.header('token');
	if (token) {
		try {
			user = await verify(token);
			user = user['sub'];
		}
		catch(error) {
			resp.status(401).send('Error: Failed to verify your Google account');
			return;
		}
	}
	resp.send(bs.getBookings(user));
});

/* ADD OR UPDATE USER ENTRY */
/* app.post('/updateuser', async function(req, resp) {
	try {
		var user = await verify(req.body.id);
	}
	catch (error) {
		resp.status(401).send('Error: Failed to verify your Google account');
		return;
	}

	bs.updateUser(user['sub'], req.body.name);
	resp.send('User successfully updated');
}); */

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
		bs.createBooking(req.body.date, req.body.stime, req.body.etime, req.body.name, user, req.body.recurrence);
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
		bs.removeBooking(req.body.id, id);
	}
	catch (error) {
		resp.status(401).send('Error:', error);
		return;
	}
	resp.send('Successfully removed booking ' + req.body.id);
});

/* DEBUG: GET FULL STATE */
app.get('/all', function(req, resp) {
	resp.send(bs.getState());
});

/* OTHERWISE */
app.get('*', function(req, resp) {
	resp.send('no');
});

app.listen(8080);