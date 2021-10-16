module.exports = {
  // Public client ID from the Android app for convenience.
  // See <https://github.com/mozilla-lockwise/lockwise-android/blob/d3c0511f73c34e8759e1bb597f2d3dc9bcc146f0/app/src/main/java/mozilla/lockbox/support/Constant.kt#L29>.
  clientId: 'e7ce535d93522896',
  scope: 'https://identity.mozilla.com/apps/oldsync',

  // Password auth.
  authServerUrl: 'https://api.accounts.firefox.com/v1',

  // OAuth.
  authorizationUrl: 'https://accounts.firefox.com/authorization',
  tokenEndpoint: 'https://oauth.accounts.firefox.com/v1/token',
  // tokenEndpoint: 'https://api.accounts.firefox.com/v1/oauth/token',

  // Final Sync auth.
  tokenServerUrl: 'https://token.services.mozilla.com'
}
