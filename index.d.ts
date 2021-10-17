export = Sync;
declare function Sync(options?: import('./types').SyncOptions): FirefoxSync;
declare class FirefoxSync {
    constructor(syncOptions: any);
    options: any;
    auth: {
        password: (email: any, password: any, options: any) => Promise<any>;
        oauth: {
            challenge: (options: any) => Promise<import("./auth/oauth").SyncOAuthChallenge>;
            complete: (challenge: any, result: any, options: any) => Promise<any>;
        };
    };
    creds: any;
    onCreds(creds: any): any;
    getCollections(): Promise<any>;
    getRawCollection(collection: any, params?: {}): Promise<any>;
    getCollection(collection: any, params: any): Promise<any>;
    getRawCollectionItem(collection: any, id: any): Promise<any>;
    getCollectionItem(collection: any, id: any): Promise<any>;
    getQuota(): Promise<any>;
    getCollectionUsage(): Promise<any>;
    getCollectionCounts(): Promise<any>;
    getConfiguration(): Promise<any>;
    fetch(path: any, params?: {}): Promise<any>;
    tokenRefreshPromise: any;
    getCryptoKeys(): Promise<any>;
    getCryptoKeysPromise: Promise<any>;
    getCollectionKeyBundle(collection: any): Promise<{
        encryptionKey: Buffer;
        hmacKey: Buffer;
    }>;
    decryptCollectionBSO(collection: any, bso: any): Promise<{
        bso: any;
        payload: any;
    }>;
    encryptCollectionBSO(collection: any, payload: any): Promise<import("./types").BSO>;
}
