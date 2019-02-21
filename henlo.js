console.log('starting henlo');
var express = require('express');
var app = express();
var taters = require('./data/taters.json');
var bodyParser = require('body-parser');


app.use(express.urlencoded({extended: false}));
app.use(express.static('static'));

/* ROOT */
app.get('/', function(req, resp) {
    resp.send('hello world');
})

/* WELCOME (/henlo/steve) */
app.get('/henlo/:name', function(req, resp) {
    name = req.params.name;
    resp.send('yeet, nice to meet you ' + name);
})

/* SLAP (/slap?name=steve&item=wet%20fish) */
app.get('/slap', function(req, resp) {
    name = req.query.name;
    item = req.query.item;
    resp.send('*slaps ' + name + ' with ' + item + '*');
})

/* TATERS (/taters?search=arms) */
app.get('/taters', function(req, resp) {
    search = req.query.search;
    response = '';
    if (search) {
        for (i = 0; i < taters.length; i++) {
            if (taters[i].title.toLowerCase().indexOf(search) !== -1) {
                response += '<img height="100" src="' + taters[i].thumbnail + '"><br><a href="' + taters[i].href + '">' + taters[i].title + '</a><br><br>';
            }
        }
    }
    else {
        for (i = 0; i < taters.length; i++) {
            response += '<img height="100" src="' + taters[i].thumbnail + '"><br><a href="' + taters[i].href + '">' + taters[i].title + '</a><br><br>';
        }
    }
    resp.send(response);
})

/* HANDLE updatetater.html FORM */
app.post('/new', function(req, resp) {
    taters.push({'title': req.body.title, 'href': req.body.href, 'ingredients': req.body.ingredients, 'thumbnail': req.body.thumbnail});
    resp.send('successfully added ' + req.body.title + ' to recipes');
})

/* OTHERWISE */
app.get('*', function(req, resp) {
    resp.send('no');
})

app.listen(8080);