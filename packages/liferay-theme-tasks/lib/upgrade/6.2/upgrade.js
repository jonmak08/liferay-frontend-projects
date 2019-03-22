/**
 * © 2017 Liferay, Inc. <https://liferay.com>
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';

const ConvertBootstrapCLI = require('convert-bootstrap-2-to-3').constructor;
const _ = require('lodash');
const colors = require('ansi-colors');
const del = require('del');
const fs = require('fs-extra');
const globby = require('globby');
const path = require('path');
const plugins = require('gulp-load-plugins')();
const replace = require('gulp-replace-task');
const spawn = require('cross-spawn');
const vinylPaths = require('vinyl-paths');

const gulpBlackList = require('./gulp_black_list.js');
const lfrThemeConfig = require('../../liferay_theme_config');

const CWD = process.cwd();

const DIR_SRC_CSS = 'src/css';

const logBuffers = {
	bootstrap: [
		getLogHeader('Bootstrap Upgrade (2 to 3)'),
		getLogHeaderNote(
			'Because Liferay Portal 7.0 uses Bootstrap 3, the default box model has been changed to box-sizing: border-box. So if you were using width or height, and padding together on an element, you may need to make changes, or those elements may have unexpected sizes.'
		),
	],
	liferay: [getLogHeader('Liferay Upgrade (6.2 to 7)')],
};

module.exports = function(options) {
	const gulp = options.gulp;

	const runSequence = require('run-sequence').use(gulp);

	const cssSrcPath = path.join(CWD, 'src/css/**/*.+(css|scss)');

	const pathSrc = options.pathSrc;

	let patterns;

	gulp.task('upgrade:convert-bootstrap', function(cb) {
		const files = globby.sync('src/css/*');

		const convertBootstrap = new ConvertBootstrapCLI({
			args: files,
			flags: {
				inlineEdit: true,
				variables: true,
			},
		});

		_.assign(convertBootstrap, {
			logResults(out) {
				logBuffers.bootstrap.push(out);
			},

			onFinish: cb,
		});

		convertBootstrap.init();
	});

	gulp.task('upgrade:create-css-diff', function() {
		const gulpCssDiff = require('./gulp_css_diff.js');

		return gulp
			.src('src/css/**/*')
			.pipe(gulpCssDiff())
			.pipe(plugins.concat('css.diff'))
			.pipe(
				gulp.dest('_backup', {
					overwrite: true,
				})
			);
	});

	gulp.task('upgrade:dependencies', function(cb) {
		lfrThemeConfig.removeDependencies(['liferay-theme-deps-6.2']);
		lfrThemeConfig.setDependencies(
			{
				'liferay-theme-deps-7.0': '8.0.2',
			},
			true
		);

		const npmInstall = spawn('npm', ['install']);

		npmInstall.stderr.pipe(process.stderr);
		npmInstall.stdout.pipe(process.stdout);

		npmInstall.on('close', cb);
	});

	gulp.task('upgrade:black-list', function() {
		return gulp.src(cssSrcPath).pipe(
			gulpBlackList(null, function(result) {
				patterns = require('./replace_patterns.js')(result);
			})
		);
	});

	gulp.task('upgrade:config', function() {
		const lfrThemeConfig = require('../../liferay_theme_config.js');

		lfrThemeConfig.setConfig({
			version: '7.0',
		});

		return gulp
			.src(
				'src/WEB-INF/+(liferay-plugin-package.properties|liferay-look-and-feel.xml)'
			)
			.pipe(
				replace({
					patterns: [
						{
							match: /(DTD Look and Feel )\d(?:\.\d+)+(\/\/EN)/g,
							replacement: '$17.0.0$2',
						},
						{
							match: /(liferay-look-and-feel_)\d(?:_\d+)+(\.dtd)/g,
							replacement: '$17_0_0$2',
						},
						{
							match: /(<version>).+(<\/version>)/g,
							replacement: '$17.0.0+$2',
						},
						{
							match: /(liferay-versions=)\d(?:\.\d+)+\+?/g,
							replacement: '$17.0.0+',
						},
					],
				})
			)
			.pipe(gulp.dest('src/WEB-INF'));
	});

	gulp.task('upgrade:create-deprecated-mixins', function(cb) {
		const NEW_LINE = '\n';

		const includeCompass =
			'@import "compass";' +
			NEW_LINE +
			NEW_LINE +
			'// Note: this file was generated by the `gulp upgrade` task and provides compass' +
			NEW_LINE +
			'// mixins that may have been used in your 6.2 theme. It is both safe and' +
			NEW_LINE +
			'// recommended to remove this file if you are not using these mixins.' +
			NEW_LINE +
			NEW_LINE +
			'// This file will be included anywhere `@import "bourbon";` is imported.' +
			NEW_LINE +
			NEW_LINE;

		const deprecatedMixins = _.map(
			require('./theme_data/deprecated_mixins.json'),
			function(item) {
				const buffer = ['@mixin '];

				buffer.push(item);
				buffer.push('-deprecated');
				buffer.push('($args...) {');
				buffer.push(NEW_LINE);
				buffer.push('\t@warn "the ');
				buffer.push(item);
				buffer.push(
					' mixin is deprecated, please use Bourbon alternative or remove";'
				);
				buffer.push(NEW_LINE);
				buffer.push('\t@include ');
				buffer.push(item);
				buffer.push('($args...);');
				buffer.push(NEW_LINE);
				buffer.push('}');
				buffer.push(NEW_LINE);
				buffer.push(NEW_LINE);

				return buffer.join('');
			}
		);

		const filePath = path.join(
			process.cwd(),
			pathSrc,
			'css',
			'_deprecated_mixins.scss'
		);

		fs.writeFileSync(filePath, includeCompass + deprecatedMixins.join(''));

		const createBourbonFile = require('../../bourbon_dependencies')
			.createBourbonFile;

		createBourbonFile(true);

		cb();
	});

	gulp.task('upgrade:ftl-templates', function() {
		const ftlRules = [
			{
				message:
					'Warning: <@liferay.dockbar /> is deprecated, replace with <@liferay.control_menu /> for new admin controls.',
				regex: /<@liferay\.dockbar\s\/>/g,
			},
			{
				fileName: 'portal_normal.ftl',
				negativeMatch: true,
				message:
					'Warning: not all admin controls will be visible without <@liferay.control_menu />',
				regex: /<@liferay\.control_menu\s\/>/g,
			},
			{
				message:
					'Warning: ${theme} variable is no longer available in Freemarker templates, see https://bit.ly/2NPkVDr for more information.',
				regex: /\${theme/g,
			},
		];

		return gulp.src('src/templates/**/*.ftl').pipe(
			vinylPaths(function(path, done) {
				checkFile(path, ftlRules);

				done();
			})
		);
	});

	gulp.task('upgrade:log-changes', function(cb) {
		logBuffer(logBuffers.bootstrap);
		logBuffer(logBuffers.liferay);

		cb();
	});

	gulp.task('upgrade:rename-core-files', function(cb) {
		const renamedCssFiles = require('./theme_data/renamed_css_files.json');

		const baseFile = ['aui', 'main'];

		const prompts = [];
		let srcPaths = [];

		_.forEach(fs.readdirSync(path.join(CWD, DIR_SRC_CSS)), function(item) {
			const fileName = path.basename(item, '.css');

			if (
				path.extname(item) === '.css' &&
				renamedCssFiles.indexOf(fileName) > -1
			) {
				srcPaths.push(path.join(CWD, DIR_SRC_CSS, item));

				const scssSuffixMessage =
					'Do you want to rename ' +
					item +
					' to ' +
					fileName +
					'.scss?';
				const underscorePrefixMessage =
					'Do you want to rename ' +
					item +
					' to _' +
					fileName +
					'.scss?';

				prompts.push({
					message:
						baseFile.indexOf(fileName) > -1
							? scssSuffixMessage
							: underscorePrefixMessage,
					name: item,
					type: 'confirm',
				});
			}
		});

		let promptResults;

		gulp.src(srcPaths)
			.pipe(
				plugins.prompt.prompt(prompts, function(results) {
					promptResults = results;
				})
			)
			.pipe(
				plugins.filter(function(file) {
					const fileName = path.basename(file.path);

					return promptResults[fileName];
				})
			)
			.pipe(
				plugins.rename(function(path) {
					path.extname = '.scss';

					if (baseFile.indexOf(path.basename) < 0) {
						path.basename = '_' + path.basename;
					}
				})
			)
			.pipe(gulp.dest(DIR_SRC_CSS))
			.on('end', function() {
				srcPaths = _.reduce(
					srcPaths,
					function(result, item) {
						const fileName = path.basename(item);

						if (promptResults[fileName]) {
							result.push(item);
						}

						return result;
					},
					[]
				);

				del(srcPaths, cb);
			});
	});

	gulp.task('upgrade:replace-compass', function() {
		return gulp
			.src(cssSrcPath)
			.pipe(
				replace({
					patterns,
				})
			)
			.pipe(gulp.dest(DIR_SRC_CSS));
	});

	gulp.task('upgrade:vm-templates', function() {
		const vmRules = [
			{
				message:
					'Warning: Support for Velocity (.vm) format is deprecated, consider migrating to FreeMarker (.ftl) format. See: https://bit.ly/2uSXySe',
				regex: /[\s\S]+/g,
			},
			{
				message:
					'Warning: #dockbar() is deprecated, replace with #control_menu() for new admin controls.',
				regex: /#dockbar\(\)/g,
			},
			{
				fileName: 'portal_normal.vm',
				negativeMatch: true,
				message:
					'Warning: not all admin controls will be visible without #control_menu()',
				regex: /#control_menu\(\)/g,
			},
		];

		return gulp.src('src/templates/**/*.vm').pipe(
			vinylPaths(function(path, done) {
				checkFile(path, vmRules);

				done();
			})
		);
	});

	return function(cb) {
		runSequence(
			'upgrade:black-list',
			'upgrade:replace-compass',
			'upgrade:convert-bootstrap',
			'upgrade:config',
			'upgrade:rename-core-files',
			'upgrade:create-css-diff',
			'upgrade:dependencies',
			'upgrade:create-deprecated-mixins',
			'upgrade:ftl-templates',
			'upgrade:vm-templates',
			'upgrade:log-changes',
			cb
		);
	};
};

function checkFile(filePath, rules) {
	const config = {
		encoding: 'utf8',
	};

	if (fs.existsSync(filePath)) {
		const logs = [];

		const fileContents = fs.readFileSync(filePath, config);

		_.forEach(rules, function(item) {
			if (item.fileName && item.fileName !== path.basename(filePath)) {
				return;
			}

			const match = item.negativeMatch
				? !item.regex.test(fileContents)
				: item.regex.test(fileContents);

			if (match) {
				logs.push('    ' + colors.yellow(item.message) + '\n');
			}
		});

		if (logs.length) {
			const fileName = colors.white(
				'File: ' + colors.underline(path.basename(filePath)) + '\n'
			);

			logBuffers.liferay.push(fileName);

			logBuffers.liferay = logBuffers.liferay.concat(logs);
		}
	}
}

function getLogHeader(header) {
	const line = new Array(65).join('-');

	return colors.bold('\n' + line + '\n ' + header + '\n' + line + '\n\n');
}

function getLogHeaderNote(headerNote) {
	return colors.cyan('| ' + headerNote + '\n\n');
}

function logBuffer(buffer) {
	process.stdout.write(colors.bgBlack(buffer.join('')));
}
