'use strict';

var fs = require('fs');
var path = require('path');
var lodash = require('lodash');
var glob = require('glob');
var cheerio = require('cheerio');
var _ = require('underscore');
var config = require('./config');

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function rememberTag(res, fileName, tag) {
    if (tag === undefined) {
        return;
    }

    tag = tag.trim();
    if (tag.length === 0) {
        return;
    }
    if (res[fileName] === undefined) {
        res[fileName] = { };
    }

    if (res[fileName][tag] === undefined) {
        res[fileName][tag] = { count : 0 };
    }

    res[fileName][tag].count++;
}

function countTags(values) {
    return _.reduce(values, function(result, current) {

        _.each(_.keys(current), function(key) {

            if (result[key] === undefined) {
                result[key] = { count : 0};
            }
            result[key].count = result[key].count + current[key].count;
        });

        return result;
    }, {});
}

function cutPathFromFilename(fileName) {
    var lastIndex = fileName.lastIndexOf('/');
    if (lastIndex === -1) return fileName;
    return fileName.substring(lastIndex+1);
}

module.exports = {
    findByFileName : function(fileName, res) {
        var keys = _.keys(res);

        var ii = _.findIndex(keys, function(str) {
            var eq = str.indexOf(fileName);
            return eq !== -1;
        });

        return keys[ii];
    },
    getTagsTotals : function(res) {
        var r = _.chain(res).map(function(value, key) {

            return value;
        }).value();

        var counts = countTags(r);
        //console.log(counts);
        return counts;
    },

    getTagsTotalsArray : function(totalsAsObject) {
        var r = _.chain(totalsAsObject).map(function(value, key) {
            //console.log('value: ', value);
            value.tagName = key;
            return value;
        }).sortBy('count').reverse().value();

        //console.log(r);
        return r;
    },
    getTagsForSample : function(res) {
        var r = _.chain(res).map(function(value, key) {
            return key;
        }).value();

        //console.log('tags: ', r);
    },

    getSamplesByTags : function(res, tagsToFind) {

        var r = _.chain(res).map(function(value, key) {
            return {
                fullFilename : key,
                fileName  : cutPathFromFilename(key),
                tags : _.keys(value)
            }
        }).reduce(function(result, current) {

            var match = _.intersection(current.tags, tagsToFind).length;
            if (match > 0 && match == tagsToFind.length) {
                result.push(current);
            }
            return result;
        }, []).value();


        //console.log('getSamplesByTags:', r);
        return r;
    },

    readMetatags : function(files, res, cwd) {
       lodash.forEach(files , function(fileName) {
            var str = fs.readFileSync(cwd+fileName, 'utf8');
            var $ = cheerio.load(str);
            var myText = $('div.metatags_category span').each(function( index ) {
                var tag = $( this).text().trim();
                rememberTag(res, fileName, tag);
            });

           // should be one
           var myText = $('div.sample').each(function( index ) {
               var tags = $( this).attr('categories');
                if (tags === undefined) {
                    //return;
                }

               tags = tags.split(',');


               _.each(tags, function(tag) {
                   rememberTag(res, fileName, tag)
               });

           });

        });
        //console.log(res);
    },

    readClassesToList : function(files, res, cwd) {

        lodash.forEach(files , function(fileName) {
            var str = fs.readFileSync(cwd+fileName, 'utf8');
            var $ = cheerio.load(str);
            var myText = $('*').each(function( index ) {
                var classes = $( this ).attr('class');

                if (classes === undefined || classes.trim().length === 0) {
                    return;
                }
                var classesList = classes.split(/\s+/);


                lodash.forEach(classesList, function(className) {
                    rememberTag(res, fileName, className);
                })
            }) ;
            //console.log(res);
        }) ;
    },

    readEnglishConstants : function() {
        var files = ['app/views/snippets/tables/samples/table_with_paging.html'];

        lodash.forEach(files , function(fileName) {
            var str = fs.readFileSync(fileName, 'utf8');
            var $ = cheerio.load(str);
            var myText = $('*').each(function( index ) {
                $( this ).text("bla");

            }) ;

        }) ;

    },
    addLocales: function (assets) {


        assets.public.locales = {};
        assets.all.locales = {};

        assets.public.locales['hebrew'] = {'css': []};
        assets.all.locales['hebrew'] = {'cssjanus': []};

        // run on public
        lodash.forEach(assets.public.css.all, function (cssFile) {
            var hebrew_cssFile = cssFile.replace('.css', '_hebrew.css');


            assets.public.locales['hebrew'].css.push(hebrew_cssFile);

        });

        // run on not public
        lodash.forEach(assets.all.css.all, function (cssFile) {
            var hebrew_cssFile = cssFile.replace('.css', '_hebrew.css');
            assets.all.locales['hebrew'].cssjanus.push({'src': cssFile, 'dest': hebrew_cssFile});
        });


    }
}