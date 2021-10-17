/**
 * @typedef {Object} SyncOptions
 * @property {string} [credsFile]
 * @property {string} [clientId]
 * @property {string} [scope]
 * @property {string} [authServerUr]
 * @property {string} [authorizationUr]
 * @property {string} [tokenEndpoint]
 * @property {string} [tokenServerUr]
 * @property {import('./auth/oauth-base').OAuthOptions} [oauthOptions]
 *
 * @typedef {Object} OAuthToken
 * @property {string} access_token
 * @property {string} token_type
 * @property {string} scope
 * @property {number} expires_in
 * @property {number} auth_at
 * @property {string} refresh_token
 *
 * @typedef {Object} SyncToken
 * @property {string} id
 * @property {string} key
 * @property {number} uid
 * @property {string} api_endpoint
 * @property {number} duration
 * @property {string} hashalg
 * @property {string} hashed_fxa_uid
 * @property {string} node_type
 *
 * @typedef {Object} KeyBundle
 * @property {string} encryptionKey
 * @property {string} hmacKey
 *
 * @typedef {Object} ParsedKeyBundle
 * @property {Buffer} encryptionKey
 * @property {Buffer} hmacKey
 *
 * @typedef {Object} SyncKeyBundle
 * @property {string} encryptionKey
 * @property {string} hmacKey
 * @property {string} kid
 *
 * @typedef {Object} SyncCredentials
 * @property {OAuthToken} oauthToken - The OAuth token required to authenticate to the TokenServer.
 * @property {SyncKeyBundle} syncKeyBundle - The Sync key bundle required to decrypt the collection keys.
 * @property {SyncToken} token - The token object required to call the Firefox Sync API.
 * @property {number} tokenIssuedAt - Timestamp in milliseconds of when the token was issued to preemptively refresh it.
 *
 * @typedef {Object} BSO
 * @property {string} id
 * @property {string} payload
 */

// Does nothing but required for TypeScript to import this file.
module.exports = {}
