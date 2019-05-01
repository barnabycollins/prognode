const express = require('express');
const bs = require('./booksys');
const verify = require('./verify');
const compression = require('compression');

// wait until the booking system is initialised before continuing
while (!bs.ready) {
	continue;
}

// create default bookings to play with
try {
	bs.createBooking('03/05/2019', '10:00', '12:00', 'steve', {'sub': '80', 'email': 'steve@stevecorp.org', 'name': 'STEPHEN'}, false);
	bs.createBooking('04/05/2019', '16:00', '19:00', '', {'sub': '116714588086254124711', 'email': 'barnstormer322@gmail.com', 'name': 'Barnaby Collins'}, false);
	bs.createBooking('02/05/2019', '20:00', '22:00', 'Recurring booking', {'sub': '116714588086254124711', 'email': 'barnstormer322@gmail.com', 'name': 'Barnaby Collins'}, true);
}
catch (error) {
	// eslint-disable-next-line no-console
	console.log('Failed to create test bookings: ' + error);
}

// NODE SERVER
const app = express();

app.use(express.static('static'));
app.use(express.json());
app.use(compression());

// redirect to HTTPS if request received on HTTP (Jeremias Binder, https://stackoverflow.com/questions/7450940/automatic-https-connection-redirect-with-node-js-express)
app.use (function (req, res, next) {
	if (req.secure || req.headers.host.includes('localhost')) {
		next();
	} else {
		res.redirect('https://' + req.headers.host + req.url);
	}
});

/* GETTING BOOKINGS */
app.get('/bookings', async function(req, resp) {
	let user;
	let token = req.header('token');
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
	resp.type('json').send(JSON.stringify(bs.getBookings(user), null, 4));
});

/* ADD OR UPDATE USER ENTRY */
app.post('/perms', async function(req, resp) {
	try {
		var user = await verify(req.header('token'));
	}
	catch (error) {
		resp.status(401).send('Error: Failed to verify your Google account');
		return;
	}

	try {
		bs.updateUser(user['sub'], req.body.id, req.body.perms);
	}
	catch (error) {
		resp.status(400).send('Error: Could not update user - ' + error);
		return;
	}
	resp.send('User successfully updated');
});

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
		resp.status(409).send('Error: failed to create your booking - ' + error);
		return;
	}
	resp.status(201).type('json').send(JSON.stringify(bs.getBookings(user), null, 4));
});

/* REMOVE BOOKING */
app.delete('/bookings', async function(req, resp) {
	try {
		let user = await verify(req.header('token'));
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
	resp.status(204).send('Successfully removed booking ' + req.header('id'));
});

/* GET PERMS FOR A USER ACCOUNT */
app.get('/perms', async function(req, resp) {
	try {
		let user = await verify(req.header('token'));
		var id = user['sub'];
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
		return;
	}
	resp.type('json').send(JSON.stringify({'perms': bs.getPerms(id)}, null, 4));
});

/* DEBUG: GET FULL STATE */
app.get('/all', async function(req, resp) {
	try {
		var user = await verify(req.header('token'));
	}
	catch (error) {
		resp.status(401).send('Error: failed to verify your Google account');
		return;
	}
	try {
		var struct = bs.getState(user['sub']);
	}
	catch (error) {
		resp.status(401).send('Error: ' + error);
		return;
	}
	resp.type('json').send(JSON.stringify(struct, null, 4));
});

/* OTHERWISE */
app.get('*', function(req, resp) {
	resp.status(404).send('404: No resource found at this location');
});

module.exports = app;