export type OAuthChallenge = {
    state: string;
    codeVerifier: string;
    url: string;
};
export type OAuthResult = {
    code: string;
    state: string;
};
export type OAuthOptions = {
    [x: string]: any;
};
export function challenge(options?: {
    clientId?: string;
    scope?: string;
    authorizationUrl?: string;
    oauthOptions?: OAuthOptions;
}): OAuthChallenge;
export function complete(challenge: OAuthChallenge, result: OAuthResult, options?: {
    clientId?: string;
    tokenEndpoint?: string;
}): Promise<any>;
