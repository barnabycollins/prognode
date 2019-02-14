console.log('starting henlo');
var express = require('express');
var app = express();

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

app.get('*', function(req, resp) {
    resp.send('no');
})

app.listen(8080);