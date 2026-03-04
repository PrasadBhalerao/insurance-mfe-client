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
    uniqueName: 'container',
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
  plugins: [
    new ModuleFederationPlugin({
      remotes: {
        mfeDashboard: 'mfeDashboard@http://localhost:4201/remoteEntry.js',
        mfePayment: 'mfePayment@http://localhost:4202/remoteEntry.js',
      },
      shared: sharedDeps,
    }),
  ],
};
