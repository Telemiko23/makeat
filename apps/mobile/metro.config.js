// Lets the app import shared code and content from outside this project root.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../../packages/shared'), path.resolve(__dirname, '../../content')];

module.exports = config;
