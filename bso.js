const crypto = require('crypto')

/**
 * @param {import('./types').ParsedKeyBundle} keyBundle
 * @param {import('./types').BSO} bso
 * @returns {Object}
 */
function decryptBSO (keyBundle, bso) {
  const payload = JSON.parse(bso.payload)

  const hmac = crypto.createHmac('sha256', keyBundle.hmacKey)
    .update(payload.ciphertext)
    .digest('hex')

  if (hmac !== payload.hmac) {
    throw new Error('HMAC mismatch')
  }

  const iv = Buffer.from(payload.IV, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBundle.encryptionKey, iv)
  const plaintext = decipher.update(payload.ciphertext, 'base64', 'utf8') + decipher.final('utf8')
  const result = JSON.parse(plaintext)

  if (result.id !== bso.id) {
    throw new Error('Record ID mismatch')
  }

  return result
}

/**
 * @param {import('./types').ParsedKeyBundle} keyBundle
 * @param {Object} payload
 * @returns {import('./types').BSO}
 */
function encryptBSO (keyBundle, payload) {
  const plaintext = JSON.stringify(payload)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBundle.encryptionKey, iv)
  const ciphertext = cipher.update(plaintext, 'utf8', 'base64') + cipher.final('base64')

  const hmac = crypto.createHmac('sha256', keyBundle.hmacKey)
    .update(ciphertext)
    .digest('hex')

  return {
    id: payload.id,
    payload: JSON.stringify({
      ciphertext: ciphertext,
      IV: iv.toString('base64'),
      hmac
    })
  }
}

module.exports = {
  decryptBSO,
  encryptBSO
}
