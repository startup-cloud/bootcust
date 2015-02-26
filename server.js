/**
 * Created by leonid.raizmen on 22/12/2014.
 */

/**
 * Module dependencies.
 */
var config = require('./config/config'),
    chalk = require('chalk');

// Init the express application
console.log(chalk.yellow('Init the express application'));
var app = require('./config/express')();

// Start the app by listening on <port>
console.log(chalk.yellow('Starting the app by listening on port:', config.port));
app.listen(config.port);

// Expose app
exports = module.exports = app;

// Logging initialization
console.log('--');
console.log(chalk.green(config.app.title + ' application started'));
console.log(chalk.green('Port:\t\t\t\t' + config.port));
console.log('--');
