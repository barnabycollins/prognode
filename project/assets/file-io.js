const fs = require('fs');
const datafile = 'data.json';
let writing = false;

function write(struct) {
	while (writing) {
		continue;
	}
	writing = true;
	fs.writeFile(datafile, JSON.stringify(struct, null, 4), 'utf8', function(err) {
		if (err) {
			throw (err);
		}
	});
	writing = false;
}

function checkFile() {
	return fs.existsSync(datafile);
}

function read() {
	return fs.readFileSync(datafile);
}

module.exports = {write, checkFile, read};