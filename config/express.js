'use strict';

/**
 * Module dependencies.
 */
var config = require('./config'),
    assets = require('./assets'),
    n18helper = require('./n18helper'),
    menu = require('./menu'),
    lodash = require('lodash'),
    _ = require('underscore'),
    fs = require('fs'),
    glob = require('glob'),
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
    var menuData = menu();

    // Setting application local variables
    app.locals.title = config.app.title;
    app.locals.description = config.app.description;
    app.locals.keywords = config.app.keywords;

    // Setting static assets: javascripts, css
    app.locals.assets = assets(config.assets);
    app.locals.menu = menuData;

    n18helper.addLocales(app.locals.assets);

    var samples = {};

    n18helper.readMetatags(glob.sync('snippets/**/*.html', {cwd: config.templatesDir}), samples, config.templatesDir);

    var tagsTotals = n18helper.getTagsTotals(samples);
    var tagsTotalAsArray = n18helper.getTagsTotalsArray(tagsTotals);

    //console.log('tables:', tables);
    //tables = ['snippets/tables/samples/table_with_paging.html'];
    // Passing the request url to environment locals
    app.use(function (req, res, next) {
        res.locals.url = req.protocol + '://' + req.headers.host + req.url;
        next();
    });

    // Showing stack errors
    app.set('showStackError', true);

    // Set swig as the template engine
    app.engine(config.templatesSuffix, consolidate[config.templateEngine]);

    // Set views path and view engine
    app.set('view engine', config.templatesSuffix);
    app.set('views', config.templatesDir);

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

    app.get('/search/:tags?', function (req, res) {
        var tagsParam = req.params['tags'];
        if (tagsParam === undefined) {
            tagsParam = 'table';
        }
        //console.log('req.params:', tagsParam);

        var tagsToFind = tagsParam.split('_');
        tagsToFind = _.compact(tagsToFind);
        var uniq = _.uniq(tagsToFind);

        console.log(uniq);
        var samplesFound = n18helper.getSamplesByTags(samples, uniq);
        while (samplesFound.length === 0 && uniq.length > 0) {
            uniq.shift();
            samplesFound = n18helper.getSamplesByTags(samples, uniq);
        }

        var selectedTags = _.reduce(uniq, function (result, current) {
            result[current] = 'active';
            return result;
        }, {});


        console.log('1?', uniq);
        var whatIf = _.reduce(tagsTotalAsArray, function(result, current) {
            if (selectedTags[current.tagName] !== undefined) {
                return result;
            }

            var uniqClone = uniq.slice(0);

            uniqClone.push(current.tagName);

            var samplesForOneMore = n18helper.getSamplesByTags(samples, uniqClone);

            result[current.tagName] = { total : current.total, totalIf : samplesForOneMore.length};

            return result;
        }, {});

        console.log('whatIf:', whatIf);

        var removedTags = _.difference(tagsToFind, uniq);

        tagsParam = uniq.join('_');

        //console.log('samplesFound:', samplesFound);

        res.render('search', {
            cookies: req.cookies,
            tagsParam: tagsParam,
            selectedTags: selectedTags,
            selectedTagsArray : uniq,
            removedTags : removedTags,
            tags: tagsTotalAsArray,
            whatIfSelect : whatIf,
            samples: samplesFound
        });

    });

    app.get('/changesearch/:tags', function (req, res) {
        var tagsParam = req.params['tags'];
        if (tagsParam === undefined) {
            tagsParam = 'table';
        }
        console.log('req.params:', tagsParam);

        var tagsToFind = tagsParam.split('_');

        tagsToFind = _.compact(tagsToFind);


        var counts = _.reduce(tagsToFind, function (result, tag) {
            if (result[tag] === undefined) {
                result[tag] = 0;
            }
            result[tag]++;

            return result;
        }, {});

        console.log(counts);

        var filtered = _.chain(counts).map(function (value, key) {
            return {
                k: key,
                v: value
            };
        }).filter(function (o) {
            return o.v === 1;
        }).pluck('k').value();


        var tags = filtered.join('_');

        res.redirect('/search/' + tags);
    });

    app.get('/single/:snippetId?', function (req, res) {
        var snippetId = req.params['snippetId'];

        var sampleFullName = n18helper.findByFileName(snippetId, samples);

        var realFileName = config.templatesDir + sampleFullName;

        var fileContent = fs.readFileSync(realFileName, 'utf8');

        var gitFileUrl = config.gitAccount + config.gitProject + realFileName;
        console.log(gitFileUrl);
        res.render('snippet', {
            gitFile : gitFileUrl,
            sample : samples[sampleFullName],
            cookies: req.cookies, snippetId : sampleFullName, snippet_source : fileContent});
    });

    // support snippets

    var context = {
        title: 'Hey', message: 'Hello there!',
        menu: menuData
    }

    app.get('/', function (req, res) {
        context.cookies = req.cookies;
        res.render('index', context);
    });

    app.get('/setlanguage', function (req, res) {
        console.log('here setlanguage');

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

    // create routes for top menu
    for (var i = 0; i < menuData.top.length; i++) {
        var mm = menuData.top[i];

        var url = '/' + mm.id;
        console.log('create route for url:', url);

        app.get(url, function (req, res) {
            var file = 'snippets' + req.route.path + req.route.path;
            //console.log(file);
            res.render(file,
                {
                    title: 'snippets for ' + req.route.path,
                    cookies: req.cookies,
                    menu: menuData,
                    current_menu: req.route.path
                });
        });

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