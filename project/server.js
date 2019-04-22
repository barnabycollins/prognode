var express = require('express');
var bs = require('./booksys.js');

// create a default booking to play with
try {
	bs.createBooking('23/04/2019', '10:00', '12:00', 'steve', {'sub': '80', 'email': 'steve@stevecorp.org', 'name': 'STEPHEN'}, false);
	bs.createBooking('25/04/2019', '16:00', '19:00', '', {'sub': '116714588086254124711', 'email': 'barnstormer322@gmail.com', 'name': 'Barnaby Collins'}, false);
}
catch (error) {
	// eslint-disable-next-line no-console
	console.log('Failed to create test bookings: ' + error);
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

app.use(express.static('static'));
app.use(express.json());

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
	resp.send(JSON.stringify(bs.getBookings(user), null, 4));
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
app.post('/bookings', async function(req, resp) {
	try {
		var user = await verify(req.header('token'));
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
	resp.status(201).send('Successfully added your booking to the database.');
});

/* REMOVE BOOKING */
app.delete('/bookings', async function(req, resp) {
	try {
		var user = await verify(req.header('token'));
		var id = user['sub'];
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
		return;
	}
	try {
		bs.removeBooking(req.header('id'), id);
	}
	catch (error) {
		resp.status(401).send('Error: ' + error);
		return;
	}
	resp.send('Successfully removed booking ' + req.header('id'));
});

/* GET PERMS FOR A USER ACCOUNT */
app.get('/perms', async function(req, resp) {
	try {
		var user = await verify(req.header('token'));
		var id = user['sub'];
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
		return;
	}
	resp.send(bs.getPerms(id).toString());
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