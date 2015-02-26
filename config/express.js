'use strict';

/**
 * Module dependencies.
 */
var config = require('./config'),
    assets = require('./assets'),
    menu = require('./menu'),
    fs = require('fs'),
    http = require('http'),
    express = require('express'),
    methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    flash = require('connect-flash'),
    consolidate = require('consolidate'),
    path = require('path');

module.exports = function () {
    // Initialize express app
    console.log('Initialize express app');
    var app = express();


    // Setting application local variables
    app.locals.title = config.app.title;
    app.locals.description = config.app.description;
    app.locals.keywords = config.app.keywords;

    // Setting static assets: javascripts, css
    app.locals.assets = assets(config.assets);

    // Passing the request url to environment locals
    app.use(function (req, res, next) {
        res.locals.url = req.protocol + '://' + req.headers.host + req.url;
        next();
    });

    // Showing stack errors
    app.set('showStackError', true);

    // Set swig as the template engine
    app.engine('server.view.html', consolidate[config.templateEngine]);

    // Set views path and view engine
    app.set('view engine', 'server.view.html');
    app.set('views', './app/views');

    // Request body parsing middleware should be above methodOverride
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use(methodOverride());

    // CookieParser should be above session
    app.use(cookieParser());

    // connect flash for flash messages
    app.use(flash());

    // Setting the app router and static folder
    app.use(express.static(path.resolve(config.publicStaticContentDir)));

    app.get('/test.html', function (req, res) {
        res.render('test', {test: 'leo'});
    });

    // support snippets
    var menuData = menu();
    var context = {
        title: 'Hey', message: 'Hello there!',
        menu: menuData
    }

    app.get('/', function (req, res) {
        res.render('index', context);
    });

    app.get('/setlanguage', function (req, res) {
        console.log('here');

        if (req.query.language) {
            if (req.cookies.language !== 'hebrew') {
                res.cookie('language', req.query.language, {maxAge: 20000});
                console.log('set language: ' + req.query.language);
            } else {
                res.cookie('language', '', {maxAge: 20000});
                console.log('unset language: ' + req.query.language);
            }
            res.redirect('back');
        }
    });

    for (var i = 0; i < menuData.top.length; i++) {
        var mm = menuData.top[i];
        for (var j = 0; j < mm.sub.length; j++) {
            var page = mm.sub[j];

            var url = '/' + page + '_' + mm.id;
            console.log('url', url);

            //var file = 'snippets/'+mm.id+'/'+page + '_' + mm.id;

            app.get(url, function (req, res) {
                console.log('here --->',req.cookies);
                //console.log('here --->, ', req.route.path);
                var splitted = req.route.path.split('_');
                //console.log(splitted);
                var file = 'snippets/' + splitted[1] + req.route.path;
                //console.log(file);
                res.render(file,
                    {
                        title: 'snippets '+req.route.path,
                        cookies : req.cookies,
                        menu: menuData,
                        current_menu: splitted[1],
                        current_page: page
                    });
            });
        }
    }

    // Assume 'not found' in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
    app.use(function (err, req, res, next) {
        // If the error object doesn't exists
        if (!err) return next();

        // Log it
        console.error(err.stack);

        // Error page
        res.status(500).render('500', {
            error: err.stack
        });
    });

    // Assume 404 since no middleware responded
    app.use(function (req, res) {
        res.status(404).render('404', {
            url: req.originalUrl,
            error: 'Not Found'
        });
    });

    // Return Express server instance
    console.log('Return Express server instance');
    return app;
};