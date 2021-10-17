export = password;
declare function password(email: string, password: string, options?: {
    clientId?: string;
    scope?: string;
    authServerUrl?: string;
    tokenServerUrl?: string;
    authClient?: any;
    signInOptions?: any;
    oauthOptions?: {
        access_type?: string;
    };
}): Promise<import('../types').SyncCredentials>;
