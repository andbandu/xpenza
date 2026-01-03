const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some libraries expect react-native-linear-gradient directly.
// This ensures they use expo-linear-gradient instead.
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    'react-native-linear-gradient': require.resolve('expo-linear-gradient'),
};

module.exports = config;
