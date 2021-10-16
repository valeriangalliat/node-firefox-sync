const fetch = require('node-fetch')
const defaults = require('./defaults')

/**
 * @typedef {Object} PartialSyncCredentials
 * @property {import('../types').OAuthToken} oauthToken
 * @property {import('../types').SyncKeyBundle} syncKeyBundle
 *
 * @typedef {import('../types').SyncCredentials} SyncCredentials
 */

/**
 * @param {PartialSyncCredentials} creds
 * @param {Object} [options]
 * @param {string} [options.tokenServerUrl]
 * @returns {Promise<SyncCredentials>}
 */
async function refresh (creds, options) {
  const { tokenServerUrl } = { ...defaults, ...options }

  const token = await fetch(`${tokenServerUrl}/1.0/sync/1.5`, {
    headers: {
      Authorization: `Bearer ${creds.oauthToken.access_token}`,
      'X-KeyID': creds.syncKeyBundle.kid
    }
  })
    .then(res => res.json())

  return {
    ...creds,
    token,
    tokenIssuedAt: Date.now()
  }
}

/**
 * @param {SyncCredentials} creds
 * @returns {boolean}
 */
function shouldRefresh (creds) {
  const duration = creds.token.duration * 1000
  const margin = 60 * 1000
  const expiresAt = creds.tokenIssuedAt + duration

  return (expiresAt - margin) < Date.now()
}

module.exports = {
  refresh,
  shouldRefresh
}
