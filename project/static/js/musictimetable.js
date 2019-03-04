var moment = require('moment');
var rows = [];
var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function updateTable() {
	var ss_id = '1ahUx8eR7WGad9xp52JUnvg8BQRwe0tFZckj3ZV_YyNU';
	var url = 'https://spreadsheets.google.com/feeds/cells/' + ss_id + '/2/public/full?alt=json&min-row=2';
	$.getJSON(url,  function (data) {
		process(data.feed.entry);
	});
	setTimeout(updateTable, 3600000);
}

function process(spreadsheetdata) {
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

	// parse spreadsheet data into rows array
	var rowLength = 5;
	
	// generate empty structure for data
	for (i = 0; i < (spreadsheetdata.length/rowLength); i++) {
		rows.push([]);
		for (j = 0; j < rowLength; j++) {
			rows[i].push('');
		}
	}

	// fill structure with data from API
	for (i = 0; i < spreadsheetdata.length; i++) {
		var cell = spreadsheetdata[i];
		// parse date into a JS Date if a date column
		if (cell.gs$cell.col == 3) {
			var data = moment(cell.content.$t, 'DD/MM/YYYY').toDate();
		}
		// parse date and time into a JS Date if a time column
		else if (cell.gs$cell.col == 1) {
			if (cell.content.$t == 'REPEATED' || cell.content.$t == 'DISABLED') {
				data = cell.content.$t;
			}
			else {
				data = moment(cell.content.$t, 'DD/MM/YYYY HH:mm:SS').toDate();
			}
		}
		// process times, filtering out unreasonable times
		else if (cell.gs$cell.col == 4 || cell.gs$cell.col == 5) {
			data = parseInt(cell.content.$t.substring(0,2));

			// filter out unreasonable times
			if (data < 10) {
				data = 10;
			}
			else if (data > 22) {
				data = 22;
			}
		}
		// otherwise pass string from API into data
		else {
			data = cell.content.$t;
		}
		// add data to rows in the correct location in the array for the cell.
		rows[parseInt(cell.gs$cell.row)-2][parseInt(cell.gs$cell.col)-1] = data;
	}
	// call function to display data on the table
	displayInfo();
}
function displayInfo() {
	// ensure rows is sorted in descending priority
	rows.sort(sortByDates);
	var i, j;

	// initialise bookings array to remember what times are booked
	var bookings = [];
	for (i = 0; i < 7; i++) {
		bookings.push([]);
		for (j = 0; j < 12; j++) {
			bookings[i].push(false);
		}
	}
	var clashList = [];
	for (i = rows.length-1; i >= 0; i--) {
		// load information from rows and place required data into variables
		var day = moment(rows[i][2]).isoWeekday() - 1;
		var time = [rows[i][3], rows[i][4]];
		var sessionLength = (time[1]-time[0]);
		var clashes = false;

		// skip entries with negative length (ie end time before start time)
		if (sessionLength <= 0 || rows[i][0] == 'DISABLED') {
			continue;
		}
		
		// copy bookings into working array
		var editedBookings = bookings.slice();
		// update working array to include new booking
		for (j = 0; j < sessionLength; j++) {
			if (!editedBookings[day][time[0]-10+j]) {
				editedBookings[day][time[0]-10+j] = true;
			}
			else {
				// stop iterating and set clashes true if booking clashes with another booking
				clashes = true;
				clashList.push([rows[i][1], rows[i][3], rows[i][4], days[day]]);
				break;
			}
		}
		// skip adding booking to timetable if it clashes
		if (clashes) {
			continue;
		}
		else {
			// if booking is valid, add it to main bookings array
			bookings = editedBookings.slice();
		}

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
		if (rows[i][0] == 'REPEATED') {
			$(tableID).css('background-color', '#444444');
		}
		else {
			$(tableID).css('background-color', '#005500');
		}
		$(tableID).html(rows[i][1]);
	}
	if (clashList.length > 0) {
		$('#clash-container').html('<div id=\'clashes-content\' class=\'col\' style=\'display: none;\'><h2>Warning: Clashes</h2><ul id=\'clashes-list\'></ul></div>');
		for (i = 0; i < clashList.length; i++) {
			$('#clashes-list').append('<li>'+clashList[i][0]+' at '+clashList[i][1]+':00 til '+clashList[i][2]+':00 on '+clashList[i][3]+'</li>');
		}
		$('#clashes-content').show();
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
	if (row1[1] == 'REPEATED') return -1;
	if (row2[1] == 'REPEATED') return 1;
	if (row1[1] > row2[1]) return 1;
	if (row1[1] < row2[1]) return -1;
	return 0;
};
updateTable();