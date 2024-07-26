const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://hyperlane-ccip.vercel.app',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // remove /api prefix when forwarding
      },
    })
  );
};