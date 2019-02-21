window.addEventListener('click', function() {
	fetch('/list')
		.then(response => {
			if (response.ok) {
				return response.text();
			}
			else {
				throw new Error(response.status + ' detected');
			}
		})
		.then(body => document.getElementById('Derek').innerHTML=body)
		.catch(function(error) {
			document.getElementById('Derek').innerHTML=error;
		});
});