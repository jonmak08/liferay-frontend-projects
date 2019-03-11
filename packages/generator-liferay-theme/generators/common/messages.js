const chalk = require('chalk');
const version = require('../../package.json').version;

function getVersionSupportMessage(generatorNamespace) {
	const supportedVersion = chalk.red('Liferay DXP v7.2');

	return (
		`This version of the liferay-js-themes-toolkit (${version})\n` +
		`can create a ${generatorNamespace} for ${supportedVersion}\n` +
		`\n` +
		`For older versions of Liferay DXP, please use v8 of the toolkit:\n` +
		`\n` +
		`    npm i -g generator-liferay-theme@^8.0.0-rc.3\n` +
		`    yo ${generatorNamespace}\n`
	);
}

module.exports = {
	getVersionSupportMessage,
};
