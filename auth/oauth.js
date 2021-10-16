const crypto = require('crypto')
const { promisify } = require('util')
const defaults = require('./defaults')
const base = require('./oauth-base')
const tokenServer = require('./token-server')

/**
 * @typedef {Object} SyncOAuthChallengeImpl
 * @property {crypto.KeyPairKeyObjectResult} keyPair
 * @typedef {base.OAuthChallenge & SyncOAuthChallengeImpl} SyncOAuthChallenge
 */

/**
 * Issue a Firefox Sync OAuth challenge.
 *
 * - Create a P-256 elliptic curve keypair.
 * - Include the public key as a Base64URL encoded JWK under `keys_jwk`.
 *
 * See <https://mozilla.github.io/ecosystem-platform/docs/fxa-engineering/fxa-scoped-keys#protocol-flow>.
 * See <https://www.codejam.info/2021/08/scripting-firefox-sync-lockwise-complete-oauth.html>.
 *
 * @param {Object} [options]
 * @param {string} [options.clientId] - OAuth client ID.
 * @param {string} [options.scope] - OAuth scope.
 * @param {string} [options.authorizationUrl] - OAuth auhorization endpoint.
 * @param {base.OAuthOptions} [options.oauthOptions] - Extra OAuth parameters.
 * @returns {Promise<SyncOAuthChallenge>}
 */
async function challenge (options) {
  const keyPair = await promisify(crypto.generateKeyPair)('ec', {
    namedCurve: 'P-256'
  })

  const publicJwk = keyPair.publicKey.export({ format: 'jwk' })
  const keysJwk = Buffer.from(JSON.stringify(publicJwk)).toString('base64url')

  const challenge = base.challenge({
    ...options,
    oauthOptions: {
      keys_jwk: keysJwk,
      ...options?.oauthOptions
    }
  })

  return { keyPair, ...challenge }
}

// For readability, helper to return a big-endian unsigned 32 bits
// integer as a buffer.
function uint32BE (number) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(number)
  return buffer
}

// Partial implementation of Concat KDF that only does a single
// iteration and no trimming, because the length of the derived key we
// need matches the hash length.
function concatKdf (key, otherInfo) {
  const buffer = Buffer.concat([uint32BE(1), key, otherInfo])
  return crypto.createHash('sha256').update(buffer).digest()
}

/**
 * Complete the Firefox Sync OAuth challenge.
 *
 * See <https://mozilla.github.io/ecosystem-platform/docs/fxa-engineering/fxa-scoped-keys#protocol-flow>.
 * See <https://www.codejam.info/2021/08/scripting-firefox-sync-lockwise-complete-oauth.html>.
 *
 * @param {SyncOAuthChallenge} challenge
 * @param {base.OAuthResult} result
 * @param {Object} [options]
 * @param {string} [options.clientId] - OAuth client ID.
 * @param {string} [options.scope] - OAuth scope.
 * @param {string} [options.tokenEndpoint] - OAuth token endpoint.
 * @param {string} [options.tokenServerUrl] - TokenServer URL.
 * @returns {Promise<import('../types').SyncCredentials>}
 */
async function complete (challenge, result, options) {
  const { scope } = { ...defaults, ...options }
  const oauthToken = await base.complete(challenge, result, options)

  const rawSegments = oauthToken.keys_jwe.split('.')
  const rawHeader = rawSegments[0]
  const segments = rawSegments.map(segment => Buffer.from(segment, 'base64'))
  const header = JSON.parse(segments[0])
  const iv = segments[2]
  const ciphertext = segments[3]
  const authTag = segments[4]

  const peerKey = crypto.createPublicKey({
    key: header.epk,
    format: 'jwk'
  })

  const ikm = crypto.diffieHellman({
    privateKey: challenge.keyPair.privateKey,
    publicKey: peerKey
  })

  // Internal Mozilla format for Concat KDF `OtherInfo`, copied from
  // Firefox Application Services and Firefox Send code.
  const otherInfo = Buffer.concat([
    uint32BE(header.enc.length),
    Buffer.from(header.enc),
    uint32BE(0),
    uint32BE(0),
    uint32BE(256)
  ])

  const key = concatKdf(ikm, otherInfo)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)

  decipher.setAuthTag(authTag)
  decipher.setAAD(rawHeader)

  const keys = JSON.parse(Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString())

  const rawBundle = Buffer.from(keys[scope].k, 'base64')

  const syncKeyBundle = {
    kid: keys[scope].kid,
    encryptionKey: rawBundle.slice(0, 32).toString('base64'),
    hmacKey: rawBundle.slice(32, 64).toString('base64')
  }

  return tokenServer.refresh({ oauthToken, syncKeyBundle }, options)
}

module.exports = {
  base,
  challenge,
  complete
}
