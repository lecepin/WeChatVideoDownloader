const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, './electron/index.js'),
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, './build-electron'),
  },
  module: {
    rules: [],
  },
  devtool: 'source-map',
  target: 'electron-main',
  node: false,
  stats: {
    errorDetails: true,
  },
};
