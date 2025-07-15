import { Router, Request, Response } from 'express';
import { oauthMiddleware } from './oauth';
import { logger } from '../utils/logger';
import { statelessTokenManager } from '../utils/jwt-token-storage';

// Store OAuth flow state data
interface OAuthFlowState {
    mcpRedirectUri: string;
    mcpState: string;
    mcpCodeChallenge?: string;
    mcpCodeChallengeMethod?: string;
    createdAt: number;
}

const oauthFlowStore: { [sessionId: string]: OAuthFlowState } = {};

// Clean up expired flow states periodically
setInterval(() => {
    const now = Date.now();
    Object.entries(oauthFlowStore).forEach(([sessionId, data]) => {
        if (now - data.createdAt > 600000) { // 10 minutes
            delete oauthFlowStore[sessionId];
        }
    });
}, 60000); // Run every minute

export function createMCPOAuthRouter(): Router {
    const router = Router();

    /**
     * OAuth Discovery Endpoint
     * Returns OAuth configuration for MCP clients
     */
    const oauthDiscoveryHandler = (req: Request, res: Response) => {
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        
        res.json({
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/auth/authorize`,
            token_endpoint: `${baseUrl}/auth/token`,
            token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
            revocation_endpoint: `${baseUrl}/auth/revoke`,
            registration_endpoint: `${baseUrl}/auth/register`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            code_challenge_methods_supported: ['S256'],
            scopes_supported: [
                'read:jira-work',
                'write:jira-work',
                'read:jira-user',
                'offline_access'
            ]
        });
    };

    // Standard OAuth discovery endpoint locations
    router.get('/auth/.well-known/oauth-authorization-server', oauthDiscoveryHandler);
    router.get('/.well-known/oauth-authorization-server', oauthDiscoveryHandler);

    /**
     * Client Registration Endpoint
     * Returns pre-configured client credentials for the MCP Inspector
     */
    router.post('/auth/register', (req: Request, res: Response) => {
        const clientId = process.env.ATLASSIAN_CLIENT_ID || process.env.MCP_CLIENT_ID;
        const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET || process.env.MCP_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            return res.status(500).json({
                error: 'server_error',
                error_description: 'OAuth client credentials not configured'
            });
        }

        // Return the pre-configured client credentials
        return res.json({
            client_id: clientId,
            client_secret: clientSecret,
            client_id_issued_at: Math.floor(Date.now() / 1000),
            client_secret_expires_at: 0, // Never expires
            redirect_uris: [
                `${process.env.BASE_URL || 'http://localhost:3000'}/auth/callback`,
                'http://localhost:6274/oauth/callback', // MCP Inspector callback
                'http://localhost:5173/oauth/callback'  // Vite dev server callback
            ],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            scope: 'read:jira-work write:jira-work read:jira-user offline_access'
        });
    });

    /**
     * Authorization Endpoint
     * Initiates the OAuth flow by redirecting to Atlassian
     */
    router.get('/auth/authorize', (req: Request, res: Response) => {
        const { 
            client_id,
            redirect_uri,
            response_type,
            state,
            scope,
            code_challenge,
            code_challenge_method
        } = req.query;

        // Validate required parameters
        if (!client_id || !redirect_uri || response_type !== 'code') {
            return res.status(400).json({
                error: 'invalid_request',
                error_description: 'Missing or invalid required parameters'
            });
        }

        // Validate client_id matches our configured client
        const configuredClientId = process.env.MCP_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID;
        if (client_id !== configuredClientId) {
            return res.status(400).json({
                error: 'invalid_client',
                error_description: 'Unknown client'
            });
        }

        try {
            // Generate session ID for this OAuth flow
            const sessionId = `oauth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            
            // Store the MCP client's redirect URI and state for later
            oauthFlowStore[sessionId] = {
                mcpRedirectUri: redirect_uri as string,
                mcpState: state as string,
                mcpCodeChallenge: code_challenge as string,
                mcpCodeChallengeMethod: code_challenge_method as string,
                createdAt: Date.now()
            };

            // Get Atlassian authorization URL
            const authUrl = oauthMiddleware.getAuthorizationUrl(sessionId);
            
            // Redirect to Atlassian OAuth
            return res.redirect(authUrl);
        } catch (error) {
            logger.error('Error in authorization endpoint:', error);
            return res.status(500).json({
                error: 'server_error',
                error_description: 'Internal server error'
            });
        }
    });

    /**
     * OAuth Callback Handler
     * Handles the callback from Atlassian after user authorization
     */
    router.get('/auth/callback', async (req: Request, res: Response) => {
        const { code, state, error, error_description } = req.query;

        // For error cases, we don't have session ID, so we can't retrieve flow state
        // Just redirect to a default error page
        if (error) {
            const errorParams = new URLSearchParams({
                error: error as string,
                error_description: error_description as string || 'Authorization denied'
            });
            
            // Redirect to a default error page or the base URL
            return res.redirect(`/?${errorParams.toString()}`);
        }

        try {
            // Exchange code for tokens with Atlassian
            const result = await oauthMiddleware.handleCallback(code as string, state as string);
            
            // Retrieve flow state using session ID
            const flowState = oauthFlowStore[result.sessionId];
            if (!flowState) {
                throw new Error('OAuth flow state not found');
            }
            
            // Clean up flow state
            delete oauthFlowStore[result.sessionId];
            
            // Create a temporary authorization code that contains the Atlassian tokens
            // This code will be exchanged for a JWT in the token endpoint
            const codePayload = {
                atlassianAccessToken: result.tokens.accessToken,
                atlassianRefreshToken: result.tokens.refreshToken,
                cloudId: result.tokens.cloudId,
                userId: result.tokens.userId,
                sessionId: result.sessionId,
                codeChallenge: flowState.mcpCodeChallenge,
                codeChallengeMethod: flowState.mcpCodeChallengeMethod,
                expiresAt: Date.now() + 600000 // 10 minutes for code exchange
            };
            
            // Create a temporary JWT as the authorization code (no storage needed!)
            const mcpAuthCode = statelessTokenManager.createMCPToken(codePayload);

            // Redirect back to MCP client with authorization code
            const successParams = new URLSearchParams({
                code: mcpAuthCode,
                state: flowState.mcpState
            });

            res.redirect(`${flowState.mcpRedirectUri}?${successParams.toString()}`);
        } catch (error) {
            logger.error('Error in OAuth callback:', error);
            
            const errorParams = new URLSearchParams({
                error: 'server_error',
                error_description: 'Failed to complete authorization'
            });

            // Redirect to a default error page
            res.redirect(`/?${errorParams.toString()}`);
        }
    });

    /**
     * Token Endpoint
     * Exchanges authorization code for access token
     */
    router.post('/auth/token', async (req: Request, res: Response) => {
        const { 
            grant_type,
            code,
            redirect_uri,
            client_id,
            client_secret,
            code_verifier,
            refresh_token
        } = req.body;

        // Check for HTTP Basic Authentication
        const authHeader = req.headers.authorization;
        let basicAuthClientId, basicAuthClientSecret;
        if (authHeader && authHeader.startsWith('Basic ')) {
            const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
            [basicAuthClientId, basicAuthClientSecret] = credentials.split(':');
        }

        // Debug logging
        logger.info('Token request received:', {
            grant_type,
            client_id: client_id || basicAuthClientId,
            hasCode: !!code,
            codeLength: code?.length || 0,
            hasClientSecret: !!(client_secret || basicAuthClientSecret),
            redirect_uri,
            hasAuthHeader: !!authHeader,
            authMethod: authHeader ? authHeader.split(' ')[0] : 'none',
            bodyKeys: Object.keys(req.body),
            contentType: req.headers['content-type']
        });

        // Validate client credentials (support both body and Basic auth)
        const configuredClientId = process.env.MCP_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID;
        const configuredClientSecret = process.env.MCP_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET;
        
        const finalClientId = client_id || basicAuthClientId;
        const finalClientSecret = client_secret || basicAuthClientSecret;

        logger.info('Client credential validation:', {
            providedClientId: finalClientId,
            configuredClientId,
            clientIdMatch: finalClientId === configuredClientId,
            hasProvidedSecret: !!finalClientSecret,
            hasConfiguredSecret: !!configuredClientSecret,
            secretMatch: finalClientSecret === configuredClientSecret,
            authMethod: authHeader ? authHeader.split(' ')[0] : 'body'
        });

        if (finalClientId !== configuredClientId || finalClientSecret !== configuredClientSecret) {
            logger.error('Client authentication failed');
            return res.status(401).json({
                error: 'invalid_client',
                error_description: 'Client authentication failed'
            });
        }

        try {
            if (grant_type === 'authorization_code') {
                logger.info('Attempting to decode authorization code:', {
                    codeLength: code?.length || 0,
                    codePreview: code?.substring(0, 50) + '...'
                });
                
                // Decode the JWT authorization code (no storage lookup needed!)
                const codeData = statelessTokenManager.verifyMCPToken(code);
                
                logger.info('Code verification result:', {
                    success: !!codeData,
                    hasAtlassianToken: !!codeData?.atlassianAccessToken,
                    hasCloudId: !!codeData?.cloudId,
                    userId: codeData?.userId
                });
                
                if (!codeData) {
                    logger.error('Authorization code verification failed');
                    return res.status(400).json({
                        error: 'invalid_grant',
                        error_description: 'Invalid or expired authorization code'
                    });
                }

                // TODO: Validate PKCE code_verifier if codeData.codeChallenge was provided

                // Create a new JWT token with longer expiry for Claude to use
                const accessTokenPayload = {
                    userId: codeData.userId,
                    atlassianAccessToken: codeData.atlassianAccessToken,
                    atlassianRefreshToken: codeData.atlassianRefreshToken,
                    cloudId: codeData.cloudId,
                    email: codeData.email,
                    jiraProject: codeData.jiraProject,
                    expiresAt: Date.now() + (3600 * 1000) // 1 hour
                };

                const mcpAccessToken = statelessTokenManager.createMCPToken(accessTokenPayload);

                // Return the JWT as the access token (Claude will use this for API calls)
                return res.json({
                    access_token: mcpAccessToken,
                    token_type: 'Bearer',
                    expires_in: 3600, // 1 hour
                    scope: 'read:jira-work write:jira-work read:jira-user offline_access'
                });

            } else if (grant_type === 'refresh_token') {
                // For JWT approach, the refresh token is actually the access token itself
                // We decode it to get the Atlassian refresh token
                const tokenData = statelessTokenManager.verifyMCPToken(refresh_token);

                if (!tokenData || !tokenData.atlassianRefreshToken) {
                    return res.status(400).json({
                        error: 'invalid_grant',
                        error_description: 'Invalid refresh token'
                    });
                }

                try {
                    // Use the Atlassian refresh token to get new tokens
                    const response = await fetch('https://auth.atlassian.com/oauth/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            grant_type: 'refresh_token',
                            client_id: process.env.ATLASSIAN_CLIENT_ID,
                            client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
                            refresh_token: tokenData.atlassianRefreshToken
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to refresh Atlassian token');
                    }

                    const newTokens = await response.json() as { access_token: string; refresh_token?: string };

                    // Create new JWT with updated Atlassian tokens
                    const newAccessTokenPayload = {
                        ...tokenData,
                        atlassianAccessToken: newTokens.access_token,
                        expiresAt: Date.now() + (3600 * 1000) // 1 hour
                    };

                    const newMcpAccessToken = statelessTokenManager.createMCPToken(newAccessTokenPayload);

                    return res.json({
                        access_token: newMcpAccessToken,
                        token_type: 'Bearer',
                        expires_in: 3600,
                        scope: 'read:jira-work write:jira-work read:jira-user offline_access'
                    });
                } catch (error) {
                    logger.error('Error refreshing tokens:', error);
                    return res.status(400).json({
                        error: 'invalid_grant',
                        error_description: 'Failed to refresh token'
                    });
                }

            } else {
                return res.status(400).json({
                    error: 'unsupported_grant_type',
                    error_description: 'Grant type not supported'
                });
            }
        } catch (error) {
            logger.error('Error in token endpoint:', error);
            return res.status(500).json({
                error: 'server_error',
                error_description: 'Internal server error'
            });
        }
    });

    /**
     * Revocation Endpoint
     * Revokes access or refresh tokens
     */
    router.post('/auth/revoke', async (req: Request, res: Response) => {
        const { token, token_type_hint, client_id, client_secret } = req.body;

        // Validate client credentials
        const configuredClientId = process.env.MCP_CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID;
        const configuredClientSecret = process.env.MCP_CLIENT_SECRET || process.env.ATLASSIAN_CLIENT_SECRET;

        if (client_id !== configuredClientId || client_secret !== configuredClientSecret) {
            return res.status(401).json({
                error: 'invalid_client',
                error_description: 'Client authentication failed'
            });
        }

        try {
            // For JWT approach, decode the token to get Atlassian refresh token
            const tokenData = statelessTokenManager.verifyMCPToken(token);

            if (tokenData && tokenData.atlassianRefreshToken) {
                // Revoke the Atlassian refresh token
                try {
                    await fetch('https://auth.atlassian.com/oauth/token/revoke', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            token: tokenData.atlassianRefreshToken,
                            token_type_hint: 'refresh_token',
                            client_id: process.env.ATLASSIAN_CLIENT_ID,
                            client_secret: process.env.ATLASSIAN_CLIENT_SECRET
                        })
                    });
                } catch (error) {
                    logger.error('Error revoking Atlassian token:', error);
                    // Don't fail the request - revocation should be best effort
                }
            }

            // Always return 200 OK per OAuth spec
            return res.status(200).send();
        } catch (error) {
            logger.error('Error in revocation endpoint:', error);
            // Still return 200 OK even on error per OAuth spec
            return res.status(200).send();
        }
    });

    return router;
}

// No global storage needed - using stateless JWT approach! 