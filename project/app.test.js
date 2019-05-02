'use strict';
/* eslint-disable no-unused-vars */
const request = require('supertest');
const app = require('./app');

let pastResponse;
let allowedTokens = ['0','1','2','3','9'];

function mockwrite() {
	return true;
}

/**
 * Mock verify function: returns users for tokens in allowedTokens and yeets errors all over the shop otherwise
 * @param {string} token 
 */
function mockverify (token) {
	if (allowedTokens.includes(token)) {
		return {
			'sub': 'usr-' + token,
			'name': 'USER ' + token,
			'email': 'user' + token + '@jest.com'
		};
	}
	else {
		throw 'invalid token';
	}
}

jest.mock('./assets/verify', () => {
	return jest.fn((token) => mockverify(token));
});

jest.mock('./assets/file-io');
jest.mock('./assets/testbk');

const verify = require('./assets/verify');
const io = require('./assets/file-io');
const testbk = require('./assets/testbk');
const bs = require('./booksys');
//bs.getPerms = jest.fn((token) => parseInt(token));

describe ('Testing adding bookings', () => {
	test ('GET /bookings succeeds & is empty', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(0);
	});

	test ('POST /bookings with valid level 0 user', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '0'
			})
			.send({
				date: '18/05/2019',
				stime: '11:00',
				etime: '13:00'
			});
		expect (response.statusCode).toBe(201);
	});

	test ('GET /bookings with user token succeeds & has our new booking', async () => {
		const response = await request(app).get('/bookings')
			.set({
				'token': '0'
			});
		pastResponse = response.body;
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(1);
	});

	test ('POST /bookings with invalid user', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': 'JEFFERY'
			})
			.send({
				date: '17/05/2019',
				stime: '11:00',
				etime: '13:00'
			});
		expect (response.statusCode).toBe(401);
	});

	test ('POST /bookings with invalid date string', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: 'I LIEK EGGS',
				stime: '13:00',
				etime: '15:00'
			});
		expect (response.statusCode).toBe(400);
	});

	test ('POST /bookings with invalid start time string', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: '21/05/2019',
				stime: 'BAKED BEANS',
				etime: '15:00'
			});
		expect (response.statusCode).toBe(400);
	});

	test ('POST /bookings with invalid end time string', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: '21/05/2019',
				stime: '13:00',
				etime: 'E'
			});
		expect (response.statusCode).toBe(400);
	});

	test ('POST /bookings with end before start', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: '21/05/2019',
				stime: '13:00',
				etime: '10:00'
			});
		expect (response.statusCode).toBe(400);
	});

	test ('POST /bookings with time in the past', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: '21/05/1066',
				stime: '13:00',
				etime: '15:00'
			});
		expect (response.statusCode).toBe(400);
	});

	test ('POST /bookings with times outside allowed range', async () => {
		const resp1 = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: '21/05/2019',
				stime: '04:00',
				etime: '10:00'
			});
		expect (resp1.statusCode).toBe(400);
		const resp2 = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: '21/05/2019',
				stime: '20:00',
				etime: '23:00'
			});
		expect (resp2.statusCode).toBe(400);
	});

	test ('GET /bookings succeeds & has not changed', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(pastResponse);
	});

	test ('POST /bookings with recurring booking', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: '12/05/2019',
				stime: '18:00',
				etime: '20:00',
				recurrence: true,
				name: 'Big Band'
			});
		expect (response.statusCode).toBe(201);
		expect (response.body[2].recurrence).toBe(true);
	});

	test ('POST /bookings trying to overwrite recurring booking', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '2'
			})
			.send({
				date: '19/05/2019',
				stime: '17:00',
				etime: '19:00'
			});
		expect (response.statusCode).toBe(400);
	});

	test ('POST /bookings adding more time in same week to exceed permission limit', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '0'
			})
			.send({
				date: '13/05/2019',
				stime: '10:00',
				etime: '13:00'
			});
		expect(response.statusCode).toBe(400);
	});

	test ('POST /bookings adding extra time within weekly limits', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '0'
			})
			.send({
				date: '13/05/2019',
				stime: '10:00',
				etime: '12:00'
			});
		expect(response.statusCode).toBe(201);
		expect(Object.keys(response.body).length).toBe(2);
	});

	test ('POST /bookings with recurring booking that clashes with non-recurring booking', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '3'
			})
			.send({
				date: '20/05/2019',
				stime: '11:00',
				etime: '14:00',
				recurrence: true,
				name: 'BIG BAND ARE TAKING OVER'
			});
		expect(response.statusCode).toBe(400);
	});

	test ('POST /bookings with user that isn\'t in UserList yet', async () => {
		const response = await request(app).post('/bookings')
			.set({
				'token': '1'
			})
			.send({
				date: '18/05/2019',
				stime: '10:00',
				etime: '11:00'
			});
		expect (response.statusCode).toBe(201);
	});

	test ('GET /bookings returns all added bookings', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(4);
	});
});

