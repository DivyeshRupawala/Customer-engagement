var autoprefixer = require('autoprefixer');

module.exports = function(grunt) {
	const os = require('os');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		// Default task - will do an initial pass at generating dev-friendly css
		// and then re-generate css when scss source files are modified
		watch: {
			sass: {
				files: ['sass/**/*.{scss,sass}','sass/_partials/**/*.{scss,sass}'],
				tasks: ['sass:dev','postcss:dev']
			}
		},

		// First step in generating css assets
		//  - dev task will generate sourcemaps and nested rules
		//  - prod task generates only compressed css
		sass: {
			dev: {
				options: {
					sourceMap: true,
					sourceComments: false,
					outputStyle: 'nested'
				},
				files: {
					'./css/customer-engagement.css': './sass/customer-engagement.scss'
				}
			},
			prod: {
				options: {
					sourceComments: false,
					outputStyle: 'compressed'
				},
				files: {
					'./prod/css/customer-engagement.css': './sass/customer-engagement.scss',
				}
			}
		},

		// Final step in generating css assets
		postcss: {
			dev :{
				options: {
					map: true,
					processors: [
						require('autoprefixer')({browsers: ['> 0.5% in US','last 3 versions', 'safari 5.1'] }) //must preceed fractional percentages with 0 - breaks config otherwise
					]
				},
				src: './css/customer-engagement.css'
			},
			prod :{
				options: {
					map: false,
					processors: [
						require('autoprefixer')({browsers: ['> 0.5% in US','last 3 versions', 'safari 5.1'] }) //must preceed fractional percentages with 0 - breaks config otherwise
					]
				},
				src: './css/customer-engagement.css',
				dest:'./prod/css/customer-engagement.css',
				src: './css/jquery-ui.min.css',
				dest:'./prod/css/jquery-ui.min.css'
			}
		},

		// Replace dev scripts from html, strip comments and minify for production
    processhtml: {
			prod: {
				files: {
					'prod/index.html' : ['index.html'],
					'prod/thankYouPage.html' : ['thankYouPage.html']
				}
			}
    },

		// Generate SVG icon stylesheets (and fallbacks)
		grunticon: {
			icons: {
				files: [{
					expand: true,
					cwd: './icons_source',
					src: ['*.svg', '*.png'],
					dest: "./css/icons"
				}],
				options: {
					cssprefix: ".o-icon--",
					compressPNG: true,
					tmpPath: os.tmpdir()
				}
			}
		},

		// Be sure these match the source order in development!
		uglify: {
			prod: {
				files: {
					'prod/js/app.min.js': [
						'./js/polyfill.string-trim.js',
						'./js/vendors/lodash.custom.min.js',
						'./js/vendors/accounting.js',
						'./js/vendors/jquery.validate.js',
						'./js/jquery-ui.min.js',
						'./js/js_cookie.js',
						'./js/vendors/handlebars.min-v4.0.5.js',
						'./js/vendors/bootstrap.custom.js',
						'./js/vendors/rangeslider.js',
						'./js/vendors/qtip.min.js',
						'./js/handlebars-helpers.js',
						'./js/validator-global-defaults.js',
						'./js/accounting-settings.js',
						'./js/components/c-linked-percent-slider.js',
						'./js/components/c-currency-input.js',
						'./js/components/c-radio.js',
						'./js/mobilenav.js',
						'./js/customer-engagement-portal.js',
						'./js/ion.rangeSlider.js'
						]
				}
			}
		},
		copy: {
			prod: {
				files: [
					{expand: true, src: ['css/icons/png/**'], dest: 'prod'},
					{expand: true, src: ['css/icons/*.css'], dest: 'prod'},
					{expand: true, src: ['js/vendors/jquery-*.min.js'], dest: 'prod'},
					{expand: true, src: ['js/vendors/js_cookie.js'], dest: 'prod'},
					{expand: true, src: ['js/vendors/bootstrap.custom.js'], dest: 'prod'},
					{expand: true, src: ['js/mobilenav.js'], dest: 'prod'},
					{expand: true, src: ['images/*'], dest: 'prod'},
					{expand: true, src: ['css/ion.rangeSlider.css'], dest: 'prod'},
					{expand: true, src: ['css/ion.rangeSlider.skinHTML5.css'], dest: 'prod'},
					{expand: true, src: ['css/normalize.css'], dest: 'prod'},
					{expand: true, src: ['css/style.css'], dest: 'prod'},
					{expand: true, src: ['fonts/**'], dest: 'prod'}
				],				
			},
		},
		htmlmin: {
			prod: {
				options: {
					removeComments: true,
					collapseWhitespace: true
				},
				files: {
					'prod/index.html': 'prod/index.html'
				}
			}
		}

	});
	grunt.registerTask('default', ['sass:dev','postcss:dev','watch']);
	grunt.registerTask('icons', ['grunticon:icons']);
	grunt.registerTask('prod', ['sass:prod','postcss:prod','uglify:prod','processhtml','htmlmin:prod','copy:prod']);
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-htmlmin');
	grunt.loadNpmTasks('grunt-postcss');
	grunt.loadNpmTasks('grunt-processhtml');
	grunt.loadNpmTasks('grunt-sass');
	grunt.loadNpmTasks('grunt-grunticon');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-uglify');
};
