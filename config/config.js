'use strict';

module.exports = {
	app: {
		title: 'UIX',
		description: 'Bootstrap customization',
		keywords: ''
	},
	port: 3000,
	publicStaticContentDir : './public',

	assets : ['./assets/css.js', './assets/javascripts.js','./assets/less.js'],

	templateEngine: 'swig',
	templatesSuffix : 'server.view.html',
	templatesDir : './app/views/',
	gitAccount : 'https://github.com/raizman2012',
	gitProject : '/bootcust/blob/master/'
};
