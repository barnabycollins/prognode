var moment = require('moment');
var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

async function updateTable() {
	var data = await fetch('/bookings');
	data = await data.json();
	
	process(data);
	setTimeout(updateTable, 3600000);
}

function process(bookings) {
	// add table inside #timetable-container with header row and initial box
	$('#timetable-container').html('<table id=\'timetable\' class=\'table table-dark table-striped\'><tr id=\'timetable-header\'><td class=\'time-header\'></td></tr></table>');

	// build table with cells for each time slot
	var today = moment().isoWeekday()-1;
	var indexes = [];
	var i, j;
	for (i = 0; i < 7; i++) {
		indexes.push((i+today)%7);
	}

	for (i = 0; i < 7; i++) {
		if (indexes[i] == 0) {
			$('#timetable-header').append('<th class=\'mon-col\'>'+days[indexes[i]]+'</th>');
		}
		else {
			$('#timetable-header').append('<th>'+days[indexes[i]]+'</th>');
		}
	}
	for (j = 10; j < 22; j++) {
		$('#timetable').append('<tr id=\''+j+'\'><th class=\'time-header\'>'+j+':00</th></tr>');
		for (i = 0; i < 7; i++) {
			if (indexes[i] == 0) {
				$('#'+j).append('<td id=\''+indexes[i]+'-'+j+'\' class=\'mon-col\'></td>');
			}
			else {
				$('#'+j).append('<td id=\''+indexes[i]+'-'+j+'\'></td>');
			}
		}
	}

	// ensure bookings is sorted in descending priority
	bookings.sort(sortByDates);


	for (i = bookings.length-1; i >= 0; i--) {
		// load information from rows and place required data into variables
		var day = moment(bookings[i].STime).isoWeekday() - 1;
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
updateTable();