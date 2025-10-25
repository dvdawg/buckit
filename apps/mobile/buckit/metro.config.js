const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.watchFolders.push(path.resolve(workspaceRoot, 'packages'));

config.resolver.disableHierarchicalLookup = true;

config.resolver.alias = {
  '@': projectRoot,
};

module.exports = config;
