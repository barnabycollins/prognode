var moment = require('moment');
var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
var idtoken;

// tell eslint that the Google API is a thing
/* global gapi */

async function updateTable() {
	var data = await fetch('/bookings');
	data = await data.json();
	
	process(data);
	setTimeout(updateTable, 3600000);
}

function process(bookings) {
	// add table inside #timetable-container with header row and initial box
	$('#timetable-container').html('<table id=\'timetable\' class=\'table table-dark table-striped table-responsive\'><tr id=\'timetable-header\'><td class=\'time-header\'></td></tr></table>');

	// build table with cells for each time slot
	var today = moment();
	var i, j;

	for (i = 0; i < 21; i++) {
		$('#timetable-header').append('<th><div class=\'width-normaliser\'>'+days[(i+today.isoWeekday()-1)%7]+'</div></th>');
	}

	for (j = 10; j < 22; j++) {
		$('#timetable').append('<tr id=\''+j+'\'><th class=\'time-header\'>'+j+':00</th></tr>');
		for (i = 0; i < 21; i++) {
			$('#'+j).append('<td id=\''+i+'-'+j+'\'></td>');
		}
	}

	// get an ordered list of table headers
	var headers = $('#timetable-header').find('th');
	// for the three coming Mondays
	for (i = 8-today.isoWeekday(); i < 21; i += 7) {
		// add mon-col class to the header
		$(headers[i]).addClass('mon-col');

		// add mon-col to each hour cell
		for (j = 10; j < 22; j++) {
			$('#' + i + '-' + j).addClass('mon-col');
		}
	}

	// ensure bookings is sorted in descending priority
	bookings.sort(sortByDates);


	for (i = bookings.length-1; i >= 0; i--) {
		// load information from rows and place required data into variables
		var day = moment(bookings[i].STime).diff(today, 'days');
		var time = [moment(bookings[i].STime).hour(), moment(bookings[i].ETime).hour()];
		var sessionLength = (time[1]-time[0]);
		var tableID = '#'+day.toString()+'-';
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
}

$('#bookingform').submit(async function(e) {
	e.preventDefault();
	await $.ajax({
		url: '/new',
		type: 'POST',
		data: $('#bookingform').serialize()
	});
	updateTable();
});

function hideLoad() {
	$('#loading-screen').remove();
}
// define function for sorting bookings by date booking was made (to determine priority)
// repeated items take priority
var sortByDates = function(row1, row2) {
	if (row1.recurrence) return -1;
	if (row2.recurrence) return 1;
	if (row1.booktime > row2.booktime) return 1;
	if (row1.booktime < row2.booktime) return -1;
	return 0;
};

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

document.addEventListener('DOMContentLoaded', function() {
	updateTable();
	gapi.load('auth2', function(){
		// Retrieve the singleton for the GoogleAuth library and set up the client.
		var auth2 = gapi.auth2.init({
			client_id: '149049213874-0g5d6qbds8th0f1snmhap4n0a05cssp2.apps.googleusercontent.com',
			cookiepolicy: 'single_host_origin'
		});
		auth2.attachClickHandler(document.getElementById('signin-link'), {},
			function(googleUser) {
				var profile = googleUser.getBasicProfile();
				idtoken = googleUser.getAuthResponse().id_token;
				$('#user-img').attr('src', profile.getImageUrl());
				$('#usr-name').html(profile.getName());
				$('#idbox').attr('value', idtoken);
			}, function(error) {
				alert(JSON.stringify(error, undefined, 2));
			}
		);
	});
});