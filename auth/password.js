const crypto = require('crypto')
const { promisify } = require('util')
const AuthClient = require('fxa-js-client')
const defaults = require('./defaults')
const tokenServer = require('./token-server')

/**
 * See <https://www.codejam.info/2021/08/scripting-firefox-sync-lockwise-figuring-the-protocol.html>.
 *
 * @param {Buffer} syncKey
 * @returns {Promise<import('../types').KeyBundle>}
 */
async function deriveKeys (syncKey) {
  const salt = ''
  const info = 'identity.mozilla.com/picl/v1/oldsync'
  const bundle = Buffer.from(await promisify(crypto.hkdf)('sha256', syncKey, salt, info, 64))

  return {
    encryptionKey: bundle.slice(0, 32).toString('base64'),
    hmacKey: bundle.slice(32, 64).toString('base64')
  }
}

/**
 * Retrieves a Firefox Sync token and key bundle by authenticating with user
 * email and password to Firefox Accounts.
 *
 * After opening a session, this will:
 *
 * - Fetch the account keys, required to access the Sync data later.
 * - Create an OAuth token for the given client ID and scope, this is
 *   the easiest way of authenticating to Sync and the alternative BrowserID
 *   method that doesn't require a OAuth token is deprecated.
 * - Get the scoped key data that is used to compute the `X-KeyID` header.
 * - Authenticate to the TokenServer to get a Sync token.
 * - Derive the Sync key bundle from the Sync key.
 *
 * See <https://www.codejam.info/2021/08/scripting-firefox-sync-lockwise-hybrid-oauth.html>.
 *
 * @param {string} email - User email.
 * @param {string} password - User password.
 * @param {Object} [options]
 * @param {string} [options.clientId] - OAuth client ID.
 * @param {string} [options.scope] - OAuth scope.
 * @param {string} [options.authServerUrl] - Firefox Accounts server URL.
 * @param {string} [options.tokenServerUrl] - TokenServer URL.
 * @param {Object} [options.authClient] - Firefox Accounts client.
 * @param {Object} [options.signInOptions] - Custom sign-in options.
 * @param {Object} [options.oauthOptions] - Extra OAuth parameters.
 * @param {string} [options.oauthOptions.access_type] - Set to `offline` to get a refresh token.
 * @returns {Promise<import('../types').SyncCredentials>}
 */
async function password (email, password, options) {
  const { clientId, scope, authServerUrl } = { ...defaults, ...options }
  const authClient = options.authClient || new AuthClient(authServerUrl)

  const creds = await authClient.signIn(email, password, {
    keys: true,
    reason: 'login',
    ...options.signInOptions
  })

  const { keyFetchToken, unwrapBKey, sessionToken } = creds

  const accountKeys = await authClient.accountKeys(keyFetchToken, unwrapBKey)

  const oauthToken = await authClient.createOAuthToken(sessionToken, clientId, {
    scope,
    ...options.oauthOptions
  })

  const syncKey = Buffer.from(accountKeys.kB, 'hex')
  const keyBundle = await deriveKeys(syncKey)
  const scopedKeyData = await authClient.getOAuthScopedKeyData(sessionToken, clientId, scope)
  const clientState = crypto.createHash('sha256').update(syncKey).digest().slice(0, 16).toString('base64url')
  const syncKeyBundle = { ...keyBundle, kid: `${scopedKeyData[scope].keyRotationTimestamp}-${clientState}` }

  return tokenServer.refresh({ oauthToken, syncKeyBundle }, options)
}

module.exports = password
