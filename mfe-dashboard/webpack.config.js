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
    uniqueName: 'mfeDashboard',
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
      name: 'mfeDashboard',
      filename: 'remoteEntry.js',
      exposes: {
        './routes': './src/app/app.routes.ts',
      },
      shared: sharedDeps,
    }),
  ],
};
