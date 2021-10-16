# Node Firefox Sync

> Node.js client for Firefox Sync.

## Overview

This kinda started as a proof of concept, but now it's pretty much a
fully functional Firefox Sync client.

You can authenticate to Firefox Sync through password authentication or
through OAuth. With OAuth, the user password is never exposed to the
program so I would highly recommend this method for security reasons.

Then you can query all the Firefox Sync collections, as well as the
other [information endpoints](https://mozilla-services.readthedocs.io/en/latest/storage/apis-1.5.html)
that are available.

The main things that are missing are:

* OAuth token refresh: while this library will automatically refresh the
  Firefox Sync token that expires every hour, it doesn't refresh the
  OAuth token that expires every day.
* Write methods: it's currently a read-only library and doesn't support
  creating, updating or deleting entries. That said the encryption
  method is already implemented so it's just a matter of calling the
  right endpoint.

Feel free to open a pull request to add those if you need them!

## Usage

```js
const Sync = require('firefox-sync')

const sync = sync(options)
```

The `options` object can contain:

| Name               | Description                                                                                                                                       | Default                                         |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| `credsFile`        | Manage authentication state in the given file. Useful if you want to keep state between multiple command invocations (e.g. a CLI).                | `undefined`                                     |
| `clientId`         | OAuth client ID. Defaults to the [Android app's one][android-app-id] for convenience.                                                             | `'e7ce535d93522896'`                            |
| `scope`            | OAuth scope to access Firefox Sync, you probably don't want to change it as it's currently the only scope that gives access to Sync data.         | `'https://identity.mozilla.com/apps/oldsync'`   |
| `authServerUrl`    | Only used for password authentication, [Firefox Accounts API][fxa-api] endpoint.                                                                  | `'https://api.accounts.firefox.com/v1'`         |
| `authorizationUrl` | OAuth authorization URL. Default from the [OpenID configuration][openid].                                                                         | `'https://accounts.firefox.com/authorization'`  |
| `tokenEndpoint`    | OAuth token endpoint. Default from the [OpenID configuration][openid].                                                                            | `'https://oauth.accounts.firefox.com/v1/token'`
| `tokenServerUrl`   | [TokenServer](https://github.com/mozilla-services/tokenserver/) URL.                                                                              | `'https://token.services.mozilla.com'`          |
| `oauthOptions`     | Extra OAuth authorization [parameters](oauth-parameters). You'll mainly want to use this to pass `access_type: 'offline'` to get a refresh token. | `undefined`                                     |

[android-app-id]: https://github.com/mozilla-lockwise/lockwise-android/blob/d3c0511f73c34e8759e1bb597f2d3dc9bcc146f0/app/src/main/java/mozilla/lockbox/support/Constant.kt#L29
[fxa-api]: https://github.com/mozilla/fxa/blob/main/packages/fxa-auth-server/docs/api.md
[openid]: https://accounts.firefox.com/.well-known/openid-configuration
[oauth-parameters]: https://mozilla.github.io/ecosystem-platform/docs/process/integration-with-fxa#authorization-query-parameters

### `auth.password`

**Warning:** while this is probably the easiest method to sign in, it
gives access to the program to the plaintext password. Even though
Mozilla's authentication mechanism never sends the password over the
network (on top of being TLS encrypted), it's still going to be stored
in RAM and JavaScript doesn't give us a way to reliably wipe it after
authenticating. Keep that in mind when evaluating your threat model.

```js
const creds = await sync.auth.password({
  email: 'hello@mozilla.com',
  password: 'The password goes here!'
})
```

```json
{
  "oauthToken": {
    "access_token": "32 bytes of hex",
    "token_type": "bearer",
    "scope": "https://identity.mozilla.com/apps/oldsync",
    "expires_in": 86399,
    "auth_at": 1634346661,
    "refresh_token": "32 bytes of hex"
  },
  "syncKeyBundle": {
    "encryptionKey": "32 bytes of Base64",
    "hmacKey": "32 bytes of Base64",
    "kid": "A timestamp and 16 bytes of Base64URL"
  },
  "token": {
    "id": "A bunch of Base64URL",
    "key": "32 bytes of Base64URL",
    "uid": 999999999,
    "api_endpoint": "https://sync-1-us-west1-g.sync.services.mozilla.com/1.5/999999999",
    "duration": 3600,
    "hashalg": "sha256",
    "hashed_fxa_uid": "16 bytes of hex",
    "node_type": "spanner"
  },
  "tokenIssuedAt": 1634346661940
}
```

### `auth.oauth.challenge`

```js
const challenge = await sync.auth.oauth.challenge()
```

```json
{
  "keyPair": "`KeyPairKeyObjectResult` for internal use",
  "state": "16 bytes of Base64URL",
  "codeVerifier": "32 bytes of Base64URL",
  "url": "https://accounts.firefox.com/authorization?all-the-challenge-params-go-here"
}
```

### `auth.oauth.complete`

This is typically the query parameters you get on the OAuth redirect URL.

```js
const result = {
  code: '32 bytes of hex',
  state: '16 bytes of Base64URL (ideally the same as the challenge)'
}

const creds = await sync.auth.oauth.complete(challenge, result)
```

Same output as [`sync.auth.password`](#auth-password).

### `getCollections`

> Returns an object mapping collection names associated with the account
> to the last modified time for each collection. [[API documentation]].

```js
const collections = await sync.getCollections()
```

```json
{
  "passwords": 1634346661.94,
  "bookmarks": 1634346661.94,
  "crypto": 1634346661.94,
  "prefs": 1634346661.94,
  "meta": 1634346661.94,
  "addons": 1634346661.94,
  "tabs": 1634346661.94,
  "clients": 1634346661.94,
  "history": 1634346661.94,
  "forms": 1634346661.94
}
```

### `getCollection`

> By default only the BSO IDs are returned, but full objects can be
> requested using the `full` parameter. If the collection does not
> exist, an empty list is returned. [[API documentation]].

```js
const items = await sync.getCollection('bookmarks')
```

```json
[
  "foo",
  "bar",
  "baz"
]
```

```js
const items = await sync.getCollection('bookmarks', { full: true })
const items = await sync.getCollection('bookmarks', { full: true, ids: ['foo', 'bar'] })
```

```json
[
  {
    "bso": {
      "id": "foo",
      "modified": 1634346661.94,
      "payload": "{\"encrypted\":\"stuff\"}"
    },
    "payload": {
      "decrypted": "stuff"
    }
  }
]
```

### `getCollectionItem`

> Returns the BSO in the collection corresponding to the requested ID.
> [[API documentation]].

```js
const item = await sync.getCollectionItem('bookmarks', 'foo')
```

```json
{
  "bso": {
    "id": "foo",
    "modified": 1634346661.94,
    "payload": "{\"encrypted\":\"stuff\"}"
  },
  "payload": {
    "decrypted": "stuff"
  }
}
```

### `getQuota`

> Returns a two-item list giving the user’s current usage and quota (in
> kB). The second item will be `null` if the server does not enforce
> quotas. [[API documentation]].

```js
const quota = await sync.getQuota()
```

```json
[
  69.133742,
  null
]
```

### `getCollectionUsage`

> Returns an object mapping collection names associated with the account
> to the data volume used for each collection (in kB). [[API documentation]].


```js
const usage = await sync.getCollectionUsage()
```

```json
{
  "addons": 0.7588336369,
  "crypto": 0.5156744894,
  "forms": 0.3097969336,
  "tabs": 0.2830539361,
  "bookmarks": 0.6618207313,
  "clients": 0.9727294557,
  "prefs": 0.3751385437,
  "meta": 0.6064291011,
  "passwords": 0.7713613800,
  "history": 0.9888805912
}
```

### `getCollectionCounts`

> Returns an object mapping collection names associated with the account
> to the total number of items in each collection. [[API documentation]].

```js
const usage = await sync.getCollectionCounts()
```

```json
{
  "history": 69,
  "addons": 1,
  "forms": 42,
  "meta": 1,
  "bookmarks": 1337,
  "tabs": 1,
  "prefs": 1,
  "crypto": 1,
  "passwords": 420,
  "clients": 1
}
```

### `getConfiguration`

> Provides information about the configuration of this storage server
> with respect to various protocol and size limits. [[API documentation]].

```js
const usage = await sync.getConfiguration()
```

```json
{
  "max_post_bytes": 2097152,
  "max_post_records": 100,
  "max_record_payload_bytes": 2097152,
  "max_request_bytes": 2101248,
  "max_total_bytes": 100000000,
  "max_total_records": 1664,
  "max_quota_limit": 2097152000
}
```

[API documentation]: https://mozilla-services.readthedocs.io/en/latest/storage/apis-1.5.html#general-info
