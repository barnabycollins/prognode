console.log('starting henlo');
var express = require('express');
var app = express();
var taters = require('./taters.json');

app.get('/', function(req, resp) {
    resp.send('hello world');
})

app.get('/henlo/:name', function(req, resp) {
    name = req.params.name;
    resp.send('yeet, nice to meet you ' + name);
})

app.get('/slap', function(req, resp) {
    name = req.query.name;
    item = req.query.item;
    resp.send('*slaps ' + name + ' with ' + item + '*');
})

app.get('/taters', function(req, resp) {
    search = req.query.search;
    response = '';
    for (i = 0; i < taters.length; i++) {
        if (taters[i].title.toLowerCase().indexOf(search) !== -1) {
            response += '<img height="100" src="' + taters[i].thumbnail + '"><br><a href="' + taters[i].href + '">' + taters[i].title + '</a><br><br>';
        }
    }
    resp.send(response);
})

app.get('*', function(req, resp) {
    resp.send('no');
})

app.listen(8080);