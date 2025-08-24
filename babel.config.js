module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
      '@babel/preset-typescript'
    ],
    plugins: [
      // Add Flow plugin to handle Flow syntax in React Native modules
      '@babel/plugin-syntax-flow',
      '@babel/plugin-transform-flow-strip-types',
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
    ],
  };
};