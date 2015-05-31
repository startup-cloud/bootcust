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

    // menu defined in json file
    var menuData = menu();

    // Setting application local variables
    app.locals.title = config.app.title;
    app.locals.description = config.app.description;
    app.locals.keywords = config.app.keywords;

    // Setting static assets: javascripts, css
    app.locals.assets = assets(config.assets);

    // same menu for all
    app.locals.menu = menuData;

    // add locale specific assets like css, needed for RTL support
    n18helper.addLocales(app.locals.assets);

    // every sample has 'categories' attribute, containing tags like 'table,panel'
    var samples = {};
    n18helper.readMetatags(glob.sync('snippets/**/*.html', {cwd: config.templatesDir}), samples, config.templatesDir);

    // calculate total for each tag
    var tagsTotals = n18helper.getTagsTotals(samples);
    var tagsTotalAsArray = n18helper.getTagsTotalsArray(tagsTotals);


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

    // define search route
    app.get('/search/:tags?', function (req, res) {
        var tagsParam = req.params['tags'];
        if (tagsParam === undefined) {
            // by default search for tables
            tagsParam = 'table';
        }

        // expect tagsParam to be like 'panel_table_button'
        var tagsToFind = tagsParam.split('_');
        tagsToFind = _.compact(tagsToFind);

        // prevent possible duplications
        var uniq = _.uniq(tagsToFind);

        // look for samples by tags like ['table', 'panel']
        var samplesFound = n18helper.getSamplesByTags(samples, uniq);
        while (samplesFound.length === 0 && uniq.length > 0) {
            // if not found, look again, without first tag
            uniq.shift();
            samplesFound = n18helper.getSamplesByTags(samples, uniq);
        }

        // mark tags to select
        var selectedTags = _.reduce(uniq, function (result, current) {
            result[current] = 'active';
            return result;
        }, {});

        // check what happends if user will click on more tags,
        // calculate if there will be results. so we can show those tags in different style
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

        // if actual search was for different tags, compute which tags were removed from search
        var removedTags = _.difference(tagsToFind, uniq);

        // finally, provide param for next search, just to make template code more simple
        tagsParam = uniq.join('_');


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

    // link from 'tags' menu in search
    app.get('/changesearch/:tags', function (req, res) {
        var tagsParam = req.params['tags'];
        if (tagsParam === undefined) {
            tagsParam = 'table';
        }


        var tagsToFind = tagsParam.split('_');

        // prevent possible empty tags
        tagsToFind = _.compact(tagsToFind);

        // it can be 'panel_table_table', so count each tag
        var counts = _.reduce(tagsToFind, function (result, tag) {
            if (result[tag] === undefined) {
                result[tag] = 0;
            }
            result[tag]++;

            return result;
        }, {});


        // filter only tags with 1, so 'panel_form_table_table' will
        // become 'panel_form'. So when user click on already selected tag
        // it will toggle off the selection
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

    // single sample request
    app.get('/single/:snippetId?', function (req, res) {
        var snippetId = req.params['snippetId'];

        var sampleFullName = n18helper.findByFileName(snippetId, samples);

        var realFileName = config.templatesDir + sampleFullName;

        // read sample content for 'source' section
        var fileContent = fs.readFileSync(realFileName, 'utf8');

        // git depended
        var gitFileUrl = config.gitAccount + config.gitProject + realFileName;

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

    // RTL support
    app.get('/setlanguage', function (req, res) {


        if (req.query.language) {
            if (req.cookies.language !== 'hebrew') {
                res.cookie('language', req.query.language, {maxAge: 20000});

            } else {
                res.cookie('language', '', {maxAge: 20000});

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