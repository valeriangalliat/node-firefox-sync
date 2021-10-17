export type PartialSyncCredentials = {
    oauthToken: import('../types').OAuthToken;
    syncKeyBundle: import('../types').SyncKeyBundle;
};
export type SyncCredentials = import('../types').SyncCredentials;
export function refresh(creds: PartialSyncCredentials, options?: {
    tokenServerUrl?: string;
}): Promise<SyncCredentials>;
export function shouldRefresh(creds: SyncCredentials): boolean;
