export type SyncOptions = {
    credsFile?: string;
    clientId?: string;
    scope?: string;
    authServerUrl?: string;
    authorizationUrl?: string;
    tokenEndpoint?: string;
    tokenServerUrl?: string;
    oauthOptions?: import('./auth/oauth-base').OAuthOptions;
};
export type OAuthToken = {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    auth_at: number;
    refresh_token: string;
};
export type SyncToken = {
    id: string;
    key: string;
    uid: number;
    api_endpoint: string;
    duration: number;
    hashalg: string;
    hashed_fxa_uid: string;
    node_type: string;
};
export type KeyBundle = {
    encryptionKey: string;
    hmacKey: string;
};
export type ParsedKeyBundle = {
    encryptionKey: Buffer;
    hmacKey: Buffer;
};
export type SyncKeyBundle = {
    encryptionKey: string;
    hmacKey: string;
    kid: string;
};
export type SyncCredentials = {
    oauthToken: OAuthToken;
    syncKeyBundle: SyncKeyBundle;
    token: SyncToken;
    tokenIssuedAt: number;
};
export type BSO = {
    id: string;
    payload: string;
};
