const PORT = process.env.PORT
const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function (app: import('express').Application) {
  app.use(
    createProxyMiddleware({
      target: '',
      changeOrigin: true,
    })
  )
}
