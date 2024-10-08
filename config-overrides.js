const webpack = require("webpack");

module.exports = function override(config, env) {
	// Ignore the source-map warnings from node_modules
	config.ignoreWarnings = [/Failed to parse source map/];

	// Ensure plugins array exists
	config.plugins = config.plugins || [];

	// ignore tfhe_bg.wasm
	config.plugins.push(
		new webpack.IgnorePlugin({
			resourceRegExp: /tfhe_bg\.wasm$/, // Removed extra escape slash
		})
	);
	config.resolve.fallback = {
		crypto: require.resolve("crypto-browserify"),
		stream: require.resolve("stream-browserify"),
		vm: require.resolve("vm-browserify"),
	};

	return config;
};