describe ('Testing booking deletions', () => {
	test ('DELETE /bookings removing recurring booking', async () => {
		const response = await request(app).delete('/bookings')
			.set({
				'token': '3'
			})
			.send({
				id: '2'
			});
		expect(response.statusCode).toBe(204);
	});

	test ('DELETE /bookings removing regular bookings', async () => {
		const resp1 = await request(app).delete('/bookings')
			.set({
				'token': '0'
			})
			.send({
				id: '1'
			});
		expect(resp1.statusCode).toBe(204);

		const resp2 = await request(app).delete('/bookings')
			.set({
				'token': '1'
			})
			.send({
				id: '4'
			});
		expect(resp2.statusCode).toBe(204);
	});

	test ('GET /bookings shows bookings were removed', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(1);
	});

	test ('DELETE /bookings trying to remove someone else\'s booking', async () => {
		const response = await request(app).delete('/bookings')
			.set({
				'token': '3'
			})
			.send({
				id: '3'
			});
		expect(response.statusCode).toBe(400);
	});

	test ('DELETE /bookings with no user token does not work', async () => {
		const response = await request(app).delete('/bookings')
			.send({
				id: '3'
			});
		expect(response.statusCode).toBe(401);
	});

	test ('DELETE /bookings with invalid user token does not work', async () => {
		const response = await request(app).delete('/bookings')
			.set({
				'token': 'BOBERT'
			})
			.send({
				id: '3'
			});
		expect(response.statusCode).toBe(401);
	});

	test ('DELETE /bookings with invalid booking id', async () => {
		const response = await request(app).delete('/bookings')
			.set({
				'token': '9'
			})
			.send({
				id: 'WILSON'
			});
		expect(response.statusCode).toBe(400);
	});

	test ('GET /bookings shows booking was not removed', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(1);
		expect(Object.keys(response.body)).toEqual(['3']);
	});

	test ('DELETE /bookings as admin works for others\' bookings', async () => {
		const response = await request(app).delete('/bookings')
			.set({
				'token': '9'
			})
			.send({
				id: '3'
			});
		expect(response.statusCode).toBe(204);
	});

	test ('GET /bookings shows booking was removed', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(0);
	});
});

