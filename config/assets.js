'use strict';

var fs = require('fs');
var path = require('path');
var lodash = require('lodash');
var glob = require('glob');

var config = require('./config');

/**
 * This project is library project, and thats the reason we need special logic for static assets
 * Instead of using css, all css are complied from less
 */
module.exports = function (dir) {
    function cutPrePath(part, list) {
        var res = [];
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            s = s.substring(part.length);
            res.push(s);
        }
        return res;
    };

    function loadSourceFilesNames(list) {
        var res = [];
        for (var i = 0; i < list.length; i++) {
            var def = list[i];
            if (def.files !== undefined) {
                res = res.concat(def.files);
            }
            if (def.file !== undefined) {
                res.push(def.file);
            }
            if (def.dir !== undefined) {
                //console.log('def.dir:', def.dir);
                //console.log('res', res);
                res = res.concat(glob.sync(def.dir, {cwd : ''}));
            }
        }
        return res;
    }

    var res = {};
    var files = config.assets;
    //console.log('files: ', files);
    for (var i = 0; i < files.length; i++) {
        var file = files[i];

        var key = path.basename(file, '.js');
        var all_key = 'all';
        var all = [];
        //console.log(' key', key, ' file:', file);
        res[key] = {};


        var contentAsJson = require(file);

        for (var keyInJson in contentAsJson) {
            var list = contentAsJson[keyInJson];
            res[key][keyInJson] = loadSourceFilesNames(list);

            res[key][all_key] = lodash.union(res[key][all_key], res[key][keyInJson]);
        }

        // exclude 'tests'
        res[key]['src_notests'] = lodash.difference(res[key]['src'], res[key]['tests']);
    }


    var res_public = {};
    for (var keyInRes in res) {
        res_public[keyInRes] = {};
        var file = res[keyInRes];

        for (var keyInFile in file) {
            res_public[keyInRes][keyInFile] = cutPrePath(config.publicStaticContentDir, file[keyInFile]);
        }
    }


    var assets = {
        all : res,
        public : res_public
    };



    return assets;
}