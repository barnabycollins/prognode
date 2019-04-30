const moment = require('moment');
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let idtoken, userLevel, userId;
let loggedIn = false;
let toastCount = 0;

// tell eslint that the Google API is a thing
/* global gapi */

/**
 * Pull all bookings from the server and put them in the main table
 */
async function updateTable() {
	try {
		let response = await fetch('/bookings');
		if (!response.ok) {
			throw await response.text();
		}
		var bookings = await response.json();
	}
	catch (error) {
		makeToast('Failed to get bookings', error);
	}

	/* PROCESS RECEIVED BOOKINGS */
	// add table inside #timetable-container with header row and initial box
	$('#timetable-container').html('<table id=\'timetable\' class=\'table table-dark table-striped table-responsive\'><tr id=\'timetable-header\'><td class=\'time-header\'></td></tr></table>');

	// build table with cells for each time slot
	let today = moment();
	let i, j;

	for (i = 0; i < 21; i++) {
		$('#timetable-header').append('<th><div class=\'width-normaliser\'>' + days[(i+today.isoWeekday()-1)%7] + '</div>' + moment(today).add(i, 'days').format('DD/MM') + '</th>');
	}

	for (j = 10; j < 22; j++) {
		$('#timetable').append('<tr id=\''+j+'\'><th class=\'time-header\'>'+j+':00</th></tr>');
		for (i = 0; i < 21; i++) {
			$('#'+j).append('<td id=\''+i+'-'+j+'\'></td>');
		}
	}

	// get an ordered list of table headers
	let headers = $('#timetable-header').find('th');
	// for the three coming Mondays
	for (i = 8-today.isoWeekday(); i < 21; i += 7) {
		// add mon-col class to the header
		$(headers[i]).addClass('mon-col');

		// add mon-col to each hour cell
		for (j = 10; j < 22; j++) {
			$('#' + i + '-' + j).addClass('mon-col');
		}
	}

	for (i of Object.keys(bookings)) {
		// get number of days before the booking
		let day = moment(bookings[i].date, 'DD/MM/YYYY').startOf('day').diff(today.startOf('day'), 'days');
		let time = [moment(bookings[i].date + ' ' + bookings[i].STime, 'DD/MM/YYYY HH:mm').hour(), moment(bookings[i].date + ' ' + bookings[i].ETime, 'DD/MM/YYYY HH:mm').hour()];
		let sessionLength = (time[1]-time[0]);
		let tableID = '#'+day.toString()+'-';
		for (j = 1; j < sessionLength; j++) {
			// hide cells that overlap with the current booking time
			$(tableID+(j+time[0]).toString()).hide();
		}
		tableID = tableID+time[0].toString();
		$(tableID).show();
		// extend cell marking start of booking to fill empty space left by other cells
		$(tableID).attr('rowspan', sessionLength.toString());
		// change background and fill cell with booker
		if (bookings[i].recurrence) {
			$(tableID).css('background-color', '#444444');
		}
		else {
			$(tableID).css('background-color', '#005500');
		}
		$(tableID).html(bookings[i].name);
	}
	$('#loading-screen').css('opacity', '0');
	setTimeout(hideLoad, 1000);
	setTimeout(updateTable, 600000);	// update again in 10 minutes
}

/**
 * When a booking is submitted
 */
$('#bookingform').submit(async function(e) {
	e.preventDefault();
	if (loggedIn) {
		
		let formJSON = {};
		$('#bookingform input').each(function() {
			let elem = $(this);
			let val;
			if (elem.attr('name') == 'recurrence') {
				val = elem.prop('checked');
			}
			else {
				val = elem.val();
			}
			formJSON[elem.attr('name')] = val;
		});

		try {
			var response = await fetch('/bookings', {
				method: 'post',
				headers: {
					'token': idtoken,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formJSON, null, 4)
			});
			if (!response.ok) {
				throw await response.text();
			}
		}
		catch (error) {
			makeToast('Failed to make booking', error);
		}

		updateTable();
		getUserBookings();
	}
	else {
		makeToast('You\'re not logged in!', 'Use the button in the top left to log in with a Google account');
	}
});

