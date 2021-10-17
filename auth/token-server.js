const fetch = require('node-fetch')
const defaults = require('./defaults')

/**
 * @typedef {Object} PartialSyncCredentials
 * @property {import('../types').OAuthToken} oauthToken
 * @property {import('../types').SyncKeyBundle} syncKeyBundle
 *
 * @typedef {import('../types').SyncCredentials} SyncCredentials
 */

function shouldRefreshImpl (issuedAt, duration, margin = 60 * 1000, now = Date.now()) {
  const expiresAt = issuedAt + duration
  return (expiresAt - margin) < now
}

/**
 * @param {SyncCredentials} creds
 * @returns {boolean}
 */
function shouldRefresh (creds) {
  return shouldRefreshImpl(creds.tokenIssuedAt, creds.token.duration * 1000)
}

function shouldRefreshOAuthToken (oauthToken) {
  return shouldRefreshImpl(oauthToken.auth_at * 1000, oauthToken.expires_in * 1000)
}

/**
 * @param {import('../types').OAuthToken} oauthToken
 * @param {Object} [options]
 * @param {string} [options.clientId]
 * @param {string} [options.tokenEndpoint]
 */
function refreshOAuthToken (oauthToken, options) {
  if (!oauthToken.refresh_token) {
    throw new Error("OAuth token expired but we don't have a refresh token to renew it, try to reauthenticate and pass `access_type: 'offline'` in `oauthOptions` to get a refresh token next time")
  }

  const { tokenEndpoint, clientId } = { ...defaults, ...options }

  return fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: oauthToken.refresh_token
    })
  })
    .then(async res => {
      if (!res.ok) {
        throw new Error(`OAuth token endpoint responded with ${res.status}: ${await res.text()}`)
      }

      return res.json()
    })
}

/**
 * @param {PartialSyncCredentials} creds
 * @param {Object} [options]
 * @param {string} [options.clientId]
 * @param {string} [options.tokenEndpoint]
 * @param {string} [options.tokenServerUrl]
 * @returns {Promise<SyncCredentials>}
 */
async function refresh (creds, options) {
  const { tokenServerUrl } = { ...defaults, ...options }

  // We need a refreshed OAuth token before refreshing the Sync token.
  if (shouldRefreshOAuthToken(creds.oauthToken)) {
    creds = { ...creds, oauthToken: await refreshOAuthToken(creds.oauthToken, options) }
  }

  const token = await fetch(`${tokenServerUrl}/1.0/sync/1.5`, {
    headers: {
      Authorization: `Bearer ${creds.oauthToken.access_token}`,
      'X-KeyID': creds.syncKeyBundle.kid
    }
  })
    .then(async res => {
      if (!res.ok) {
        throw new Error(`TokenServer responded with ${res.status}: ${await res.text()}`)
      }

      return res.json()
    })

  return {
    ...creds,
    token,
    tokenIssuedAt: Date.now()
  }
}

module.exports = {
  shouldRefresh,
  refresh
}
