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

jest.mock('./verify', () => {
	return jest.fn((token) => mockverify(token));
});

jest.mock('./file-io');
jest.mock('./testbk');

const verify = require('./verify');
const io = require('./file-io');
const testbk = require('./testbk');
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

	test ('GET /bookings succeeds & has our new booking', async () => {
		const response = await request(app).get('/bookings');
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
		expect (response.statusCode).toBe(409);
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
		expect(response.statusCode).toBe(409);
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
		expect(response.statusCode).toBe(409);
	});

	test ('GET /bookings returns all added bookings', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(3);
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

	test ('DELETE /bookings removing regular booking', async () => {
		const response = await request(app).delete('/bookings')
			.set({
				'token': '0'
			})
			.send({
				id: '1'
			});
		expect(response.statusCode).toBe(204);
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
		expect(response.statusCode).toBe(401);
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

describe ('Testing permission changes', () => {
	test ('POST /perms as admin increasing perms is successful', async () => {
		const response = await request(app).post('/perms')
			.set({
				'token': '9'
			})
			.send({
				id: 'usr-3',
				perms: '9'
			});
		expect(response.statusCode).toBe(200);
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
});