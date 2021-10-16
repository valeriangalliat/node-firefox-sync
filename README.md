# Node Firefox Sync

> Node.js client for Firefox Sync.

## Overview

This kinda started as a [proof of concept](https://www.codejam.info/2021/08/scripting-firefox-sync-lockwise-figuring-the-protocol.html),
but now it's pretty much a fully functional Firefox Sync client.

You can authenticate to Firefox Sync through password authentication or
through OAuth. With OAuth, the user password is never exposed to the
program so I would highly recommend this method for security reasons.

Then you can query all the Firefox Sync collections, as well as the
other [information endpoints][storage-api] that are available.

[storage-api]: https://mozilla-services.readthedocs.io/en/latest/storage/apis-1.5.html

The main things that are missing are:

* OAuth token refresh: while this library will automatically refresh the
  Firefox Sync token that expires every hour, it doesn't refresh the
  OAuth token that expires every day.
* Write methods: it's currently a read-only library and doesn't support
  creating, updating or deleting entries. That said the encryption
  method is already implemented so it's just a matter of calling the
  right endpoint.

Feel free to open a pull request to add those if you need them!

## Installation

```sh
npm install firefox-sync
```

## Usage

```js
const Sync = require('firefox-sync')
const sync = Sync(options)
```

The `options` object can contain:

| Name               | Description                                                                                                                                        |
|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `credsFile`        | Manage authentication state in the given file. Useful if you want to keep state between multiple command invocations (e.g. a CLI).                 |
| `clientId`         | OAuth client ID. Defaults to the [Android app's one][android-app-id] for convenience.                                                              |
| `scope`            | OAuth scope to access Firefox Sync, you probably don't want to change the default as it's currently the only scope that gives access to Sync data. |
| `authServerUrl`    | Only used for password authentication, [Firefox Accounts API][fxa-api] endpoint, in case you want to use a custom server.                          |
| `authorizationUrl` | OAuth authorization URL. Default from the [OpenID configuration][openid].                                                                          |
| `tokenEndpoint`    | OAuth token endpoint. Default from the [OpenID configuration][openid].                                                                             |
| `tokenServerUrl`   | [TokenServer](https://github.com/mozilla-services/tokenserver/) URL, in case you want to use a custom server.                                      |
| `oauthOptions`     | Extra OAuth [parameters](oauth-parameters). You'll mainly want to use this to pass `access_type: 'offline'` to get a refresh token.                |

[android-app-id]: https://github.com/mozilla-lockwise/lockwise-android/blob/d3c0511f73c34e8759e1bb597f2d3dc9bcc146f0/app/src/main/java/mozilla/lockbox/support/Constant.kt#L29
[fxa-api]: https://github.com/mozilla/fxa/blob/main/packages/fxa-auth-server/docs/api.md
[openid]: https://accounts.firefox.com/.well-known/openid-configuration
[oauth-parameters]: https://mozilla.github.io/ecosystem-platform/docs/process/integration-with-fxa#authorization-query-parameters

## Authentication

### Email and password

**Warning:** while this is probably the easiest method to sign in, it
gives access to the program to the plaintext password. Even though
Mozilla's authentication mechanism never sends the password over the
network (on top of being TLS encrypted), it's still going to be stored
in RAM and JavaScript doesn't give us a way to reliably wipe it after
authenticating. Keep that in mind when evaluating your threat model.

```js
const creds = await sync.auth.password('hello@mozilla.com', 'The password goes here!')

const creds = await sync.auth.password('hello@mozilla.com', 'The password goes here!', {
  authServerUrl: 'https://your.custom.url/'
})
```

<details>
<summary>Response</summary>

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

</details>

### OAuth

First, we issue a OAuth challenge that the user needs to open in a
browser.

If you don't have your own OAuth client ID with a properly configured
redirect URL for your application, you can use a public client ID like
[the one of the Android app](https://github.com/mozilla-lockwise/lockwise-android/blob/d3c0511f73c34e8759e1bb597f2d3dc9bcc146f0/app/src/main/java/mozilla/lockbox/support/Constant.kt#L29>),
but you'll need to use web debugging tools to retrieve the OAuth
response code, so this will only work for testing purpose.

```js
const challenge = await sync.auth.oauth.challenge()

const challenge = await sync.auth.oauth.challenge({
  oauthOptions: {
    access_type: 'offline'
  }
})
```

<details>
<summary>Response</summary>

```json
{
  "keyPair": "`KeyPairKeyObjectResult` for internal use",
  "state": "16 bytes of Base64URL",
  "codeVerifier": "32 bytes of Base64URL",
  "url": "https://accounts.firefox.com/authorization?all-the-challenge-params-go-here"
}
```

</details>

Upon successful authentication, the user is redirected to the configured
URL that will include a `code` and `state` query string parameters that
you need to pass to the `auth.oauth.complete` function.

```js
const result = {
  code: '32 bytes of hex',
  state: '16 bytes of Base64URL (ideally the same as the challenge)'
}

const creds = await sync.auth.oauth.complete(challenge, result)

const creds = await sync.auth.oauth.complete(challenge, result, {
  tokenEndpoint: 'https://your.custom.url/token'
})
```

Same output as [`auth.password`](#email-and-password).

</details>

## Collections

### `getCollections`

> Returns an object mapping collection names associated with the account
> to the last modified time for each collection.

```js
const collections = await sync.getCollections()
```

<details>
<summary>Response</summary>

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

</details>

### `getCollection`

> By default only the BSO IDs are returned, but full objects can be
> requested using the `full` parameter. If the collection does not
> exist, an empty list is returned.

```js
const items = await sync.getCollection('bookmarks')
```

<details>
<summary>Response</summary>

```json
[
  "foo",
  "bar",
  "baz"
]
```

</details>

```js
const items = await sync.getCollection('bookmarks', { full: true })
const items = await sync.getCollection('bookmarks', { full: true, ids: ['foo', 'bar'] })
```

<details>
<summary>Response</summary>

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

</details>

### `getCollectionItem`

> Returns the BSO in the collection corresponding to the requested ID.

```js
const item = await sync.getCollectionItem('bookmarks', 'foo')
```

<details>
<summary>Response</summary>

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

</details>

## Information

There's a [number of endpoints][storage-api-endpoints] that return some
information about this Firefox Sync instance.

[storage-api-endpoints]: https://mozilla-services.readthedocs.io/en/latest/storage/apis-1.5.html#general-info

### `getQuota`

> Returns a two-item list giving the user’s current usage and quota (in
> kB). The second item will be `null` if the server does not enforce
> quotas.

```js
const quota = await sync.getQuota()
```

<details>
<summary>Response</summary>

```json
[
  69.133742,
  null
]
```

</details>

### `getCollectionUsage`

> Returns an object mapping collection names associated with the account
> to the data volume used for each collection (in kB).


```js
const usage = await sync.getCollectionUsage()
```

<details>
<summary>Response</summary>

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

</details>

### `getCollectionCounts`

> Returns an object mapping collection names associated with the account
> to the total number of items in each collection.

```js
const usage = await sync.getCollectionCounts()
```

<details>
<summary>Response</summary>

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

</details>

### `getConfiguration`

> Provides information about the configuration of this storage server
> with respect to various protocol and size limits.

```js
const usage = await sync.getConfiguration()
```

<details>
<summary>Response</summary>

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

</details>
