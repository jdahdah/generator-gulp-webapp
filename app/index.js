'use strict';
var generators = require('yeoman-generator');
var yosay = require('yosay');
var chalk = require('chalk');
var wiredep = require('wiredep');
var mkdirp = require('mkdirp');
var _s = require('underscore.string');

module.exports = generators.Base.extend({
  constructor: function () {
    var testLocal;

    generators.Base.apply(this, arguments);

    this.option('skip-welcome-message', {
      desc: 'Skips the welcome message',
      type: Boolean
    });

    this.option('skip-install-message', {
      desc: 'Skips the message after the installation of dependencies',
      type: Boolean
    });

    this.option('test-framework', {
      desc: 'Test framework to be invoked',
      type: String,
      defaults: 'mocha'
    });

    this.option('babel', {
      desc: 'Use Babel',
      type: Boolean,
      defaults: true
    });

    if (this.options['test-framework'] === 'mocha') {
      testLocal = require.resolve('generator-mocha/generators/app/index.js');
    } else if (this.options['test-framework'] === 'jasmine') {
      testLocal = require.resolve('generator-jasmine/generators/app/index.js');
    }

    this.composeWith(this.options['test-framework'] + ':app', {
      options: {
        'skip-install': this.options['skip-install']
      }
    }, {
      local: testLocal
    });
  },

  initializing: function () {
    this.pkg = require('../package.json');
  },

  prompting: function () {
    if (!this.options['skip-welcome-message']) {
      this.log(yosay('\'Allo \'allo! Out of the box I include HTML5 Boilerplate, jQuery, Normalize.css and a gulpfile.js to build your app.'));
    }

    var prompts = [{
      type: 'checkbox',
      name: 'features',
      message: 'Which additional features would you like to include?',
      choices: [{
        name: 'Sass',
        value: 'includeSass',
        checked: true
      }, {
        name: 'Pug',
        value: 'includePug',
        checked: false
      }, {
        name: 'Bootstrap',
        value: 'includeBootstrap',
        checked: false
      }, {
        name: 'Fastclick',
        value: 'includeFastclick',
        checked: true
      }, {
        name: 'ViewportUnitsBuggyfill',
        value: 'includeViewportFix',
        checked: true
      }, {
        name: 'UnCSS',
        value: 'includeUncss',
        checked: false
      }, {
        name: 'Modernizr',
        value: 'includeModernizr',
        checked: true
      }]
    }, {
      type: 'list',
      name: 'legacyBootstrap',
      message: 'Which version of Bootstrap would you like to include?',
      choices: [{
        name: 'Bootstrap 3',
        value: true
      }, {
        name: 'Bootstrap 4',
        value: false
      }],
      when: function (answers) {
        return answers.features.indexOf('includeBootstrap') !== -1;
      }
    }, {
      type: 'confirm',
      name: 'includeJQuery',
      message: 'Would you like to include jQuery?',
      default: true,
      when: function (answers) {
        return answers.features.indexOf('includeBootstrap') === -1;
      }
    }, {
      type: 'input',
      name: 'shortname',
      message: 'Project short name?',
      default: this.appname
    }, {
      type: 'input',
      name: 'fullname',
      message: 'Project full name?',
      default: this.appname
    }, {
      type: 'input',
      name: 'author',
      message: 'Author name? (That\'s you!)',
      store: true
    }];

    return this.prompt(prompts).then(function (answers) {
      var features = answers.features;

      function hasFeature(feat) {
        return features && features.indexOf(feat) !== -1;
      };

      // manually deal with the response, get back and store the results.
      // we change a bit this way of doing to automatically do this in the self.prompt() method.
      this.includeSass = hasFeature('includeSass');
      this.includePug = hasFeature('includePug');
      this.includeBootstrap = hasFeature('includeBootstrap');
      this.includeViewportFix = hasFeature('includeViewportFix');
      this.includeUncss = hasFeature('includeUncss');
      this.includeModernizr = hasFeature('includeModernizr');
      this.legacyBootstrap = answers.legacyBootstrap;
      this.includeJQuery = answers.includeJQuery;
      this.includeFastclick = hasFeature('includeFastclick');

      this.shortname = answers.shortname;
      this.fullname  = answers.fullname;
      this.author    = answers.author;

    }.bind(this));
  },

  writing: {
    gulpfile: function () {
      this.fs.copyTpl(
        this.templatePath('gulpfile.js'),
        this.destinationPath('gulpfile.js'),
        {
          date: (new Date).toISOString().split('T')[0],
          name: this.pkg.name,
          version: this.pkg.version,
          includeSass: this.includeSass,
          includePug: this.includePug,
          includeUncss: this.includeUncss,
          includeBootstrap: this.includeBootstrap,
          legacyBootstrap: this.legacyBootstrap,
          includeBabel: this.options['babel'],
          testFramework: this.options['test-framework']
        }
      );
    },

    packageJSON: function () {
      this.fs.copyTpl(
        this.templatePath('_package.json'),
        this.destinationPath('package.json'),
        {
          shortname: _s.slugify(this.shortname),
          fullname: this.fullname,
          author: this.author,
          includeSass: this.includeSass,
          includePug: this.includePug,
          includeUncss: this.includeUncss,
          includeBabel: this.options['babel'],
          includeJQuery: this.includeJQuery,
        }
      );
    },

    babel: function () {
      this.fs.copy(
        this.templatePath('babelrc'),
        this.destinationPath('.babelrc')
      );
    },

    git: function () {
      this.fs.copy(
        this.templatePath('gitignore'),
        this.destinationPath('.gitignore'));

      this.fs.copy(
        this.templatePath('gitattributes'),
        this.destinationPath('.gitattributes'));
    },

    bower: function () {
      var bowerJson = {
        name: _s.slugify(this.shortname),
        private: true,
        dependencies: {}
      };

      if (this.includeBootstrap) {

        // Bootstrap 4
        bowerJson.dependencies = {
          'bootstrap': '~4.0.0-alpha.6'
        };

        // Bootstrap 3
        if (this.legacyBootstrap) {
          if (this.includeSass) {
            bowerJson.dependencies = {
              'bootstrap-sass': '~3.3.6'
            };
            bowerJson.overrides = {
              'bootstrap-sass': {
                'main': [
                  'assets/stylesheets/_bootstrap.scss',
                  'assets/fonts/bootstrap/*',
                  'assets/javascripts/bootstrap.js'
                ]
              }
            };
          } else {
            bowerJson.dependencies = {
              'bootstrap': '~3.3.6'
            };
            bowerJson.overrides = {
              'bootstrap': {
                'main': [
                  'less/bootstrap.less',
                  'dist/css/bootstrap.css',
                  'dist/js/bootstrap.js',
                  'dist/fonts/*'
                ]
              }
            };
          }
        }

      } else if (this.includeJQuery) {
        bowerJson.dependencies['jquery'] = '~2.1.1';
      }

      if (this.includeModernizr) {
        bowerJson.dependencies['modernizr'] = '~2.8.1';
      }

      if (this.includeFastclick) {
        bowerJson.dependencies['fastclick'] = '~1.0.6';
      }

      if (this.includeViewportFix) {
        bowerJson.dependencies['viewport-units-buggyfill'] = '~0.6.1';
      }

      if (!this.includeBootstrap) {
        bowerJson.dependencies['normalize-css'] = '~3.0.2';
      }

      this.fs.writeJSON('bower.json', bowerJson);
      this.fs.copy(
        this.templatePath('bowerrc'),
        this.destinationPath('.bowerrc')
      );
    },

    editorConfig: function () {
      this.fs.copy(
        this.templatePath('editorconfig'),
        this.destinationPath('.editorconfig')
      );
    },

    h5bp: function () {
      this.fs.copy(
        this.templatePath('favicon.ico'),
        this.destinationPath('app/favicon.ico')
      );

      this.fs.copy(
        this.templatePath('apple-touch-icon.png'),
        this.destinationPath('app/apple-touch-icon.png')
      );

      this.fs.copy(
        this.templatePath('robots.txt'),
        this.destinationPath('app/robots.txt'));
    },

    styles: function () {
      var css = 'main';

      if (this.includeSass) {
        css += '.scss';
      } else {
        css += '.css';
      }

      this.fs.copyTpl(
        this.templatePath(css),
        this.destinationPath('app/styles/' + css),
        {
          shortname: this.shortname,
          fullname: this.fullname,
          author: this.author,
          includeUncss: this.includeUncss,
          includePug: this.includePug,
          includeBootstrap: this.includeBootstrap,
          legacyBootstrap: this.legacyBootstrap
        }
      );
    },

    customStyles: function () {
      if (this.includeSass) {
        var sassModules = ['fonts', 'mixins', 'styles', 'variables'];

        for (var i = 0; i < sassModules.length; i++) {
          this.fs.copyTpl(
            this.templatePath('styles/' + sassModules[i] + '.scss'),
            this.destinationPath('app/styles/' + sassModules[i] + '.scss'),
            {
              shortname: this.shortname,
              fullname: this.fullname,
              author: this.author,
              includePug: this.includePug,
              includeBootstrap: this.includeBootstrap,
              legacyBootstrap: this.legacyBootstrap
            }
          );
        }
      }
    },

    scripts: function () {
      this.fs.copyTpl(
        this.templatePath('main.js'),
        this.destinationPath('app/scripts/main.js'),
        {
          shortname: this.shortname,
          fullname: this.fullname,
          author: this.author,
          includeJQuery: this.includeJQuery,
          includeBootstrap: this.includeBootstrap,
          includeFastclick: this.includeFastclick,
          includeViewportFix: this.includeViewportFix,
        }
      );
    },

    html: function () {
      var bsPath, bsPlugins;

      // path prefix for Bootstrap JS files
      if (this.includeBootstrap) {

        // Bootstrap 4
        bsPath = '/bower_components/bootstrap/js/dist/';
        bsPlugins = [
          'util',
          'alert',
          'button',
          'carousel',
          'collapse',
          'dropdown',
          'modal',
          'scrollspy',
          'tab',
          'tooltip',
          'popover'
        ];

        // Bootstrap 3
        if (this.legacyBootstrap) {
          if (this.includeSass) {
            bsPath = '/bower_components/bootstrap-sass/assets/javascripts/bootstrap/';
          } else {
            bsPath = '/bower_components/bootstrap/js/';
          }
          bsPlugins = [
            'affix',
            'alert',
            'dropdown',
            'tooltip',
            'modal',
            'transition',
            'button',
            'popover',
            'carousel',
            'scrollspy',
            'collapse',
            'tab'
          ];
        }

      }

      if (this.includePug) {
        var html = '.pug';
      } else {
        var html = '.html';
      }

      this.fs.copyTpl(
        this.templatePath('index' + html),
        this.destinationPath('app/index' + html),
        {
          appname: this.shortname,
          fullname: this.fullname,
          author: this.author,
          includeSass: this.includeSass,
          includeBootstrap: this.includeBootstrap,
          legacyBootstrap: this.legacyBootstrap,
          includePug: this.includePug,
          includeFastclick: this.includeFastclick,
          includeViewportFix: this.includeViewportFix,
          includeUncss: this.includeUncss,
          includeModernizr: this.includeModernizr,
          includeJQuery: this.includeJQuery,
          bsPath: bsPath,
          bsPlugins: bsPlugins
        }
      );

      if (this.includePug) {
        var pugModules = [
          '_includes/config',
          '_includes/head',
          '_includes/header',
          '_includes/footer',
          '_includes/mixins',
          '_includes/foot-scripts',
          '_layouts/default',
          '_mixins/example',
          '_modules/example',
        ];

        for (var i = 0; i < pugModules.length; i++) {
          this.fs.copyTpl(
            this.templatePath(pugModules[i] + '.pug'),
            this.destinationPath('app/' + pugModules[i] + '.pug'),
            {
              appname: this.shortname,
              fullname: this.fullname,
              author: this.author,
              includeSass: this.includeSass,
              includeBootstrap: this.includeBootstrap,
              legacyBootstrap: this.legacyBootstrap,
              includePug: this.includePug,
              includeFastclick: this.includeFastclick,
              includeViewportFix: this.includeViewportFix,
              includeUncss: this.includeUncss,
              includeModernizr: this.includeModernizr,
              includeJQuery: this.includeJQuery,
              bsPath: bsPath,
              bsPlugins: bsPlugins
            }
          );
        }
      }
    },

    misc: function () {
      mkdirp('app/images');
      mkdirp('app/fonts');
    }
  },

  install: function () {
    this.installDependencies({
      skipMessage: this.options['skip-install-message'],
      skipInstall: this.options['skip-install']
    });
  },

  end: function () {
    var bowerJson = this.fs.readJSON(this.destinationPath('bower.json'));
    var howToInstall =
      '\nAfter running ' +
      chalk.yellow.bold('yarn install & bower install') +
      ', inject your' +
      '\nfront end dependencies by running ' +
      chalk.yellow.bold('gulp wiredep') +
      '.';

    if (this.options['skip-install']) {
      this.log(howToInstall);
      return;
    }

    // wire Bower packages to .html

    if (this.includePug) {
      var html = '.pug';
    } else {
      var html = '.html';
    }

    wiredep({
      bowerJson: bowerJson,
      directory: 'bower_components',
      exclude: ['bootstrap-sass', 'bootstrap.js'],
      ignorePath: /^(\.\.\/)*\.\./,
      src: 'app/index' + html
    });

    if (this.includeSass) {
      // wire Bower packages to .scss
      wiredep({
        bowerJson: bowerJson,
        directory: 'bower_components',
        ignorePath: /^(\.\.\/)+/,
        src: 'app/styles/*.scss'
      });
    }
  }
});
