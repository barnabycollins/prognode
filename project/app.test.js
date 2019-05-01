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
bs.getPerms = jest.fn((token) => parseInt(token.slice(-1)));
bs.saveToDisk = jest.fn().mockImplementation(() => true);

describe ('Tests adding some bookings', () => {
	test('GET /bookings succeeds & is empty', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(0);
	});

	test ('POST /bookings with valid level 0 user', async () => {
		const response = await request(app).post('/bookings')
			.send({
				date: '18/05/2019',
				stime: '11:00',
				etime: '13:00'
			})
			.set({
				'Accept': 'application/json',
				'token': '0'
			});
		expect (response.statusCode).toBe(201);
	});

	test('GET /bookings succeeds & has our new booking', async () => {
		const response = await request(app).get('/bookings');
		pastResponse = response.body;
		expect(response.statusCode).toBe(200);
		expect(Object.keys(response.body).length).toBe(1);
	});

	test ('POST /bookings with invalid user', async () => {
		const response = await request(app).post('/bookings')
			.send({
				date: '17/05/2019',
				stime: '11:00',
				etime: '13:00'
			})
			.set({
				'Accept': 'application/json',
				'token': 'JEFFERY'
			});
		expect (response.statusCode).toBe(401);
	});

	test('GET /bookings succeeds & has not changed', async () => {
		const response = await request(app).get('/bookings');
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(pastResponse);
	});
});