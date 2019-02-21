window.addEventListener('click', function() {
	fetch('127.0.0.1:8080/list')
		.then(response => response.text())
		.then(body => document.getElementById('Derek').innerHTML=body);
});