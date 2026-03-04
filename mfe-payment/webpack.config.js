const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const path = require('path');

const sharedDeps = {
  '@angular/core': { singleton: true, strictVersion: true },
  '@angular/common': { singleton: true, strictVersion: true },
  '@angular/router': { singleton: true, strictVersion: true },
  '@angular/forms': { singleton: true, strictVersion: true },
  '@angular/platform-browser': { singleton: true, strictVersion: true },
  '@angular/animations': { singleton: true, strictVersion: true },
  rxjs: { singleton: true },
};

module.exports = {
  output: {
    uniqueName: 'mfePayment',
    publicPath: 'auto',
    scriptType: 'text/javascript',
  },
  experiments: {
    outputModule: false,
  },
  optimization: {
    runtimeChunk: false,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'mfePayment',
      filename: 'remoteEntry.js',
      exposes: {
        './routes': './src/app/app.routes.ts',
      },
      shared: sharedDeps,
    }),
  ],
};