/**
 * Make a toast notification (usually for an error)
 * @param {string} title title for the toast notification
 * @param {string} message message for the toast notification
 * @param {boolean} [autohide] whether or not to hide the toast
 */
function makeToast(title, message, autohide) {
	let hidestr = 'false';
	if (autohide) {
		hidestr = 'true';
	}
	let toastStr = '<div id="toast-' + toastCount.toString() + '" class="toast" data-autohide="' + hidestr + '" data-delay="3000"><div class="toast-header"><strong class="mr-auto">' + title + '</strong><button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close"><span aria-hidden="true">&times;</span></button></div><div class="toast-body">' + message + '</div></div>';
	$('#toast-container').append(toastStr);
	$('#toast-' + toastCount.toString()).toast('show');
	toastCount++;
}

/**
 * Hide the loading screen
 */
function hideLoad() {
	$('#loading-screen').remove();
}

/**
 * Get the bookings for the logged in user and populate them in the user bookings table
 */
async function getUserBookings() {
	try {
		let response = await fetch('/bookings', {headers: {'token': idtoken}});
		if (!response.ok) {
			throw await response.text();
		}
		var data = await response.json();
	}
	catch (error) {
		makeToast('Failed to get bookings', error);
		return;
	}

	$('#userTable tr:not(:first)').remove();
	
	// if the user has bookings
	if (Object.keys(data).length > 0) {
		for (let i of Object.keys(data)) {
			let cur = data[i];
			$('#userTable').append('<tr><td>' + cur.name + '</td><td>' + cur.date + ', ' + cur.STime + '-' + cur.ETime + '</td><td>' + moment(cur.booktime).format('DD/MM/YYYY HH:mm') +'</td><td class="rem-btn" booking="' + i + '">Remove</td></tr>');
		}
		$('.rem-btn').each(function() {
			this.addEventListener('click', async function() {
				let elem = this;
				$(elem).css('background-color', '#ff0000');
	
				try {
					let response = await fetch('/bookings', {method: 'delete', headers: {'token': idtoken, 'id': $(elem).attr('booking')}});
					if (!response.ok) {
						throw await response.text();
					}
				}
				catch (error) {
					makeToast('Failed to delete booking', error);
					return;
				}
	
				$(elem).css('background-color', '#00ff00');
				updateTable();
				$('html, body').animate({ scrollTop: 0 }, 'slow');
				setTimeout(updateAfterRem, 700);
			});
		});
	}
	else {
		$('#userTable').append('<tr><td colspan=4>No bookings found</td></tr>');
	}
}

/**
 * Run getUserBookings() after an item is removed (after a delay to allow for the scrolling animation)
 */
function updateAfterRem() {
	$('#user-bookings').html('');
	getUserBookings();
}

