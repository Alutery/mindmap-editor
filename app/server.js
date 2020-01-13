const express = require('express');
const nunjucks = require('nunjucks');
const app = express();

app.use(express.static('dist'));

app.listen(3000, function () {
    console.log('listening on port 3000');
    console.log('Go to: http://localhost:3000/');
});

nunjucks.configure('views', {
    autoescape: true,
    express: app
});

app.get('/', function(req, res) {
    res.render('index.html');
});
