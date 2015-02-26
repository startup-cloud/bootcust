'use strict';

module.exports = function(grunt) {

	// Project Configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		less: {
			development : {
				files: [
					{
						expand: true,
						cwd: 'public/less',
						// Compile each LESS component
						src: ['*.less'],
						dest: 'public/css_from_less',
						ext: '.css'
					}
				]
			}
		},
		cssjanus : {
			theme: {
				files: [{src: 'public/lib/bootstrap/dist/css/bootstrap.css', dest: 'public/lib/bootstrap/dist/css/bootstrap_hebrew.css'}]
			}
		},
		nodemon: {
			dev: {
				script: 'server.js',
				options: {
					nodeArgs: ['--debug'],
					ext: 'js,html'
				}
			}
		},
		concurrent: {
			default: ['nodemon'],
			debug: ['nodemon'],
			options: {
				logConcurrentOutput: true,
				limit: 10
			}
		}
	});

	// Load NPM tasks
	require('load-grunt-tasks')(grunt);

	// Making grunt default to force in order not to break the project.
	grunt.option('force', true);

	// A Task for loading the configuration object
	grunt.task.registerTask('loadConfig', 'Task that loads the config into a grunt option.', function() {
		var config = require('./config/config');
	});

	// Default task(s).
	grunt.registerTask('default', ['less', 'concurrent:default']);
};