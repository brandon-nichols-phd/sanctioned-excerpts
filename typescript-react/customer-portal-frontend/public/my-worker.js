//CSP worker to allow Sentry

self.onmessage = function (event) {
  console.debug('Worker received:', event.data)
  self.postMessage('Copy')
}
