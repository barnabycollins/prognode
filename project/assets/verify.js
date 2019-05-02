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

module.exports = verify;