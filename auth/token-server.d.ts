export type PartialSyncCredentials = {
    oauthToken: import('../types').OAuthToken;
    syncKeyBundle: import('../types').SyncKeyBundle;
};
export type SyncCredentials = import('../types').SyncCredentials;
export function shouldRefresh(creds: SyncCredentials): boolean;
export function refresh(creds: PartialSyncCredentials, options?: {
    clientId?: string;
    tokenEndpoint?: string;
    tokenServerUrl?: string;
}): Promise<SyncCredentials>;
