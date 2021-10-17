const fs = require('fs').promises
const fetch = require('node-fetch')
const Hawk = require('hawk')
const auth = require('./auth')
const tokenServer = require('./auth/token-server')
const { decryptBSO, encryptBSO } = require('./bso')

// Special collections that don't need to be decrypted.
const rawCollections = {
  keys: true,
  meta: true
}

class FirefoxSync {
  constructor (syncOptions) {
    this.options = syncOptions

    this.auth = {
      password: (email, password, options) => auth.password(email, password, { ...syncOptions, ...options }).then(creds => this.onCreds(creds)),
      oauth: {
        challenge: options => auth.oauth.challenge({ ...syncOptions, ...options }),
        complete: (challenge, result, options) => auth.oauth.complete(challenge, result, { ...syncOptions, ...options }).then(creds => this.onCreds(creds))
      }
    }

    this.creds = syncOptions.creds
  }

  onCreds (creds) {
    this.creds = creds
    return creds
  }

  getCollections () {
    return this.fetch('info/collections')
  }

  async getRawCollection (collection, params = {}) {
    const query = new URLSearchParams(Object.entries(params)).toString()
    return this.fetch(`storage/${collection}?${query}`)
  }

  async getCollection (collection, params) {
    const items = await this.getRawCollection(collection, params)

    if (!params || !params.full) {
      return items
    }

    if (collection in rawCollections) {
      return items
    }

    return Promise.all(items.map(bso => this.decryptCollectionBSO(collection, bso)))
  }

  getRawCollectionItem (collection, id) {
    return this.fetch(`storage/${collection}/${id}`)
  }

  async getCollectionItem (collection, id) {
    const bso = await this.getRawCollectionItem(collection, id)

    if (collection in rawCollections) {
      return bso
    }

    return this.decryptCollectionBSO(collection, bso)
  }

  getQuota () {
    return this.fetch('info/quota')
  }

  getCollectionUsage () {
    return this.fetch('info/collection_usage')
  }

  getCollectionCounts () {
    return this.fetch('info/collection_counts')
  }

  getConfiguration () {
    return this.fetch('info/configuration')
  }

  async fetch (path, params = {}) {
    if (this.tokenRefreshPromise) {
      await this.tokenRefreshPromise
    } else if (tokenServer.shouldRefresh(this.creds)) {
      this.tokenRefreshPromise = tokenServer.refresh(this.creds, this.options)
        .then(creds => this.onCreds(creds))
        .then(() => {
          delete this.tokenRefreshPromise
        })

      await this.tokenRefreshPromise
    }

    const url = `${this.creds.token.api_endpoint}/${path}`
    const method = params.method || 'get'

    const hawkOptions = {
      credentials: {
        id: this.creds.token.id,
        key: this.creds.token.key,
        algorithm: this.creds.token.hashalg
      }
    }

    if (params.body) {
      hawkOptions.payload = params.body
    }

    const authHeader = Hawk.client.header(url, method, hawkOptions)

    return fetch(url, {
      ...params,
      headers: {
        Authorization: authHeader.header,
        ...params.headers
      }
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Firefox Sync responded with ${res.status}: ${await res.text()}`)
        }

        return res.json()
      })
  }

  getCryptoKeys () {
    if (this.getCryptoKeysPromise) {
      return this.getCryptoKeysPromise
    }

    this.getCryptoKeysPromise = this.getCollectionItem('crypto', 'keys')
      .then(item => item.payload)

    return this.getCryptoKeysPromise
  }

  async getCollectionKeyBundle (collection) {
    // Special collection that uses the primary Sync key bundle.
    if (collection === 'crypto') {
      return {
        encryptionKey: Buffer.from(this.creds.syncKeyBundle.encryptionKey, 'base64'),
        hmacKey: Buffer.from(this.creds.syncKeyBundle.hmacKey, 'base64')
      }
    }

    const cryptoKeys = await this.getCryptoKeys()
    const encodedKeyBundle = cryptoKeys.collections[collection] || cryptoKeys.default

    return {
      encryptionKey: Buffer.from(encodedKeyBundle[0], 'base64'),
      hmacKey: Buffer.from(encodedKeyBundle[1], 'base64')
    }
  }

  async decryptCollectionBSO (collection, bso) {
    const keyBundle = await this.getCollectionKeyBundle(collection)
    const payload = decryptBSO(keyBundle, bso)
    return { bso, payload }
  }

  async encryptCollectionBSO (collection, payload) {
    const keyBundle = await this.getCollectionKeyBundle(collection)
    return encryptBSO(keyBundle, payload)
  }
}

/**
 * Overloaded version that supports storing and loading credentials to a file
 * to keep state between scripts runs and avoid signing in again every time.
 */
class StatefulFirefoxSync extends FirefoxSync {
  async onCreds (creds) {
    super.onCreds(creds)
    await fs.writeFile(this.options.credsFile, JSON.stringify(creds, null, 2) + '\n', { mode: 0o600 })
    return creds
  }

  async fetch (path, params) {
    await this.loadCreds()
    return super.fetch(path, params)
  }

  loadCreds () {
    if (this.creds) {
      return
    }

    if (this.loadCredsPromise) {
      return this.loadCredsPromise
    }

    if (this.options.credsFile) {
      this.loadCredsPromise = fs.readFile(this.options.credsFile, 'utf8')
        .then(creds => {
          this.creds = JSON.parse(creds)
        })

      return this.loadCredsPromise
    }
  }
}

/**
 * @param {import('./types').SyncOptions} [options]
 * @returns {FirefoxSync}
 */
function Sync (options = {}) {
  return options.credsFile ? new StatefulFirefoxSync(options) : new FirefoxSync(options)
}

module.exports = Sync