describe ('Testing permissions endpoint', () => {
	test ('POST /perms as admin increasing perms is successful', async () => {
		const resp1 = await request(app).post('/perms')
			.set({
				'token': '9'
			})
			.send({
				id: 'usr-3',
				perms: '9'
			});
		expect(resp1.statusCode).toBe(200);

		const resp2 = await request(app).post('/perms')
			.set({
				'token': '9'
			})
			.send({
				id: 'usr-1',
				perms: '1'
			});
		expect(resp2.statusCode).toBe(200);
	});

	test ('GET /perms returns updated permission level #1', async () => {
		const response = await request(app).get('/perms')
			.set({
				'token': '3'
			});
		expect(response.statusCode).toBe(200);
		expect(response.body.perms).toBe(9);
	});

	test ('POST /perms to check that user now has access to new permission level', async () => {
		const response = await request(app).post('/perms')
			.set({
				'token': '3'
			})
			.send({
				id: 'usr-2',
				perms: '3'
			});
		expect(response.statusCode).toBe(200);
	});

	test ('GET /perms returns updated permission level #2', async () => {
		const response = await request(app).get('/perms')
			.set({
				'token': '2'
			});
		expect(response.statusCode).toBe(200);
		expect(response.body.perms).toBe(3);
	});

	test ('POST /perms as admin reducing perms is successful', async () => {
		const resp1 = await request(app).post('/perms')
			.set({
				'token': '9'
			})
			.send({
				id: 'usr-3',
				perms: '3'
			});
		expect (resp1.statusCode).toBe(200);

		const resp2 = await request(app).post('/perms')
			.set({
				'token': '9'
			})
			.send({
				id: 'usr-2',
				perms: '2'
			});
		expect (resp2.statusCode).toBe(200);
	});

	test ('GET /perms returns updated permission levels #3', async () => {
		const resp1 = await request(app).get('/perms')
			.set({
				'token': '3'
			});
		expect(resp1.statusCode).toBe(200);
		expect(resp1.body.perms).toBe(3);

		const resp2 = await request(app).get('/perms')
			.set({
				'token': '2'
			});
		expect(resp2.statusCode).toBe(200);
		expect(resp2.body.perms).toBe(2);
	});

	test ('POST /perms to check that user no longer has access to admin permission level', async () => {
		const response = await request(app).post('/perms')
			.set({
				'token': '3'
			})
			.send({
				id: 'usr-2',
				perms: '3'
			});
		expect(response.statusCode).toBe(400);
	});

	test ('POST /perms with invalid permission level', async () => {
		const response = await request(app).post('/perms')
			.set({
				'token': '9'
			})
			.send({
				id: 'usr-3',
				perms: 'KEITH'
			});
		expect(response.statusCode).toBe(400);
	});

	test ('POST /perms with non-existent user', async () => {
		const response = await request(app).post('/perms')
			.set({
				'token': '9'
			})
			.send({
				id: 'BOBERT',
				perms: '2'
			});
		expect(response.statusCode).toBe(400);
	});
});

describe ('Testing full state access for admins', () => {
	test ('GET /all with no token is not allowed', async () => {
		const response = await request(app).get('/all');
		expect(response.statusCode).toBe(401);
	});

	test ('GET /all without admin perms is not allowed', async () => {
		const response = await request(app).get('/all')
			.set({
				'token': '3'
			});
		expect(response.statusCode).toBe(401);
	});

	test ('GET /all as admin works and shows that all internal structures are correctly formed after previous tests (THE UBERTEST)', async () => {
		const response = await request(app).get('/all')
			.set({
				'token': '9'
			});
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(5);
		expect(Object.keys(response.body.bookedTimes).length).toBe(2);
		expect(Object.keys(response.body.bookings).length).toBe(0);
	});
});

describe ('Miscellaneous tests', () => {
	test ('GET random URL returns 404', async () => {
		const response = await request(app).get('/BANANAS');
		expect(response.statusCode).toBe(404);
	});
	
	test ('POST /bookings with user level 1 works', async () => {
		const resp1 = await request(app).post('/bookings')
			.set({
				'token': '1'
			})
			.send({
				date: '18/05/2019',
				stime: '10:00',
				etime: '11:00'
			});
		expect (resp1.statusCode).toBe(201);

		const resp2 = await request(app).get('/bookings');
		expect(resp2.statusCode).toBe(200);
		expect(Object.keys(resp2.body).length).toBe(1);
	});

	test ('Invalid tokens are rejected on all endpoints', async () => {
		let responses = [];
		responses.push(await request(app).get('/bookings')
			.set({
				'token': 'DOROTHY'
			}));
		responses.push(await request(app).post('/bookings')
			.set({
				'token': 'BOB'
			}));
		responses.push(await request(app).delete('/bookings')
			.set ({
				'token': 'GERALDINE'
			}));
		responses.push(await request(app).get('/perms')
			.set({
				'token': 'PAUL'
			}));
		responses.push(await request(app).post('/perms')
			.set({
				'token': 'LINDA'
			}));
		responses.push(await request(app).get('/all')
			.set({
				'token': 'JAR JAR'
			}));
		for (let i = 0; i < responses.length; i++) {
			expect(responses[i].statusCode).toBe(401);
		}
	});
});