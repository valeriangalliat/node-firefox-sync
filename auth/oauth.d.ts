/// <reference types="node" />
export type SyncOAuthChallengeImpl = {
    keyPair: crypto.KeyPairKeyObjectResult;
};
export type SyncOAuthChallenge = base.OAuthChallenge & SyncOAuthChallengeImpl;
import base = require("./oauth-base");
export function challenge(options?: {
    clientId?: string;
    scope?: string;
    authorizationUrl?: string;
    oauthOptions?: base.OAuthOptions;
}): Promise<SyncOAuthChallenge>;
export function complete(challenge: SyncOAuthChallenge, result: base.OAuthResult, options?: {
    clientId?: string;
    scope?: string;
    tokenEndpoint?: string;
    tokenServerUrl?: string;
}): Promise<import('../types').SyncCredentials>;
import crypto = require("crypto");
export { base };