async function populateAdminContent() {
	try {
		let response = await fetch('/all', {headers: {'token': idtoken}});
		if (!response.ok) {
			throw await response.text();
		}
		var data = await response.json();
	}
	catch (error) {
		makeToast('Failed to get admin data', error);
		return;
	}

	$('#admin-bookings tr:not(:first)').remove();
	
	// if the user has bookings
	if (Object.keys(data.bookings).length > 0) {
		for (let i of Object.keys(data.bookings)) {
			let cur = data.bookings[i];
			if (cur.id !== userId) {
				$('#admin-bookings').append('<tr><td>' + cur.name + '</td><td>' + cur.date + ', ' + cur.STime + '-' + cur.ETime + '</td><td>' + moment(cur.booktime).format('DD/MM/YYYY HH:mm') +'</td><td class="admin-rem-btn" booking="' + i + '">Remove</td></tr>');
			}
		}
		$('.admin-rem-btn').each(function() {
			this.addEventListener('click', async function() {
				let elem = this;
				$(elem).css('background-color', '#ff0000');
	
				try {
					let response = await fetch('/bookings', {method: 'delete', headers: {'token': idtoken, 'id': $(elem).attr('booking')}});
					if (!response.ok) {
						throw await response.text();
					}
				}
				catch (error) {
					makeToast('Failed to delete booking', error);
					return;
				}
	
				$(elem).css('background-color', '#00ff00');
				updateTable();
				$('html, body').animate({ scrollTop: 0 }, 'slow');
				setTimeout(updateAfterRem, 700);
			});
		});
	}
	else {
		$('#admin-bookings').append('<tr><td colspan=4>No bookings found</td></tr>');
	}


	$('#admin-users tr:not(:first)').remove();

	for (let i of Object.keys(data.UserList)) {
		let cur = data.UserList[i];
		$('#admin-users').append('<tr><td>' + cur.name + '</td><td><form id="form-' + i + '"><input class="user-perms-inp" type=number min="0" max="9" value="' + cur.permissionLevel + '"></form></td><td><input form="form-' + i + '" type="submit" value="Update"></td></tr>');

		$('#form-' + i).submit(async function(e) {
			let elem = $(this);
			let level = elem.children('input.user-perms-inp').first().val();
			e.preventDefault();

			try {
				let response = await fetch('/users', {
					method: 'post',
					headers: {
						'token': idtoken,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({'id': i, 'perms': level}, null, 4)
				});
				if (!response.ok) {
					throw await response.text();
				}
			}
			catch (error) {
				makeToast('Failed to change user permissions', error);
				return;
			}
			makeToast('User updated successfully', 'User ' + cur.name + ' given permission level ' + level, true);
		});
	}
}

// set up custom booking form fields
$('#datepicker').datepicker({
	'format': 'dd/mm/yyyy'
});
$('#timepicker1').timepicker({
	'minTime': '10:00am',
	'maxTime': '10:00pm',
	'step': 60,
	'timeFormat': 'H\\:i'
});
$('#timepicker2').timepicker({
	'minTime': '10:00am',
	'maxTime': '10:00pm',
	'step': 60,
	'timeFormat': 'H\\:i'
});

// when fully loaded
document.addEventListener('DOMContentLoaded', function() {
	// populate the main timetable
	updateTable();
	
	// set up Google sign-in
	gapi.load('auth2', function(){
		// Retrieve the singleton for the GoogleAuth library and set up the client.
		let auth2 = gapi.auth2.init({
			client_id: '149049213874-0g5d6qbds8th0f1snmhap4n0a05cssp2.apps.googleusercontent.com',
			cookiepolicy: 'single_host_origin'
		});
		// when a user logs in
		auth2.attachClickHandler(document.getElementById('signin-link'), {},
			async function(googleUser) {
				// get profile information
				let profile = googleUser.getBasicProfile();
				idtoken = googleUser.getAuthResponse().id_token;
				userId = profile.getId();

				// update login button with user details
				$('#user-img').attr('src', profile.getImageUrl());
				$('#user-name').html(profile.getName());
				
				// remember we're logged in
				loggedIn = true;

				// fetch and store permissions for the user
				let data = await fetch('/perms', {headers: {'token': idtoken}});
				data = await data.json();
				userLevel = data['perms'];

				// get the user's bookings for display on the user table
				getUserBookings();

				// show elements for logged in users
				if (userLevel >= 2) {
					$('#recurrence').show();
					if (userLevel == 9) {
						populateAdminContent();
						$('#admin-header').show();
						$('#admin-content').show();
					}
				}
				$('#user-content').show();
				

			}, function(error) {
				makeToast('Signin failed', 'Make sure you\'ve got popups enabled! (' + error.error + ')');
			}
		);
	});
});