const crypto = require('crypto')
const qs = require('querystring')
const fetch = require('node-fetch')
const defaults = require('./defaults')

/**
 * @typedef {Object} OAuthChallenge
 * @property {string} state - Parameter to prevent CSRF attacks, validated upon completion.
 * @property {string} codeVerifier - PKCE verifier.
 * @property {string} url - Authorization URL for user to sign in.
 *
 * @typedef {Object} OAuthResult
 * @property {string} code
 * @property {string} state
 *
 * @typedef {Object.<string, any>} OAuthOptions
 * @property {string} access_type - Set to `offline` to get a refresh token.
 */

/**
 * Issue a OAuth challenge.
 *
 * - Generate a 16 bytes Base64URL string as `state` to prevent CSRF attacks.
 * - Generate a PKCE challenge to include in the query string.
 * - Serialize the URL.
 *
 * @param {Object} [options]
 * @param {string} [options.clientId] - OAuth client ID.
 * @param {string} [options.scope] - OAuth scope.
 * @param {string} [options.authorizationUrl] - OAuth auhorization endpoint.
 * @param {OAuthOptions} [options.oauthOptions] - Extra OAuth parameters.
 * @returns {OAuthChallenge}
 */
function challenge (options) {
  const { clientId, scope, authorizationUrl } = { ...defaults, ...options }

  // To prevent CSRF attacks.
  const state = crypto.randomBytes(16).toString('base64url')

  // Dead simple PKCE challenge implementation.
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

  const params = {
    client_id: clientId,
    scope,
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    ...options.oauthOptions
  }

  const url = `${authorizationUrl}?${qs.stringify(params)}`

  return { state, codeVerifier, url }
}

/**
 * Complete the OAuth challenge.
 *
 * - Verify that the `state` result parameter matches that of the challenge.
 * - Call the OAuth token endpoint with the challenge code verifier and the result code.
 *
 * @param {OAuthChallenge} challenge
 * @param {OAuthResult} result
 * @param {Object} [options]
 * @param {string} [options.clientId] - OAuth client ID.
 * @param {string} [options.tokenEndpoint] - OAuth token endpoint.
 * @returns {Promise<Object>} OAuth token.
 */
function complete (challenge, result, options) {
  const { clientId, tokenEndpoint } = { ...defaults, ...options }

  if (challenge.state !== result.state) {
    throw new Error('Invalid `state` parameter')
  }

  return fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      grant_type: 'authorization_code',
      code_verifier: challenge.codeVerifier,
      code: result.code
    })
  })
    .then(async res => {
      if (!res.ok) {
        throw new Error(`OAuth token endpoint responded with ${res.status}: ${await res.text()}`)
      }

      return res.json()
    })
}

module.exports = {
  challenge,
  complete
}
