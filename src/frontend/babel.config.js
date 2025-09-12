module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-transform-runtime', { regenerator: true }],
  ],
};